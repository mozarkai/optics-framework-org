# Optics: create it your way, run it forever

Optics is open-source test automation for Android, iOS, web, TV and desktop. Write a test by hand, record it, describe it in plain English or hand it to your AI agent, then run that same suite on every build and every device.

- Install (macOS and Linux): `curl -fsSL https://optics-framework.org/install | sh`
- Install (Windows): `irm https://optics-framework.org/install.ps1 | iex`
- Install (pip): `pip install "optics-framework[mcp]"`
- Licence: Apache 2.0. Needs Python 3.12 or newer.
- Docs: https://optics-framework.org/docs/ (every page is also Markdown; index for agents: https://optics-framework.org/docs/llms.txt)
- HTTP API (`optics serve`, runs locally): https://optics-framework.org/openapi.json
- Source: https://github.com/mozarkai/optics-framework
- For AI agents: https://optics-framework.org/llms.txt
- Setup steps for AI agents: https://optics-framework.org/agents.md
- One-minute demo film: https://optics-framework.org/media/optics-film.mp4 (transcript: https://optics-framework.org/media/optics-film-transcript.md)

## Playground

The homepage has three playgrounds and a simulator on a demo shop app, Birch. They show what Optics does. They do not run Optics. To run the real Optics package in your browser, open https://optics-framework.org/playground.

- **Tap it, Optics writes it.** A copy of `optics live` sits next to a phone. Type a keyword, or tap the phone to type the keyword for that element. Each step runs at once and shows how Optics found the element. `/save` writes the steps that passed into `modules.csv` and `elements.csv`, with the password kept out of the module. `optics execute` then replays the suite. Under the phone, each step also shows as CSV, Python, Robot, an HTTP call and an MCP call, with replies in the form Optics gives.
- **Break the test.** Ship a new release of the app: rename the sign-in button's id, change its words, draw it as a picture, translate the app or delete the button. Each step of the fallback ladder shows if it found the button. A missing button or a "Session expired" screen is a real bug and fails the run. A button that Optics cannot find, but that still works, is a false failure; add its new text to `elements.csv` and run again.
- **Release simulator.** Set the odds that each release renames an id, rewords a label, restyles the buttons, draws text into a picture, deletes a button, signs the shopper out or flashes a server error. Then ship 25, 50 or 100 releases in a row. The same releases run three ways: one value per element, every value, and every value with AI self-heal. A table counts green runs, false failures, healed steps, test edits, bugs caught and runs with a bug unseen. Turn off `error_definitions.csv` to see a sign-out bug go unseen. The results are a simulation, not measurements. The seed and the odds make a run, and the link with `?sim=` replays it.
- **One suite, every screen.** Move the slider to run the same five-step suite on Android, iOS, the web, a TV and a production device driven over Bluetooth. Only the driver changes.

## Every test has two lives

- **The day you create it.** Someone turns a user flow into steps a machine can repeat. Optics lets that person work in a spreadsheet, on the device, in a sentence, or through an AI agent.
- **Every day after that.** The test runs the same way on every build, every device and every release, and fails only when the app is actually broken.

## Four ways to create a test

1. **Write it.** Elements, modules and test cases are plain CSV or YAML. The same keywords are also a Python library and a Robot Framework library.
2. **Record it.** Run keywords one at a time in `optics live` next to your device. Every step that works is recorded, and `/save` writes the recording into your suite as a reusable module.
3. **Describe it.** Press Ctrl+N in `optics live` and describe the flow. An AI model (Gemini, Claude, OpenAI or a local one) drives the device a step at a time, then keeps only the steps that mattered.
4. **Delegate it.** Add `optics mcp` to any MCP client. Your agent looks, taps, types and checks through its tools, and every action returns what changed on screen. When it is done, it reads the steps it ran as a ready suite.

## Every way ends in plain text

A suite is three kinds of file, in CSV or YAML, and lives in your repository next to the app it tests. Changing a test is a pull request.

- **Test cases:** which flows run, and in what order.
- **Modules:** the steps, one keyword each, reused by every test case that names them.
- **Elements:** every name mapped to the ways to find it on screen.

