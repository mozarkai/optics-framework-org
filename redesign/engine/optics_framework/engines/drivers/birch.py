"""Drives the Birch app on optics-framework.org/playground, through the page's window.opticsBirch."""
from typing import Any, Optional

import js

from optics_framework.common.driver_interface import DriverInterface


def device():
    return js.opticsBirch


class BirchElement:
    """One node of the Birch page source."""

    def __init__(self, node_id: str):
        self.id = node_id

    def is_enabled(self) -> bool:
        return True

    def is_selected(self) -> bool:
        return bool(device().selected(self.id))


class Birch(DriverInterface):
    NAME = "birch"

    def __init__(self, config: Optional[dict] = None, event_sdk: Any = None):
        self.config = config or {}
        self.event_sdk = event_sdk

    def launch_app(self, app_identifier=None, app_activity=None, event_name=None):
        device().launch()
        return "birch"

    def launch_other_app(self, app_name, event_name=None):
        self._unsupported("launch_other_app")

    def get_app_version(self) -> str:
        return str(device().version)

    def press_coordinates(self, coor_x, coor_y, event_name=None):
        device().tapAt(int(coor_x), int(coor_y))

    def press_element(self, element, repeat=1, event_name=None):
        for _ in range(max(1, int(repeat))):
            device().tap(element.id)

    def press_percentage_coordinates(self, percentage_x, percentage_y, repeat=1, event_name=None):
        size = self.get_window_size()
        for _ in range(max(1, int(repeat))):
            device().tapAt(round(size["width"] * float(percentage_x) / 100), round(size["height"] * float(percentage_y) / 100))

    def enter_text(self, text, event_name=None):
        device().type(None, str(text))

    def press_keycode(self, keycode, event_name=None):
        self._unsupported("press_keycode")

    def enter_text_element(self, element, text, event_name=None):
        device().type(element.id, str(text))

    def enter_text_using_keyboard(self, text, event_name=None):
        device().type(None, str(text))

    def clear_text(self, event_name=None):
        device().type(None, "")

    def clear_text_element(self, element, event_name=None):
        device().type(element.id, "")

    def swipe(self, x_coor, y_coor, direction, swipe_length, event_name=None):
        self._unsupported("swipe")

    def swipe_percentage(self, x_percentage, y_percentage, direction, swipe_length_percentage, event_name=None):
        self._unsupported("swipe_percentage")

    def swipe_element(self, element, direction, swipe_length, event_name=None):
        self._unsupported("swipe_element")

    def scroll(self, direction, duration, event_name=None):
        self._unsupported("scroll")

    def get_text_element(self, element) -> str:
        return str(device().text(element.id))

    def force_terminate_app(self, app_name, event_name=None):
        device().close()

    def terminate(self) -> None:
        pass

    def get_driver_session_id(self):
        return "birch"

    def execute_script(self, script, *args, event_name=None):
        self._unsupported("execute_script")

    def go_back(self, event_name=None):
        device().back()

    def get_window_size(self) -> dict:
        return {"width": int(device().width), "height": int(device().height)}
