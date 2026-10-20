# Introducing Optics: create a test your way, run it forever

> Optics is an open-source test automation framework for Android, iOS, web and TV apps. Tests are CSV or YAML files, and each element on screen can have several locators.

11 Oct 2026, Chinmay Jha. Canonical URL: https://optics-framework.org/blog/introducing-optics-framework

A designer changes “Sign in” to “Log in”, or a developer renames the button’s id in a refactor, and the nightly run fails even though the app works. Someone then spends the next morning updating locators.

At Atlassian, flaky tests caused [up to 21% of master build failures](https://www.atlassian.com/blog/atlassian-engineering/taming-test-flakiness-how-we-built-a-scalable-tool-to-detect-and-manage-flaky-tests) in the Jira frontend repo. Mobile teams often write the same flow separately for Android, iOS and the web. Many newer AI testing tools put a model in charge of every step of every run, so each run costs money and can take a different path through the app.

Optics Framework, licensed under Apache 2.0, runs on your laptop or CI runner. It has no paid edition or account, and it sends no telemetry.

![Animation: four ways to create an Optics test (write, record, describe, delegate), each producing the same CSV test suite](https://optics-framework.org/media/blog/four-ways.webp)

*Four ways to create a test. Each one writes the same plain-text suite.*

## The test format

A test row describes one action a person takes in the app, and Optics works out how to perform it on the current screen.

`modules/modules.csv`:

```csv
module_name,module_step,param_1,param_2
Sign In,Enter Text,${email_field},ava@birch.shop
Sign In,Press Element,${sign_in}
Sign In,Assert Presence,Picked for you
Add To Cart,Press Element,Add to cart
```

These rows form modules, which are reusable sequences of steps. A test case lists the modules to run in order, and an elements file maps names like `sign_in` to the locators that find them. All three are plain text in your repository, so product managers can read them and changes go through pull requests like any other code.

## Four ways to create a test

All four write the same files, and one project can mix them:

- Write it in a text editor or a spreadsheet.
- Record it in `optics live`, an interactive session next to your device. Each step runs on the device as you type it, and `/save` stores the steps that worked as a module.
- Describe it in plain English. Press Ctrl+N in `optics live`, type *add trail runners to the cart*, and an AI model drives the app one keyword at a time.
- Delegate it to your AI agent. Add `optics mcp` to Claude Code, Cursor or another MCP client, and every keyword becomes a tool the agent can call while it explores the app and writes the suite files.

![Animation: an optics live terminal session running test steps on a phone app, then saving them to modules.csv](https://optics-framework.org/media/blog/optics-live.webp)

*`optics live` runs each step on the device as you type it, and `/save` writes the steps into the suite.*

Teams that prefer code can use the same keywords from [Python or Robot Framework](https://optics-framework.org/docs/create/python).

## How Optics finds an element

You can give an element several locators. Optics tries them in order, cheapest first:

1. XPath, through the app’s UI tree.
2. The visible text, in the same tree.
3. OCR, which reads the text from a screenshot.
4. Image matching against a small picture of the element.

`test_data/elements.csv`:

```csv
Element_Name,Element_ID
sign_in,//*[@resource-id='login']
sign_in,Sign in
```

With these two rows, a refactor that renames the button’s id breaks the XPath, and Optics falls back to the button’s text. Text painted into a banner image never reaches the UI tree, so OCR is the only way to read it. The report for each step names the method that found the element, which tells you when a locator has gone stale.

![Animation: Optics locator fallback, where an XPath misses, the visible text matches, and OCR reads text inside a banner image](https://optics-framework.org/media/blog/locator-fallback.webp)

*After a redesign the XPath misses and Optics finds the button by its text. OCR reads a product name from a banner image.*

## AI in Optics

Optics uses AI to write tests. A model or an agent explores the app and leaves behind keyword rows for you to review, and `optics execute` replays those rows without calling a model. The browser-use team made a similar choice when they built a deterministic follow-up to their AI browser agent, because [in their words](https://news.ycombinator.com/item?id=44007065) "pure LLM agents were slow, expensive, and unpredictable."

AI self-heal is the one exception. You can switch it on as a last step for when every locator fails, and the log records each action the model takes.

![Diagram comparing an AI model deciding every test run with Optics, where a model helps author the test once and later runs replay keywords](https://optics-framework.org/media/blog/ai-once.webp)

*Optics calls a model only while you write a test.*

## Supported platforms

A project’s `config.yaml` names the target, and the same test files run on:

- Android and iOS, through Appium, on emulators, simulators and real phones.
- Websites, through Playwright or Selenium.
- Android TV, Samsung Tizen and LG webOS, through Appium, using remote-control keys.
- Locked production phones, through a Bluetooth mouse and keyboard and a camera pointed at the screen. Nothing gets installed on the phone, so a journey tested in CI can also monitor the live app.

Teams that already run Appium, Playwright or Selenium keep their drivers and devices, since Optics drives them directly.

![Animation: the same Optics test running on a phone, a TV with remote keys, and a web browser](https://optics-framework.org/media/blog/platforms.webp)

*The same test on a phone, a TV and a browser.*

## Running a suite

`optics execute` prints a live tree of every test case, module and step. This is a real run on an Android emulator:

<video src="https://optics-framework.org/media/blog/execute-run.mp4" poster="https://optics-framework.org/media/blog/execute-run-poster.webp" autoplay loop muted playsinline preload="none" aria-label="Screen recording of optics execute running a test suite on an Android emulator, with a live pass and fail tree in the terminal"></video>

*A real `optics execute` run on an Android emulator.*

A run leaves behind a JUnit report for CI, screenshots with a box around every element it found, and an exit code of 1 when a test fails. You can list error messages such as *Session expired* in a definitions file, and Optics looks for them on the last screen to catch failures no step asserted. [Your tests passed. Your app didn’t.](https://optics-framework.org/blog/your-tests-passed-your-app-didnt) walks through that feature.

`optics dry_run` checks a suite without a device, and loops, conditions and data files run one flow with many inputs. To connect Optics to other tools, Invoke API calls your backend mid-test, `optics serve` exposes the keywords over REST, and `optics generate` converts a suite to pytest or Robot Framework code.

## Try it

Optics needs Python 3.12 or newer and runs on macOS, Linux and Windows:

```shell
curl -fsSL https://optics-framework.org/install | sh
optics quickstart
optics execute my-optics-project
```

On Windows, install with `irm https://optics-framework.org/install.ps1 | iex`. `pip install optics-framework` works on any system. The quickstart asks whether you're testing a mobile app or a website, installs the engine it needs, and creates a project you can run.

- Docs: [optics-framework.org/docs](https://optics-framework.org/docs/)
- Source: [github.com/mozarkai/optics-framework](https://github.com/mozarkai/optics-framework)

Later posts in this series cover the locator fallbacks, AI agents over MCP, and testing phones that can’t run automation software. Send bug reports and questions to the [GitHub issues](https://github.com/mozarkai/optics-framework/issues).
