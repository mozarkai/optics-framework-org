---
title: MCP server reference
summary: Tools and resources that `optics mcp` gives your AI agent.
layout: wide
---

`optics mcp` runs a Model Context Protocol (MCP) server, a standard way for AI agents such as Claude, Cursor or VS Code to call outside tools. Your agent can start a session on a device or browser, look at the screen, and run Optics keywords one at a time.

For a guided walkthrough, see [Build tests with an AI agent](/docs/create/agent).

## Install

The server needs the `mcp` extra. `optics setup` can't install it, and the `all` bundle doesn't include it.

```shell
$ pip install "optics-framework[mcp]"
```

You also need the extras for your driver, for example `appium` or `playwright`. See [Engines and extras](/docs/reference/engines).

## Start the server

```text
optics mcp [--transport stdio|http] [--host HOST] [--port PORT]
```

| Flag | Default | What it does |
|---|---|---|
| `--transport` | `stdio` | `stdio`: your agent starts the server and talks to it directly. `http`: the server listens at `http://<host>:<port>/mcp`. |
| `--host` | `127.0.0.1` | The address to listen on. `http` only. |
| `--port` | `8090` | The port to listen on. `http` only. |

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

## Session tools

### start_session

Starts a session and launches the app. Returns `{"session_id", "driver_id"}`. Keep the `session_id`: every other tool needs it.

| Parameter | Default | What it does |
|---|---|---|
| `driver` | `appium` | `appium`, `selenium`, `playwright` or `ble`. |
| `url` | Appium: `http://127.0.0.1:4723` | The driver's server URL. |
| `capabilities` | None | The driver's capabilities, as in [config.yaml](/docs/reference/config#examples-by-platform). |
| `elements_sources` | The driver's three sources | For example `["appium_find_element", "appium_page_source", "appium_screenshot"]`. Passing `[]` makes the session fail to start. |
| `text_detection` | None | OCR engines, for example `["easyocr"]`. |
| `image_detection` | None | Image engines, for example `["templatematch"]`. |
| `project_path` | None | A project folder. Optics loads its image templates. It doesn't load elements or test cases. |
| `ai_self_heal` | `OPTICS_AI_SELF_HEAL`, else off | Turns on [AI self-heal](/docs/elements/self-heal). |
| `llm_provider` | `OPTICS_LLM_PROVIDER`, else `gemini` | The LLM engine for self-heal: `gemini`, `openai` or `anthropic`. |
| `llm_model` | `OPTICS_LLM_MODEL`, else `gemini-2.5-flash` for Gemini | The model for self-heal. `openai` and `anthropic` need one. |
| `strict_element_match` | Off | Accepts only exact text matches. |

The first session against a remote device farm can take 30 to 60 seconds to start.

### terminate_session

Closes the app and ends the session. Takes `session_id`. Returns `{"session_id", "status": "terminated"}`.

### screenshot

Returns the current screen as a PNG image. Takes `session_id`.

## Keyword tools

Every app, action and verification keyword is a tool named after the keyword in snake_case. Each takes `session_id` plus the keyword's parameters. All parameter values are strings. Leave out a parameter to use its default.

`aoi_*` stands for `aoi_x`, `aoi_y`, `aoi_width` and `aoi_height`, an area of the screen in percent (0–100). See [Area of interest](/docs/elements/area-of-interest).

| Tool | Parameters (defaults) |
|---|---|
| `launch_app` | `app_identifier`, `app_activity`, `event_name` |
| `launch_other_app` | `app_name`, `event_name` |
| `close_and_terminate_app` | none |
| `force_terminate_app` | `app_name`, `event_name` |
| `get_app_version` | `app_package` |
| `get_driver_session_id` | none |
| `start_appium_session` | `event_name` |
| `initialise_setup` | none |

| Tool | Parameters (defaults) |
|---|---|
| `press_element` | `element`, `repeat` (1), `offset_x` (0), `offset_y` (0), `index` (0), `aoi_*`, `event_name` |
| `detect_and_press` | `element`, `timeout` (30), `event_name` |
| `select_dropdown_option` | `element`, `option`, `timeout` (30), `event_name` |
| `enter_text` | `element`, `text`, `aoi_*`, `event_name`, `index` (0) |
| `enter_text_direct` | `text`, `event_name` |
| `enter_text_using_keyboard` | `text_input`, `event_name` |
| `enter_number` | `element`, `number`, `aoi_*`, `event_name`, `index` (0) |
| `clear_element_text` | `element`, `aoi_*`, `event_name`, `index` (0) |
| `get_text` | `element`, `index` (0), `aoi_*` |
| `press_keycode` | `keycode`, `event_name` |
| `swipe` | `coor_x`, `coor_y`, `direction` (right), `swipe_length` (50), `event_name` |
| `swipe_by_percentage` | `percent_x`, `percent_y`, `direction` (right), `swipe_length` (50), `event_name` |
| `swipe_from_element` | `element`, `direction`, `swipe_length`, `aoi_*`, `event_name`, `index` (0) |
| `swipe_until_element_appears` | `element`, `direction`, `timeout`, `event_name` |
| `scroll` | `direction`, `event_name` |
| `scroll_from_element` | `element`, `direction`, `scroll_length`, `aoi_*`, `event_name`, `index` (0) |
| `scroll_until_element_appears` | `element`, `direction`, `timeout`, `event_name` |
| `sleep` | `duration` |
| `execute_script` | `script_or_json`, `event_name` |
| `press_checkbox`, `press_radio_button`, `swipe_seekbar_to_right_android` | Deprecated. Use `press_element` and `swipe_from_element`. |

