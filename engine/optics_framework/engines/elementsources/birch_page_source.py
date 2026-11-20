"""Reads the Birch app on optics-framework.org/playground as a UI tree, the way appium_page_source reads a phone."""
import re
import time
from typing import List, Optional

from lxml import etree  # type: ignore

from optics_framework.common import utils
from optics_framework.common.elementsource_interface import ElementSourceInterface
from optics_framework.common.error import Code, OpticsError
from optics_framework.engines.drivers import birch
from optics_framework.engines.drivers.birch import BirchElement, device

TEXT_ATTRIBUTES = ("text", "content-desc", "resource-id")
BOUNDS = re.compile(r"\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]")


def _bounds(node) -> Optional[tuple]:
    match = BOUNDS.match(node.get("bounds", ""))
    if not match:
        return None
    x1, y1, x2, y2 = map(int, match.groups())
    return (x1, y1), (x2, y2)


class BirchPageSource(ElementSourceInterface):
    REQUIRED_DRIVER_TYPE = "birch"

    def __init__(self, driver=None):
        self.driver = driver

    def _strict(self) -> bool:
        try:
            return bool(self.driver.event_sdk.config_handler.config.strict_element_match)
        except AttributeError:
            return False

    def _tree(self):
        return etree.fromstring(birch.read_screen().encode("utf-8"))

    def capture(self):
        raise NotImplementedError("The Birch page source has no screenshots.")

    def get_page_source(self):
        return birch.read_screen(), str(utils.get_timestamp())

    def _matches(self, element: str) -> list:
        kind = utils.determine_element_type(element)
        tree = self._tree()
        if kind == "XPath":
            try:
                found = tree.xpath(utils.without_prefix(element, utils.XPATH_PREFIX))
            except etree.XPathError as e:
                raise OpticsError(Code.E0201, message=f"Invalid XPath: {element}", cause=e) from e
            return [n for n in found if isinstance(n, etree._Element)]
        if kind == "Text":
            return self._text_matches(tree, utils.without_prefix(element, "text="))
        return []

    def _text_matches(self, tree, text: str) -> list:
        # Exact matches win over close ones, as in AppiumUIHelper._index_matches.
        def exact(value: str) -> bool:
            return value == text or ("/" in value and value.rsplit("/", 1)[-1] == text)

        nodes = list(tree.iter())
        found = [n for n in nodes if any(exact(n.get(a, "").strip()) for a in TEXT_ATTRIBUTES)]
        if found or self._strict():
            return found
        return [n for n in nodes if any(utils.compare_text(n.get(a, ""), text) for a in TEXT_ATTRIBUTES)]

    def can_locate(self, element: str) -> bool:
        return utils.determine_element_type(element) in ("XPath", "Text")

    def locate(self, element: str, index: Optional[int] = None):
        kind, found, pick = utils.determine_element_type(element), self._matches(element), index or 0
        if pick >= len(found):
            device().missed(element, kind)
            raise OpticsError(Code.E0201, message=f"Element not found in the page source: {element}")
        utils.warn_if_ambiguous(element, len(found), pick)
        node_id = found[pick].get("node-id")
        device().found(node_id, element, kind)
        return BirchElement(node_id)

    def check_elements(self, elements: list[str], visible: bool = False) -> list[bool]:
        return [bool(self._matches(e)) for e in elements]

    def assert_elements(self, elements, timeout=30, rule="any"):
        if rule not in ("any", "all"):
            raise ValueError("Invalid rule. Use 'any' or 'all'.")
        deadline = time.time() + float(timeout)
        while not (all if rule == "all" else any)(self.check_elements(elements)):
            if time.time() >= deadline:
                raise TimeoutError(f"Timeout reached: Elements not found based on rule '{rule}': {elements}")
            time.sleep(0.3)
        return True, utils.get_timestamp()

    def assert_elements_visible(self, elements, timeout=30, rule="any"):
        return self.assert_elements(elements, timeout, rule)

    def get_bbox_for_element(self, element):
        node = self._tree().find(f".//*[@node-id='{element.id}']")
        return _bounds(node) if node is not None else None

    def get_element_bboxes(self, elements: list):
        trees = [self._matches(e) for e in elements]
        return [_bounds(found[0]) if found else None for found in trees]

    def get_interactive_elements(self, filter_config: Optional[List[str]] = None, compact: bool = False) -> list:
        return [
            {"text": n.get("text") or n.get("content-desc", ""), "resource_id": n.get("resource-id", ""), "class": n.tag, "bounds": _bounds(n)}
            for n in self._tree().iter()
            if n.get("clickable") == "true" or n.get("text")
        ]
