---
title: Troubleshooting
summary: Fix the most common problems with installing, configuring and running Optics.
---

Problems are grouped by when they happen and named by the message Optics prints, so you can search this page for the words on your screen. Start with `optics doctor <project>`, which finds many of these for you. For messages with a code such as `E0201`, see [Error codes](/docs/reference/errors).

## Installing

### `optics: command not found` {#command-not-found}

Your shell can't find the `optics` command. The installer adds it to your PATH, but only new terminals pick that up.

Open a new terminal. If it still fails, add `~/.optics/bin` to your PATH, as the installer printed. With pip, activate the virtual environment you installed into.

### Optics needs Python 3.12 or newer {#python-version}

Optics runs on Python 3.12 and later. pip on an older Python reports that no matching version of `optics-framework` exists.

Check with `python3 --version`, then install a current Python from [python.org](https://www.python.org/downloads/) or use the installer, which sets up its own environment. See [Install Optics](/docs/get-started/install).

### "Cannot start": Optics could not load one of its dependencies {#cannot-load-dependencies}

Every command stops with a red panel because a package Optics needs is missing or broken. This usually follows a partial upgrade or a package installed into the wrong environment.

Run the reinstall command shown in the panel, for example `pip install --force-reinstall optics-framework`. It matches the way you installed Optics.

### `optics setup` refuses to install {#setup-refuses}

`optics setup` and `optics quickstart` won't install engines into environments that another tool manages: Conda, pipx, `uv tool`, and project environments run by uv, Poetry, PDM or Pipenv. They also refuse a system Python marked as externally managed.

Run the command the message suggests, such as `pipx inject optics-framework …` or `poetry add …`. Or install Optics into a plain virtual environment, where `optics setup` works. See [Where installs are refused](/docs/reference/engines#where-installs-are-refused).

### EasyOCR fails under Conda {#easyocr-conda}

EasyOCR and Optics need different major versions of NumPy under Conda, so they can't share a Conda environment.

Use the installer or a standard `venv` instead of Conda.

### The MCP server isn't installed by `optics setup` {#mcp-not-installed}

`optics setup --install mcp` reports `Invalid engine(s): mcp`, and the `all` bundle leaves the MCP server out.

Install it with pip: `pip install "optics-framework[mcp]"`. See [MCP server](/docs/reference/mcp#install).

## Setting up a project

### "No driver enabled in …/config.yaml" {#no-driver-enabled}

No entry under `driver_sources` has `enabled: true`. Optics also prints this when it couldn't read `config.yaml` at all, for example because of a YAML syntax error or a value of the wrong type, and fell back to defaults.

- Run `optics doctor <project>`. Its `config: file` row shows whether the file parses.
- Set `enabled: true` on one driver, or run `optics configure <project>` to write a working config.
- Check indentation: each engine is a list item, as in `- appium:` followed by its settings indented below.

### "Missing required files in …: test_cases, modules" {#missing-required-files}

Optics finds files by their header row, not their names, and found no test cases file or no modules file.

Check that the first line of each file is exactly right: `test_case,test_step` for test cases and `module_name,module_step,param_1,…` for modules. A spreadsheet app can add an invisible character to the first cell when it saves as "CSV UTF-8", so save as plain CSV. See [How Optics finds your files](/docs/reference/files#how-optics-finds-your-files).

### "Cannot start" panel: "No Appium server reachable at …" {#no-appium-server}

Before a run, `optics execute` checks that the Appium server answers at the `url` in `config.yaml`. Nothing is listening there.

Start the server in another terminal with `appium`, then run again. If the server runs on another port or machine, fix `url` under `driver_sources`. On Android, the same panel appears when `adb` isn't installed or no device is connected; check with `adb devices`.

### "Cannot start" panel for Selenium {#selenium-not-reachable}

No Selenium server answers at the `url` in `config.yaml`.

Start one, for example with Docker: `docker run -d -p 4444:4444 selenium/standalone-chrome`. Check that `url` in `config.yaml` points to it, usually `http://localhost:4444/wd/hub`.

### "Selenium capabilities not found in config" {#selenium-capabilities}

The Selenium driver needs a `browserName` under `capabilities`. `optics configure` writes `capabilities: {}` for Selenium, which can't start, and `optics doctor` doesn't catch it.

Add `browserName: chrome` or `browserName: firefox` under `capabilities`. Those are the only two browsers the Selenium driver supports. See [config.yaml examples](/docs/reference/config#examples-by-platform).

### `E0104` Appium capabilities not found or unsupported platform {#appium-capabilities}

The Appium driver needs non-empty `capabilities` with a `platformName` of `Android`, `iOS`, `TizenTV` or `LGTV`.

Fill in the capabilities for your platform. Run `optics configure <project>` to answer a few questions instead of writing them by hand. See [Error codes](/docs/reference/errors#e01-driver-and-session).

### YAML test cases load nothing {#yaml-test-cases}

A YAML file with `test_cases:` at the top is recognized as a test cases file but loads no tests. The run then stops with "No test cases to run". Section names in YAML suites are exact.

Use `Test Cases:`, `Modules:` and `Elements:`, with that capitalization and spacing. See [Section names are exact](/docs/create/yaml#section-names-are-exact).

### Elements file loads no elements {#elements-header-case}

The header must start with exactly `Element_Name`. A file headed `element_name,element_id` is recognized as an elements file but loads nothing, so every `${name}` fails with "Element not found".

Change the header to `Element_Name,Element_ID`. Extra value columns must also start with `Element_ID`, such as `Element_ID_text`. See [Define elements](/docs/elements/define#write-elements).

### My config.yaml changes have no effect {#config-ignored}

Optics ignores keys it doesn't know, so a typo such as `driver_source` is skipped without a warning. If your project folder holds more than one YAML file with `driver_sources` and `elements_sources`, `optics execute` uses the last one it finds, which may not be the one you edited.

Check the spelling against [config.yaml](/docs/reference/config#top-level-keys). Keep one config file per project; to switch targets, copy a different file into place. See [Run the same suite on different devices](/docs/create/organise#run-the-same-suite-on-different-devices).

## Finding elements

### "Element not found: <name>" {#element-not-found-name}

A step uses `${name}`, and no elements file defines `name`. The step fails before Optics looks at the screen.

- Add a row for `name` to `test_data/elements.csv`, and check the spelling and case.
- If a step creates the value while running, such as `Evaluate` or `Read Data`, add a placeholder row (`order_total,placeholder`) so `optics dry_run` accepts it.
- If every name fails, check the elements header. See [Elements file loads no elements](#elements-header-case).

### `[E0201]` No valid strategies found {#e0201}

Optics looked for the element every way it could and didn't find it on the current screen.

- Check the value against the screen. In `optics live`, try it with `assert_presence` and see whether it's found.
- If the element appears late, put `Assert Presence` before the step. Actions don't wait.
- For text drawn inside images, enable a [text detection engine](/docs/elements/text-and-images#turn-on-ocr) and a screenshot source.
- Add fallback values, so a second way can take over when the first breaks.

See [`E0201` and `X0201`](/docs/reference/errors#e02-elements).

### A text value is treated as an XPath or CSS selector {#text-looks-like-locator}

Optics decides what a value is from how it looks. Text that starts with `(` or `/`, or contains `[` and `]`, is read as an XPath or CSS selector: `(optional)`, `Price [USD]`, `.com`.

Put `text=` in front to force text, for example `text=(optional)`. See [Choose the kind of value](/docs/elements/define#choose-the-kind-of-value).

### `id:` values always fail {#id-locators}

No element source supports values written as `id:login`, so they fail with `E0201` every time.

Use an XPath on the id instead, for example `//*[@resource-id='com.birch.shop:id/login']` on Android or `//*[@id='login']` on the web.

### Assert Presence with several elements fails {#assert-presence-commas}

Assert Presence, Assert Visibility and Validate Screen separate elements with `|`, not commas. In a CSV, a comma starts a new cell, so the second element becomes the timeout and the step fails with `ValueError: invalid literal for int()`.

Write `Assert Presence,Welcome|Picked for you,20`. See [Check several elements at once](/docs/reference/keywords/verification#check-several-elements-at-once).

### Images aren't found {#images-not-found}

Image values refer to a picture by file name, and Optics searches the whole project folder for it.

- Use the file name only (`cart_icon.png`), not a path.
- Keep the picture inside the project folder, and give every picture a unique file name. Two files with the same name in different folders replace each other.
- Use `.png`, `.jpg`, `.jpeg` or `.bmp`. Other formats aren't treated as images.
- Enable `templatematch` under `image_detection` and a screenshot source under `elements_sources`.

See [Capture a good template](/docs/elements/text-and-images#capture-a-good-template).

### OCR is slow on the first run {#ocr-slow}

EasyOCR downloads its models the first time it runs, and loads them at the start of every run. The first run can take minutes on a slow connection.

Let the first run finish once; later runs reuse the download. To make OCR faster in general, list UI tree sources before screenshot sources and use an [area of interest](/docs/elements/area-of-interest). See [Speed things up](/docs/elements/text-and-images#speed-things-up).

### The wrong match is tapped {#wrong-match}

The same text or picture appears more than once on screen, and Optics took the first match.

Add `index=1` to pick the second match, counting from 0, or narrow the search with an [area of interest](/docs/elements/area-of-interest). See [Pick one of several matches](/docs/elements/define#pick-one-of-several-matches).

## Running tests

### "Keyword not found: X. Did you mean …" {#keyword-not-found}

A module step names a keyword that doesn't exist, usually because of a typo. Optics suggests the closest real name.

Fix the spelling. Case and spaces don't matter, so `Press Element` and `press element` both work. Run `optics list` to see every keyword.

### A module that calls another module reports "Keyword not found" {#nested-module}

A module step that names another module is read as a keyword name.

Call the other module with `Execute Module`: `Checkout,Execute Module,Sign In`. See [Execute Module](/docs/reference/keywords/flow#execute-module).

### Enter Text or Press Element acts before the page loads {#actions-dont-wait}

Action keywords act on the screen as it is at that moment. They don't wait for a page or screen to finish loading, so they fail or act on the wrong screen.

Put `Assert Presence` before the action, which waits up to 30 seconds by default: `Search,Assert Presence,${search_bar},15`. Use `Detect And Press` for pop-ups that may or may not appear. See [Action keywords don't wait](/docs/reference/keywords/#action-keywords-dont-wait).

### `${name}` is typed literally {#variable-typed-literally}

Optics substitutes `${name}` only when it fills the whole cell. `Hello ${name}` is typed exactly as written.

Put the complete value in the elements file and use it on its own: `greeting,Hello Ava`, then `Enter Text,${message_field},${greeting}`. To build a value from parts, use [Evaluate](/docs/reference/keywords/flow#evaluate), which substitutes inside expressions.

### Condition with numbers fails with `E0403` {#condition-numbers}

Condition compares values as text, so `${count} > 5` can't be evaluated.

Compare with quoted values: `${count} == '7'` or `${status} == 'ready'`. For greater-than or less-than, compute the result with Evaluate first, then test it: see [Compare numbers](/docs/reference/keywords/flow#compare-numbers).

### Evaluate or Read Data fails when the target is `${x}` {#write-target-bare-name}

The first value of Evaluate, Date Evaluate and Read Data, and the variable names in Run Loop, name a variable to write. Written as `${total}`, Optics tries to read `total` first and fails with "Element not found: total".

Write the name without `${}`: `Calc,Evaluate,total,${price} + 3`. See [Flow control keywords](/docs/reference/keywords/flow).

### `ValueError: invalid literal for int()` {#invalid-literal-int}

A parameter that must be a whole number got something else. Two causes are common: a timeout or count with a decimal point, such as `2.5`, and an empty cell. Empty cells are dropped, so the values after them shift left into the wrong parameter.

Use whole numbers. To skip a parameter, name the next one instead of leaving a gap: `Press Element,${sign_in},index=1`.

### Per-test Setup runs only around the first test case {#per-test-setup}

In 1.10.5, a test case named `Setup` or `Teardown` (without "suite") runs only before or after the first regular test case, not around each one.

Use `Suite Setup` and `Suite Teardown`, which run once and work as expected. If each test needs a fresh start, open and close the app inside that test's own modules. See [Setup and teardown](/docs/reference/files#setup-and-teardown).

### A test step runs nothing {#step-runs-nothing}

A test case step that names a keyword instead of a module passes without doing anything.

List modules in `test_cases.csv`, and put keywords inside modules in `modules.csv`.

### Assert Equality never fails {#assert-equality}

Assert Equality and Validate Screen return false on a mismatch but never fail a step.

Use Assert Presence or Validate Element to check what's on screen. See [Keywords that never fail a step](/docs/reference/keywords/#keywords-that-never-fail-a-step).

### Screenshots are missing on Windows {#windows-screenshots}

Some screenshot names contain a time with colons, such as `+05:30`. Windows doesn't allow colons in file names, so those images may not be saved. The run itself isn't affected.

The screenshots Optics takes before each step use names without colons, so they're still saved. Use those and `junit_output.xml` to see what happened.

### Screenshots are missing from a custom output folder {#output-folder-missing}

When you set `execution_output_path` yourself, Optics doesn't create the folder. Results and logs create it, but screenshots fail to save without a warning.

Create the folder before the run. See [config.yaml](/docs/reference/config#top-level-keys).

### `optics dry_run` fails without a device {#dry-run-needs-engines}

A dry run doesn't tap or type, but it still starts the engines in `config.yaml`. Every enabled engine must be installed, a driver must be enabled, and its settings must be valid.

Install the engines with `optics setup --install <name>`, and run `optics doctor <project>` to find what's missing. You don't need a device or a running Appium server for a dry run.

## optics live

### "optics live supports exactly one enabled driver" {#live-one-driver}

`optics live` drives one target at a time, and your `config.yaml` enables more than one driver.

Set `enabled: false` on every driver except the one you want.

### "optics live needs a config.yaml with an enabled driver and elements source" {#live-needs-config}

`optics live` found no config file in the folder. Without a folder argument, it uses the current folder.

Run it from your project folder, or pass the folder: `optics live my-project`. Live has no built-in defaults.

### "No enabled source in config.yaml's elements_sources" {#live-no-element-source}

Live needs at least one element source enabled.

Enable the sources for your driver, such as `appium_find_element`, `appium_page_source` and `appium_screenshot`.

### Every step fails with "run `launch_app` first" {#live-launch-app}

The app didn't open when the session started, so no keyword can run (`E0101`).

Check the server and device with `optics doctor <project>`, then type `launch_app` and read its error.

### `[E0901]` Named element is not defined in this project {#live-e0901}

You typed `${name}`, and no elements file in the project defines it.

Add the name to `test_data/elements.csv`, or type the value directly. Run `/elements` to see the names live found.

### "Unknown keyword: … Keywords use snake_case" {#live-unknown-keyword}

Live didn't recognize the first words you typed as a keyword.

Check the spelling and the suggestion in the message. Press [[Tab]] to complete names, or [[Ctrl]]+[[K]] to browse them.

### `/save` prints "Usage: /save <test_case> <module_name>" {#live-save-usage}

`/save` takes exactly two names, and names can't contain spaces.

Use underscores: `/save Checkout Sign_In`. Rename them in the CSV files afterwards if you like.

### Find the session log {#live-log}

Live writes a full log to `logs/optics_live_<time>.log` in the project folder, and prints its path when you quit. Attach it when you [report a problem](/docs/help/#ask-a-question-or-report-a-bug).

## AI features

### "No LLM engine is enabled" {#no-llm-engine}

You pressed [[Ctrl]]+[[N]] in `optics live`, and `config.yaml` has no enabled `llm_models` entry.

Add one, then restart `optics live`:

```yaml title="config.yaml"
llm_models:
  - gemini:
      enabled: true
```

Use `openai` or `anthropic` for those providers. See [Describe a test in plain English](/docs/create/describe#before-you-begin).

### `E0601`: the LLM engine requires an optional dependency {#llm-not-installed}

An engine is enabled under `llm_models`, but its extra isn't installed. The message names the engine.

Install it by that name, for example `optics setup --install openai`.

### `E0601`: the LLM engine needs a model or a key {#llm-not-configured}

The `openai` and `anthropic` engines have no default model, so set `capabilities.model`. The `openai` engine also stops when it finds no key and no `url`: set `OPENAI_API_KEY`, or the variable you named in `api_key_env`. See [llm_models](/docs/reference/config#llm-models).

### `E0801` or authentication errors from the model {#llm-auth}

The model provider rejected the request, usually because the key is missing, wrong or out of quota, or the model name is wrong.

Set your engine's key (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or the variable in `api_key_env`) in the terminal you run Optics from, and check your quota with the provider. See [Environment variables](/docs/reference/cli#environment-variables).

### AI self-heal does nothing {#self-heal-inactive}

Self-heal needs `ai_self_heal: true`, an enabled `llm_models` entry, the AI engine, a key, and a screenshot source. If any is missing, Optics logs "AI self-heal enabled but no usable LLM" or skips self-heal without a message.

Check each item in [Turn it on](/docs/elements/self-heal#turn-it-on). Self-heal only helps steps that find and act on an element; Assert Presence and other checks never self-heal.

### A plain-English instruction stops before it's done {#ai-run-stops}

Each instruction stops after 15 steps, after 3 failed steps in a row, or after repeated taps and swipes that don't get closer ("Repeated gesture/coordinate actions did not reach the goal").

Break the goal into smaller instructions, and use the words shown on screen. See [Write goals the model can finish](/docs/create/describe#write-goals-the-model-can-finish).

## Web and Playwright

### "Object of type Locator is not JSON serializable" {#locator-not-serializable}

On Optics 1.10.5, Enter Text and Get Text fail in Playwright with this error. The fix ([pull request #600](https://github.com/mozarkai/optics-framework/pull/600)) ships in the next release.

Until you upgrade, click the field and type in two steps:

```csv title="modules/modules.csv"
Sign In,Press Element,${email_field}
Sign In,Enter Text Direct,ava@birch.shop
```

### The Playwright sample's "TC1 Verify Landing" fails {#playwright-sample-fails}

On 1.10.5, the `playwright` sample checks for text that example.com no longer shows.

Open `test_data/elements.csv` in the project and replace the `Heading` row with:

```csv title="test_data/elements.csv"
Heading,text=This domain is for use in documentation examples
```

### Playwright ignores `headless`, `browser` and `viewport` {#playwright-settings-ignored}

In 1.10.5, Playwright reads none of the settings under `capabilities`. It always opens a visible Chromium window at 1280×800.

There's no workaround in config. On a Linux CI machine without a display, run Optics under a virtual display such as `xvfb-run optics execute my-project`.

### The Playwright browser isn't installed {#playwright-browser-missing}

`optics doctor` shows ⚠️ on the `playwright browser` row, or Playwright fails to launch Chromium.

Run `optics setup --install playwright` again. It downloads the Chromium build Playwright needs.

### A password typed with `@:` shows the prefix {#playwright-at-prefix}

Playwright types the `@:` prefix that masks secrets in logs, unlike Appium and Selenium.

Don't use `@:` with Playwright. Use test accounts whose passwords are safe to appear in logs, and keep log files private.

## CI

### The run passes, but CI shows a failed test {#ci-on-screen-error}

When your project has an [error definitions file](/docs/run/error-detection), Optics checks the last screen for known error messages at the end of `optics execute`. A match adds a failing test case named `on-screen-error-detection` to `junit_output.xml`, but doesn't change the exit code or the summary in the terminal.

Open `execution_output/detected_errors_<session>.json` to see which message matched. Fix the app, or the definition if it matched by mistake.

### `optics doctor --check` passes even with a broken config {#doctor-check-no-folder}

Without a folder, doctor checks your machine but not any `config.yaml`, so `--check` can't fail on config problems.

Always pass the project: `optics doctor ./my-project --check`.

### The preflight fails in CI {#ci-preflight}

Your CI starts the Appium or Selenium server in a way the preflight check can't reach, or starts it after Optics.

Wait for the server before running Optics. If you're sure it's reachable, set `OPTICS_SKIP_PREFLIGHT=1` to skip the check.

### `junit_output.xml` is cut short {#junit-truncated}

On long runs, Optics may stop before every result is written.

Set `OPTICS_EVENT_DRAIN_TIMEOUT_S` to a higher value, such as `10`. See [Environment variables](/docs/reference/cli#environment-variables).

### CI logs are full of progress output {#ci-logs}

The live result tree redraws itself, which clutters plain CI logs.

Run `optics execute my-project --no-use-printer`, and set `file_log: true` to keep full logs as build artifacts.

### `--runner pytest` fails {#runner-pytest}

The pytest runner needs the `pytest-cov` package, which Optics doesn't install.

Use the default runner by leaving out `--runner`. To run tests under pytest, generate pytest code with [`optics generate`](/docs/advanced/generate) instead.
