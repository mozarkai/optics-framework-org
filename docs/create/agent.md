---
title: Let your AI agent build tests
nav: Delegate it
summary: Connect Optics to Claude, Cursor or any MCP client so your agent can drive a device and write the suite.
level: Intermediate
time: 10 min
---

`optics mcp` is a [Model Context Protocol](https://modelcontextprotocol.io) server. It gives an AI agent eyes and hands on a phone, TV or browser: every Optics keyword becomes a tool the agent can call, and the screen becomes something it can read. The agent explores your app, then writes an ordinary Optics suite that you review and run with `optics execute`.

::scene{name="agent" caption="The agent drives the app through Optics tools, reads the project format, and writes the suite files. You run them like any other suite."}

The agent is yours. Optics doesn't call any AI service in this mode, so it works with whichever model your client uses.

## Before you begin

- An MCP client, such as Claude Code, Claude Desktop, Cursor or VS Code.
- A target to drive: a browser (Playwright needs nothing else), or a phone or emulator with an Appium server running. See [Platforms](/docs/platforms/).

:::steps
### Install the MCP server

The installer includes the MCP server, so if you used it there is nothing to do. With pip, install the `mcp` extra in the same environment as Optics:

```shell
$ pip install "optics-framework[mcp]"
```

### Add Optics to your client

:::tabs{group="client"}
::tab[Claude Code]
```shell
$ claude mcp add optics -- optics mcp
```
::tab[Claude Desktop]
Add this to `claude_desktop_config.json` (**Settings → Developer → Edit config**), then restart Claude Desktop:

```json title="claude_desktop_config.json"
{
  "mcpServers": {
    "optics": { "command": "optics", "args": ["mcp"] }
  }
}
```
::tab[Cursor]
Add this to `.cursor/mcp.json` in your project, or `~/.cursor/mcp.json` for every project:

```json title=".cursor/mcp.json"
{
  "mcpServers": {
    "optics": { "command": "optics", "args": ["mcp"] }
  }
}
```
::tab[VS Code]
Add this to `.vscode/mcp.json`:

```json title=".vscode/mcp.json"
{
  "servers": {
    "optics": { "type": "stdio", "command": "optics", "args": ["mcp"] }
  }
}
```
:::

If your client can't find `optics`, use its full path, for example `~/.optics/bin/optics`.

### Ask for a test

Describe the flow and where the app runs. The agent starts a session, explores, and writes files:

```text
Use the optics tools to open https://www.saucedemo.com in Playwright.
Sign in as standard_user / secret_sauce, add the backpack to the cart,
and check that the cart badge shows 1. Then write it as an Optics suite
in ./checkout, run optics dry_run on it, and tell me how to run it.
```

For a phone app, include the Appium details: *start an appium session at http://127.0.0.1:4723 with platformName Android, deviceName emulator-5554, appPackage com.birch.shop*.

### Review and run the suite

The agent writes the same files you would: test cases, modules and elements, in CSV. Read them like a colleague's pull request, then run them:

```shell
$ optics execute checkout
```
:::

## What the agent can do

The server gives the agent:

- **Session tools**: `start_session` (picks the driver, URL and device settings, and opens the app), `screenshot` and `terminate_session`.
- **A tool for each keyword**, such as `press_element`, `enter_text`, `assert_presence` and `launch_app`. Each takes the session id plus the keyword's values.
- **Resources to read**: the current screen as an image, the list of elements on screen, the raw UI tree, the keyword catalogue, and `optics://project-format`, which teaches the agent how to write suite files.

A typical session goes: start a session, look at the screen, act with keywords, read the project format, write the files, run `optics dry_run`, and end the session. The [MCP reference](/docs/reference/mcp) lists every tool and resource.

## Keep the agent on track

- **Agents tap by name, not by position.** Tapping raw screen coordinates is hidden by default, because those tests break on any other screen size. Set `OPTICS_MCP_ALLOW_COORDINATE_TAPS=1` before starting the server if you really need it.
- **Saving is the agent's job.** There's no record button in MCP. The agent writes the files using `optics://project-format`. Ask it to run `optics dry_run` before it finishes.
- **Loops and conditions** (`Run Loop`, `Condition`, `Read Data` and the rest) aren't tools, because they only make sense inside suite files. The agent can still write them into modules.
- **Sessions are private to the server.** A session started over MCP isn't visible to `optics serve` or `optics live`, and it ends when the server stops.

:::details[Run the server over HTTP]
By default the server talks to one client over standard input and output. To share it on a network, or run it in a container, start it in HTTP mode:

```shell
$ optics mcp --transport http --host 127.0.0.1 --port 8090
```

Then point your client at `http://127.0.0.1:8090/mcp`:

```json
{ "mcpServers": { "optics": { "url": "http://127.0.0.1:8090/mcp" } } }
```

The server has no authentication. Keep it on `127.0.0.1` or a trusted network.
:::

:::details[Let the agent recover failing steps with AI self-heal]
Self-heal uses an AI model to recover a step when every locator fails (see [AI self-heal](/docs/elements/self-heal)). Over MCP it's controlled by environment variables on the server, or by `ai_self_heal: true` in `start_session`:

```shell
$ export OPTICS_AI_SELF_HEAL=1
$ export GEMINI_API_KEY="your-key"
$ optics mcp
```

For OpenAI, Claude or a local model, also set `OPTICS_LLM_PROVIDER`, `OPTICS_LLM_MODEL` and the engine's key. See [Environment variables](/docs/reference/mcp#environment-variables).

When a step is healed, the tool result includes `"healed": true` and the steps that worked, so the agent can update the suite.
:::

## See also

- [MCP server reference](/docs/reference/mcp)
- [Describe a test in plain English](/docs/create/describe), the built-in AI mode
- [Run keywords over HTTP](/docs/advanced/http-api)
