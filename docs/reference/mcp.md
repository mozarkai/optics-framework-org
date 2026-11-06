---
title: MCP server reference
summary: Tools and resources that `optics mcp` gives your AI agent.
layout: wide
---

`optics mcp` runs a Model Context Protocol (MCP) server, a standard way for AI agents such as Claude, Cursor or VS Code to call outside tools. Your agent starts a session on a device or browser, reads the screen as a list of rows, and acts on those rows by reference. Each action returns what changed on the screen.

For a guided walkthrough, see [Build tests with an AI agent](/docs/create/agent).

## Install

The server needs the `mcp` extra. The [install scripts](/docs/reference/cli#install-scripts) always include it. With pip, add it yourself: `optics setup` can't install it, and the `all` bundle doesn't include it.

```shell
$ pip install "optics-framework[mcp]"
```

You also need the extras for your driver, for example `appium` or `playwright`. See [Engines and extras](/docs/reference/engines).

## Start the server

```text
optics mcp [--transport stdio|http] [--host HOST] [--port PORT] [--toolset core|full]
```

| Flag | Default | What it does |
|---|---|---|
| `--transport` | `stdio` | `stdio`: your agent starts the server and talks to it directly. `http`: the server listens at `http://<host>:<port>/mcp`. |
| `--host` | `127.0.0.1` | The address to listen on. `http` only. |
| `--port` | `8090` | The port to listen on. `http` only. |
| `--toolset` | `OPTICS_MCP_TOOLSET`, else `core` | `core`: the 10 tools below. `full`: also one tool for each keyword. See [Full toolset](#full-toolset). |

We recommend `stdio` for an agent on your own machine. Use `http` when the server runs in a container or on another machine.

## Connect your agent

Most agents read a JSON file that lists MCP servers. For Claude Desktop it's `claude_desktop_config.json`; for Claude Code it's `.mcp.json` in your project. Other agents use the same shape.

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

If your agent can't find `optics`, use the full path to it, for example `/Users/ana/.optics/bin/optics`.

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
e2 input "Username" [tap,input] #user-name
e4 input "Login" [tap] #login-button
e6 h4 "Accepted usernames are:"
```

- The quoted text is on the screen. The `#id` is not.
- `[...]` lists what the element accepts: `tap`, `long`, `toggle`, `input` or `scroll`. A row without it is read-only text.
- A web row marked `(off-screen)` is on the page but scrolled out of view. A tap scrolls it into view.
- A ref stays valid while its element is on the screen. A ref from an earlier screen gives a `stale_ref` error.

A tap on a ref uses a locator that matches only that element. The agent can also pass an exact label or a locator (`css=`, `xpath=`, `text=`) as the target.

## Core tools

The default toolset has 10 tools. Every tool except `start_session` takes `session_id`. You can leave it out when one session is open. When more than one session is open, the call fails with `session_required` and lists the ids.

| Tool | Parameters (defaults) | What it does |
|---|---|---|
| `start_session` | See [start_session](#start-session) | Starts a session. With `app`, it also opens the app or URL and returns the first screen. |
| `terminate_session` | none | Ends the session and closes the driver. |
| `observe` | `query` (""), `screenshot` (false), `max_rows` (80, 1–300) | Lists the rows. `query` keeps rows whose label or id holds the text. `screenshot` adds a JPEG of at most 1024 px. |
| `tap` | `target`, `repeat` (1, 1–20) | Runs `press_element`. Refuses a row that has no `tap`, `long`, `toggle` or `input`. |
| `type_text` | `target`, `text`, `clear_first` (false) | Runs `enter_text`, after `clear_element_text` when `clear_first` is true. Refuses a row without `input`. |
| `scroll` | `direction` (`up`, `down`, `left`, `right`), `until` (""), `timeout_s` (10, 1–60) | Runs `scroll`. With `until`, runs `scroll_until_element_appears` (up and down only). |
| `press_key` | `key` | `back` runs `go_back` on any driver. Another value runs `press_keycode`: a key name such as `Enter`, `Escape`, `esc` or `ArrowDown`, or an Android KeyEvent number such as `66`. On the web, case and a `KEYCODE_` prefix do not matter. A ref is refused with a hint to use `tap`. |
| `launch_app` | `app` ("") | Opens an app id or a URL. Empty opens the configured app. |
| `check` | `present` ([]), `absent` ([]), `timeout_s` (5, 0–30) | Waits for the texts or refs, then gives a verdict. See [check](#check). |
| `run_keyword` | `keyword`, `params` ({}) | Runs any other keyword. See [run_keyword](#run-keyword). |

The tools that act (`tap`, `type_text`, `scroll`, `press_key`, `launch_app` and `run_keyword`) also take these parameters:

| Parameter | Default | What it does |
|---|---|---|
| `expect_present` | `[]` | Texts or refs that must be on the screen after the action. |
| `expect_absent` | `[]` | Texts or refs that must be gone after the action. |
| `screen` | `diff` | What the reply shows: `diff` (the changed rows), `full` (all rows) or `none`. |

### start_session

| Parameter | Default | What it does |
|---|---|---|
| `driver` | `appium` | `appium`, `selenium`, `playwright` or `ble`. |
| `app` | "" | An app id or URL to open after the session starts. |
| `url` | Appium: `http://127.0.0.1:4723` | The driver's server URL. For Playwright, the endpoint of a [remote browser](/docs/platforms/web#use-a-remote-browser). |
| `capabilities` | `{}` | The driver's capabilities, as in [config.yaml](/docs/reference/config#examples-by-platform). For a phone-sized page, add `"device": "Pixel 7"`. See [Emulate a phone](/docs/platforms/web#emulate-a-phone). For a signed-in web session, add `profile`. See [Sign in with a browser profile](#sign-in-with-a-browser-profile). |
| `elements_sources` | Every source of the driver | For Appium: `appium_find_element`, `appium_page_source`, `appium_web` and `appium_screenshot`. Passing `[]` makes the session fail to start. |
| `text_detection` | `[]` | OCR engines, for example `["easyocr"]`. |
| `image_detection` | `[]` | Image engines, for example `["templatematch"]`. |
| `project_path` | "" | A project folder. Optics loads its image templates. It doesn't load elements or test cases. |
| `ai_self_heal` | `OPTICS_AI_SELF_HEAL`, else off | Turns on [AI self-heal](/docs/elements/self-heal). |
| `llm_provider` | `OPTICS_LLM_PROVIDER`, else `gemini` | The LLM engine for self-heal: `gemini`, `openai` or `anthropic`. |
| `llm_model` | `OPTICS_LLM_MODEL`, else `gemini-2.5-flash` for Gemini | The model for self-heal. `openai` and `anthropic` need one. |
| `strict_element_match` | false | Accepts only exact text matches. |

It returns `{"session_id", "driver", "idle_lease_s", "status": "started", "driver_id"}`. With `app`, it also returns the first screen:

```text
session e5202adb-44cd-43c6-b84a-c31186dd67b7 (playwright) · idle lease 900 s
launch_app "https://www.saucedemo.com" -> ok · verified: unknown (add expect_present/expect_absent to verify)
screen 0b1dab · 8 rows
e1 div "Swag Labs"
e2 input "Username" [tap,input] #user-name
e3 input "Password" [tap,input] #password
e4 input "Login" [tap] #login-button
...
```

The server refuses a `${NAME}` reference in `url` or in a `capabilities.headers` value, because it does not read its own environment for a caller. It also refuses `capabilities.storage_state` as a file path. Send the state as a JSON object. Both give `E0501`.

The first session against a remote device farm can take 30 to 60 seconds to start.

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
tap e4 "Login" -> ok (Text) · verified: pass
check present "Products": met
screen 65a355 · new screen
e9 button "Open Menu" [tap] #react-burger-menu-btn
e12 a "Cart, empty" [tap]
e13 span "Products"
...
```

- `ok` means only that the keyword ran. The word in brackets is the strategy that found the element.
- `verified` is `pass`, `fail` or `unknown`. It is `pass` only when every expectation is met and the action caused it. Without `expect_present` or `expect_absent`, it stays `unknown`.
- An action waits up to 5 seconds for `expect_present` and `expect_absent` before it judges them. A page that loads after a redirect can still pass.
- `note:` lines tell the agent what to trust less. For example, a `scroll` is `ok` even when nothing moved, and a row with no unique locator is found by its label.
- `run_keyword` adds a `result:` line with the keyword's return value, cut at 400 characters.

After an action, the server reads the screen until it stops changing. A screen with no rows counts as a page that is still loading, so the server reads it again for up to 6 seconds. A keyword that only reads, and `execute_script` when the screen stays the same, are read once.

The structured reply is `{"ok", "verified", "verb", "keyword", "checks", "target", "result", "screen", "error"}`. `screen` holds `digest`, `changed`, `new_screen`, `added`, `removed` and `relabelled`. On a new screen, `screen` holds all `rows` and no `added` or `removed` lists. With `screen="none"`, `screen` holds only `digest`, `changed` and `new_screen`. The reply text is cut at 8,000 characters.

When self-heal recovers a step, `result` is `{"result", "healed": true, "heal_summary", "suggested_steps"}`, so your agent can write the extra steps into the test.

### check

`check` reads the screen until every text in `present` shows and every text in `absent` is gone, or until `timeout_s` passes. It gives a verdict, not an error:

```text
check -> passed
present "Products": met
absent "Login": met
```

A locator in `present`, such as `css=.title`, gets one look with `assert_presence`. `absent` cannot hold a locator. The structured reply is `{"passed", "checks", "digest"}`.

### run_keyword

`run_keyword` runs a keyword that has no tool of its own, for example `assert_text`, `select_dropdown_option` or `get_text`. `params` takes the keyword's parameters by name, as strings. An element parameter can be a ref:

```json
{"keyword": "get_text", "params": {"element": "css=.title"}}
```

```text
run_keyword get_text -> ok (Text) · verified: unknown (add expect_present/expect_absent to verify)
result: Products
screen 65a355 · unchanged
```

The `optics://keywords` resource lists every keyword that `run_keyword` accepts. Flow control, deprecated keywords and the coordinate keywords are not in it. Optics caps a `timeout` parameter at 60 seconds.

## Full toolset

Start the server with `--toolset full`, or set `OPTICS_MCP_TOOLSET=full`, to add one tool for each app, action and verification keyword. The tool name is the keyword in snake_case, such as `press_element`, `enter_text`, `assert_text` or `go_back`. Each tool takes `session_id` plus the keyword's parameters, all as strings. An element parameter can be a ref. See [Keywords](/docs/reference/keywords/) for each parameter.

The full toolset also has:

- The 10 core tools, but the keyword tools `launch_app` and `scroll` replace the core tools of the same name.
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
| `optics://keywords` | JSON | The keywords `run_keyword` accepts, with the description, parameters, `returns` and `deprecated` of each. |
| `optics://project-format` | Markdown | How to write a CSV project: the files, columns, `${name}` variables, secrets and flow-control keywords. |
| `optics://browser-profiles` | JSON | The Chrome and Edge profiles on the machine that runs the server, as `{channel, directory, name, email}`. Use one as `capabilities.profile`. |
| `optics://session/{session_id}/screenshot` | PNG | The current screen. |
| `optics://session/{session_id}/source` | JSON | `{"page_source", "timestamp"}`: the UI tree or HTML. |
| `optics://session/{session_id}/elements` | JSON | The elements on the screen as `{i, label, cls, bounds, act, rid, loc, offscreen}`. Appium, Appium web and Playwright only. It has no refs. |
| `optics://session/{session_id}/screen_elements` | JSON | `{"screenshot", "elements"}`: a base64 PNG and the elements in the same frame. |
| `optics://session/{session_id}/steps` | JSON | The steps the session ran, with the module and element CSV rows to replay them. |

There are no MCP prompts.

### The steps resource

`/steps` returns `{"steps", "modules_csv", "elements_csv", "notes"}`. Each step that passed is a row in the module `recorded`, and each element it used is a row in the elements CSV. A value typed into a secret field becomes its own element, written as `<redacted>`:

```csv title="modules_csv"
module_name,module_step,param_1,param_2
recorded,Launch App,https://www.saucedemo.com
recorded,Enter Text,${username_input},standard_user
recorded,Enter Text,${password_input},${password_value}
recorded,Press Element,${login_input}
```

```csv title="elements_csv"
Element_Name,Element_ID,Element_ID_2,Element_ID_3
username_input,"css=[data-test=""username""]",css=#user-name,Username
password_input,"css=[data-test=""password""]",css=#password
password_value,<redacted>
login_input,"css=[data-test=""login-button""]",css=#login-button,Login
```

`notes` says what to do before the suite can run, for example: `replace <redacted> for password_value before running: write it as @:value or set it with Read Data,${password_value},ENV:NAME`. A passed `check` is recorded as `Assert Presence`. See [Hide sensitive values](/docs/advanced/variables#hide-sensitive-values).

## Environment variables

Set these in the environment that starts `optics mcp`. In a JSON client config, add an `env` object next to `command`.

| Variable | Default | What it does |
|---|---|---|
| `OPTICS_MCP_TOOLSET` | `core` | `core` or `full`. The `--toolset` flag wins. |
| `OPTICS_MCP_SESSION_IDLE_S` | `900` | Ends a session after this many seconds without a call. `0` turns it off. |
| `OPTICS_MCP_CALL_TIMEOUT_S` | `100` | The longest time one call can take. After it, the call returns a `timeout` error, and the session stays `busy` until the driver call ends. |
| `OPTICS_MCP_ALLOW_COORDINATE_TAPS` | off | `1`, `true`, `yes` or `on` allows the coordinate keywords. See [Coordinate taps](#coordinate-taps). |
| `OPTICS_AI_SELF_HEAL` | off | `1`, `true`, `yes` or `on` turns self-heal on for every session unless `start_session` says otherwise. |
| `OPTICS_LLM_PROVIDER` | `gemini` | The default LLM engine: `gemini`, `openai` or `anthropic`. |
| `OPTICS_LLM_MODEL` | | The default model. `openai` and `anthropic` need one. |
| `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` | | The engine's key. Keys never travel in a tool call. For Vertex AI and Bedrock, see [llm_models](/docs/reference/config#llm-models). |
| `OPENAI_BASE_URL` | | The server the `openai` engine calls, such as OpenRouter or a local Ollama. Only the operator sets it; a session cannot. The key comes from `OPENAI_API_KEY` or `api_key_env`. |

## Typical agent loop

:::steps
### Start a session
Call `start_session` with the driver and the app, for example `driver: "playwright"`, `app: "https://www.saucedemo.com"`. For a phone, add `url` and `capabilities`, such as `{"platformName": "Android", "appPackage": "com.birch.shop", ...}`. The reply shows the first screen.

### Act on refs
Call `tap`, `type_text` and the other tools with a ref from the rows, for example `tap(target="e4", expect_present=["Products"])`. Each reply shows what changed, so you do not need to call `observe` after each action. Use `observe` for a `query`, a screenshot or the full list.

### Check the result
Call `check` with the texts that prove the flow worked.

### Save the run as a test
Read `optics://session/{session_id}/steps` and `optics://project-format`. Write the CSV files and a config.yaml, replace each `<redacted>` value, then run `optics execute <folder>`.

### End the session
Call `terminate_session`.
:::

## Limits

- **No flow control.** `Run Loop`, `Condition`, `Evaluate`, `Read Data`, `Invoke API` and the other flow-control keywords are not tools. Your agent can still write them into CSV modules for `optics execute`.
- **No save tool.** There are no tools to record, save, replay, find devices or run doctor. The agent writes project files from the steps resource.
- **Sessions are not shared.** Sessions live in the server's memory. `optics serve` and `optics live` cannot see them. A session ends after the idle lease. All sessions end when the server stops.
- **Images come from a project.** There's no upload tool. Pass `project_path` to use template images.
- **Selenium has no rows.** The tools run keywords on Selenium, but `verified` stays `unknown` and `observe` fails. Read `/source` instead.

## Errors

A core tool does not raise. A failed call returns an error result with the code, a `Next:` line, and the current rows:

```text
tap "Nonexistent thing" -> FAIL · verified: fail
[E0201] not found: tried Nonexistent thing.
Next: Pick a ref from the current screen.
screen 65a355 · 40 rows
e9 button "Open Menu" [tap] #react-burger-menu-btn
...
```

The structured reply has `error: {"code", "kind", "message"}`. An error without a code, such as a bad ref, has no `[E…]` part. See [Error codes](/docs/reference/errors).

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
| `unknown_session` | No such session, or none is open. When the idle lease ended it, the message says so. |
| `session_required` | More than one session is open, and `session_id` was left out. The message lists the ids. |
| `other` | Any other error, such as a refused `start_session`. |

A tool in the full toolset raises its error as `[E0201] message`. A keyword with several fallback values fails with `All fallback values failed for keyword '…'` and the code of the last try.
