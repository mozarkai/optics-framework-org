---
title: MCP server reference
summary: Tools and resources that `optics mcp` gives your AI agent.
layout: wide
---

`optics mcp` runs a Model Context Protocol (MCP) server, a standard way for AI agents such as Claude, Cursor or VS Code to call outside tools. Your agent starts a session on a device or browser, reads the screen as a list of rows, and acts on those rows by reference. Each action returns what changed on the screen.

Every reply is one text block, plus a JPEG when `observe` takes a screenshot. The core tools send no `structuredContent` and have no output schema, so a client or script reads the text.

For a guided walkthrough, see [Build tests with an AI agent](/docs/create/agent).

## Install

The server needs the `mcp` extra. The [install scripts](/docs/reference/cli#install-scripts) always include it. With pip, add it yourself: `optics setup` can't install it, and the `all` bundle doesn't include it.

```shell
$ pip install "optics-framework[mcp]"
```

The extra installs fastmcp 3.4.4 or newer.

You also need the extras for your driver, for example `appium` or `playwright`. See [Engines and extras](/docs/reference/engines).

## Start the server

```text
optics mcp [--transport stdio|http] [--host HOST] [--port PORT] [--toolset core|full]
optics mcp install [--toolset core|full]
```

| Flag | Default | What it does |
|---|---|---|
| `--transport` | `stdio` | `stdio`: your agent starts the server and talks to it directly. `http`: the server listens at `http://<host>:<port>/mcp`. |
| `--host` | `127.0.0.1` | The address to listen on. `http` only. |
| `--port` | `8090` | The port to listen on. `http` only. |
| `--toolset` | `OPTICS_MCP_TOOLSET`, else `core` | `core`: the 11 tools below. `full`: also one tool for each keyword. See [Full toolset](#full-toolset). |

We recommend `stdio` for an agent on your own machine. Use `http` when the server runs in a container or on another machine.

Over `http`, each session belongs to the client connection that started it. Another client cannot see the session or use its id. The server has no authentication, so keep it on `127.0.0.1` or behind a gateway that adds authentication. On another address, it logs a warning when it starts. Set `OPTICS_ALLOWED_HOSTS` to the host names that clients use, such as `localhost` in a container. A request with another `Host` is refused.

An `http` server also refuses what makes it read its own files: `project_path`, `credentials_path`, `file:` URLs and `Read Data` from a file.

## Connect your agent

`optics mcp install` registers the server with Claude Code for all your folders. The installer adds `~/.optics/bin` to `PATH` only in new terminals, so give the full path the first time:

```shell
$ ~/.optics/bin/optics mcp install
Registered optics for all folders: /Users/ana/.optics/venv/bin/optics mcp
A client loads its MCP servers only when a session starts: start a new session, then check that the optics tools are listed.
In Claude Code, `claude --continue` keeps the conversation, and /mcp shows optics as connected.
```

The command does these steps:

- It adds a user entry named `optics` with the absolute path of this install, so the server starts from any folder without `PATH`. If a user entry is there, it replaces it.
- It removes the `optics` entry in local scope for the current folder, because a local entry wins over the user entry. A plain `claude mcp add` makes a local entry.
- It names the entries that still win and does not delete them: an `optics` server in the `.mcp.json` of this folder, and the local entries of other folders.
- With `--toolset full`, it registers `optics mcp --toolset full`. It refuses `--transport`, because it registers a `stdio` server.

When `claude` is not on `PATH`, the command changes nothing. It prints the config for another client, with the absolute command:

```text
Claude Code is not on PATH. Add this server to your MCP client's config:

{
  "mcpServers": {
    "optics": {
      "command": "/Users/ana/.optics/venv/bin/optics",
      "args": [
        "mcp"
      ]
    }
  }
}
```

Most other agents read a JSON file that lists MCP servers. For Claude Desktop, the file is `claude_desktop_config.json`. Claude Code also reads `.mcp.json` in your project. Other agents use the same shape.

```json title=".mcp.json"
{
  "mcpServers": {
    "optics": {
      "command": "optics",
      "args": ["mcp"]
    }
  }
}
```

If your agent cannot find `optics`, use the full path that `optics mcp install` prints. Agents do not expand `~` in a JSON file.

An agent reads its MCP servers when a session starts. After you add the server, start a new session, then make sure that the optics tools, such as `start_session`, are in its tool list. An agent that does not have the tools yet can pick another tool for the job, such as AppleScript for a desktop app.

For the `http` transport, point the agent at the URL instead:

```json title=".mcp.json"
{
  "mcpServers": {
    "optics": {
      "url": "http://127.0.0.1:8090/mcp"
    }
  }
}
```

When the server runs in Docker and Appium runs on your machine, pass `url: "http://host.docker.internal:4723"` to `start_session`.

## Screen rows

The server shows the screen as rows. Each row has a ref, such as `e7`, that the agent uses as a target:

```text
e1 h1 "Welcome back"
e2 input "Email" [tap,input] #email
e3 input "Password" [tap,input] #password
e4 button "Sign in" [tap] #login
```

- The quoted text is on the screen. The `#id` is not.
- `[...]` lists what the element accepts: `tap`, `long`, `toggle`, `input` or `scroll`. A row without it is read-only text.
- A row shows what a control holds: `= "text"` for a field or a selected option, `(checked)` or `(unchecked)` for a checkbox, radio button or switch, and `(filled)` for a password field. A password is never shown.
- `in "x"` after a row names its group, when more than one row has the same label.
- A web row marked `(off-screen)` is on the page but scrolled out of view. A tap scrolls it into view.
- A ref stays with its control when the text around it changes. A ref never moves to a different element. A ref that is gone from the screen gives a `stale_ref` error with the current rows.

A tap on a ref uses a locator that matches only that element. The agent can also pass an exact label or a locator (`css=`, `xpath=`, `text=`) as the target.

## Core tools

The default toolset has 11 tools. Every tool except `start_session` takes `session_id`. You can leave it out when one session is open. When more than one session is open, the call fails with `session_required` and lists the ids.

| Tool | Parameters (defaults) | What it does |
|---|---|---|
| `start_session` | See [start_session](#start-session) | Starts a session. With `app`, it also opens the app or URL and returns the first screen. |
| `terminate_session` | none | Waits for a running action, up to `OPTICS_MCP_CALL_TIMEOUT_S`, then ends the session and closes the driver. The steps stay readable. See [Steps after a session ends](#steps-after-a-session-ends). |
| `observe` | `query` (""), `screenshot` (false), `max_rows` (80, 1–300) | Lists the rows. `query` keeps the rows whose text, name, id or role holds the text, or the one row of a ref. `screenshot` adds a JPEG of at most 1024 px, and each row ends with its box in that image, such as `@479,592,545,606`. |
| `tap` | `target`, `repeat` (1, 1–20) | Runs `press_element`. Refuses a row that has no `tap`, `long`, `toggle` or `input`. |
| `type_text` | `target`, `text`, `clear_first` (false) | Runs `enter_text`, after `clear_element_text` when `clear_first` is true. Refuses a row without `input`. |
| `scroll` | `direction` (`up`, `down`, `left`, `right`), `until` (""), `timeout_s` (10, 1–60) | Runs `scroll`. With `until`, runs `scroll_until_element_appears` (up and down only). |
| `press_key` | `key` | `back` runs `go_back` on any driver. Another value runs `press_keycode`: a key name such as `Enter`, `Escape`, `esc` or `ArrowDown`, or an Android KeyEvent number such as `66`. On the web, case and a `KEYCODE_` prefix do not matter. A ref is refused with a hint to use `tap`. |
| `launch_app` | `app` ("") | Opens an app id or a URL. Empty opens the configured app. |
| `batch` | `steps` (1–12) | Runs the steps in order on one screen, such as a form, and stops at the first that fails. A step is `{"tool": "tap", "target"}`, `{"tool": "type_text", "target", "text"}` or `{"tool": "press_key", "key"}`. `expect_present` and `expect_absent` check the screen after the last step. See [batch](#batch). |
| `check` | `present` ([]), `absent` ([]), `timeout_s` (5, 0–60) | Waits for the texts or refs, then gives a verdict. See [check](#check). |
| `run_keyword` | `keyword`, `params` ({}) | Runs any other keyword. See [run_keyword](#run-keyword). |

The tools that act (`tap`, `type_text`, `scroll`, `press_key`, `launch_app`, `batch` and `run_keyword`) also take these parameters:

| Parameter | Default | What it does |
|---|---|---|
| `expect_present` | `[]` | Texts or refs that must be on the screen after the action. |
| `expect_absent` | `[]` | Texts or refs that must be gone after the action. |

### start_session

| Parameter | Default | What it does |
|---|---|---|
| `driver` | `appium` | `appium`, `selenium`, `playwright` or `ble`. |
| `app` | "" | An app id or URL to open after the session starts. |
| `url` | Appium: `http://127.0.0.1:4723` | The driver's server URL. For Playwright, the endpoint of a [remote browser](/docs/platforms/web#use-a-remote-browser). |
| `capabilities` | `{}` | The driver's capabilities, as in [config.yaml](/docs/reference/config#examples-by-platform). For a phone-sized page, add `"device": "Pixel 7"`. See [Emulate a phone](/docs/platforms/web#emulate-a-phone). For a signed-in web session, add `profile`. See [Sign in with a browser profile](#sign-in-with-a-browser-profile). |
| `elements_sources` | Every source of the driver | For Appium: `appium_find_element`, `appium_page_source`, `appium_web` and `appium_screenshot`. With `[]`, the session starts without the screen. See [Sessions without a screen source](#sessions-without-a-screen-source). |
| `text_detection` | none, or the camera default | OCR engines, for example `["rapidocr"]`. A session that reads a camera gets the fastest installed engine: `apple_vision`, then `rapidocr`, `easyocr` and `pytesseract`. `[]` turns OCR off. |
| `image_detection` | none, or the camera default | Image engines, for example `["templatematch"]`. A session that reads a camera gets `templatematch`. |
| `project_path` | "" | A project folder. Optics loads its image templates. It doesn't load elements or test cases. `stdio` only: an `http` server refuses it with E0501. |
| `ai_self_heal` | `OPTICS_AI_SELF_HEAL`, else off | Turns on [AI self-heal](/docs/elements/self-heal). |
| `llm_provider` | `OPTICS_LLM_PROVIDER`, else `gemini` | The LLM engine for self-heal: `gemini`, `openai` or `anthropic`. |
| `llm_model` | `OPTICS_LLM_MODEL`, else `gemini-2.5-flash` for Gemini | The model for self-heal. `openai` and `anthropic` need one. |
| `strict_element_match` | false | Accepts only exact text matches. |

The reply starts with the session id and the driver. Over `http`, the first line also gives the idle lease, such as `· idle lease 900 s`. When the driver does not support some keywords, the next line names them. With `app`, the reply then opens the app and shows the first screen. This is the reply to `{"driver": "playwright", "app": "https://example.com", "capabilities": {"headless": true}}`:

```text
session 0b7ea260-c3b1-4dd9-b724-beb9790b844b (playwright)
run_keyword cannot run here: force_terminate_app
launch_app "https://example.com" -> ok · verified: unknown (add expect_present/expect_absent to verify)
screen b5dfb4 · 7 rows
e1 p "This domain is for use in documentation examples without needing permission. Thi…"
…
e7 a "Learn more" [tap]
```

Without `app`, the reply shows the screen that is there.

The server refuses a `${NAME}` reference in `url` or in a `capabilities.headers` value, because it does not read its own environment for a caller. It also refuses `capabilities.storage_state` as a file path. Send the state as a JSON object. Both give `E0501`.

The first session against a remote device farm can take 30 to 60 seconds to start.

For a desktop app, give the app and the OS. The session starts the app. On macOS, it attaches to the app if the app runs:

```json
{
  "driver": "appium",
  "url": "http://127.0.0.1:4723",
  "app": "com.apple.TextEdit",
  "capabilities": {"platformName": "Mac", "automationName": "Xa11y"}
}
```

`app` is an app name, a bundle id or an `.app` path on macOS, and an executable on Linux and Windows. On a desktop, `press_key` takes a key combination such as `primary+s`, and `launch_app` opens another app in the same session. See [Test desktop apps](/docs/platforms/desktop).

### Sessions without a screen source

The `ble` driver has no element source of its own. When you leave out `elements_sources`, the session reads the server's camera if the server sets `WEBCAM_SCREENSHOT_URL`. A `camera_screenshot` that you name in `elements_sources` gets the same setup:

- The camera picture has the size of `capabilities.frame` when it has both `width` and `height`. A side outside 1 to 8192 stops `start_session` with a validation error.
- The session gets the fastest installed OCR engine and `templatematch`, unless you pass `text_detection` or `image_detection`.

```json
{
  "driver": "ble",
  "capabilities": {"platform": "android", "frame": {"width": 1080, "height": 2400}, "serial": "<dongle serial>"},
  "elements_sources": ["camera_screenshot"]
}
```

A session that cannot list rows still starts. The reply says what it lacks, in place of the first screen:

| Reply line | Cause |
|---|---|
| `No screen source: position and key keywords run; observe and check need a camera.` | The session has no element source, for example with `elements_sources: []`. |
| `No OCR engine: observe and check cannot list a camera's rows; pass text_detection to read them.` | The camera has no OCR engine, for example with `text_detection: []`. |

When the rows come from OCR, each row is a text that the OCR engine reads, such as `e7 Text "Settings" [tap]`. OCR cannot tell a button from a label, so every row offers only `tap`. To type, tap the field, then call `run_keyword` with `enter_text_using_keyboard` and `{"text_input": "..."}`. A row keeps its ref while its letters and digits stay the same, so a camera frame that moves a little does not give new refs. A tap on an OCR row is found by OCR, so `verified` stays `unknown`. Read the `check` lines instead.

An `http` server checks more, because the caller is on another machine. Each refusal is `E0501`:

- A `ble` session names the dongle by its `serial`, never by `port`.
- The `serial` must be a plugged-in airhand dongle. Another serial fails with `ble: no plugged-in airhand dongle has the serial <serial>`. If airhand cannot list the dongles, the session does not start.
- A `camera_screenshot` reads only the camera that the server sets in `WEBCAM_SCREENSHOT_URL`. A `url` or a `camera_index` from the caller is refused.

See [Test production devices](/docs/platforms/production) for the dongle and the camera.

### Sign in with a browser profile

A web flow that needs a sign-in can start with the sign-ins of a local Chrome or Edge profile. The agent reads the `optics://browser-profiles` resource and shows the list to you. Each entry has a `channel`, a `directory`, a `name` and the `email` of the account:

```json
[{"channel": "chrome", "directory": "Default", "name": "Work", "email": "me@example.com"}]
```

After you choose a profile, the agent passes its `directory`, `name` or `email` as `capabilities.profile`:

```json
{
  "driver": "playwright",
  "capabilities": {"profile": "me@example.com"},
  "app": "https://app.example.com"
}
```

The browser starts with the sign-ins of that profile. If you choose no profile, the agent asks you for the credentials and types them with `type_text`. A `profile` that matches none, or more than one, fails with `E0501` and lists the profiles. Add `channel` (`chrome`, `chrome-beta` or `msedge`) to choose between browsers.

A profile holds the sign-ins of the person who runs the server. For this reason only a `stdio` server lists and accepts profiles. The `http` transport and `optics serve` refuse `profile`. Every API session refuses `user_data_dir`. Set both in the `config.yaml` of a project instead. See [Start signed in with a browser profile](/docs/platforms/web#start-signed-in-with-a-browser-profile) for what a profile carries over.

### Action replies

Each tool that acts replies with one head line, the check lines, then the screen:

```text
tap e7 "Learn more" -> ok (Text) · verified: pass
check present "Example Domains": met
screen 47fb7e · new screen
e8 a "Homepage" [tap]
…
e14 h1 "Example Domains" #example-domains
…
```

That is the reply to `tap(target="e7", expect_present=["Example Domains"])` on example.com.

- `ok` means only that the keyword ran. The word in brackets is the strategy that found the element.
- `verified` is `pass`, `fail` or `unknown`. It is `pass` only when every expectation is met and the action caused it. Without `expect_present` or `expect_absent`, it stays `unknown`, and the head line ends with `(add expect_present/expect_absent to verify)`.
- An action waits up to 5 seconds for `expect_present` and `expect_absent` before it judges them. A page that loads after a redirect can still pass.
- An `expect_present` that is the value the action typed, and that is not in the rows, is not checked, because the rows often do not hold a typed value. Its check line says `not checked, a typed value is not in the rows`.
- `note:` lines tell the agent what to trust less. For example, a `scroll` is `ok` even when nothing moved, and a row with no unique locator is found by its label.
- `run_keyword` adds a `result:` line with the keyword's return value, cut at 2,000 characters. A line break shows as `\n`.

The screen line is one of these:

| Screen line | What follows |
|---|---|
| `screen 47fb7e · new screen` | Every row. |
| `screen 171915 · changed (+0 -0 ~1)` | The changed rows (`~`) first, then at most 40 added rows (`+`), controls first, and at most 10 removed rows (`-`). A line counts the rest. |
| `screen b5dfb4 · unchanged` | Nothing. |

A typed value shows as a changed row, so the agent does not need to read the field back:

```text
type_text e2 "Email" -> ok (Text) · verified: unknown (add expect_present/expect_absent to verify)
screen 171915 · changed (+0 -0 ~1)
~ e2 input "Email" [tap,input] = "ava@birch.shop" #email
```

After an action, the server reads the screen until it stops changing. A screen with no rows counts as a page that is still loading, so the server reads it again for up to 6 seconds. A keyword that only reads, and `execute_script` when the screen stays the same, are read once. The reply text is cut at 8,000 characters.

When self-heal recovers a keyword that `run_keyword` ran, the `result:` line holds the heal report, with `result`, `healed`, `heal_summary` and `suggested_steps`, so your agent can write the extra steps into the test. The other tools do not show the heal report.

### batch

`batch` runs up to 12 `tap`, `type_text` and `press_key` steps in one call. A `press_key` step takes `key`, as the `press_key` tool does. The reply has one head line for each step, then the change from before the first step:

```json
{"steps": [{"tool": "type_text", "target": "e3", "text": "hunter22"}, {"tool": "press_key", "key": "Enter"}], "expect_present": ["Picked for you"]}
```

```text
type_text e3 "Password" -> ok (Text) · verified: unknown (add expect_present/expect_absent to verify)
press_key Enter -> ok · verified: pass
check present "Picked for you": met
screen 622118 · new screen
e5 h1 "Picked for you"
e6 input "Search Birch" [tap,input] #search
e7 a "Trail Runner 2" [tap]
```

The expectations judge the last step only. At the first step that fails, the batch stops, and the reply ends with `stopped: <n> of <total> steps did not pass` and every row.

### check

`check` reads the screen until every text in `present` shows and every text in `absent` is gone, or until `timeout_s` passes. It gives a verdict, not an error:

```text
check -> passed
present "Learn more": met
absent "Example Domains": met
```

When a check does not pass, the reply starts with `check -> not passed`, gives the line of each text, and lists the rows. A locator in `present`, such as `css=.title`, gets one look with `assert_presence`. `absent` cannot hold a locator.

### run_keyword

`run_keyword` runs a keyword that has no tool of its own, for example `assert_text`, `select_dropdown_option` or `get_text`. `params` takes the keyword's parameters by name, as strings. An element parameter can be a ref:

```json
{"keyword": "get_text", "params": {"element": "Picked for you"}}
```

```text
run_keyword get_text -> ok (Text) · verified: unknown (add expect_present/expect_absent to verify)
result: Picked for you
screen 622118 · unchanged
```

The `optics://keywords` resource lists every keyword that `run_keyword` accepts. Flow control, deprecated keywords and the coordinate keywords are not in it. With one session open, it also leaves out the keywords that the session's driver does not support. `start_session` names them, and `run_keyword` refuses them as `unsupported`. When a call has one parameter name that the keyword does not have, and the keyword still needs exactly one parameter, `run_keyword` uses the value for that parameter. Optics caps a `timeout` parameter at 60 seconds.

## Full toolset

Start the server with `--toolset full`, or set `OPTICS_MCP_TOOLSET=full`, to add one tool for each app, action and verification keyword. The tool name is the keyword in snake_case, such as `press_element`, `enter_text`, `assert_text` or `go_back`. Each tool takes `session_id` plus the keyword's parameters, all as strings. An element parameter can be a ref. See [Keywords](/docs/reference/keywords/) for each parameter.

The full toolset also has:

- The 11 core tools, but the keyword tools `launch_app` and `scroll` replace the core tools of the same name.
- `screenshot`, which returns the screen as a PNG image.
- Deprecated keywords, `swipe`, `get_interactive_elements`, `initialise_setup`, `start_appium_session` and `get_driver_session_id`.

A keyword tool returns the keyword's result, and an error raises with `[E0201] message`. It does not return the screen.

## Coordinate taps

Agents that guess coordinates write fragile tests, so the server hides the coordinate keywords by default. Set `OPTICS_MCP_ALLOW_COORDINATE_TAPS=1` before you start the server to allow them:

- In the core toolset, `run_keyword` and `optics://keywords` then accept `press_by_coordinates`, `press_by_percentage` and `swipe`.
- In the full toolset, the `press_by_coordinates` and `press_by_percentage` tools appear.

Self-heal can still tap by percentage when it recovers a step.

## Resources

Resources are read-only data your agent can fetch by URI.

| URI | Type | What it returns |
|---|---|---|
| `optics://keywords` | JSON | The keywords `run_keyword` accepts, as `{keyword, params, about}`. With one session open, only the keywords its driver supports. |
| `optics://project-format` | Markdown | How to write a CSV project: the files, columns, `${name}` variables, secrets and flow-control keywords. |
| `optics://browser-profiles` | JSON | The Chrome and Edge profiles on the machine that runs the server, as `{channel, directory, name, email}`. Use one as `capabilities.profile`. |
| `optics://session/{session_id}/screenshot` | PNG | The current screen. |
| `optics://session/{session_id}/source` | JSON | `{"page_source", "timestamp"}`: the UI tree or HTML. |
| `optics://session/{session_id}/elements` | JSON | The elements on the screen as `{i, label, cls, bounds, act, rid, loc, offscreen}`. Appium, Appium web and Playwright only. It has no refs. |
| `optics://session/{session_id}/screen_elements` | JSON | `{"screenshot", "elements"}`: a base64 PNG and the elements in the same frame. |
| `optics://session/{session_id}/steps` | JSON | The steps the session ran, with the module and element CSV rows to replay them. It stays readable after the session ends. |

There are no MCP prompts.

### The steps resource

`/steps` returns `{"steps", "modules_csv", "elements_csv", "notes"}`. `steps` lists each call as `{"n", "verb", "keyword", "ok", "verified"}`. Each step that passed is a row in the module `recorded`, and each element it used is a row in the elements CSV. A value typed into a secret field becomes its own element, written as `<redacted>`. These rows come from a sign-in with `type_text`, a `batch` and `run_keyword`:

```csv title="modules_csv"
module_name,module_step,param_1,param_2
recorded,Launch App,http://127.0.0.1:50369/index.html
recorded,Enter Text,${email_input},ava@birch.shop
recorded,Enter Text,${password_input},${password_value}
recorded,Press Keycode,Enter
recorded,Get Text,Picked for you
```

```csv title="elements_csv"
Element_Name,Element_ID,Element_ID_2
email_input,css=#email,Email
password_input,css=#password
password_value,<redacted>
```

`notes` says what to do before the suite can run, for example: `replace <redacted> for password_value before running: write it as @:value or set it with Read Data,${password_value},ENV:NAME`. A passed `check` is recorded as `Assert Presence`. An `absent` check has no keyword, so `notes` says `absent checks are not recordable as keywords`. See [Hide sensitive values](/docs/advanced/variables#hide-sensitive-values).

### Steps after a session ends

A suite is often written after the app is closed, so the server keeps the steps of an ended session for the client that started it. This is true for `terminate_session`, the idle lease and a lost driver. The reply to `terminate_session` gives the address:

```text
session 0b7ea260-c3b1-4dd9-b724-beb9790b844b terminated. Its 7 recorded steps are at optics://session/0b7ea260-c3b1-4dd9-b724-beb9790b844b/steps.
```

A later call with that `session_id` fails with `unknown_session` and tells the agent the same thing:

```text
Session '0b7ea260-c3b1-4dd9-b724-beb9790b844b' has ended. It was ended by terminate_session. Its 7 recorded steps are at optics://session/0b7ea260-c3b1-4dd9-b724-beb9790b844b/steps.
Next: Start a session.
```

- The server keeps the steps of the last 64 ended sessions in memory.
- A `stdio` server also writes the steps of each session to `$OPTICS_HOME/mcp/steps/<session id>.json` (`~/.optics/mcp/steps/` by default) after each call and when it stops. Only your user can read the file. A new server reads the file, so the steps are there after a restart. Secret values stay `<redacted>`. Files older than 7 days are deleted.
- An `http` server keeps the steps in memory only.

## Environment variables

Set these in the environment that starts `optics mcp`. In a JSON client config, add an `env` object next to `command`.

| Variable | Default | What it does |
|---|---|---|
| `OPTICS_MCP_TOOLSET` | `core` | `core` or `full`. The `--toolset` flag wins. |
| `OPTICS_MCP_SESSION_IDLE_S` | `900` | `http` only. A session without a call for this many seconds ends at the next call of another client. A `stdio` server never ends its client's session for this. `0` turns it off. |
| `OPTICS_HOME` | `~/.optics` | Where a `stdio` server writes the steps of each session, in `mcp/steps/`. |
| `OPTICS_MCP_CALL_TIMEOUT_S` | `100` | The longest time one call can take. After it, the call returns a `timeout` error, and the session stays `busy` until the driver call ends. |
| `OPTICS_ALLOWED_HOSTS` | | `http` only. Host names that the server answers in addition to loopback names, separated by commas. |
| `OPTICS_MCP_ALLOW_COORDINATE_TAPS` | off | `1`, `true`, `yes` or `on` allows the coordinate keywords. See [Coordinate taps](#coordinate-taps). |
| `OPTICS_AI_SELF_HEAL` | off | `1`, `true`, `yes` or `on` turns self-heal on for every session unless `start_session` says otherwise. |
| `OPTICS_LLM_PROVIDER` | `gemini` | The default LLM engine: `gemini`, `openai` or `anthropic`. |
| `OPTICS_LLM_MODEL` | | The default model. `openai` and `anthropic` need one. |
| `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` | | The engine's key. Keys never travel in a tool call. A session cannot set `api_key_env`, so each engine reads its default variables. For Gemini on Vertex AI, see [llm_models](/docs/reference/config#llm-models). Claude runs only on the Claude API here, not on Bedrock or Vertex AI. |
| `OPENAI_BASE_URL` | | The server the `openai` engine calls, such as OpenRouter or a local Ollama. Only the operator sets it; a session cannot. The key comes from `OPENAI_API_KEY`. |

## Typical agent loop

:::steps
### Start a session
Call `start_session` with the driver and the app, for example `driver: "playwright"`, `app: "https://example.com"`. For a phone, add `url` and `capabilities`, such as `{"platformName": "Android", "appPackage": "com.birch.shop", ...}`. The reply shows the first screen.

### Act on refs
Call `tap`, `type_text` and the other tools with a ref from the rows, for example `tap(target="e7", expect_present=["Example Domains"])`. Each reply shows what changed, so you do not need to call `observe` after each action. Use `batch` for a form. Use `observe` for a `query`, a screenshot or the full list.

### Check the result
Call `check` with the texts that prove the flow worked.

### End the session
Call `terminate_session`. The reply gives the address of the steps.

### Save the run as a test
Read `optics://session/{session_id}/steps` and `optics://project-format`. Write the CSV files and a config.yaml, replace each `<redacted>` value, then run `optics execute <folder>`.
:::

## Limits

- **No flow control.** `Run Loop`, `Condition`, `Evaluate`, `Read Data`, `Invoke API` and the other flow-control keywords are not tools. Your agent can still write them into CSV modules for `optics execute`.
- **No save tool.** There are no tools to record, save, replay, find devices or run doctor. The agent writes project files from the steps resource.
- **Sessions are not shared.** Sessions live in the server's memory. `optics serve` and `optics live` cannot see them. All sessions end when the server stops. On `stdio`, their steps stay readable. See [Steps after a session ends](#steps-after-a-session-ends).
- **Images come from a project.** There is no upload tool. On `stdio`, pass `project_path` to use template images. An `http` server has no template images.
- **Selenium has no rows.** The tools run keywords on Selenium, but `verified` stays `unknown` and `observe` fails. Read `/source` instead.

## Errors

A core tool does not raise. A failed call returns an error result with the code, a `Next:` line, and the current rows:

```text
tap "Sign in" -> FAIL · verified: fail
[E0201] not found: tried Sign in.
Next: Pick a ref from the current screen.
screen b5dfb4 · 7 rows
e1 p "This domain is for use in documentation examples without needing permission. Thi…"
…
e7 a "Learn more" [tap]
```

The result has `isError: true`. An error without a code, such as a bad ref, has no `[E…]` part. For `invalid_params`, `unsupported` and `other`, the `Next:` line ends with a link to the keyword reference or the error codes page. See [Error codes](/docs/reference/errors).

An `observe` query that matches no row is not an error. The reply gives the number of rows it searched, so the agent can tell an empty screen from a missed search:

```text
screen b5dfb4 · no row of 7 holds "Sign in"
```

| Kind | When |
|---|---|
| `not_found` | No strategy found the element. |
| `stale_ref` | The ref is not on the current screen. |
| `unknown_ref` | No row has that ref. |
| `ambiguous` | The target matches more than one row. |
| `no_locator` | The row has no locator that matches only it. |
| `invalid_params` | A parameter is missing or wrong, such as `type_text` on a row without `input`. The reply shows an example call. |
| `silent_failure` | The keyword reported an error but did not fail (`E0401` or `E0405`). The message reads `[E0401] <keyword> reported an error: ...`. Read the screen before you continue. |
| `unsupported` | The platform does not support the keyword. |
| `loop` | The same action ran 3 times in a row without progress. The fourth try does not run. |
| `timeout` | The call took longer than `OPTICS_MCP_CALL_TIMEOUT_S`. |
| `busy` | An earlier call on the session still runs. |
| `session_lost` | The driver session ended. Start a new session. |
| `unknown_session` | No such session, or none is open. When the session ended, the message says how and where its steps are. |
| `session_required` | More than one session is open, and `session_id` was left out. The message lists the ids. |
| `other` | Any other error, such as a refused `start_session`. |

A tool in the full toolset raises its error as `[E0201] message`. A keyword with several fallback values fails with `All fallback values failed for keyword '…'` and the code of the last try.
