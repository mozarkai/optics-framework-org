---
title: CLI
summary: Look up every `optics` command, its flags, what it writes and the exit codes it returns.
layout: wide
---

The `optics` command creates projects, checks your setup, runs tests and starts the integration servers. This page covers Optics 1.11.2.

Commands are grouped by when you use them: getting started, running tests, integrating with other tools, and everything else. Run `optics <command> --help` to see the same flags in your terminal.

## Global behavior

```text
optics [--version] [--help] <command> [options]
```

| Flag | What it does |
|---|---|
| `--version` | Prints `Optics Framework 1.11.2` and exits with code 0. |
| `--help`, `-h` | Lists the commands: `list`, `configure`, `config`, `doctor`, `quickstart`, `dry_run`, `dry-run`, `init`, `execute`, `live`, `generate`, `setup`, `serve`, `mcp`, `completion`. |

There's no `optics version` command. Use `optics --version`.

When you run `optics` with no command for the first time, it prints a welcome panel that points to `optics quickstart`, `optics doctor` and `optics --help`. After that, it prints a one-line reminder. Optics remembers the first run in a small marker file under `~/.optics` (or `$OPTICS_HOME`).

If Optics can't load one of its own dependencies, every command stops with a red "Cannot start" panel. The panel shows the underlying error and the reinstall command for your environment, for example `pipx reinstall optics-framework` or `pip install --force-reinstall optics-framework`.

When a run cannot start for another reason, the panel title includes the error code, for example `Cannot start: E0501`. See [Error codes](/docs/reference/errors).

