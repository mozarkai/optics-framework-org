# Optics: create it your way, run it forever

Optics is open-source test automation for Android, iOS, web and TV. Write a test by hand, record it, describe it in plain English or hand it to your AI agent, then run that same suite on every build and every device.

- Install (macOS and Linux): `curl -fsSL https://optics-framework.org/install | sh`
- Install (Windows): `irm https://optics-framework.org/install.ps1 | iex`
- Install (pip): `pip install optics-framework`
- Licence: Apache 2.0. Needs Python 3.12 or newer.
- Docs: https://mozarkai.github.io/optics-framework/
- HTTP API (`optics serve`, runs locally): https://optics-framework.org/openapi.json
- Source: https://github.com/mozarkai/optics-framework
- For AI agents: https://optics-framework.org/llms.txt

## Every test has two lives

- **The day you create it.** Someone turns a user flow into steps a machine can repeat. Optics lets that person work in a spreadsheet, on the device, in a sentence, or through an AI agent.
- **Every day after that.** The test runs the same way on every build, every device and every release, and fails only when the app is actually broken.

## Four ways to create a test

1. **Write it.** Elements, modules and test cases are plain CSV or YAML. The same keywords are also a Python library and a Robot Framework library.
2. **Record it.** Run keywords one at a time in `optics live` next to your device. Every step that works is recorded, and `/save` writes the recording into your suite as a reusable module.
3. **Say it.** Press Ctrl+N in `optics live` and describe the flow. An AI model (the Gemini model you configure) drives the device a step at a time, then keeps only the steps that mattered.
4. **Delegate it.** Add `optics mcp` to any MCP client. Every keyword becomes a tool and the screen becomes a resource, so your agent can explore the app and write the suite files itself.

## Every way ends in plain text

A suite is three kinds of file, in CSV or YAML, and lives in your repository next to the app it tests. Changing a test is a pull request.

- **Test cases:** which flows run, and in what order.
- **Modules:** the steps, one keyword each, reused by every test case that names them.
- **Elements:** every name mapped to the ways to find it on screen.

```csv
module_name,module_step,param_1,param_2
Sign In,Enter Text,${email_field},ada@example.com
Sign In,Press Element,${sign_in}
Add To Cart,Enter Text,${search_bar},running shoes
Add To Cart,Press Element,Add to cart
```

## Run a suite

`optics execute <folder>` replays the suite step by step. `optics dry_run <folder>` validates every keyword, element and module reference without a device. Each run writes:

- `junit_output.xml`, written as the run goes so CI sees progress live.
- Screenshots before and after every action, annotated with the strategy that found the element.
- Detected errors: crash dialogs and messages matched from `error_definitions.csv` fail the run even without an assertion.

## How Optics finds an element

Every element can have several identities, tried cheapest first:

1. **XPath:** a native query through the accessibility tree.
2. **Text:** the visible text, CSS or class in the page source.
3. **OCR:** reads the screenshot with EasyOCR, Tesseract or Google Vision.
4. **Image:** matches a reference picture of the element on screen.
5. **AI self-heal (optional):** an LLM reads the screen and recovers with the same keywords.

## Where suites run

- **On every build:** in CI, with on-screen error detection.
- **Before every release:** on your own emulator or device, with annotated screenshots.
- **On every device:** Android, iOS, Android TV, Samsung Tizen and LG webOS through Appium; web through Selenium or Playwright.
- **In production:** on a schedule against your live app, including a Bluetooth driver for locked-down devices.

## Get started

```sh
curl -fsSL https://optics-framework.org/install | sh
optics quickstart
optics execute my_test_project
```

- [About](https://optics-framework.org/about)
- [Contact](https://optics-framework.org/contact)
- [Privacy](https://optics-framework.org/privacy)
