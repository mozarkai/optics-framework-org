# HTTP API reference

> Learn the endpoints `optics serve` exposes for starting sessions, running keywords and streaming results.

`optics serve` runs a local HTTP server that lets any language or tool drive a device through Optics. You start a session, send keywords one at a time, and read screenshots, UI trees and events back.

For a guided introduction, see [Drive Optics over HTTP](https://optics-framework.org/docs/advanced/http-api). The machine-readable OpenAPI document is at [https://optics-framework.org/openapi.json](https://optics-framework.org/openapi.json).

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

**Warning:**
The API has no authentication. Anyone who can reach the port can control your devices. Keep the default `127.0.0.1`, or put the server behind a gateway that adds authentication. On another address, the server logs a warning when it starts.

Two more checks keep web pages away from the server:

- **CORS is off.** A web page cannot read the server's replies or send preflighted requests, such as a JSON body, unless you list its origin in `OPTICS_CORS_ORIGINS`, such as `https://dash.example.com`. Separate origins with commas. The value `*` stops the server with E0501. CORS does not stop a simple cross-origin request from reaching the server.
- **The Host header must be a loopback name.** On `127.0.0.1`, a request with another `Host`, such as a domain that points to `127.0.0.1`, gets `421 Misdirected Request`. To allow more names, or to apply the check on any address, list the names in `OPTICS_ALLOWED_HOSTS`. Separate names with commas. Loopback names stay allowed.

In a container, publish the port on the host loopback and set `OPTICS_ALLOWED_HOSTS=localhost`:

```shell
$ docker run -p 127.0.0.1:8000:8000 -e OPTICS_ALLOWED_HOSTS=localhost <image>
```

The server does not read config.yaml or the test files of your project. Each session gets its engines from the request. Sessions do not save screenshots or page sources, and they log at `DEBUG`. Each session writes its other output, such as `junit_output.xml`, to its own temporary folder. The server deletes the folder when the session stops.

## Endpoints

| Method | Path | What it does |
|---|---|---|
| `GET` | `/` or `/health` | Checks the server is up. Returns `{"status": "Optics Framework API is running", "version": "1.11.5"}`. |
| `POST` | `/v1/sessions/start` | Starts a session from a [SessionConfig](#sessionconfig) and launches the app. Returns `{"session_id", "driver_id", "status": "created"}`. |
| `POST` | `/v1/sessions/{id}/action` | Runs one keyword from an [ExecuteRequest](#executerequest). Returns `{"execution_id", "status": "SUCCESS", "data"}`. |
| `POST` | `/v1/sessions/{id}/templates` | Uploads an image template: `{"name", "image_base64"}`. The image can be raw base64 or a `data:` URL. Use the name as an element for the rest of the session. Returns `{"name", "status": "ok"}`. |
| `POST` | `/v1/sessions/{id}/api` | Replaces the session's API definitions for `Invoke API`. Send `{"api": {"collections": ...}}`. Returns 204. |
| `GET` | `/v1/sessions/{id}/screenshot` | The current screen. `data.result` is a base64 PNG without a `data:` prefix, or `""` if the capture failed. |
| `GET` | `/v1/sessions/{id}/driver-id` | The driver's own session id in `data.result`. |
| `GET` | `/v1/sessions/{id}/variables` | Every variable in the session: `{"variables": {"name": ["value", ...]}}`. |
| `GET` | `/v1/sessions/{id}/elements` | Elements on screen in `data.result`. Query: `filter_config` (`all`, `interactive`, `buttons`, `inputs`, `images`, `text`; repeatable) and `compact=true`. `compact` ignores the filter. Appium, Appium web and Playwright only. See [Compact elements](#compact-elements). |
| `GET` | `/v1/sessions/{id}/source` | The UI tree or HTML. `data` is `{"page_source", "timestamp"}` directly, not under `result`. |
| `GET` | `/v1/sessions/{id}/screen_elements` | A screenshot and its elements from the same frame. `data` is `{"screenshot", "elements"}` directly, not under `result`. |
| `GET` | `/v1/sessions/{id}/events` | A stream of keyword events. See [Streams](#streams). |
| `GET` | `/v1/sessions/{id}/workspace/stream` | A stream of screenshots and elements whenever the screen changes. See [Streams](#streams). |
| `GET` | `/v1/keywords` | Every keyword, including flow control. See [Keyword list](#keyword-list). |
| `DELETE` | `/v1/sessions/{id}/stop` | Closes the app and ends the session. Returns `{"status": "terminated"}`. |

### Compact elements

With `compact=true`, each element is one row:

```json
{"i": 1, "label": "Username", "cls": "input", "bounds": [494, 154, 786, 193], "act": ["tap", "input"], "rid": "user-name", "loc": "css=[data-test=\"username\"]"}
```

- `act` lists what the element accepts: `tap`, `long`, `toggle`, `input` or `scroll`. An empty list is read-only text.
- `rid` is the element's id, when it has one.
- `loc` is a locator that matches only this element. Use it as the element of a keyword.
- `offscreen: true` marks a web element that is on the page but scrolled out of view.

### Image templates

`POST /v1/sessions/{id}/templates` stores an image for the rest of the session. A second upload with the same name replaces the first. The server deletes the files when the session ends.

```shell
$ curl -X POST "http://127.0.0.1:8000/v1/sessions/$SID/templates" \
>   -H "Content-Type: application/json" \
>   -d '{"name": "my_button", "image_base64": "<base64-encoded-png>"}'
{"name":"my_button","status":"ok"}
```

Then use the name as the element. You do not send the image again:

```json
{"mode": "keyword", "keyword": "Press Element", "params": {"element": "my_button"}}
```

To use an image for one request only, send it in `template_images` with the same name that `params` uses:

```json
{"mode": "keyword", "keyword": "Press Element", "params": {"element": "my_button"}, "template_images": {"my_button": "<base64-encoded-png>"}}
```

### API definitions for Invoke API

`Invoke API` needs API definitions in the session. Send them as `api_data` in [SessionConfig](#sessionconfig), or later with `POST /v1/sessions/{id}/api`. The body replaces the API data of the session, the same as the `Add API` keyword. It is either `{"api": {...}}` or the same content at the root. It has `collections` and optional `global_defaults`. Each collection has `name`, `base_url`, `global_headers` and `apis`, and each API has `endpoint`, `request` and `expected_result`. See [Call APIs](https://optics-framework.org/docs/advanced/api-calls) for every field.

```bash
curl -X POST "http://127.0.0.1:8000/v1/sessions/$SID/api" \
  -H "Content-Type: application/json" \
  -d '{
    "api": {
      "collections": {
        "auth": {
          "name": "Auth APIs",
          "base_url": "https://api.example.com",
          "apis": {
            "token": {
              "name": "Get Token",
              "endpoint": "/token",
              "request": { "method": "POST", "body": {"user": "x"} },
              "expected_result": { "expected_status": 200, "extract": {"access_token": "access_token"} }
            }
          }
        }
      }
    }
  }'
```

Then run `Invoke API` with `<collection>.<api>`, such as `auth.token`:

```json
{"mode": "keyword", "keyword": "Invoke API", "params": ["auth.token"]}
```

`data` holds the response: `status_code`, `headers`, `body` and `elapsed_ms`. The values that `extract` names go into the session variables, where later keywords can use them and `GET /v1/sessions/{id}/variables` shows them:

```json
{"variables": {"access_token": ["eyJhbGci..."], "otp": ["482913"]}}
```

### Keyword list

Each item of `/v1/keywords` has the keyword's name, slug, description and parameters:

```json
{"keyword": "Get Text", "keyword_slug": "get_text", "description": "Get the text from a specified element. …", "parameters": [{"name": "element", "type": "<class 'str'>", "default": null, "required": true, "variadic": false}, {"name": "index", "type": "<class 'str'>", "default": "0", "required": false, "variadic": false}, …], "returns": true, "deprecated": false}
```

`required` is true for a parameter that has no default. `variadic` is true for a parameter that takes any number of values, such as `args` of `Run Loop`. `returns` is true when the keyword gives back a value. `deprecated` is true for a keyword you must not use in new tests, such as `Press Checkbox`.

## SessionConfig

The body of `POST /v1/sessions/start`. Every field is optional, but a session needs a driver and at least one element source.

| Field | Type | What it does |
|---|---|---|
| `driver_sources` | list | The driver. Each item is a name (`"playwright"`) or `{"appium": {"url": ..., "capabilities": {...}}}`. A listed item is enabled unless it says `"enabled": false`. |
| `elements_sources` | list | Element sources by name, for example `["appium_find_element", "appium_page_source", "appium_screenshot"]`. There's no default here, so always list them. |
| `text_detection` | list | OCR engines, for example `["rapidocr"]`. |
| `image_detection` | list | Image engines, for example `["templatematch"]`. |
| `project_path` | string | Refused with `400` and E0501. Upload templates with `POST /v1/sessions/{id}/templates`. |
| `api_data` | object | API definitions for `Invoke API`, inline. File paths aren't supported. |
| `ai_self_heal` | boolean | Turns on [AI self-heal](https://optics-framework.org/docs/elements/self-heal). Defaults to `OPTICS_AI_SELF_HEAL`, else off. |
| `llm_provider` | string | The self-heal engine: `gemini`, `openai` or `anthropic`. Defaults to `OPTICS_LLM_PROVIDER`, else `gemini`. |
| `llm_model` | string | The self-heal model. Defaults to `OPTICS_LLM_MODEL`, else `gemini-2.5-flash` for Gemini. `openai` and `anthropic` need one. |
| `strict_element_match` | boolean | Accepts only exact text matches. |
| `appium_url`, `appium_config` | | Deprecated. Use `driver_sources`. |

Engine names are the same as in [config.yaml](https://optics-framework.org/docs/reference/config#engine-lists). LLM credentials never go in the request, and neither does the server the `openai` engine calls. Set them in the server's environment (`OPENAI_BASE_URL` for the server). A session cannot set `api_key_env` or the `anthropic` `platform`, so each engine reads its default variables, such as `GEMINI_API_KEY`, `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`, and Claude runs on the Claude API. See [Environment variables](https://optics-framework.org/docs/reference/cli#environment-variables).

The server does not read its own environment or files for a caller. It refuses these values with `400` and `E0501`:

- A `$NAME` or `${NAME}` reference in a driver `url` or in a `capabilities.headers` value. Send the value itself.
- A file path in `capabilities.storage_state`. Send the state as a JSON object.
- `capabilities.user_data_dir`. Set it in a project's config.yaml instead.
- `capabilities.profile`. A browser profile holds the sign-ins of the person who runs the server, so only a local stdio MCP server accepts it.
- `project_path`, and `credentials_path` in any capabilities.
- A `file:` URL, or another URL that opens a local resource of the browser, such as `chrome:`, `view-source:` or `about:` other than `about:blank`. This applies to `Launch App` and to each capability value, including a browser argument such as `--app=<url>`.
- `Read Data` from a file or from `ENV:`. A step can't send rows either: each parameter is a string or a list of strings. Read the data in your client and send the values in the steps.

```terminal
{"detail":{"type":"optics:config","code":"E0501","status":400,"message":"playwright: a browser profile works only through a local stdio MCP server","details":null,"meta":null,"cause":null}}
```

The session log shows only the scheme and host of a URL. It masks header values, `storage_state` and every value with a secret name, such as `token` or `password`.

## ExecuteRequest

The body of `POST /v1/sessions/{id}/action`.

| Field | Type | What it does |
|---|---|---|
| `mode` | string | Required. Must be `"keyword"`. |
| `keyword` | string | The keyword. `"Press Element"` and `"press_element"` both work. |
| `params` | list or object | Positional values as a list, or named values as an object: `{"element": "text=Sign in"}`. Optics puts named values in the order of the keyword's parameters. A value can be a list of strings, such as `[["button_login", "login_btn"], "1"]`: Optics tries each one until the keyword passes. |
| `template_images` | object | `{"name": "<base64>"}` images available to this request only. A value can be raw base64 or a `data:image/png;base64,...` URL. See [Image templates](#image-templates). |
| `test_case` | string | Not used. |

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
| `400` | The request asks the server to read its own environment or files. See below. | A coded error with `E0501`. |
| `404` | The session doesn't exist. | `{"detail": "Session not found"}` |
| `404` | The keyword doesn't exist. | A coded error with `E0402`. |
| `4xx`/`5xx` | A keyword failed with an Optics error. The status comes from the code, for example `404` for `E0201`. | `{"detail": {"type", "code", "status", "message", "details", "meta", "cause"}}` |
| `500` | A keyword failed with an error that has no Optics code. | `{"detail": "Execution failed: <message>"}` |
| `500` | The session couldn't start. | `{"detail": "Session creation failed: ..."}` or a coded error. |

A keyword that does not find its element returns `404`:

```json
{"detail": {"type": "optics:element", "code": "E0201", "status": 404, "message": "No valid strategies found for 'css=#nope' in 'press_element'", "details": null, "meta": null, "cause": "E0201: Element 'css=#nope' not found."}}
```

- `cause` is the error that caused this one, or `null`.
- When you send several values for one parameter, Optics tries the next value only when the element is not found. It tries a maximum of 20 combinations. When each try fails, the message is `All <n> fallback combinations failed for keyword '<keyword>':` and lists the last five tries. The code and status are those of the last try.
- `Read Data` with a file or an `ENV:` path returns `400` with `E0501`.
- The `code` field holds the code alone, such as `E0402`. See [Error codes](https://optics-framework.org/docs/reference/errors).
- `DELETE /stop` on an unknown session returns 500 with `Session termination failed: 404: Session not found`.
- If closing the app fails during `DELETE /stop`, the session isn't removed. Call it again.

**The code reads `Code.E0201` on Python 3.11 and later:**
The server writes the `code` field and the code in `cause` with the enum class name in front: `"code": "Code.E0201"`, `"cause": "Code.E0201: Element 'css=#nope' not found."`. Until the fix ships, remove a leading `Code.` before you compare the code, for example `code.removeprefix("Code.")` in Python.

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

Each event is `{"screenshot", "elements", "screenshotFailed"}`, plus `source` when requested. It's sent only when the screen or elements change. Otherwise a `{"type": "heartbeat", "timestamp": <seconds>}` arrives every 15 seconds, and errors arrive as `{"type": "error", "message"}`. The stream ends when the session ends.

## Walkthrough

This drives the Birch app on an Android emulator. You need an Appium server on port 4723 and the `appium` extra.

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

Optics writes `junit_output.xml` for the session to the temporary folder of the session. The server deletes the folder when the session stops.

## Limits

- Sessions live in memory. `optics live` and `optics mcp` cannot see them. When the server stops, it ends every session and closes its drivers.
- There's no record or save endpoint. Write the steps you ran into [project files](https://optics-framework.org/docs/reference/files) to replay them with `optics execute`.
- Error detection doesn't run over HTTP.
- A `ble` session names the dongle by its `serial`, never by `port`. The `serial` must be a plugged-in airhand dongle, or the session fails with E0501: `ble: no plugged-in airhand dongle has the serial <serial>`.
- A `camera_screenshot` source reads only the camera that the server sets in `WEBCAM_SCREENSHOT_URL`. A `url` or a `camera_index` in the request is refused with E0501. See [Test production devices](https://optics-framework.org/docs/platforms/production).
- With the `ble` driver, the automatic `launch_app` at session start has no app name, so it does nothing and the screen stays as it is. To open an app, send `Launch App` with the name the device shows, such as `Settings`. See [Open apps](https://optics-framework.org/docs/platforms/production#open-apps).
