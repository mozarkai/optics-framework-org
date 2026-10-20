---
title: HTTP API reference
summary: Learn the endpoints `optics serve` exposes for starting sessions, running keywords and streaming results.
layout: wide
---

`optics serve` runs a local HTTP server that lets any language or tool drive a device through Optics. You start a session, send keywords one at a time, and read screenshots, UI trees and events back.

For a guided introduction, see [Drive Optics over HTTP](/docs/advanced/http-api). The machine-readable OpenAPI document is at [https://optics-framework.org/openapi.json](https://optics-framework.org/openapi.json).

## Start the server

```text
optics serve [--host HOST] [--port PORT] [--workers N]
```

| Flag | Default | What it does |
|---|---|---|
| `--host` | `127.0.0.1` | The address to listen on. |
| `--port` | `8000` | The port to listen on. |
| `--workers` | `1` | Server processes. Keep it at 1. Sessions live in each process's memory, so with more workers a request can reach a process that doesn't know your session and get a 404. |

The server prints its own log lines and Optics' debug logs to the terminal. Interactive docs are at `http://127.0.0.1:8000/docs` while it runs.

:::warning
The API has no authentication, and it accepts requests from any web origin (CORS is open). Anyone who can reach the port can control your devices. Keep the default `127.0.0.1`, and bind to another address only on a network you trust.
:::

The server doesn't read config.yaml or your project's test files. Each session gets its engines from the request. Sessions also don't write screenshots or page sources to disk, and they log at `DEBUG`.

## Endpoints

| Method | Path | What it does |
|---|---|---|
| `GET` | `/` or `/health` | Checks the server is up. Returns `{"status": "Optics Framework API is running", "version": "1.10.5"}`. |
| `POST` | `/v1/sessions/start` | Starts a session from a [SessionConfig](#sessionconfig) and launches the app. Returns `{"session_id", "driver_id", "status": "created"}`. |
| `POST` | `/v1/sessions/{id}/action` | Runs one keyword from an [ExecuteRequest](#executerequest). Returns `{"execution_id", "status": "SUCCESS", "data"}`. |
| `POST` | `/v1/sessions/{id}/templates` | Uploads an image template: `{"name", "image_base64"}`. The image can be raw base64 or a `data:` URL. Use the name as an element for the rest of the session. Returns `{"name", "status": "ok"}`. |
| `POST` | `/v1/sessions/{id}/api` | Replaces the session's API definitions for `Invoke API`. Send `{"api": {"collections": ...}}`. Returns 204. |
| `GET` | `/v1/sessions/{id}/screenshot` | The current screen. `data.result` is a base64 PNG without a `data:` prefix, or `""` if the capture failed. |
| `GET` | `/v1/sessions/{id}/driver-id` | The driver's own session id in `data.result`. |
| `GET` | `/v1/sessions/{id}/variables` | Every variable in the session: `{"variables": {"name": ["value", ...]}}`. |
| `GET` | `/v1/sessions/{id}/elements` | Elements on screen in `data.result`. Query: `filter_config` (`all`, `interactive`, `buttons`, `inputs`, `images`, `text`; repeatable) and `compact=true`. `compact` ignores the filter. Appium and Playwright only. |
| `GET` | `/v1/sessions/{id}/source` | The UI tree or HTML. `data` is `{"page_source", "timestamp"}` directly, not under `result`. |
| `GET` | `/v1/sessions/{id}/screen_elements` | A screenshot and its elements from the same frame. `data` is `{"screenshot", "elements"}` directly, not under `result`. |
| `GET` | `/v1/sessions/{id}/events` | A stream of keyword events. See [Streams](#streams). |
| `GET` | `/v1/sessions/{id}/workspace/stream` | A stream of screenshots and elements whenever the screen changes. See [Streams](#streams). |
| `GET` | `/v1/keywords` | Every keyword, including flow control, with its description and parameters. |
| `DELETE` | `/v1/sessions/{id}/stop` | Closes the app and ends the session. Returns `{"status": "terminated"}`. |

## SessionConfig

The body of `POST /v1/sessions/start`. Every field is optional, but a session needs a driver and at least one element source.

| Field | Type | What it does |
|---|---|---|
| `driver_sources` | list | The driver. Each item is a name (`"playwright"`) or `{"appium": {"url": ..., "capabilities": {...}}}`. A listed item is enabled unless it says `"enabled": false`. |
| `elements_sources` | list | Element sources by name, for example `["appium_find_element", "appium_page_source", "appium_screenshot"]`. There's no default here, so always list them. |
| `text_detection` | list | OCR engines, for example `["easyocr"]`. |
| `image_detection` | list | Image engines, for example `["templatematch"]`. |
| `project_path` | string | A project folder on the server. Optics loads its image templates. It doesn't load elements or test cases. |
| `api_data` | object | API definitions for `Invoke API`, inline. File paths aren't supported. |
| `ai_self_heal` | boolean | Turns on [AI self-heal](/docs/elements/self-heal). Defaults to `OPTICS_AI_SELF_HEAL`, else off. |
| `llm_provider` | string | The self-heal engine: `gemini`, `openai` or `anthropic`. Defaults to `OPTICS_LLM_PROVIDER`, else `gemini`. |
| `llm_model` | string | The self-heal model. Defaults to `OPTICS_LLM_MODEL`, else `gemini-2.5-flash` for Gemini. `openai` and `anthropic` need one. |
| `strict_element_match` | boolean | Accepts only exact text matches. |
| `appium_url`, `appium_config` | | Deprecated. Use `driver_sources`. |

Engine names are the same as in [config.yaml](/docs/reference/config#engine-lists). LLM credentials never go in the request, and neither does the server the `openai` engine calls. Set them in the server's environment (`OPENAI_BASE_URL` for the server). See [Environment variables](/docs/reference/cli#environment-variables).

## ExecuteRequest

The body of `POST /v1/sessions/{id}/action`.

| Field | Type | What it does |
|---|---|---|
| `mode` | string | Required. Must be `"keyword"`. |
| `keyword` | string | The keyword. `"Press Element"` and `"press_element"` both work. |
| `params` | list or object | Positional values as a list, or named values as an object: `{"element": "text=Sign in"}`. A value can be a list of strings: Optics tries each one until the keyword passes. |
| `template_images` | object | `{"name": "<base64>"}` images available to this request only. |

The session has no elements file, so pass locators directly, or define variables first with keywords such as `Evaluate`.

## Responses

A successful action returns:

```json
{
  "execution_id": "4f1c2b7e-...",
  "status": "SUCCESS",
  "data": { "result": "Trail Runner 2" }
}
```

- When the keyword returns a value that isn't an object, `data` is `{"result": <value>}`.
- When the keyword returns an object, `data` is that object. This is why `/source` and `/screen_elements` put their fields directly in `data`.
- When self-heal recovers a step, `data` is `{"result", "healed": true, "heal_summary", "suggested_steps"}`. `suggested_steps` lists the keywords and parameters that fixed it.

Unlike `optics execute`, the HTTP API returns keyword results, so `Get Text`, `Assert Equality` and `Execute Script` values come back to you.

## Errors

| Status | When | Body |
|---|---|---|
| `400` | `mode` isn't `"keyword"`, a template image isn't valid base64, or `api_data` is invalid. | `{"detail": "<message>"}` |
| `404` | The session doesn't exist. | `{"detail": "Session not found"}` |
| `404` | The keyword doesn't exist. | `{"detail": {"type": "optics:keyword", "code": "Code.E0402", "status": 404, "message": "Keyword ... not found", ...}}` |
| `4xx`/`5xx` | Optics raised a coded error. The status depends on the code. | `{"detail": {"type", "code", "status", "message", "details", "meta"}}` |
| `500` | A keyword failed. | `{"detail": "Execution failed: All fallback attempts failed for keyword '...': ..."}`. The Optics code is inside the text. |
| `500` | The session couldn't start. | `{"detail": "Session creation failed: ..."}` or a coded error. |

- The `code` field can carry a `Code.` prefix, as in `Code.E0402`. It's the same code. See [Error codes](/docs/reference/errors).
- `DELETE /stop` on an unknown session returns 500 with `Session termination failed: 404: Session not found`.
- If closing the app fails during `DELETE /stop`, the session isn't removed. Call it again.

## Streams

Both stream endpoints use server-sent events (SSE): the connection stays open and each event is a `data:` line of JSON.

**`/events`** sends one event when each keyword starts, passes or fails, including the automatic `launch_app` at start, `close_and_terminate_app` at stop, and the GET helpers such as `/screenshot`.

```text
data: {"execution_id": "4f1c...", "status": "RUNNING", "message": "Starting keyword: press_element"}
data: {"execution_id": "4f1c...", "status": "SUCCESS", "message": "Keyword press_element executed successfully"}
```

- Statuses are `RUNNING`, `SUCCESS` and `FAIL`, plus `ERROR` or `CANCELLED` when the stream itself stops.
- After 15 seconds without events, it sends `{"execution_id": "heartbeat", "status": "HEARTBEAT", ...}`.
- Events wait in a queue until someone reads them. With several clients, each event goes to only one of them, so connect one client per session.

**`/workspace/stream`** sends the screen whenever it changes.

| Query | Default | What it does |
|---|---|---|
| `interval_ms` | `2000` | How often to check the screen. Minimum `500`. |
| `include_source` | `false` | Adds the UI tree or HTML as `source`. |
| `filter_config` | | Filters the elements, as for `/elements`. |

Each event is `{"screenshot", "elements", "screenshotFailed"}`, plus `source` when requested. It's sent only when the screen or elements change. Otherwise a `{"type": "heartbeat"}` arrives every 15 seconds, and errors arrive as `{"type": "error", "message"}`. The stream ends when the session ends.

## Walkthrough

This drives the Birch app on an Android emulator. You need an Appium server on port 4723 and the `appium` extra.

:::steps
### Start the server

```shell
$ optics serve --port 8000
```

Leave it running and open a second terminal.

### Start a session

```shell
$ curl -s -X POST http://127.0.0.1:8000/v1/sessions/start \
>   -H 'Content-Type: application/json' \
>   -d '{"driver_sources": [{"appium": {"url": "http://127.0.0.1:4723",
>          "capabilities": {"platformName": "Android", "automationName": "UiAutomator2",
>            "deviceName": "emulator-5554", "appPackage": "com.birch.shop",
>            "appActivity": "com.birch.shop.MainActivity"}}}],
>        "elements_sources": ["appium_find_element", "appium_page_source", "appium_screenshot"],
>        "text_detection": [], "image_detection": []}'
{"session_id":"8d0e7c55-...","driver_id":"...","status":"created"}
```

The app launches. Save the session id:

```shell
$ SID=8d0e7c55-...
```

### Watch events (optional)

In a third terminal:

```shell
$ curl -N http://127.0.0.1:8000/v1/sessions/$SID/events
```

### Run keywords

```shell
$ curl -s -X POST http://127.0.0.1:8000/v1/sessions/$SID/action \
>   -H 'Content-Type: application/json' \
>   -d '{"mode": "keyword", "keyword": "Press Element", "params": [["//*[@resource-id=\"com.birch.shop:id/search\"]", "text=Search"]]}'
$ curl -s -X POST http://127.0.0.1:8000/v1/sessions/$SID/action \
>   -H 'Content-Type: application/json' \
>   -d '{"mode": "keyword", "keyword": "Enter Text", "params": {"element": "text=Search", "text": "Trail Runner 2"}}'
$ curl -s -X POST http://127.0.0.1:8000/v1/sessions/$SID/action \
>   -H 'Content-Type: application/json' \
>   -d '{"mode": "keyword", "keyword": "Assert Presence", "params": ["text=Trail Runner 2", "20"]}'
```

The first call passes a list for `element`, so Optics tries the XPath and then the text.

### Save a screenshot

```shell
$ curl -s http://127.0.0.1:8000/v1/sessions/$SID/screenshot \
>   | python3 -c 'import sys,json,base64; open("screen.png","wb").write(base64.b64decode(json.load(sys.stdin)["data"]["result"]))'
```

### End the session

```shell
$ curl -s -X DELETE http://127.0.0.1:8000/v1/sessions/$SID/stop
{"status":"terminated"}
```

Optics writes `junit_output.xml` for the session to `execution_output/` in the project path, or in the folder where the server runs.
:::

## Limits

- Sessions live in memory. Restarting the server ends them, and `optics live` and `optics mcp` can't see them.
- There's no record or save endpoint. Write the steps you ran into [project files](/docs/reference/files) to replay them with `optics execute`.
- Error detection doesn't run over HTTP.
- With the `ble` driver, the automatic `launch_app` at session start fails, because BLE can't launch apps.
