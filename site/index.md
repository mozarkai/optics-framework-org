# Optics: create it your way, run it forever

Optics is open-source test automation for Android, iOS, web and TV. Write a test by hand, record it, describe it in plain English or hand it to your AI agent, then run that same suite on every build and every device.

- Install (macOS and Linux): `curl -fsSL https://optics-framework.org/install | sh`
- Install (Windows): `irm https://optics-framework.org/install.ps1 | iex`
- Install (pip): `pip install optics-framework`
- Licence: Apache 2.0. Needs Python 3.12 or newer.
- Docs: https://optics-framework.org/docs/ (every page is also Markdown; index for agents: https://optics-framework.org/docs/llms.txt)
- HTTP API (`optics serve`, runs locally): https://optics-framework.org/openapi.json
- Source: https://github.com/mozarkai/optics-framework
- For AI agents: https://optics-framework.org/llms.txt
- Setup steps for AI agents: https://optics-framework.org/agents.md

## Playground

The homepage has three playgrounds and a simulator on a demo shop app, Birch. They show what Optics does. They do not run Optics.

- **Tap it, Optics writes it.** A copy of `optics live` sits next to a phone. Type a keyword, or tap the phone to type the keyword for that element. Each step runs at once and shows how Optics found the element. `/save` writes the steps that passed into `modules.csv` and `elements.csv`, with the password kept out of the module. `optics execute` then replays the suite.
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

`optics execute <folder>` replays the suite step by step. `optics dry_run <folder>` validates every keyword, element and module reference without a device. Each run writes:

- `junit_output.xml`, written as the run goes so CI sees progress live.
- Screenshots of the screen before each step that finds an element, and the same screen with a box around what Optics found.
- Detected errors: crash dialogs and messages matched from `error_definitions.csv` on the last screen add a failure to the JUnit report, even without an assertion.

Birch, the demo shop in these examples, is a real web app at https://optics-framework.org/birch/. A real run of the Birch suite against two releases of it, with every file Optics wrote and the commands to run it yourself, is at https://optics-framework.org/run. Release 2.2 passes every step and fails the run, because the last screen shows "Session expired".

## How Optics finds an element

Every element can have several identities, tried cheapest first:

1. **XPath:** a native query through the accessibility tree.
2. **Text:** the visible text, CSS or class in the page source.
3. **OCR:** reads the screenshot with EasyOCR, Tesseract or Google Vision.
4. **Image:** matches a reference picture of the element on screen.
5. **AI self-heal (optional):** an LLM reads the screen and recovers with the same keywords.

## One suite, every screen

The same `modules.csv` runs on a phone, in a browser, on a TV and on a locked production device. Only the driver changes:

- **Android:** `appium` with UiAutomator2. Press Element taps the element.
- **iOS:** `appium` with XCUITest. Press Element taps the element.
- **Web:** `playwright` with Chromium. Press Element clicks the element.
- **TV:** `appium` with TizenTV. Press Element presses the arrow keys until the element has focus, then ENTER.
- **Production device:** `ble` with `camera_screenshot`. Press Element moves a Bluetooth mouse and clicks.

## No flow too wild

A locked phone through Bluetooth and a camera. A TV through its remote. A game through OCR. Each flow uses the same keywords as every other test:

- **A locked phone that blocks screenshots:** a Bluetooth dongle taps and types, a camera shows the screen, and OCR reads it. `Sign in,Press Element,Sign in,aoi_y=50,aoi_height=50`. Guide: https://optics-framework.org/docs/guides/protected-apps
- **A TV with only a remote:** on Tizen and webOS, Press Element presses the arrow keys until the element has focus, and Enter Text uses the on-screen keyboard. `Shop,Enter Text,Search Birch,trail`. Guide: https://optics-framework.org/docs/platforms/tv
- **A game with no UI tree:** OCR reads the words that the game draws. `Play,Press Element,text_only:PLAY`. Guide: https://optics-framework.org/docs/elements/text-and-images
- **An icon with no text or id:** image matching finds a cropped picture of it. `Cart,Press Element,cart_icon.png`. Guide: https://optics-framework.org/docs/elements/text-and-images
- **A popup that may not show:** Detect And Press taps it when it shows, and passes when it does not. `Launch Birch,Detect And Press,Not now,5`. Guide: https://optics-framework.org/docs/advanced/conditions
- **A new user or a returning user:** Condition runs a check module and picks the next module. `Start,Condition,Is Signed In,Go To Search,Sign In`. Guide: https://optics-framework.org/docs/advanced/conditions
- **One module, many search terms:** Run Loop runs a module once for each value in a list. `Every Search,Run Loop,Search And Check,${term},trail|pace|ridge,${expected},Trail Runner 2|Pace Knit|Ridge GTX`. Guide: https://optics-framework.org/docs/advanced/data-driven
- **A crash that no step checks:** error detection reads the last screen and fails the run on "has stopped". `ERR_CRASH,has stopped,The app crashed with a system dialog,critical`. Guide: https://optics-framework.org/docs/run/error-detection
- **The same words twice:** an area of interest keeps the match in one part of the screen. `Add To Cart,Press Element,Add to cart,aoi_y=75,aoi_height=25`. Guide: https://optics-framework.org/docs/elements/area-of-interest

## Where suites run

- **On every build:** in CI. `optics execute` exits with 1 when a test fails, and the JUnit report becomes a check on the pull request. On-screen error detection runs too. GitLab and Android versions: https://optics-framework.org/docs/run/ci
- **Before every release:** on your own emulator or device, with annotated screenshots.
- **On every device:** Android, iOS, Android TV, Samsung Tizen and LG webOS through Appium; web through Selenium or Playwright.
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
      - run: pip install "optics-framework[playwright]==1.11.2"
      - run: python -m playwright install --with-deps chromium
      - run: optics execute birch-tests --no-use-printer
      - if: always()
        uses: mikepenz/action-junit-report@v6
        with:
          report_paths: birch-tests/execution_output/junit_output.xml
```

<!-- proof -->

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

<!-- blog:latest -->

- [About](https://optics-framework.org/about)
- [Contact](https://optics-framework.org/contact)
- [Privacy](https://optics-framework.org/privacy)