When a command fails unexpectedly, Optics prints `Unexpected error (<type>): <message>` and suggests running `optics doctor`. See [Exit codes](#exit-codes).

## `optics quickstart`

Walks you through creating your first project, installing an engine, writing config.yaml and running a test.

```text
optics quickstart
```

There are no flags. The command asks these questions in order:

1. **What do you want to automate?** `mobile` or `web`.
2. **Install the engine now?** Appium for mobile; Playwright and Selenium for web. If you decline, it prints the `optics setup --install` command to run later.
3. **Start from a sample?** The `contact` sample for mobile, the `playwright` sample for web. Decline to pick an empty project or another sample.
4. **Project name** (default `my-optics-project`) and **where it should live** (default: the current folder). If the folder exists, it asks for another name.
5. **Config questions.** If the sample ships its own config.yaml, you choose whether to overwrite it. The default is yes for mobile and no for web.
6. It runs `optics doctor` on the new project and shows the report.
7. If the report shows no blocking problems, it offers to run your first test with `optics execute`.

Quickstart never runs `optics dry_run`. It writes the same files as [`optics init`](#optics-init) and [`optics configure`](#optics-configure).

:::tip
The web path with the `playwright` sample needs no device or server. It's the fastest way to see a passing run.
:::

## `optics init`

Creates a new project folder, either blank or copied from a sample.

```text
optics init [name] [--path DIR] [--template NAME] [--force] [--git-init]
```

| Argument | Default | What it does |
|---|---|---|
| `name` | Asks for it | The project name. The project goes in `<path>/<name>`. |
| `--path` | Current folder | The parent folder. Missing folders are created. |
| `--template` | Asks in a terminal; blank otherwise | Copies a sample project. One of `calendar`, `clock`, `contact`, `gmail_web`, `mobile_web`, `playwright`, `youtube`. |
| `--force` | Off | Deletes an existing folder with the same name first. Without it, an existing folder is an error and nothing is created. |
| `--git-init` | Off | Runs `git init` in the new project. Skipped quietly if Git isn't installed. |
| `--name` | | Deprecated. Pass the name as the first argument instead. |

In a terminal without `--template`, Optics shows a numbered list: `(Blank project)`, Contacts, Clock, Calendar, YouTube, Gmail Web, Playwright Web and Mobile Web. Press [[Enter]] on a blank answer to cancel.

A blank project contains:

```tree
birch-tests/
├── config.yaml                 # commented starter config, every engine disabled
├── modules/modules.csv         # module_name,module_step,param_1,param_2,param_3
├── test_cases/test_cases.csv   # test_case,test_step
└── test_data/elements.csv      # Element_Name,Element_ID
```

| Sample | Target | Engines it uses |
|---|---|---|
| `contact` | Google Contacts on an Android emulator | Appium, EasyOCR. Includes an error definitions file. |
| `clock` | Android Clock app | Appium, Pytesseract, image templates. Shows `Run Loop`. |
| `calendar` | Android Calendar app | Appium, EasyOCR. Shows `Invoke API` and `Date Evaluate`. |
| `youtube` | YouTube on Android | Appium, EasyOCR, image templates. Shows `Condition`. |
| `gmail_web` | Gmail in Chrome | Selenium, EasyOCR. |
| `playwright` | `https://example.com` | Playwright. Needs no device or server. |
| `mobile_web` | Wikipedia search in Chrome on Android | Appium with `browserName: Chrome`, and the `appium_web` element source. See [Test mobile websites](/docs/platforms/mobile-web). |

Example:

```shell
$ optics init birch-tests --template playwright --path ~/work --git-init
```

Exit code 3 if the project already exists, the template name is unknown, or the name is empty.

## `optics configure`

Writes a project's config.yaml by asking a few questions, or opens a full editor.

```text
optics configure [folder] [--edit]
```

| Argument | Default | What it does |
|---|---|---|
| `folder` | Current folder | The project folder. It's created if it doesn't exist. |
| `--edit` | Off | Opens a full-screen editor over every config.yaml setting instead of the questions. |

**Guided mode** asks what you're automating (`android`, `ios`, `web-playwright` or `web-selenium`), then the details for that platform:

| Platform | Questions (defaults) |
|---|---|
| `android` | Device name (`emulator-5554`), platform name (`Android`), app package (`com.example.app`), main activity (`com.example.app.MainActivity`), Appium server URL (`http://127.0.0.1:4723`) |
| `ios` | Device or simulator name (`iPhone 15`), platform name (`iOS`), bundle identifier (`com.example.app`), Appium server URL |
| `web-selenium` | Selenium server URL (`http://127.0.0.1:4444/wd/hub`) |
| `web-playwright` | Browser (`chromium`), headless (no) |

For `android` and `ios`, Optics also enables the `appium_web` element source. Every platform then asks whether to find elements by on-screen text with EasyOCR, and the log level. If config.yaml already exists, Optics asks before overwriting it.

:::warning
The `web-selenium` answer writes `capabilities: {}`, which Selenium can't start with. Add `browserName: chrome` (or `firefox`) under `capabilities` before you run. See [config.yaml](/docs/reference/config#examples-by-platform).
:::

**Editor mode** (`--edit`) uses these keys: [[↑]]/[[↓]] to move, [[Space]] to edit or toggle, [[S]] to save, [[Q]] to quit. Saving rewrites the whole file and removes your comments. Editing an engine list replaces it with `enabled: true` entries and drops their `url` and `capabilities`, so we recommend guided mode or a text editor for engine settings.

```shell
$ optics configure ./birch-tests
```

## `optics doctor`

Checks your Python, installed engines, device tools and project config, and tells you what to fix.

```text
optics doctor [folder] [--check]
```

| Argument | Default | What it does |
|---|---|---|
| `folder` | None | The project to validate. Without it, doctor checks your environment only. It shows a ⚠️ row if the current folder has no config.yaml. With a folder that has no config.yaml, it shows a ❌ row. |
| `--check` | Off | Exits with code 1 if any row is ❌. Use it in CI. |

Doctor prints one row per check: ✅ ok, ⚠️ warning (optional or not yet needed) or ❌ failure. Each problem row has a `→` hint with the fix. If the terminal cannot show emoji, doctor writes `OK`, `WARN`, `FAIL` and `->` instead.

| Section | What it checks |
|---|---|
| Core | Python version (Optics needs 3.12 or later), the installed Optics version, and whether this environment allows engine installs. |
| Engines | Whether each engine package is installed: Appium, BLE, Selenium, Playwright, EasyOCR, Pytesseract, Google Vision, Gemini, OpenAI, Anthropic. |
| Mobile | `adb` on your PATH, connected Android devices, and whether the Appium server answers (the project's URL, or `127.0.0.1:4723`). |
| Web | The Playwright Chromium browser, and `chromedriver` or `geckodriver` on your PATH. If the project's Playwright entry has a `url`, the row shows ✅ "remote browser configured; no local download needed". |
| Project | With a folder: config.yaml parses and every `${NAME}` environment variable it uses is set. A ❌ `config: references` row names a missing variable. Exactly one driver is enabled, its element sources are enabled, and it has the settings it needs (for example `url`, `platformName`, and `bundleId` on iOS). |

Only project rows can be ❌. Environment rows are ✅ or ⚠️. Without `--check`, doctor always exits with 0.

Doctor doesn't check Selenium `capabilities`, and it doesn't create any output folders.

```shell
$ optics doctor ./birch-tests --check
```

## `optics setup`

Installs the optional engines Optics needs for your platform: drivers, OCR and LLM.

```text
optics setup [--install NAME [NAME ...]] [--list]
```

| Argument | What it does |
|---|---|
| (none) | Opens a full-screen picker with checkboxes for each engine. |
| `--list` | Prints every engine and bundle you can install. Wins if you also pass `--install`. |
| `--install` | Installs the named engines or bundles. |

Names are case-insensitive. You can use an engine name (`appium`, `ble`, `selenium`, `playwright`, `easyocr`, `pytesseract`, `google-vision`, `gemini`, `openai`, `anthropic`), a display name (`Gemini`, `Google Vision`) or a bundle (`mobile`, `web`, `vision`, `llm`, `all`). Pin the engine's main package with a standard specifier such as `appium==6.1.2` or `"easyocr>=1.7,<2.0"`. The version must be in the range that your Optics release supports.

`optics setup` installs into the same Python environment as Optics. If you install Playwright, it also downloads the Chromium browser. Some environments refuse installs, for example Conda, pipx and uv tool. See [Engines and extras](/docs/reference/engines#where-installs-are-refused).

The MCP server isn't an engine here. The install scripts include it; with pip, install it with `pip install "optics-framework[mcp]"`.

```shell
$ optics setup --install appium easyocr
$ optics setup --install web gemini
```

Exit code 1 if a name is unknown, a version specifier is malformed (`appium=6.1.2`), or the install fails.

## `optics dry_run`

Checks a project for mistakes without running any step on a device.

```text
optics dry_run <folder> [--runner NAME] [--use-printer | --no-use-printer]
               [--include TEST_CASE ...] [--exclude TEST_CASE ...]
```

`optics dry-run` is the same command.

| Argument | Default | What it does |
|---|---|---|
| `folder` | Required | The project folder. It must exist. |
| `--runner` | `test_runner` | The runner. Leave the default. |
| `--use-printer` / `--no-use-printer` | Printer on | Shows or hides the live result tree. |
| `--include`, `--exclude` | All test cases | Checks only some test cases. See [Pick test cases](#pick-test-cases). |

A dry run checks that:

- Each test step names a module (or a keyword).
- Each module step names a real keyword. A typo gets a suggestion: `Did you mean 'Press Element'?`
- Each `${name}` is defined, as a whole cell or inside a longer value. An unknown name fails with `Variable '${name}' in '<value>' is not defined.`

A dry run counts a variable as defined when an earlier step creates it: the first parameter of `Read Data`, `Evaluate` and `Date Evaluate`, and each `store_as=` name. Do not add placeholder rows for them.

It does not run any keyword or touch the device. It does load the engines in config.yaml, so the engine extras must be installed, a driver must be enabled, and its settings must be valid (for example non-empty Appium `capabilities`). A suite that uses only [flow control keywords](/docs/reference/keywords/flow) needs no driver.

The output and exit codes are the same as [`optics execute`](#optics-execute). In the report, each keyword that passes the check ends as `PASS`. Dry runs write `junit_output.xml` to `execution_output/` but no screenshots.

## `optics execute`

Runs every test case in a project on the real device, browser or app, and records the results.

```text
optics execute <folder> [--runner NAME] [--use-printer | --no-use-printer]
               [--include TEST_CASE ...] [--exclude TEST_CASE ...]
```

| Argument | Default | What it does |
|---|---|---|
| `folder` | Required | The project folder. It must exist. |
| `--runner` | `test_runner` | The runner. We recommend the default. `pytest` is also accepted, but it needs the `pytest-cov` package installed. |
| `--use-printer` / `--no-use-printer` | Printer on | Shows or hides the live result tree. Turn it off for plain CI logs. |
| `--include` | All test cases | Runs only the test cases with these names. |
| `--exclude` | None | Skips the test cases with these names. |

### Pick test cases

`--include` and `--exclude` work the same on `optics execute` and `optics dry_run`. Put the folder before them.

```shell
$ optics execute ./birch-tests --include "shopper can*" --exclude "Shopper can check out"
```

- Each flag takes one or more names. You can also give a flag more than once.
- Matching ignores case and extra spaces, and must match the full name. `*` and `?` are wildcards.
- You can use both flags. Optics applies `--include` first, then removes the `--exclude` matches.
- Suite Setup, Suite Teardown and the per-test setup and teardown always stay in the run. You cannot include or exclude them.
- Either flag replaces `include` and `exclude` in [config.yaml](/docs/reference/config#include-and-exclude) for that run.

Each name must match a test case. If a name matches nothing, Optics stops before it starts a session and exits with code 3. This also applies to `include` and `exclude` in config.yaml:

```terminal
╭──────────────────────────── Cannot start: E0702 ─────────────────────────────╮
│ include 'Shoper can sign in' matches no test case. Did you mean 'Shopper can │
│ sign in' or 'Shopper can check out'?                                         │
│                                                                              │
│ Available test cases:                                                        │
│   - Shopper can sign in                                                      │
│   - Shopper can add a backpack                                               │
│   - Shopper can check out                                                    │
│                                                                              │
│ Fix the names given via --include/--exclude; matching ignores case and       │
│ accepts * and ? wildcards.                                                   │
╰──────────────────────────────────────────────────────────────────────────────╯
```

Optics also stops when a name matches only setup or teardown test cases, or when no test case is left to run.

### How a run works

1. Optics walks the whole folder and finds your files by their content (see [Project files](/docs/reference/files#how-optics-finds-your-files)). It stops if there's no test cases file or no modules file.
2. It loads the config and checks the test case selection. Then it stops if no driver is enabled and the selected test cases use a keyword that needs one. A suite that uses only [flow control keywords](/docs/reference/keywords/flow), such as `Evaluate`, `Condition` and `Run Loop`, runs with no driver.
3. **Preflight.** It checks that the first enabled driver can be reached. For Appium it connects to the server URL. If the server is on this computer and the platform is Android, it also checks that `adb` finds a device. For Selenium it connects to the server URL. Playwright is skipped. If the check fails, Optics shows a "Cannot start" panel with the command that fixes it. Set `OPTICS_SKIP_PREFLIGHT=1` to skip this check.
4. It runs Suite Setup, then each test case, then Suite Teardown. A test case that fails does not stop the others. A failed setup skips the test cases that it prepares. See [Setup and teardown](/docs/reference/files#setup-and-teardown).
5. It saves a final screenshot and page source, and runs [error detection](/docs/run/error-detection) if the project has an error definitions file. This happens before Suite Teardown when the suite has one.

The printer shows a live tree, then a summary:

```terminal
Test Suite
└── Shopper can add a backpack                                     |      1.88s |    PASS
    ├── Open the store                                             |      0.85s |    PASS
    │   └── Launch App (https://www.saucedemo.com)                 |      0.85s |    PASS
```

```terminal
Total Test Cases: 1 | Passed: 1 | Failed: 0
```

When a failed setup skips test cases, the summary also shows `| Skipped: <count>`.

When a step fails, a "Failure details" box names the test, the step and the reason:

```terminal
Shopper can add a backpack → step 'Press Elemnt (//input[@id='login-button'])' — Keyword not found: Press Elemnt. Did you mean 'Press Element'? (run `optics list` to see all keywords)
```

The reason has the form `Keyword '<keyword>' failed: <code>: <message>`. If every fallback value failed, it is `Keyword '<keyword>' failed after fallback attempts; last error: <error>`. If the error has a deeper cause, `(cause: …)` comes at the end:

```terminal
Shopper can sign in → step 'Enter Text (user-name, standard_user)' — Keyword 'Enter Text' failed after fallback attempts; last error: E0201: No valid strategies found for 'user-name' in 'enter_text' (cause: E0201: Element 'user-name' not found. OCR was not tried: no text_detection engine is configured.)
```

Results go to `execution_output/` in the project: `junit_output.xml`, screenshots, `failed_steps_elements.json` when a step fails, and logs if you turn them on. See [Project files](/docs/reference/files#outputs) and [Read the results](/docs/run/results#what-each-outcome-writes).

| Exit code | When |
|---|---|
| 0 | Every test case passed. |
| 1 | A test case failed, error detection found an on-screen error, or the run could not start. Causes are missing files, no driver, a failed preflight or a missing folder. |
| 2 | The command line is not valid. |
| 3 | The test case selection is not valid. |
| 130 | You pressed [[Ctrl]]+[[C]]. |
| 143 | Optics received SIGTERM. |

Optics also writes `junit_output.xml` when you stop the run with [[Ctrl]]+[[C]] or SIGTERM. The test case in progress ends as `ERROR`, with the code E0706. The test cases that did not start are `NOT_RUN`. Suite Teardown does not run.

On-screen errors found by error detection appear in `junit_output.xml` as a failing test case. They count as a failed test case, so the exit code is 1.

```shell
$ optics execute ./birch-tests
$ OPTICS_SKIP_PREFLIGHT=1 optics execute ./birch-tests --no-use-printer
```

## `optics live`

Opens an interactive session where you type keywords, see each result straight away, and save what worked as a test.

```text
optics live [folder]
```

| Argument | Default | What it does |
|---|---|---|
| `folder` | Current folder | The project folder. It must contain a config.yaml. |

The config must enable exactly one driver and at least one element source. Without a config, `optics live` stops with an error; there are no built-in defaults. Live runs `launch_app` as soon as it starts.

Type a keyword with its parameters, for example `press_element ${sign_in}` or `enter_text ${email_field} "ana@birch.example"`. Each result appears as two lines:

```terminal
  ✓ press_element ${sign_in}
     0.31s  [XPath]
```

| Command | What it does |
|---|---|
| `/save <test_case> <module>` | Saves the steps you've run since the last save as a module and a test case in CSV. Names can't contain spaces. |
| `/device [id]` | Lists connected Android and iOS devices, or switches to one. Appium only. |
| `/elements` | Shows the named elements in the project. |
| `/screenshot` | Saves a screenshot to `screenshots/` in the project. |
| `/help` | Shows help. |
| `/quit`, `/exit` | Quits. Warns once if you have unsaved steps. |

| Key | What it does |
|---|---|
| [[Tab]] / [[Shift]]+[[Tab]] | Completes keyword names. |
| `${` | Suggests element names. |
| [[Ctrl]]+[[K]] | Opens the keyword browser. |
| [[Ctrl]]+[[N]] | Switches to plain-English mode. Needs an enabled `llm_models` entry. Tune it with [`nl_agent`](/docs/reference/config#nl-agent). |
| [[Ctrl]]+[[X]] | Stops a running plain-English instruction. |
| [[Ctrl]]+[[C]] | Quits. |

Live writes its log to `logs/optics_live_<time>.log` and its screenshots to `screenshots/session_<time>/` in the project. See [Record a test](/docs/create/record) for a full walkthrough.

## `optics serve`

Starts the HTTP API so any language or tool can drive a device through Optics.

```text
optics serve [--host HOST] [--port PORT] [--workers N]
```

| Flag | Default | What it does |
|---|---|---|
| `--host` | `127.0.0.1` | The address to listen on. |
| `--port` | `8000` | The port to listen on. |
| `--workers` | `1` | Server processes. Keep it at 1: sessions live in memory and aren't shared between processes. |

:::warning
The API has no authentication. Keep the default `127.0.0.1`, unless you are on a trusted network. On another address, the server logs a warning when it starts.
:::

Web pages cannot call the server unless you list their origins in `OPTICS_CORS_ORIGINS`. A request whose `Host` is not a loopback name gets `421`. Add other names in `OPTICS_ALLOWED_HOSTS`.

The server doesn't read config.yaml. Each session gets its settings from the request. Interactive API docs are at `http://127.0.0.1:8000/docs`. See [HTTP API](/docs/reference/http-api).

```shell
$ optics serve --port 8000
```

## `optics mcp`

Starts the MCP server, which lets an AI agent such as Claude or Cursor drive a device with Optics keywords.

```text
optics mcp [--transport stdio|http] [--host HOST] [--port PORT] [--toolset core|full]
```

| Flag | Default | What it does |
|---|---|---|
| `--transport` | `stdio` | `stdio` for agents that start the server themselves; `http` to serve at `http://<host>:<port>/mcp`. |
| `--host` | `127.0.0.1` | The address to listen on. `http` only. |
| `--port` | `8090` | The port to listen on. `http` only. |
| `--toolset` | `core`, or `OPTICS_MCP_TOOLSET` | `core` gives the agent a small set of tools. `full` also adds one tool for each keyword. |

It needs the `mcp` extra, which the install scripts include. With pip: `pip install "optics-framework[mcp]"`. The `all` bundle doesn't include it. Without the extra, the command exits with code 1 and prints the install command. See [MCP server](/docs/reference/mcp).

## `optics generate`

Turns a CSV or YAML project into pytest or Robot Framework code.

```text
optics generate <folder> [--framework pytest|robot] [--output FILE]
```

| Argument | Default | What it does |
|---|---|---|
| `folder` | Required | The project folder. |
| `--framework` | `pytest` | `pytest` or `robot`. |
| `--output` | `test_generated.py` or `test_generated.robot` | A file name, not a path. The file always goes in `<folder>/generated/Tests/`. |

It writes:

- `generated/Tests/<file>`: the generated tests.
- `generated/requirements.txt`: the packages the generated code needs.
- `generated/Tests/input_templates/`: a copy of `input_templates/` if that folder sits at the project root.

Generate has stricter needs than `optics execute`:

- The config file must be named exactly `config.yaml`.
- The project needs an elements file. Only the `Element_ID` column is used; fallback columns are ignored.
- Every `${name}` must come from the elements file. Run a suite that sets values with Evaluate, Date Evaluate or `store_as` with `optics execute`.
- Flow-control keywords (`Run Loop`, `Condition`, `Evaluate` and the rest) and a few others are skipped without a warning.
- Suite Setup and Suite Teardown become ordinary tests.

Exit code 3 if a required file is missing or two files define the same name. See [Generate code](/docs/advanced/generate).

```shell
$ optics generate ./birch-tests --framework robot --output smoke.robot
```

## `optics list`

Prints every keyword you can use, grouped by category.

```text
optics list
```

Names are printed in snake_case. In a module, write them in Title Case with spaces: `press_element` becomes `Press Element`. Matching ignores case and spaces, so both forms work.

```terminal
ActionKeyword:
  - clear_element_text
  - detect_and_press
  ...
AppManagement:
  - launch_app
  ...
```

For parameters and examples, see [Keywords](/docs/reference/keywords/).

## `optics completion`

Turns on tab completion for `optics` in bash or zsh.

```text
optics completion
```

It writes `~/.optics/optics_completion.sh` and `~/.optics/optics_completion.zsh`, then asks before it adds a `# Optics CLI autocompletion` comment and a `source` line to `~/.zshrc` or `~/.bashrc`, based on `$SHELL`. If you decline, or the terminal is not interactive, Optics leaves the file alone and prints the line to add. Other shells are not supported. Restart your shell, or run `source ~/.zshrc`, to use it. To remove it, delete the comment and the `source` line from your shell profile.

## `optics config`

Deprecated. Use [`optics configure`](#optics-configure).

```text
optics config
```

It prints a deprecation notice, then runs guided `optics configure` on the current folder. There's no global config file any more: every setting lives in the project's config.yaml.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success. For `optics execute` and `optics dry_run`, every test case passed. |
| `1` | A test case failed, error detection found an on-screen error, a check failed (`optics doctor --check`, preflight), a required file or setting is missing, or an unexpected error occurred. |
| `2` | The command line was invalid, for example an unknown flag or a missing argument. |
| `3` | The input was invalid. For `optics execute` and `optics dry_run`, a name in `--include`, `--exclude` or the config `include` and `exclude` matches no test case, or no test case is left. For other commands, it is a project that already exists, an unknown template, or files `optics generate` needs. The message starts with `Error:`. |
| `130` | You pressed [[Ctrl]]+[[C]]. Optics prints `Operation cancelled by user.` |
| `143` | Optics received SIGTERM. `optics execute` and `optics dry_run` write `junit_output.xml` before they exit. |

## Environment variables

None of these override config.yaml. Settings for `optics execute`, `dry_run` and `live` come only from the project's config.yaml.

| Variable | Used by | What it does |
|---|---|---|
| `OPTICS_SKIP_PREFLIGHT` | `execute` | Set to `1` or `true` to skip the server and device check before a run. |
| `OPTICS_HOME` | `optics` | Folder for the first-run marker. Default `~/.optics`. |
| `OPTICS_AI_SELF_HEAL` | `serve`, `mcp` | Set to `1`, `true`, `yes` or `on` to turn on AI self-heal for every session by default. |
| `OPTICS_LLM_PROVIDER` | `serve`, `mcp` | The LLM engine for self-heal: `gemini` (default), `openai` or `anthropic`. |
| `OPTICS_LLM_MODEL` | `serve`, `mcp` | The model for self-heal. Gemini defaults to `gemini-2.5-flash`; `openai` and `anthropic` need one. |
| `OPTICS_MCP_ALLOW_COORDINATE_TAPS` | `mcp` | Set to `1`, `true`, `yes` or `on` to let the agent use `press_by_coordinates`, `press_by_percentage` and `swipe`. |
| `OPTICS_MCP_TOOLSET` | `mcp` | The default for `--toolset`: `core` or `full`. Any other value stops the server. |
| `OPTICS_MCP_SESSION_IDLE_S` | `mcp` | Seconds before an unused session ends. Default `900`. `0` keeps sessions open. |
| `OPTICS_MCP_CALL_TIMEOUT_S` | `mcp` | Seconds that one tool call can take. Default `100`. |
| `OPTICS_CORS_ORIGINS` | `serve` | Web origins that can call the server, separated by commas. Empty by default, so no web page can call it. `*` stops the server with E0501. |
| `OPTICS_ALLOWED_HOSTS` | `serve`, `mcp` over HTTP | Host names that the server answers in addition to loopback names, separated by commas. When set, the check applies on any address. Other hosts get `421`. |
| `OPTICS_EVENT_DRAIN_TIMEOUT_S` | `execute`, `serve` | Seconds to wait for events to flush at the end of a run. Default `2.0`. Raise it if `junit_output.xml` is cut short on long runs. |
| `PLAYWRIGHT_BROWSERS_PATH` | `doctor`, Playwright | Where Playwright browsers are installed. |
| `GEMINI_API_KEY` or `GOOGLE_API_KEY` | Gemini | API key for the Gemini Developer API. `capabilities.api_key` in config.yaml wins over it. |
| `GOOGLE_GENAI_USE_VERTEXAI`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `GOOGLE_APPLICATION_CREDENTIALS` | Gemini, Google Vision | Use Vertex AI and Google Cloud credentials instead of an API key. |
| `OPENAI_API_KEY` | `openai` engine | API key for OpenAI. `capabilities.api_key` in config.yaml wins over it. Set `api_key_env` to read another variable. |
| `OPENAI_BASE_URL` | `openai` engine | The server to call when the entry has no `url`, such as OpenRouter or a local Ollama. |
| `ANTHROPIC_API_KEY` | `anthropic` engine | API key for the Claude API. `capabilities.api_key` in config.yaml wins over it. Set `api_key_env` to read another variable. |
| Any name in `${NAME}` | Playwright | A `${NAME}` in the Playwright `url` or in a `headers` value is read from the environment. If it is not set, the run stops with [E0501](/docs/reference/errors#e05-files-and-config). |

`Read Data` can also read any variable with `ENV:<NAME>` in a project run. `optics serve` and `optics mcp` refuse `ENV:`. `optics serve` and `optics mcp` over HTTP also refuse a `Read Data` file. See [Flow control keywords](/docs/reference/keywords/flow).

## Install scripts

The install scripts put Optics in its own virtual environment under `~/.optics` and add the `optics` command to your PATH. They don't change your system Python. Python 3.12 or later is the one prerequisite.

:::tabs{group="os"}
::tab[macOS and Linux]
```shell
$ curl -fsSL https://optics-framework.org/install | sh
```

Pass options after `sh -s --`:

```shell
$ curl -fsSL https://optics-framework.org/install | sh -s -- --extra appium,easyocr
```

| Option | Environment variable | What it does |
|---|---|---|
| `--version X.Y.Z` | `OPTICS_VERSION` | Installs a specific release. |
| `--extra a,b` | | Also installs engine extras, for example `appium,llm`. The `mcp` extra is always installed. |
| `--dir PATH` | `OPTICS_INSTALL_DIR` | Installs somewhere other than `~/.optics`. |
| `--no-modify-path` | `OPTICS_NO_MODIFY_PATH` | Leaves your shell profile alone. |
| `--dry-run` | | Prints what would happen and changes nothing. |
| `--uninstall` | | Removes Optics and the PATH line it added to your shell profile. Other files in the folder are kept. |
| `--help` | | Shows the options. |

On Windows under Git Bash, MSYS2 or Cygwin, the script stops and points you to the PowerShell installer. Inside WSL, use this script.
::tab[Windows]
```powershell
PS> irm https://optics-framework.org/install.ps1 | iex
```

Piping into `iex` can't pass parameters, so set environment variables first:

```powershell
PS> $env:OPTICS_EXTRA = "appium,easyocr"
PS> irm https://optics-framework.org/install.ps1 | iex
```

| Parameter (downloaded script) | Environment variable | What it does |
|---|---|---|
| `-Version X.Y.Z` | `OPTICS_VERSION` | Installs a specific release. |
| `-Extra a,b` | `OPTICS_EXTRA` | Also installs engine extras. The `mcp` extra is always installed. |
| `-Dir PATH` | `OPTICS_INSTALL_DIR` | Installs somewhere other than `~\.optics`. |
| `-NoModifyPath` | `OPTICS_NO_MODIFY_PATH` | Leaves your PATH alone. |
| `-DryRun` | | Prints what would happen and changes nothing. |
| `-Uninstall` | | Removes Optics and its entry in your user PATH. Other files in the folder are kept. |

To pass parameters without downloading the script, run it as a script block:

```powershell
PS> & ([scriptblock]::Create((irm https://optics-framework.org/install.ps1))) -Uninstall
```
::tab[pip]
```shell
$ python3 -m venv .venv && . .venv/bin/activate
$ pip install "optics-framework[appium,easyocr]"
```

Install into a virtual environment you control. Add [extras](/docs/reference/engines) in the brackets.
:::

See [Install Optics](/docs/get-started/install) for a step-by-step guide.
