# Frequently asked questions

> Learn what Optics can and can't do, with short answers to the questions people ask most.

Short answers, with links to the pages that explain each one in full. These docs describe Optics 1.10.5.

## About Optics

### Is Optics free and open source?

Yes. Optics is open source under the Apache 2.0 license, and the code is on [GitHub](https://github.com/mozarkai/optics-framework). There's no paid edition, account or license key.

### Does Optics send my data anywhere?

No, not by default. Optics has no telemetry and needs no account. Tests, screenshots and results stay on your machine or CI runner.

Data leaves your machine only through features you turn on:

- **The AI features**, [plain-English mode](https://optics-framework.org/docs/create/describe) and [AI self-heal](https://optics-framework.org/docs/elements/self-heal), send screenshots and the screen's UI tree to the provider you configure: Google, OpenAI, Anthropic, or the server in your `url`. A local model keeps them on your machine.
- **Google Cloud Vision** OCR sends screenshots to Google. EasyOCR and Tesseract run locally.
- **Remote OCR and image engines** (`remote_ocr`, `remote_oir`) send screenshots to the URL you configure.
- **Event reporting** sends the events you label with `event_name` to the `eventUrl` in your `event_attributes_json` file, if you set one up.

With the [MCP server](https://optics-framework.org/docs/create/agent), Optics itself calls no AI service. Your agent's client sends what it reads to whichever model it uses.

### What can I test, and where does it run?

Optics tests Android and iOS apps through Appium, websites through Playwright or Selenium, and Android TV, Samsung Tizen and LG webOS apps through Appium. It can also drive locked-down [production devices](https://optics-framework.org/docs/platforms/production) as a Bluetooth mouse and keyboard, with a camera watching the screen.

Optics itself runs on macOS, Linux and Windows with Python 3.12 or newer. Testing iOS apps needs a Mac with Xcode. See [Platforms](https://optics-framework.org/docs/platforms/).

### Do I need to know how to code?

No. Tests are rows in CSV or YAML files: a keyword such as `Press Element` and the values it needs. You can [record](https://optics-framework.org/docs/create/record) them by running steps against the live app, or [write](https://optics-framework.org/docs/create/write) them in a spreadsheet. You'll edit a YAML settings file and use a terminal, but you won't write code. [Python](https://optics-framework.org/docs/create/python) and [Robot Framework](https://optics-framework.org/docs/create/robot) are there if you want them.

### What is Optics not good for?

Optics tests what a person does through the interface. Use other tools for unit tests, load testing, API-only contract tests and pixel-by-pixel visual comparison.

## Creating tests

### Should I use CSV or YAML?

Use CSV unless you have a reason not to. CSV opens in any spreadsheet app, and `optics live` saves recordings as CSV. Use YAML when you want a whole suite in one text file that reads well in code review. Both do the same things, and you can mix them in one project. Error definitions are CSV only. See [Write tests in YAML](https://optics-framework.org/docs/create/yaml).

### Can people who aren't developers write tests?

Yes. That's what the file format is for. A tester can [record a flow](https://optics-framework.org/docs/create/record) in `optics live` and save it, then edit the CSV files in a spreadsheet. Someone comfortable with a terminal and YAML should set up `config.yaml` once; after that, most work happens in the CSV files.

### Can I import tests from Selenium IDE, Appium or another tool?

No. Optics has no importer. Rebuild the flows by [recording](https://optics-framework.org/docs/create/record) them, or ask an AI agent to explore the app and write the suite through the [MCP server](https://optics-framework.org/docs/create/agent).

Going the other way works: [`optics generate`](https://optics-framework.org/docs/advanced/generate) turns a suite into pytest or Robot Framework code. It skips flow-control keywords such as `Run Loop` and `Condition`, so check the output.

### Can AI write my tests?

Yes, two ways. [Describe a flow](https://optics-framework.org/docs/create/describe) in plain English inside `optics live`, and an AI model drives the app and records the steps. Or [connect your AI agent](https://optics-framework.org/docs/create/agent) through MCP and let it explore the app and write the files. Both produce ordinary CSV that you review before you rely on it.

## Running tests

### Can I run tests in parallel?

Not within one run. `optics execute` runs test cases one after another on one device or browser.

To test several devices at once, start a separate `optics execute` process for each one, each with its own project folder and `config.yaml`. Separate folders keep their results apart in each project's `execution_output/`. See [Run the same suite on different devices](https://optics-framework.org/docs/create/organise#run-the-same-suite-on-different-devices).

### How do I run only one test?

There's no command-line flag for it. List the test cases to run under `include:` in `config.yaml`, or the ones to skip under `exclude:`:

`config.yaml`:

```yaml
include:
  - Shopper can sign in
```

Names match exactly, ignoring case. Suite Setup and Suite Teardown always run. See [Run only some test cases](https://optics-framework.org/docs/create/organise#run-only-some-test-cases).

### Does Optics retry failed tests?

No. Optics doesn't rerun failed steps or test cases. Within a step, it tries each [fallback value](https://optics-framework.org/docs/elements/define#write-elements) of an element in turn, and assertions such as `Assert Presence` wait up to their timeout. To retry a whole run, rerun the command in your CI.

Before adding retries, look for the cause. Most flaky steps act before the screen is ready; put `Assert Presence` before them. See [Action keywords don't wait](https://optics-framework.org/docs/reference/keywords/#action-keywords-dont-wait).

### Can I run the browser headless?

Not with Playwright in 1.10.5. It ignores the `headless` setting and always opens a visible Chromium window. On a Linux machine without a display, such as a CI runner, run Optics under a virtual display: `xvfb-run optics execute my-project`.

With Selenium, the browser runs wherever your Selenium server runs. A Selenium server in Docker runs the browser inside the container, so no window opens on your machine. See [Web](https://optics-framework.org/docs/platforms/web).

### Can I use a remote Appium server or device?

Yes. Set `url` under the `appium` driver to any Appium server you can reach. `optics execute` checks that the server answers before the run starts. See [config.yaml](https://optics-framework.org/docs/reference/config#driver-sources).

### Where do the results go?

To `execution_output/` in the project: a `junit_output.xml` report that any CI system can read, screenshots of each step, and logs if you turn them on. See [Read the results](https://optics-framework.org/docs/run/results).

## AI features

### Which AI models does Optics support?

For plain-English mode and AI self-heal, Optics works with Gemini, Claude and OpenAI models, and with any server that offers an OpenAI-compatible API, such as OpenRouter or a local Ollama. Choose a model that accepts images. See [llm_models](https://optics-framework.org/docs/reference/config#llm-models).

The [MCP server](https://optics-framework.org/docs/create/agent) works with any agent that speaks MCP, such as Claude Code, Claude Desktop, Cursor or VS Code, and with whichever model that agent uses.

### Do I need AI to use Optics?

No. Every AI feature is optional and off by default. Recording, writing, running and reporting work without any model or API key.

### What do the AI features cost?

Optics is free. Your model provider bills its usage at its own rates. A local model costs nothing per call.

- **Plain-English mode** makes one model call per step, plus one more to tidy up the steps when the goal is reached. An instruction stops after at most 15 steps.
- **AI self-heal** makes up to six calls for each step it tries to rescue, and none when steps pass normally.
- **MCP** costs whatever your agent's client charges. Optics makes no model calls.

### Will self-heal hide real bugs?

It can. A healed step passes, and the run's summary doesn't say it healed. Turn on `file_log: true` and search the logs for `AI self-heal` after each run, then update the element so the step passes without help. See [Find out what healed](https://optics-framework.org/docs/elements/self-heal#find-out-what-healed).

## Elements

### Why give an element both an XPath and text?

Each fails in different situations, so together they last longer. An XPath is the fastest and most precise way to find an element, but a redesign that changes ids or layout breaks it. Text is readable and survives layout changes, but breaks when the wording changes. List both, and Optics tries them in order until one works. See [Define elements](https://optics-framework.org/docs/elements/define).

### When should I use images?

Use an image when nothing else identifies the element: an icon with no text or id, something drawn in a game or canvas, or a device you watch through a camera. Image matching is the slowest way to find an element, and a new icon design or theme breaks it, so put it last in the element's values. See [Find elements by text and image](https://optics-framework.org/docs/elements/text-and-images).

### Why can't Optics find text that's clearly on screen?

The text is probably drawn inside an image or canvas, so it isn't in the app's UI tree. Enable an [OCR engine](https://optics-framework.org/docs/elements/text-and-images#turn-on-ocr) and a screenshot source, and Optics reads the screenshot instead. If the element only appears after a moment, put `Assert Presence` before the step. For more causes, see [Troubleshooting](https://optics-framework.org/docs/help/troubleshooting#e0201).
