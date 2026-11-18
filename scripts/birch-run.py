"""Run the Birch suite with Optics against the real Birch app and publish what Optics wrote.

Run it with the Python environment that has Optics installed with Playwright and EasyOCR:

    <venv>/bin/python scripts/birch-run.py

It serves site/ on 127.0.0.1:4180, runs `optics execute birch-tests` once for each Birch
release, and writes site/runs/birch-<release>/ (the files Optics wrote, its screenshots as
WebP) and site/runs/birch-run.js (the data the replay on /run and the homepage reads).
"""

import csv
import functools
import hashlib
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import tempfile
import threading
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from importlib.metadata import version
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
SUITE = SITE / "birch-tests"
OUT = SITE / "runs"
PORT = 4180
RELEASES = [("2.1", ""), ("2.2", "?release=2.2")]
OPTICS = Path(sys.executable).with_name("optics")
SYSTEMS = {"Darwin": "macOS"}
RAW = ["junit_output.xml", "logs.json", "execution_logs.log", "internal_logs.log"]
SUITE_FILES = ["config.yaml", "test_cases/test_cases.csv", "modules/modules.csv", "test_data/elements.csv", "test_data/error_definitions.csv"]
STRATEGY = re.compile(r"^Trying (\w+?)Strategy on '(.*)' \.\.\. (SUCCESS|FAIL)")
RUNG = {"XPath": "XPath", "TextElement": "Text", "TextDetection": "OCR", "ImageDetection": "Image"}
PRE = re.compile(r"^(\d{4}-\d\d-\d\dT\d\d-\d\d-\d\d)-(\d{6})-pre_\w+\.jpg$")
FOUND = re.compile(r"^(\d{4}-\d\d-\d\dT\d\d-\d\d-\d\d)\.(\d{6})([+-]\d\d)-(\d\d)-\w+_detection_result\.jpg$")


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve():
    server = ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(Quiet, directory=SITE))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def execute(url, work):
    shutil.copytree(SUITE, work / "birch-tests")
    started = datetime.now(timezone.utc)
    proc = subprocess.run(
        [str(OPTICS), "execute", "birch-tests"],
        cwd=work, env={**os.environ, "BIRCH_URL": url}, capture_output=True, text=True,
    )
    return proc, started


def tree(stdout):
    """The result tree and summary the terminal shows at the end of the run."""
    lines = stdout.splitlines()
    start = next(i for i, line in enumerate(lines) if line.startswith("Test Suite"))
    return "\n".join(line.rstrip() for line in lines[start:]).strip()


def final_events(events):
    """The last event of each entity, in the order the entities started."""
    last = {}
    for event in events:
        last[event["entity_id"]] = event
    return list(last.values())


def module_rows():
    rows = {}
    with open(SUITE / "modules/modules.csv", newline="") as f:
        for cells in list(csv.reader(f))[1:]:
            rows.setdefault(cells[0], []).append([cell for cell in cells[1:] if cell])
    return rows


def found_by(logs):
    attempts = [STRATEGY.match(line) for line in logs or []]
    return [{"rung": RUNG.get(m[1], m[1]), "strategy": m[1] + "Strategy", "value": m[2], "ok": m[3] == "SUCCESS"} for m in attempts if m and m[1] != "Screenshot"]


def pre_time(m):
    return datetime.strptime(m[1] + m[2], "%Y-%m-%dT%H-%M-%S%f").timestamp()


def found_time(m):
    stamp = f"{m[1]}{m[2]}{m[3]}{m[4]}"
    return datetime.strptime(stamp, "%Y-%m-%dT%H-%M-%S%f%z").timestamp()


def captures(folder):
    """Every pre-step and detection screenshot, with the time Optics wrote it."""
    shots = []
    for path in sorted(folder.glob("*.jpg")):
        if m := PRE.match(path.name):
            shots.append(("pre", pre_time(m), path))
        elif m := FOUND.match(path.name):
            shots.append(("found", found_time(m), path))
    return shots


def green_box(found):
    """The rectangle Optics drew on a detection screenshot, from its pure green pixels."""
    b = np.asarray(Image.open(found).convert("RGB"), dtype=np.int16)
    green = (b[..., 1] > 200) & (b[..., 0] < 90) & (b[..., 2] < 90)
    ys, xs = np.nonzero(green)
    if len(xs) < 20:
        return None
    return [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]


