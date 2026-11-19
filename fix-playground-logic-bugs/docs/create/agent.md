# Let your AI agent build tests

> Connect Optics to Claude, Cursor or any MCP client so your agent can drive a device and write the suite.

`optics mcp` is a [Model Context Protocol](https://modelcontextprotocol.io) server. It gives an AI agent eyes and hands on a phone, TV or browser. The agent reads the screen as a list of rows, acts on a row by its reference, and sees what changed after each action. The agent explores your app, then writes an ordinary Optics suite that you review and run with `optics execute`.

The agent is yours. Optics doesn't call any AI service in this mode, so it works with whichever model your client uses.

## Example session

This session ran against https://example.com. Each reply is the text that the agent gets, cut with `…` where a page has many rows.

Install Optics and register the server for all your folders:

```shell
$ curl -fsSL https://optics-framework.org/install | sh
$ ~/.optics/bin/optics setup --install playwright
$ ~/.optics/bin/optics mcp install
Registered optics for all folders: /Users/ana/.optics/venv/bin/optics mcp
A client loads its MCP servers only when a session starts: start a new session, then check that the optics tools are listed.
In Claude Code, `claude --continue` keeps the conversation, and /mcp shows optics as connected.
```

Start a new Claude Code session and ask: *Use the optics tools to open https://example.com, follow "Learn more", check that the page says "Example Domains", then go back.* These are the calls and the replies.

`start_session` opens the browser and returns the first screen:

```json
{"driver": "playwright", "app": "https://example.com", "capabilities": {"headless": true}}
```

```text
session 3c4fc8b3-8b6a-4b52-b293-325b178caec8 (playwright)
run_keyword cannot run here: force_terminate_app
launch_app "https://example.com" -> ok · verified: unknown (add expect_present/expect_absent to verify)
screen b5dfb4 · 7 rows
e1 p "This domain is for use in documentation examples without needing permission. Thi…"
…
e7 a "Learn more" [tap]
```

`tap` acts on the ref `e7` and says the text it expects. The reply gives the verdict and the new screen:

```json
{"target": "e7", "expect_present": ["Example Domains"]}
```

```text
tap e7 "Learn more" -> ok (Text) · verified: pass
check present "Example Domains": met
screen 47fb7e · new screen
e8 a "Homepage" [tap]
…
e14 h1 "Example Domains" #example-domains
…
```

`press_key` goes back, and `check` gives a verdict without an action:

```json
{"key": "back", "expect_present": ["Learn more"]}
```

```text
press_key back -> ok · verified: pass
check present "Learn more": met
screen b5dfb4 · new screen
…
```

```json
{"present": ["Learn more"], "absent": ["Example Domains"]}
```

```text
check -> passed
present "Learn more": met
absent "Example Domains": met
```

`terminate_session` closes the browser and says where the steps are. They stay readable after the session ends:

```text
session 3c4fc8b3-8b6a-4b52-b293-325b178caec8 terminated. Its 4 recorded steps are at optics://session/3c4fc8b3-8b6a-4b52-b293-325b178caec8/steps.
```

The steps resource gives the rows of the suite:

`modules_csv`:

```csv
module_name,module_step,param_1,param_2
recorded,Launch App,https://example.com
recorded,Press Element,${learn_more_a}
recorded,Go Back
recorded,Assert Presence,Learn more,rule=all
```

`elements_csv`:

```csv
Element_Name,Element_ID,Element_ID_2
learn_more_a,"css=a[href=""https://iana.org/help/example-domains""]",Learn more
```

The `absent` check has no keyword, so `notes` says `absent checks are not recordable as keywords`. A failed call has the error code, a `Next:` hint and the current rows. See [Errors](https://optics-framework.org/docs/reference/mcp#errors).

## Before you begin

- An MCP client, such as Claude Code, Claude Desktop, Cursor or VS Code.
- A target to drive: a browser (Playwright needs nothing else), or a phone or emulator with an Appium server running. See [Platforms](https://optics-framework.org/docs/platforms/).

### Install the MCP server

The installer includes the MCP server, so if you used it there is nothing to do. With pip, install the `mcp` extra in the same environment as Optics:

```shell
$ pip install "optics-framework[mcp]"
```

### Add Optics to your client

**Claude Code**

```shell
$ ~/.optics/bin/optics mcp install
```

The command registers the server for all your folders, with the absolute path of this install. It also removes an `optics` entry that `claude mcp add` made for the current folder only, and names the entries that still win. Give the full path of `optics` the first time, because the installer adds `~/.optics/bin` to `PATH` only in new terminals. If you installed with pip, run `optics mcp install` in that environment. See [Connect your agent](https://optics-framework.org/docs/reference/mcp#connect-your-agent).
**Claude Desktop**

Add this to `claude_desktop_config.json` (**Settings → Developer → Edit config**), then restart Claude Desktop:

`claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "optics": { "command": "optics", "args": ["mcp"] }
  }
}
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
**VS Code**

Add this to `.vscode/mcp.json`:

`.vscode/mcp.json`:

```json
{
  "servers": {
    "optics": { "type": "stdio", "command": "optics", "args": ["mcp"] }
  }
}
```

If your client cannot find `optics`, use its full path, for example `/Users/ana/.optics/bin/optics`. Clients do not expand `~` in a JSON file. To see the path, run `command -v optics` in a new terminal.

### Check that the tools are there

Your client reads its MCP servers when a session starts. A session that was open when you added the server does not show the optics tools. Start a new session, or restart the client. Then make sure that the tool list has the optics tools, such as `start_session`. In Claude Code, run `/mcp`, or run `claude mcp list` in a terminal.

### Ask for a test

Describe the flow and where the app runs. The agent starts a session, explores, and writes files:

```text
Use the optics tools to open https://www.saucedemo.com in Playwright.
Sign in as standard_user / secret_sauce, add the backpack to the cart,
and check that the cart badge shows 1. Then write it as an Optics suite
in ./checkout, run optics dry_run on it, and tell me how to run it.
```

For a phone app, include the Appium details: *start an appium session at http://127.0.0.1:4723 with platformName Android, deviceName emulator-5554, appPackage com.birch.shop*.

### Lint the suite (optional)

The [optics-framework-lsp](https://github.com/mozarkai/optics-framework-lsp) package lints a suite and lists every problem in one run, such as a keyword with the wrong number of parameters. Install it, then ask the agent to run it on the folder it wrote:

```shell
$ pip install optics-framework-lsp
$ optics-lsp lint checkout --json
```

The exit code is 0 whenever the lint ran, also when it finds problems. Read `status` and the `diagnostics` list in the JSON to decide what blocks the run.

### Review and run the suite

The agent writes the same files you would: test cases, modules and elements, in CSV. Read them like a colleague's pull request, then run them:

```shell
$ optics execute checkout
```

Results go to `execution_output/`. When a step fails, `failed_steps_elements.json` lists the elements on the screen where it failed. See [Read the results](https://optics-framework.org/docs/run/results).

## What the agent can do

The server gives the agent:

- **Session tools**: `start_session` (picks the driver, URL and device settings, and opens the app) and `terminate_session`.
- **Tools that act on the screen**: `tap`, `type_text`, `scroll`, `press_key`, `launch_app`, `batch` (several steps on one screen, such as a form) and `check`. `observe` lists the screen and can add a screenshot. `run_keyword` runs any other keyword, such as `assert_text`.
- **Resources to read**: the steps the session ran as CSV rows, the current screen, the raw UI tree and the keyword catalogue. `optics://project-format` teaches the agent how to write suite files. `optics://browser-profiles` lists the Chrome and Edge profiles on your machine.

The screen comes back as rows such as `e4 input "Login" [tap] #login-button`. The agent taps `e4`, and Optics uses a locator that matches only that element. Each action returns the rows that changed. When the agent adds the text it expects, such as `expect_present: ["Products"]`, the reply also gives a `verified` verdict. Optics waits up to 5 seconds for that text, so a page that loads late can still pass.

A typical session goes: start a session, act on rows, check the result, end the session, read the steps and the project format, write the files, and run `optics dry_run`. The [MCP reference](https://optics-framework.org/docs/reference/mcp) lists every tool and resource. For one tool per keyword, start the server with `--toolset full`.

## Keep the agent on track

- **The agent asks you before it signs in.** For a website that needs a sign-in, the agent reads `optics://browser-profiles`. It asks you which profile to use. If you choose none, it asks you for the credentials. Only a server that starts with the default `stdio` transport accepts a profile. See [Sign in with a browser profile](https://optics-framework.org/docs/reference/mcp#sign-in-with-a-browser-profile).
- **Agents tap by reference, not by position.** The server hides coordinate taps by default, because those tests break on any other screen size. To allow them, set `OPTICS_MCP_ALLOW_COORDINATE_TAPS=1` before you start the server.
- **The steps resource is the start of the suite.** `optics://session/{id}/steps` gives the module and element rows for each step that passed. A typed password shows as `<redacted>`, so the agent must replace it. Ask the agent to run `optics dry_run`, or `optics-lsp lint <folder> --json`, before it finishes.
- **Values go in the elements file.** The agent puts run-specific values in `elements.csv` and uses them as `${name}`. A cell that is only `${name}` tries each value of `name` in order. A `${name}` inside a longer value uses the first value.
- **Loops and conditions** (`Run Loop`, `Condition`, `Read Data` and the rest) aren't tools, because they only make sense inside suite files. The agent can still write them into modules.
- **Sessions are private to the server.** `optics serve` and `optics live` cannot see a session started over MCP. It ends when the agent calls `terminate_session` or the server stops. Its steps stay readable after that, also after a restart. When more than one session is open, the agent must pass `session_id`. The error lists the ids.

**Run the server over HTTP**
By default the server talks to one client over standard input and output. To share it on a network, or run it in a container, start it in HTTP mode:

```shell
$ optics mcp --transport http --host 127.0.0.1 --port 8090
```

Then point your client at `http://127.0.0.1:8090/mcp`:

```json
{ "mcpServers": { "optics": { "url": "http://127.0.0.1:8090/mcp" } } }
```

The server has no authentication. Keep it on `127.0.0.1` or a trusted network.

**Let the agent recover failing steps with AI self-heal**
Self-heal uses an AI model to recover a step when every locator fails (see [AI self-heal](https://optics-framework.org/docs/elements/self-heal)). Over MCP it's controlled by environment variables on the server, or by `ai_self_heal: true` in `start_session`:

```shell
$ export OPTICS_AI_SELF_HEAL=1
$ export GEMINI_API_KEY="your-key"
$ optics mcp
```

For OpenAI, Claude or a local model, also set `OPTICS_LLM_PROVIDER`, `OPTICS_LLM_MODEL` and the engine's key. See [Environment variables](https://optics-framework.org/docs/reference/mcp#environment-variables).

When self-heal recovers a keyword that `run_keyword` ran, the `result:` line of the reply holds the heal report, with `healed`, `heal_summary` and the steps that worked, so the agent can update the suite.

## See also

- [MCP server reference](https://optics-framework.org/docs/reference/mcp)
- [Describe a test in plain English](https://optics-framework.org/docs/create/describe), the built-in AI mode
- [Run keywords over HTTP](https://optics-framework.org/docs/advanced/http-api)
