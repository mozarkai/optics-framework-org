"""Regenerate site/doors-contract.js: one playground step as each Optics interface takes and answers it.

Run it with the Python environment of an optics-framework checkout at the release tag, with
Playwright's Chromium installed. It reads the contracts from the source and records real
replies from one session per interface against scripts/doors-fixture:

    <checkout>/.venv/bin/python scripts/doors.py <checkout> [site/doors-contract.js]
"""

import ast
import asyncio
import functools
import http.server
import inspect
import json
import re
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

checkout = Path(sys.argv[1]).resolve()
target = sys.argv[2] if len(sys.argv) > 2 else "site/doors-contract.js"
sys.path.insert(0, str(checkout))

from fastmcp import Client  # noqa: E402
import optics_framework  # noqa: E402
from optics_framework import Optics  # noqa: E402
from optics_framework.common import expose_api  # noqa: E402
from optics_framework.helper.mcp_server import build_server  # noqa: E402
from optics_framework.helper.version import VERSION  # noqa: E402

KEYWORDS = ("launch_app", "enter_text", "press_element", "assert_presence", "go_back")
HOLE = "{target}"
HOLES = ["{first}", "{last}"]
TEXT = "{text}"
FIXTURE = Path(__file__).with_name("doors-fixture")
UUID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")


def serve() -> str:
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(FIXTURE))
    handler.log_message = lambda *_: None
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{srv.server_address[1]}/index.html"


def robot_names() -> dict[str, str]:
    tree = ast.parse((checkout / "optics_framework" / "optics.py").read_text())
    names = {}
    for fn in ast.walk(tree):
        for deco in getattr(fn, "decorator_list", []):
            if isinstance(deco, ast.Call) and getattr(deco.func, "id", "") == "keyword" and deco.args:
                names[fn.name] = deco.args[0].value
    return names


def keywords() -> dict:
    robot = robot_names()
    out = {}
    for name in KEYWORDS:
        sig = inspect.signature(inspect.unwrap(getattr(Optics, name)))
        params = [[p.name] if p.default is inspect.Parameter.empty else [p.name, p.default] for p in sig.parameters.values() if p.name != "self"]
        out[name] = {"robot": robot[name], "params": params}
    return out


def http_contract() -> dict:
    spec = expose_api.app.openapi()
    paths = [p for p in spec["paths"] if p.endswith("/action") or p.endswith("/start")]
    req = spec["components"]["schemas"]["ExecuteRequest"]
    return {"paths": sorted(paths), "required": req["required"], "fields": sorted(req["properties"]), "mode": expose_api.MODE_KEYWORD, "ok": expose_api.STATUS_SUCCESS, "result": expose_api.KEY_RESULT}


def failure(call) -> str:
    try:
        call()
    except Exception as e:  # noqa: BLE001
        return f"{type(e).__name__}: {e}"
    raise SystemExit("expected a miss")


def python_run(url: str) -> dict:
    config = {
        "driver_sources": [{"playwright": {"enabled": True}}],
        "elements_sources": [{"playwright_find_element": {"enabled": True}}, {"playwright_page_source": {"enabled": True}}],
    }
    with Optics(config) as o:
        o.launch_app(url)
        return {
            "returns": {"enter_text": o.enter_text("//*[@id='email']", "ava@birch.shop"), "press_element": o.press_element("Sign in"), "assert_presence": o.assert_presence("Picked for you", timeout="5"), "go_back": o.go_back()},
            "miss": {"press_element": failure(lambda: o.press_element(HOLE)), "enter_text": failure(lambda: o.enter_text(HOLE, TEXT)), "assert_presence": failure(lambda: o.assert_presence(HOLE, timeout="1"))},
            "miss_list": {"press_element": failure(lambda: o.press_element(HOLES)), "enter_text": failure(lambda: o.enter_text(HOLES, TEXT))},
        }