| Tool | Parameters (defaults) |
|---|---|
| `validate_element` | `element`, `timeout` (10), `rule` (all), `event_name` |
| `is_element` | `element`, `element_state`, `timeout`, `event_name` |
| `assert_presence` | `elements`, `timeout_str` (30), `rule` (any), `event_name`, `fail` (True) |
| `assert_visibility` | `elements`, `timeout_str` (30), `rule` (any), `event_name`, `fail` (True) |
| `assert_equality` | `output`, `expression`, `event_name` |
| `validate_screen` | `elements`, `timeout` (30), `rule` (any), `event_name` |
| `get_interactive_elements` | `filter_config`, `compact` (False) |

Separate several elements with `|`, for example `elements: "text=Trail Runner 2|text=Pace Knit"`. Each tool's description in your agent comes from the keyword's own documentation. See [Keywords](/docs/reference/keywords/) for what each parameter does.

A tool returns the keyword's result. When self-heal recovers a step, it returns `{"result", "healed": true, "heal_summary", "suggested_steps"}` instead, so your agent can write the extra steps into the test.

### Hidden coordinate taps

`press_by_coordinates` and `press_by_percentage` are hidden by default, because agents that guess coordinates write fragile tests. To expose them, set `OPTICS_MCP_ALLOW_COORDINATE_TAPS=1` before you start the server.

| Tool | Parameters (defaults) |
|---|---|
| `press_by_coordinates` | `coor_x`, `coor_y`, `repeat` (1), `event_name` |
| `press_by_percentage` | `percent_x`, `percent_y`, `repeat` (1), `event_name` |

## Resources

Resources are read-only data your agent can fetch by URI.

| URI | Type | What it returns |
|---|---|---|
| `optics://keywords` | JSON | Every keyword, including flow control, with its description and parameters. |
| `optics://project-format` | Markdown | How to write a CSV project: the files, columns, `${name}` variables and flow-control keywords. |
| `optics://session/{session_id}/screenshot` | PNG | The current screen. |
| `optics://session/{session_id}/source` | JSON | `{"page_source", "timestamp"}`: the UI tree or HTML. |
| `optics://session/{session_id}/elements` | JSON | A compact list of interactive elements on screen. Appium and Playwright only. |
| `optics://session/{session_id}/screen_elements` | JSON | `{"screenshot", "elements"}`: a base64 PNG and the elements in the same frame. |

`Capture Screenshot`, `Capture Pagesource` and `Get Screen Elements` aren't tools; use these resources instead. There are no MCP prompts.

## Environment variables

Set these in the environment that starts `optics mcp`. In a JSON client config, add an `env` object next to `command`.

| Variable | What it does |
|---|---|
| `OPTICS_AI_SELF_HEAL` | `1`, `true`, `yes` or `on` turns self-heal on for every session unless `start_session` says otherwise. |
| `OPTICS_LLM_PROVIDER` | The default LLM engine: `gemini`, `openai` or `anthropic`. |
| `OPTICS_LLM_MODEL` | The default model. `openai` and `anthropic` need one. |
| `OPTICS_MCP_ALLOW_COORDINATE_TAPS` | `1`, `true`, `yes` or `on` exposes the coordinate tap tools. |
| `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` | The engine's key. Keys never travel in a tool call. For Vertex AI and Bedrock, see [llm_models](/docs/reference/config#llm-models). |
| `OPENAI_BASE_URL` | The server the `openai` engine calls, such as OpenRouter or a local Ollama. Only the operator sets it; a session cannot. The key comes from `OPENAI_API_KEY` or `api_key_env`. |

## Typical agent loop

:::steps
### Start a session
Call `start_session` with the driver, URL and capabilities, for example `driver: "appium"`, `capabilities: {"platformName": "Android", "appPackage": "com.birch.shop", ...}`. Keep the `session_id`.

### Look at the screen
Call `screenshot`, then read `optics://session/{session_id}/elements` (or call `get_interactive_elements`) for labels and positions. Read `/source` when you need XPaths.

### Act
Call keyword tools with a locator: `press_element` with `element: "text=Sign in"`, `enter_text` with an XPath, or `detect_and_press` with a visible label. Look again after each action.

### Save the run as a test
Read `optics://project-format`, then write the steps you ran into CSV files with a config.yaml. Run them with `optics execute <folder>`.

### End the session
Call `terminate_session`.
:::

## Limits

- **No flow control.** `Run Loop`, `Condition`, `Evaluate`, `Read Data`, `Invoke API` and the other flow-control keywords aren't tools. Your agent can still write them into CSV modules for `optics execute`.
- **No recording or saving.** There are no tools to record, save, replay, find devices or run doctor. The agent writes project files itself.
- **Coordinate taps are hidden** unless you set `OPTICS_MCP_ALLOW_COORDINATE_TAPS`. Self-heal can still tap by percentage when it recovers a step.
- **Sessions aren't shared.** Sessions live in the server's memory. `optics serve` and `optics live` can't see them, and restarting the server ends them.
- **Images come from a project.** There's no upload tool. Pass `project_path` to use template images.
- **Selenium has no interactive element list.** The elements resource and `get_interactive_elements` fail on Selenium; use `/source` instead.

## Errors

A failing tool returns an error message. When Optics raises a coded error, the message starts with the code in brackets, for example `[Code.E0106] Driver session is no longer active ...`. The code can carry a `Code.` prefix; it's the same code. A step that fails after trying every element value arrives as `Execution failed: All fallback attempts failed for keyword ...`, with the code inside the text. See [Error codes](/docs/reference/errors).