```csv
module_name,module_step,param_1,param_2
Sign In,Enter Text,${email_field},ava@birch.shop
Sign In,Press Element,${sign_in}
Add To Cart,Enter Text,${search_bar},trail runner
Add To Cart,Press Element,Add to cart
```

[Explain a suite](https://optics-framework.org/explain) reads one row by row and shows what `optics dry_run` would report.

## Run a suite

`optics execute <folder>` replays the suite step by step. `optics dry_run <folder>` checks every keyword and its parameters, and every element and module reference, without a device. Each run writes:

- `junit_output.xml`, written once when the run ends, also when you stop the run.
- Screenshots of the screen before each step that finds an element, and the same screen with a box around what Optics found.
- Detected errors: crash dialogs and messages matched from `error_definitions.csv` on the last screen add a failure to the JUnit report, even without an assertion.

Birch, the demo shop in these examples, is a real web app at https://optics-framework.org/birch/. A real run of the Birch suite against two releases of it, with every file Optics wrote and the commands to run it yourself, is at https://optics-framework.org/run. Release 2.2 passes every step and fails the run, because the last screen shows "Session expired".

## How Optics finds an element

Every element can have several identities, tried cheapest first:

1. **XPath:** a native query through the accessibility tree.
2. **Text:** the visible text, CSS or class in the page source.
3. **OCR:** reads the screenshot with Apple Vision, RapidOCR, EasyOCR, Tesseract or Google Vision.
4. **Image:** matches a reference picture of the element on screen.
5. **AI self-heal (optional):** an LLM reads the screen and recovers with the same keywords.

Change the sign-in button of a demo shop app and watch Optics climb the ladder, then simulate a hundred releases: https://optics-framework.org/releases

## One suite, every screen

The same `modules.csv` runs on a phone, in a browser, on a TV and on a locked production device. Only the driver changes:

- **Android:** `appium` with UiAutomator2. Press Element taps the element.
- **iOS:** `appium` with XCUITest. Press Element taps the element.
- **Web:** `playwright` with Chromium. Press Element clicks the element.
- **TV:** `appium` with TizenTV. Press Element presses the arrow keys until the element has focus, then ENTER.
- **Production device:** `ble` with `camera_screenshot`. Press Element moves a Bluetooth mouse and clicks.

Locked phones, TVs, games and other hard targets, each with the suite lines that drive it: https://optics-framework.org/hard-targets

## Where suites run

- **On every build:** in CI. `optics execute` exits with 1 when a test fails, and the JUnit report becomes a check on the pull request. On-screen error detection runs too. GitLab and Android versions: https://optics-framework.org/docs/run/ci
- **Before every release:** on your own emulator or device, with annotated screenshots.
- **On every device:** Android, iOS, Android TV, Samsung Tizen, LG webOS and macOS, Linux and Windows desktop apps through Appium; web through Selenium or Playwright.
- **In production:** on a schedule against your live app, including a Bluetooth driver for locked-down devices.

```yaml
# .github/workflows/optics.yml
name: Optics
on: [push, pull_request]
permissions:
  contents: read
  checks: write
jobs:
  web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-python@v7
        with:
          python-version: "3.12"
      - run: pip install "optics-framework[playwright]==1.11.5"
      - run: python -m playwright install --with-deps chromium
      - run: optics execute birch-tests --no-use-printer
      - if: always()
        uses: mikepenz/action-junit-report@v6
        with:
          report_paths: birch-tests/execution_output/junit_output.xml
```

## Built in the open

- 9,347 downloads from PyPI by pip, uv and requests, 18 Apr 2025 to 17 Nov 2026, out of 75,053 downloads in all (the rest are mirrors, browsers and unnamed clients). Source: PyPI public download logs via ClickPy, https://clickpy.clickhouse.com/dashboard/optics-framework.
- 100 stars and 30 forks on GitHub, read 18 Nov 2026. Source: https://github.com/mozarkai/optics-framework.
- 12 releases in the 90 days to 18 Nov 2026. Source: https://github.com/mozarkai/optics-framework/releases.

What the last three releases added:

- [1.11.4](https://github.com/mozarkai/optics-framework/releases/tag/1.11.4), 17 Nov 2026:
  - Name the report after the project name kept in config.yaml (https://github.com/mozarkai/optics-framework/pull/719)
  - Cut agent turns and tokens, and fix what the runs found (https://github.com/mozarkai/optics-framework/pull/720)
  - Drive desktop apps through the Xa11y driver (https://github.com/mozarkai/optics-framework/pull/714)
- [1.11.3](https://github.com/mozarkai/optics-framework/releases/tag/1.11.3), 10 Nov 2026, 9 fixes:
  - Keep small models on the target name (https://github.com/mozarkai/optics-framework/pull/704)
  - Accept API keys in config.yaml (https://github.com/mozarkai/optics-framework/pull/706)
  - Mark setup and teardown in the report and stop tests a failed setup guards (https://github.com/mozarkai/optics-framework/pull/712)
- [1.11.2](https://github.com/mozarkai/optics-framework/releases/tag/1.11.2), 6 Nov 2026, 8 fixes:
  - Drive MCP and live NL mode by refs from one screen snapshot (https://github.com/mozarkai/optics-framework/pull/673)
  - Remote browsers over CDP/Playwright protocol, configurable timeouts and phone emulation (https://github.com/mozarkai/optics-framework/pull/629)
  - Drive mobile web pages through the webview context (CSS / DOM XPath) (https://github.com/mozarkai/optics-framework/pull/631)
  - Start a new context signed in from a storage_state file (https://github.com/mozarkai/optics-framework/pull/656)
  - Resolve environment variables and relative paths in config files (https://github.com/mozarkai/optics-framework/pull/688)
  - Fetch screenshots over HTTP with a bearer token (https://github.com/mozarkai/optics-framework/pull/658)
  - Run optics execute cleanly inside an environment (https://github.com/mozarkai/optics-framework/pull/690)
  - Press, type and clear on TV web apps with D-pad focus (https://github.com/mozarkai/optics-framework/pull/693)

## Get started

```sh
curl -fsSL https://optics-framework.org/install | sh
optics quickstart
optics execute my_test_project
```

## Or hand it to your agent

Paste one line into Claude Code, Codex, Cursor or any agent that runs commands. The agent follows https://optics-framework.org/agents.md: it finds or installs Optics, connects the MCP server, checks that it works in a headless browser, then does the task. It asks you only for what it cannot do: a device, credentials, a `sudo` command or a restart of the agent.

- Set up Optics: `Read https://optics-framework.org/agents.md and follow it to set up Optics.`
- Test a web app: `Read https://optics-framework.org/agents.md and follow it to set up Optics, then test my web app.`
- Test a phone app: `Read https://optics-framework.org/agents.md and follow it to set up Optics, then test my Android or iOS app.`
- Run a suite in CI: `Read https://optics-framework.org/agents.md and follow it to set up Optics, then run my Optics suite in CI.`

## From the blog

- [Self-heal broken locators with a 2B model on your own GPU](https://optics-framework.org/blog/small-model-self-heal.md): article, 9 Nov 2026, by Chinmay Jha. I taught Qwen3.5-2B the Optics Framework self-heal job with a weight edit and with a LoRA. On a Pixel 4a with Optics Framework 1.11.3, the LoRA model healed 113 of 114 broken locators.
- [Your AI agent writes the test once. Optics runs it with no model.](https://optics-framework.org/blog/ai-agent-writes-the-test-once.md): article, 20 Oct 2026, by Chinmay Jha. An AI agent drives a real browser through the Optics MCP server and writes a CSV test suite. Later runs replay that suite with no model, in about 3 seconds.
- [Your tests passed. Your app didn't.](https://optics-framework.org/blog/your-tests-passed-your-app-didnt.md): article, 16 Oct 2026, by Chinmay Jha. Error definitions catch crash dialogs, "Session expired" and other error screens that no step checked for. List the messages in one CSV file, and Optics looks for them on the last screen of every run.
- [Introducing Optics Framework: create a test your way, run it forever](https://optics-framework.org/blog/introducing-optics-framework.md): article, 11 Oct 2026, by Chinmay Jha. Optics is an open-source test automation framework for Android, iOS, web and TV apps. Tests are CSV or YAML files, and each element on screen can have several locators.

All posts and videos: https://optics-framework.org/blog


- [About](https://optics-framework.org/about)
- [Contact](https://optics-framework.org/contact)
- [Privacy](https://optics-framework.org/privacy)