def send(base: str, method: str, path: str, body: dict | None = None) -> tuple[int, str]:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(base + path, data=data, method=method, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def http_run(url: str) -> dict:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    code = f"import sys; sys.path.insert(0, {str(checkout)!r}); from optics_framework.helper.serve import run_uvicorn_server; run_uvicorn_server(port={port})"
    server = subprocess.Popen([sys.executable, "-c", code], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    base = f"http://127.0.0.1:{port}"
    try:
        for _ in range(100):
            try:
                send(base, "GET", "/health")
                break
            except OSError:
                time.sleep(0.2)
        start = json.loads(send(base, "POST", "/v1/sessions/start", {"driver_sources": ["playwright"], "elements_sources": ["playwright_find_element", "playwright_page_source"]})[1])
        sid = start["session_id"]

        def act(keyword: str, *params: str | list[str]) -> dict:
            status, text = send(base, "POST", f"/v1/sessions/{sid}/action", {"mode": "keyword", "keyword": keyword, "params": list(params)})
            return {"status": status, "body": json.loads(UUID.sub("…", text))}

        act("Launch App", url)
        out = {
            "start": sorted(start),
            "ok": act("Press Element", "Sign in"),
            "present": act("Assert Presence", "Picked for you", "5"),
            "miss": {"press_element": act("Press Element", HOLE), "enter_text": act("Enter Text", HOLE, TEXT), "assert_presence": act("Assert Presence", HOLE, "1")},
            "miss_list": {"press_element": act("Press Element", HOLES), "enter_text": act("Enter Text", HOLES, TEXT)},
        }
        send(base, "DELETE", f"/v1/sessions/{sid}/stop")
        return out
    finally:
        server.terminate()


def head(reply) -> list[str]:
    lines = reply.content[0].text.split("\n")
    return [line for line in lines if not re.match(r"(screen |[~+-] |e\d+ )", line)]


async def mcp_run(url: str) -> dict:
    async with Client(build_server()) as c:
        tools = {t.name: {"params": sorted(t.inputSchema.get("properties", {})), "required": sorted(t.inputSchema.get("required", []))} for t in await c.list_tools()}
        await c.call_tool("start_session", {"driver": "playwright", "app": url})

        async def call(name: str, args: dict) -> list[str]:
            return head(await c.call_tool(name, args, raise_on_error=False))

        out = {
            "tools": tools,
            "replies": {
                "type_xpath": await call("type_text", {"target": "xpath=//*[@id='email']", "text": "ava@birch.shop"}),
                "tap_label": await call("tap", {"target": "Sign in"}),
                "check": await call("check", {"present": ["Picked for you"]}),
                "check_miss": await call("check", {"present": [HOLE], "timeout_s": 1}),
                "tap_miss": await call("tap", {"target": HOLE}),
                "type_miss": await call("type_text", {"target": HOLE, "text": TEXT}),
                "back": await call("press_key", {"key": "back"}),
                "launch_same": await call("launch_app", {}),
            },
        }
        await c.call_tool("terminate_session", {})
        return out


MARK = "doors:"
RUNS = {"python": python_run, "http": http_run, "mcp": lambda url: asyncio.run(mcp_run(url))}


def run(door: str) -> dict:
    """One interface per process: each keeps a process-wide event queue bound to its own loop."""
    with tempfile.TemporaryDirectory() as scratch:
        out = subprocess.run([sys.executable, str(Path(__file__).resolve()), str(checkout), door], cwd=scratch, capture_output=True, text=True, check=True)
    return json.loads(next(line for line in out.stdout.splitlines() if line.startswith(MARK))[len(MARK):])


def main() -> None:
    if not Path(optics_framework.__file__).resolve().is_relative_to(checkout):
        raise SystemExit(f"optics_framework loaded from {optics_framework.__file__}, not from {checkout}")
    if target in RUNS:
        print(MARK + json.dumps(RUNS[target](serve())))
        return
    data = {"version": VERSION, "keywords": keywords(), "http": {**http_contract(), "run": run("http")}, "python": run("python"), "mcp": run("mcp")}
    Path(target).write_text("window.OPTICS_DOORS = " + json.dumps(data, indent=1, ensure_ascii=False) + ";\n")
    print(f"wrote {target} from optics-framework {VERSION}")


main()
