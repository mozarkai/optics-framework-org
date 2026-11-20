"""Runs optics-framework for optics-framework.org/playground: writes the project, runs it, streams its events to the page."""
import asyncio
import contextlib
import io
import json
import os
import shutil
import sys
import time
from importlib.metadata import version

import js
from pyodide.ffi import can_run_sync, run_sync

from optics_framework.common.events import Event, EventSubscriber, get_event_manager
from optics_framework.common.runner.test_runnner import TestRunner
from optics_framework.helper.execute import DryRunRunner, ExecuteRunner, RunnerArgs

PROJECT = "/home/pyodide/birch-shop"
RUNNERS = {"dry_run": DryRunRunner, "execute": ExecuteRunner}
skipped = 0.0
paced = 0.0  # seconds the page spent showing steps at a human pace


class Stopped(BaseException):
    """The visitor pressed Stop. Not an Exception, so the keyword retry loops let it through."""


def stop_if_asked() -> None:
    if getattr(js.opticsPage, "stopped", False):
        raise Stopped


def sleep(seconds):
    # Without JSPI the page cannot change while Python runs, so a wait only moves the clock on.
    global skipped
    stop_if_asked()
    if can_run_sync():
        run_sync(asyncio.sleep(seconds))
        stop_if_asked()
    else:
        skipped += seconds


def skipping(clock):
    # Pacing is for the viewer, so it is not part of any keyword's time (JUnit, step timings).
    return lambda: clock() + skipped - paced


real_clock = time.perf_counter
time.sleep = sleep
time.time, time.monotonic, time.perf_counter = skipping(time.time), skipping(time.monotonic), skipping(time.perf_counter)
# Event stamps its own time with the time.time it imported, so give it the page's clock.
Event.model_fields["timestamp"].default_factory = time.time
Event.model_rebuild(force=True)
execute_keyword = TestRunner._execute_keyword
dry_run_keyword = TestRunner._dry_run_keyword


def announce(keyword_node) -> None:
    js.opticsPage.step(keyword_node.id, keyword_node.name, json.dumps(keyword_node.params))


async def pause(shown):
    global paced
    start = real_clock()
    try:
        await shown
    finally:
        paced += real_clock() - start


async def paced_keyword(self, keyword_node, *args, **kwargs):
    announce(keyword_node)
    stop_if_asked()
    await pause(js.opticsPage.before())
    try:
        return await execute_keyword(self, keyword_node, *args, **kwargs)
    finally:
        await pause(js.opticsPage.after())


def announced_dry_run(self, keyword_node, *args, **kwargs):
    announce(keyword_node)
    return dry_run_keyword(self, keyword_node, *args, **kwargs)


TestRunner._execute_keyword = paced_keyword
TestRunner._dry_run_keyword = announced_dry_run


class PageEvents(EventSubscriber):
    async def on_event(self, event):
        js.opticsPage.event(event.model_dump_json())


def about() -> str:
    return json.dumps({"optics": version("optics-framework"), "python": sys.version.split()[0]})


def write_project(files: dict) -> None:
    shutil.rmtree(PROJECT, ignore_errors=True)
    os.makedirs(PROJECT)
    for name, text in files.items():
        with open(os.path.join(PROJECT, os.path.basename(name)), "w", encoding="utf-8") as f:
            f.write(text)


def output(name: str) -> str:
    path = os.path.join(PROJECT, "output", name)
    if not os.path.exists(path):
        return ""
    with open(path, encoding="utf-8") as f:
        return f.read()


async def run(mode: str, files_json: str) -> str:
    write_project(json.loads(files_json))
    stderr = io.StringIO()
    try:
        with contextlib.redirect_stderr(stderr):
            runner = RUNNERS[mode](RunnerArgs(folder_path=PROJECT, use_printer=False))
            get_event_manager(runner.session_id).subscribe("page", PageEvents())
            results = await runner.execute()
    except Stopped:
        return json.dumps({"stopped": True})
    except (Exception, SystemExit) as e:
        return json.dumps({"error": str(e) if isinstance(e, Exception) else stderr.getvalue().strip(), "code": getattr(e, "code", None) and str(e.code)})
    return json.dumps({
        "results": [r.model_dump() for r in (results or {}).values()],
        "junit": output("junit_output.xml"),
    })
