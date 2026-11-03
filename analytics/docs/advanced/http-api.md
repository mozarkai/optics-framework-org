# Run keywords over HTTP

> Start a local Optics server and drive a device or browser from your own service, one keyword per request.

`optics serve` runs Optics as a small web server on your machine. Another program, such as an internal dashboard, a test orchestrator or a script in another language, can then open a session on a device and run keywords on it with plain HTTP requests. Each request runs one keyword and returns its result.

Use the server when something other than Optics decides what to do next. If you want to run a suite, `optics execute` is simpler. If an AI agent is the caller, use [MCP](https://optics-framework.org/docs/create/agent) instead.

### Start the server

```shell
$ optics serve
```

It listens on `http://127.0.0.1:8000`. Check it's up:

```shell
$ curl http://127.0.0.1:8000/health
{"status":"Optics Framework API is running","version":"1.10.5"}
```

Use `--port` to change the port. Interactive API docs are at `http://127.0.0.1:8000/docs` while the server runs.

### Start a session

A session is one connection to a device or browser. Send the same settings you'd put in `config.yaml`:

```shell
$ curl -X POST http://127.0.0.1:8000/v1/sessions/start \
    -H 'Content-Type: application/json' \
    -d '{
      "driver_sources": ["playwright"],
      "elements_sources": ["playwright_find_element", "playwright_page_source", "playwright_screenshot"]
    }'
{"session_id":"23db1bdc-07d8-4cca-bfaa-1e9deaf4b794","driver_id":"PLAYWRIGHT_SESSION","status":"created"}
```

Keep the `session_id`. Starting a session also opens the app, as `Launch App` would. For a phone, pass an Appium entry with its URL and capabilities:

```json
{
  "driver_sources": [{"appium": {"url": "http://127.0.0.1:4723", "capabilities": {
    "platformName": "Android", "automationName": "UiAutomator2",
    "deviceName": "emulator-5554", "appPackage": "com.birch.shop", "appActivity": ".MainActivity"}}}],
  "elements_sources": ["appium_find_element", "appium_page_source", "appium_screenshot"]
}
```

### Run keywords

Send one keyword per request, with its values in order:

```shell
$ curl -X POST http://127.0.0.1:8000/v1/sessions/$SESSION/action \
    -H 'Content-Type: application/json' \
    -d '{"mode": "keyword", "keyword": "Launch Other App", "params": ["https://www.saucedemo.com"]}'
{"execution_id":"ebbdc919-…","status":"SUCCESS","data":{"result":null}}

$ curl -X POST http://127.0.0.1:8000/v1/sessions/$SESSION/action \
    -H 'Content-Type: application/json' \
    -d '{"mode": "keyword", "keyword": "Assert Presence", "params": ["Accepted usernames are"]}'
{"execution_id":"71f5ee34-…","status":"SUCCESS","data":{"result":true}}
```

Keyword names work in any case: `Assert Presence` or `assert_presence`. `params` can also be an object of named values, such as `{"element": "Login", "index": "1"}`. A list inside it gives fallbacks: `{"element": ["//input[@id='login-button']", "Login"]}`.

### Look at the screen

```shell
$ curl http://127.0.0.1:8000/v1/sessions/$SESSION/screenshot \
    | python3 -c 'import sys,json,base64; open("screen.png","wb").write(base64.b64decode(json.load(sys.stdin)["data"]["result"]))'
```

`/elements` lists the elements on screen, and `/source` returns the UI tree.

### Stop the session

```shell
$ curl -X DELETE http://127.0.0.1:8000/v1/sessions/$SESSION/stop
{"status":"terminated"}
```

This closes the app and ends the session.

## Follow a session live

Two endpoints stream updates as [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events):

- `/v1/sessions/{id}/events` sends a message when each keyword starts, passes or fails.
- `/v1/sessions/{id}/workspace/stream` sends a new screenshot and element list whenever the screen changes, which is handy for showing a live view of the device.

```shell
$ curl -N http://127.0.0.1:8000/v1/sessions/$SESSION/events
```

## Keep the server safe

The server has **no authentication**, and it accepts requests from any web page your browser opens. Anyone who can reach it can control the connected device.

- Keep the default `--host 127.0.0.1`, so only your machine can reach it.
- If another machine must call it, put it behind a proxy that adds authentication, on a trusted network.
- Run one worker (the default). Sessions live in the server's memory, so several workers would lose track of each other's sessions.

## See also

- [HTTP API reference](https://optics-framework.org/docs/reference/http-api), with every endpoint and field
- The [OpenAPI document](https://optics-framework.org/openapi.json), for generating a client
- [Let your AI agent build tests](https://optics-framework.org/docs/create/agent)