def webp(src, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    Image.open(src).convert("RGB").save(dest, "WEBP", quality=74, method=6)
    digest = hashlib.sha256(dest.read_bytes()).hexdigest()[:10]
    return f"runs/{dest.parent.name}/{dest.name}?v={digest}"


def attach(step, shots, folder, n):
    """Give a step the screenshots Optics took while it ran."""
    inside = [s for s in shots if step["t0"] - 0.005 <= s[1] <= step["t1"] + 0.005]
    pre = next((s[2] for s in inside if s[0] == "pre"), None)
    found = next((s[2] for s in inside if s[0] == "found"), None)
    if pre:
        step["pre"] = webp(pre, folder / f"{n:02d}-pre.webp")
    if found:
        step["found"] = webp(found, folder / f"{n:02d}-found.webp")
        step["box"] = green_box(found)


def steps(events, shots, folder):
    final = final_events(events)
    children = {}
    for e in final:
        children.setdefault(e["parent_id"], []).append(e)
    rows = module_rows()
    cases, out = [], []
    t_start = min(e["start_time"] for e in final if e["entity_type"] == "test_case")
    for case in children.get(None, []):
        if case["entity_type"] != "test_case":
            continue
        cases.append({"name": case["name"], "status": case["status"], "time": round(case["elapsed"] or 0, 2)})
        for module in children.get(case["entity_id"], []):
            for kw, row in zip(children.get(module["entity_id"], []), rows[module["name"]]):
                step = {
                    "case": case["name"], "module": module["name"], "keyword": kw["name"], "args": row[1:],
                    "status": kw["status"], "elapsed": round(kw["elapsed"] or 0, 3),
                    "at": round((kw["start_time"] or t_start) - t_start, 3),
                    "t0": kw["start_time"] or 0, "t1": kw["end_time"] or 0,
                    "found_by": found_by(kw["logs"]), "message": kw["message"] or None,
                }
                attach(step, shots, folder, len(out) + 1)
                del step["t0"], step["t1"]
                out.append(step)
    return cases, out


def last_screen(src, folder, name):
    files = sorted(src.glob(f"*{name}*.jpg"))
    return webp(files[-1], folder / f"{name.split('_')[0]}.webp") if files else None


def detected(src):
    files = sorted(src.glob("detected_errors_*.json"))
    return json.loads(files[-1].read_text())["detected"] if files else []


def publish_raw(src, folder, stdout):
    for name in RAW:
        if (src / name).exists():
            shutil.copy(src / name, folder / name)
    for path in src.glob("detected_errors_*.json"):
        shutil.copy(path, folder / "detected_errors.json")
    (folder / "terminal.txt").write_text(stdout)


def record(release, query, work):
    url = f"http://127.0.0.1:{PORT}/birch/{query}"
    proc, started = execute(url, work)
    src = work / "birch-tests" / "execution_output"
    folder = OUT / f"birch-{release}"
    shutil.rmtree(folder, ignore_errors=True)
    folder.mkdir(parents=True)
    cases, run_steps = steps(json.loads((src / "logs.json").read_text()), captures(src), folder)
    publish_raw(src, folder, proc.stdout)
    return {
        "release": release,
        "command": f"BIRCH_URL='{url}' optics execute birch-tests",
        "exit": proc.returncode,
        "date": started.strftime("%Y-%m-%d"),
        "started": started.isoformat(timespec="seconds"),
        "tree": tree(proc.stdout),
        "cases": cases,
        "steps": run_steps,
        "errors": detected(src),
        "end": last_screen(src, folder, "end_of_run"),
        "failure": last_screen(src, folder, "failure_"),
        "files": sorted(p.name for p in folder.iterdir() if not p.name.endswith(".webp")),
    }


def main():
    banner = subprocess.run([str(OPTICS), "--version"], capture_output=True, text=True).stdout.strip()
    server = serve()
    runs = []
    try:
        for release, query in RELEASES:
            with tempfile.TemporaryDirectory() as work:
                runs.append(record(release, query, Path(work)))
                print(f"Birch {release}: exit {runs[-1]['exit']}")
    finally:
        server.shutdown()
    data = {
        "optics": banner.rsplit(" ", 1)[-1],
        "playwright": version("playwright"),
        "platform": f"{SYSTEMS.get(platform.system(), platform.system())} {platform.machine()}",
        "suite": {name: (SUITE / name).read_text() for name in SUITE_FILES},
        "runs": runs,
    }
    (OUT / "birch-run.js").write_text(f"window.BIRCH_RUN = {json.dumps(data, indent=1)};\n")


if __name__ == "__main__":
    main()
