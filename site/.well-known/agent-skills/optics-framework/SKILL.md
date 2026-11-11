---
name: optics-framework
description: Drive Android, iOS, smart TV, desktop app and browser sessions with the Optics (optics-framework) MCP server, and write or fix Optics CSV/YAML test suites (test_cases, modules, elements, error_definitions). Use when automating or testing a real app UI with Optics, or when an Optics keyword name, parameter or default is uncertain.
license: Apache-2.0
---

# Optics (optics-framework)

Optics is newer than your training data. Do not guess keyword names, parameters or defaults:
look them up in the docs below, or read the MCP server's `optics://keywords` resource.

## Documentation

- Docs index for agents: https://optics-framework.org/docs/llms.txt
- Keyword reference: https://optics-framework.org/docs/reference/keywords/index.md
- MCP server (tools, resources, env vars): https://optics-framework.org/docs/reference/mcp.md
- Write a suite (CSV and YAML): https://optics-framework.org/docs/create/write.md
- YAML rules: https://optics-framework.org/docs/create/yaml.md
- config.yaml: https://optics-framework.org/docs/reference/config.md
- CLI: https://optics-framework.org/docs/reference/cli.md
- Error codes: https://optics-framework.org/docs/reference/errors.md
- Mobile web (Chrome, Safari, WebViews): https://optics-framework.org/docs/platforms/mobile-web.md

## Drive a device or browser over MCP

1. `start_session` with `driver` (`appium`, `playwright`, `selenium` or `ble`), `url`,
   `capabilities` and, to open something at once, `app`. It returns the screen as rows with
   refs: `e4 input "Login" [tap] #login-button`. With one session open, `session_id` is optional.
   - Web: `driver: "playwright"`, `capabilities: {"headless": true}`, `app: "<url>"`.
     Phone emulation: `capabilities: {"device": "Pixel 7"}`.
   - Mobile and TV: an Appium server must already be running (default
     `http://127.0.0.1:4723`); the device goes in the capabilities (`udid`, `deviceName`, ...).
   - Desktop (macOS, Linux, Windows): Appium with appium-xa11y-driver must run on the computer
     that shows the app. `capabilities: {"platformName": "Mac", "automationName": "Xa11y"}`
     (or `Linux`, `Windows`) and `app`: a bundle id on macOS, an executable elsewhere.
     `press_key` takes a key combination such as `primary+s`; `"back"` fails on a desktop.
2. Act on refs with `tap`, `type_text`, `scroll`, `press_key` (`"back"` goes back) and
   `launch_app`. Add `expect_present` / `expect_absent` so the reply says `verified: pass`.
   Every action returns what changed on screen; call `observe` only to search the rows
   (`query`), get a screenshot, or list every row.
3. `check` waits for text to be present or absent. `run_keyword` runs any other keyword, such as
   `assert_text` or `select_dropdown_option`; an element parameter can be a ref.
4. A failure returns `[E0201] …`, a `Next:` hint and the current rows. Do not repeat the same
   failed call: the server refuses a fourth identical try. Do not tap by coordinates.
5. Read `optics://session/{session_id}/steps` for the run as ready `modules_csv` and
   `elements_csv`. Secrets come back as `<redacted>`; replace them with `@:value` or a
   `Read Data,${name},ENV:NAME` step.
6. `terminate_session` when done. Idle sessions end after 900 s. Sessions live only inside this
   server process.

`optics mcp --toolset full` adds one tool per keyword. Look up codes on the error codes page.

## Write a suite

A project is `config.yaml` plus CSV or YAML files. Optics classifies each file by its contents,
not its name or folder, and resolves module and element names across all files and both formats.
Scaffold one with `optics init <name>`.

A CSV is classified by its header row:

| header | the file holds |
| --- | --- |
| `test_case,test_step` | test cases, each a list of modules run in order |
| `module_name,module_step,param_1,...` | modules, each a list of keyword steps |
| `Element_Name,Element_ID` | elements; repeat a name for fallback locators, tried in order |
| `error_code,match_string` | error definitions (CSV only, no YAML form) |

Header names are read in any case. A byte order mark (BOM) at the start of the file breaks
detection, so save CSV files as plain UTF-8.

Step rules:

- Keyword names are case-insensitive: `Press Element`, `press_element`.
- `${name}` is replaced by the element called `name`. As the whole value, each fallback is tried;
  inside longer text, the first value is used. `$${name}` gives a literal `${name}`.
- `store_as=<name>` keeps a keyword's return value (e.g. `Get Text,${price_label},store_as=price`)
  for later steps and test cases.
- Assert Text fails the step on wrong text, and Assert Equality on different values. Validate Screen never fails it.
- `name=value` sets a parameter by its real name (e.g. `timeout_str=20`).
- Wrap a CSV value that contains commas in double quotes.

YAML holds `Test Cases`, `Modules` and `Elements` in one file. Its traps fail quietly:

1. Section keys are exact: `Test Cases`, `Modules`, `Elements`. `test_cases:` loads nothing.
2. `Test Cases` and `Modules` are lists of single-key mappings (`- Sign In:`), not plain mappings.
3. A step is one string: keyword, then values split on spaces. Quote any value with a space:
   `Press Element "Sign in"`. Quote XPaths.

```yaml
Test Cases:
  - Shopper can sign in:
      - Sign In
Modules:
  - Sign In:
      - Launch App
      - Enter Text ${email_field} ava@example.com
      - Press Element "Sign in"
      - Assert Presence "Welcome"
Elements:
  email_field: "//*[@resource-id='com.example:id/email']"
```

## Run it

- `optics dry_run <folder>` checks the suite without a device.
- `optics execute <folder>` runs it and writes `execution_output/junit_output.xml`.
- `optics list` prints every keyword; `optics doctor` checks the environment.
