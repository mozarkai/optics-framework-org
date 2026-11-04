# Let your AI agent drive a real phone over MCP

> Give Claude Code, Cursor or Codex eyes and hands on a real Android phone or iPhone over MCP.

Your coding agent can read code, but it can't see your app running. `optics mcp` changes that. It's a [Model Context Protocol](https://modelcontextprotocol.io) server that turns every Optics keyword into a tool your agent can call, and the phone's screen into something it can read. The agent can open the app, tap through a flow, reproduce a bug, then write what it did as a test you run again later.

Optics doesn't call any AI service in this mode. The model is whichever one your agent already uses.

This page covers the phone case from start to finish. [Let your AI agent build tests](https://optics-framework.org/docs/create/agent) covers browsers and every client, and the [MCP server reference](https://optics-framework.org/docs/reference/mcp) lists every tool.

## Before you begin

- **An MCP client**, such as Claude Code, Cursor, Codex, Claude Desktop or VS Code.
- **A phone the agent can reach through Appium.** Optics drives phones through an Appium server on your machine.
  - **Android**: turn on USB debugging, connect the cable and accept the prompt. Check that `adb devices` lists the phone. See [Test Android apps](https://optics-framework.org/docs/platforms/android).
  - **iPhone**: a Mac with Xcode, Developer Mode on the phone, and WebDriverAgent signed with your Apple developer team. See [Test on a real device](https://optics-framework.org/docs/platforms/ios#test-on-a-real-device).
- **The Appium server running** in a terminal: `appium`.

An emulator or simulator works the same way, if you'd rather start there.

## Set up

### Install the MCP server

The MCP server is a separate extra. Install it with the Appium engine, in the same environment as Optics:

```shell
$ pip install "optics-framework[mcp,appium]"
```

If you used the installer, run `~/.optics/venv/bin/pip install "optics-framework[mcp,appium]"` instead.

### Add Optics to your agent

**Claude Code**

```shell
$ claude mcp add optics -- optics mcp
```
**Cursor**

Add this to `.cursor/mcp.json` in your project, or `~/.cursor/mcp.json` for every project:

`.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "optics": { "command": "optics", "args": ["mcp"] }
  }
}
```
**Codex**

```shell
$ codex mcp add optics -- optics mcp
```
**Other clients**

Most clients read a JSON file that lists MCP servers, in this shape:

```json
{
  "mcpServers": {
    "optics": { "command": "optics", "args": ["mcp"] }
  }
}
```

If your agent can't find `optics`, use its full path, for example `~/.optics/bin/optics`.

### Ask for a flow

Tell the agent which phone and app to use, and what to do. Give it the Appium URL and the capabilities, including the phone's serial from `adb devices` as `udid`:

```text
Use the optics tools to start an appium session at http://127.0.0.1:4723
with platformName Android, udid R58M12ABCDE and appPackage com.birch.shop.
Sign in as ava@birch.shop, add Trail Runner 2 to the cart, and check
that the cart shows 1 item. Tell me each step you took.
```

For an iPhone, use `platformName iOS`, the phone's `udid` and the app's `bundleId`.

## What the agent does

A typical session goes like this:

1. **Start a session.** `start_session` connects to Appium with your capabilities and opens the app. It returns a `session_id` for every later call.
2. **Look at the screen.** The agent calls `screenshot` and reads the list of elements on screen, each with a label and what it can do with it.
3. **Act.** It calls keyword tools such as `press_element`, `enter_text` and `assert_presence`, with a label or locator from that list. It looks again after each action.
4. **End the session.** `terminate_session` closes the app.

The agent taps by name, not by position. Coordinate taps are hidden by default, because tests that guess positions break on any other screen size. See [Hidden coordinate taps](https://optics-framework.org/docs/reference/mcp#hidden-coordinate-taps).

## Keep the run as a test

What the agent did on the phone can become a suite you run without it. Ask it to save the flow:

```text
Read optics://project-format and write the steps you ran as an
Optics suite in ./checkout, with a config.yaml for this phone.
Run optics dry_run on it and fix any errors.
```

The agent writes the same CSV files a person would: test cases, modules and elements. Review them like a colleague's pull request, then run them:

```shell
$ optics execute checkout
```

The run writes a JUnit report and screenshots to `execution_output/`. See [Read the results](https://optics-framework.org/docs/run/results).

## Know the limits

- **No loops or conditions as tools.** `Run Loop`, `Condition` and the other flow-control keywords only work inside suite files. The agent can still write them there.
- **No record button.** The agent writes the suite files itself, using `optics://project-format`.
- **Sessions are private to the server.** `optics serve` and `optics live` can't see an MCP session, and it ends when the server stops.
- **Apps that block screenshots.** The agent sees what the driver sees. For an app that blocks screenshots, see [Test apps that block screenshots](https://optics-framework.org/docs/guides/protected-apps).

## See also

- [Let your AI agent build tests](https://optics-framework.org/docs/create/agent)
- [MCP server reference](https://optics-framework.org/docs/reference/mcp)
- [Test Android apps](https://optics-framework.org/docs/platforms/android)
- [Test iOS apps](https://optics-framework.org/docs/platforms/ios)
