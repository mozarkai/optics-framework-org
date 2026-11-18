"""Regenerate the suite explainer's keyword catalogue and its dry_run goldens from an optics-framework checkout.

    <checkout>/.venv/bin/python scripts/explain.py <checkout>

Writes content/explain/catalogue.json (every keyword the CSV and YAML runner knows, with its
signature) and test/fixtures/explain/goldens.json (what real `optics dry_run` reports for every
example and every fixture suite), so `npm test` can hold the browser analyser to the real runner.
"""

import inspect
import json
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

checkout = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(checkout))

from optics_framework.api.action_keyword import ActionKeyword  # noqa: E402
from optics_framework.api.app_management import AppManagement  # noqa: E402
from optics_framework.api.flow_control import FlowControl  # noqa: E402
from optics_framework.api.verifier import Verifier  # noqa: E402
from optics_framework.common.error import ERROR_REGISTRY  # noqa: E402
from optics_framework.common.runner import data_reader  # noqa: E402
from optics_framework.helper.version import VERSION  # noqa: E402

CONFIG = """driver_sources:
  - playwright:
      enabled: true
      capabilities:
        browser: chromium
        headless: true
elements_sources:
  - playwright_find_element:
      enabled: true
"""


def parameter(p: inspect.Parameter) -> dict:
    entry = {"name": p.name}
    if p.kind is inspect.Parameter.VAR_POSITIONAL:
        entry["variadic"] = True
    elif p.default is inspect.Parameter.empty:
        entry["required"] = True
    else:
        entry["default"] = None if p.default is None else str(p.default)
    return entry


def keyword(cls: type, name: str) -> dict:
    method = getattr(cls, name)
    params = [parameter(p) for p in inspect.signature(method).parameters.values() if p.name != "self"]
    entry = {"slug": name, "group": cls.__name__, "params": params}
    if raw := list(getattr(method, "_raw_param_indices", ())):
        entry["raw"] = raw
    if getattr(method, "_substitutes_own_vars", False):
        entry["substitutesOwnVars"] = True
    if getattr(method, "_defines_variable", False):
        entry["definesVariable"] = True
    return entry


def catalogue() -> dict:
    keywords = [
        keyword(cls, name)
        for cls in (AppManagement, ActionKeyword, Verifier, FlowControl)
        for name in sorted(dir(cls))
        if not name.startswith("_") and callable(getattr(cls, name))
    ]
    return {
        "version": VERSION,
        "keywords": keywords,
        "yamlArity": data_reader._keyword_catalogue(),
        "codes": {code: spec.default_message for code, spec in ERROR_REGISTRY.items()},
    }


def junit_cases(xml: Path) -> list:
    cases = []
    for case in ET.parse(xml).getroot().iter("testcase"):
        failure = case.find("failure")
        cases.append({
            "name": case.get("name"),
            "kind": case.get("kind"),
            "status": case.get("status"),
            **({"code": failure.get("code"), "message": failure.get("message")} if failure is not None else {}),
        })
    return cases


def dry_run(project: Path) -> dict:
    with tempfile.TemporaryDirectory() as tmp:
        copy = Path(tmp) / project.name
        shutil.copytree(project, copy)
        if not (copy / "config.yaml").exists():
            (copy / "config.yaml").write_text(CONFIG)
        run = subprocess.run(
            [str(checkout / ".venv/bin/optics"), "dry_run", str(copy), "--no-use-printer"],
            capture_output=True, text=True, env={"PATH": "/usr/bin:/bin", "COLUMNS": "200", "NO_COLOR": "1"},
        )
        xml = copy / "execution_output" / "junit_output.xml"
        if xml.exists():
            return {"exit": run.returncode, "cases": junit_cases(xml)}
        return {"exit": run.returncode, "output": " ".join((run.stdout + run.stderr).split())}


root = Path(__file__).resolve().parent.parent
(root / "content/explain/catalogue.json").write_text(json.dumps(catalogue(), indent=1) + "\n")
projects = sorted([*(root / "content/explain/examples").iterdir(), *(root / "test/fixtures/explain").iterdir()])
goldens = {f"{p.parent.name}/{p.name}": dry_run(p) for p in projects if p.is_dir()}
(root / "test/fixtures/explain/goldens.json").write_text(json.dumps(goldens, indent=1) + "\n")
print(f"wrote catalogue and {len(goldens)} goldens from optics-framework {VERSION}")
