# Optics vs Maestro

> Compare two open-source UI test frameworks on platforms, test format, finding elements, TVs, AI agents and where tests run.

Optics and Maestro both let you write end-to-end UI tests as plain files, run them on emulators, devices and browsers, and hand a device to an AI agent over MCP. Both are open source under Apache 2.0. They differ in what they can reach, how they find things on screen, and where tests run.

This page sets out the facts so you can pick the one that fits your apps. Maestro facts come from [Maestro's documentation](https://docs.maestro.dev) and its [GitHub repository](https://github.com/mobile-dev-inc/maestro), checked in October 2026. Maestro changes quickly, so check its docs for anything that matters to your decision.

## At a glance

| | Optics | Maestro |
|---|---|---|
| Licence | Apache 2.0. No paid edition. | Apache 2.0 for the open-source CLI. [Maestro Cloud](https://docs.maestro.dev/maestro-cloud) is a hosted service that needs an account. |
| Android | Emulators and real phones, through Appium | Emulators and physical devices |
| iOS | Simulators and signed real devices, through Appium | Simulators. Its README says physical iOS devices aren't supported yet. |
| Web | Playwright (Chromium) or Selenium (Chrome or Firefox) | Beta, Chromium only |
| TV | Android TV, Samsung Tizen and LG webOS | Android TV remote keys in `pressKey`. Tizen and webOS aren't listed as supported platforms. |
| Locked devices | Bluetooth mouse and keyboard plus a camera, no software on the device | Not covered in its docs |
| How it drives the app | Through a driver you run: Appium, Playwright, Selenium or a BLE dongle | A single binary that drives the app through the accessibility layer, with no separate drivers. The CLI needs Java 17 or newer. |
| Test format | CSV or YAML rows of keywords, split into test cases, modules and elements. Also Python and Robot Framework. | YAML flows, with JavaScript for logic |
| Finding elements | Several values per element, then XPath, UI-tree text, OCR and image matching in turn | Selectors on the accessibility layer, such as text and id |
| AI agent support | `optics mcp`, a separate extra | `maestro mcp`, built into the CLI |
| Where tests run | Your machine or CI. No hosted service. | Your machine or CI, or Maestro Cloud |

## Platforms

Optics drives Android and iOS apps through [Appium](https://optics-framework.org/docs/platforms/android), websites through [Playwright or Selenium](https://optics-framework.org/docs/platforms/web), and TV apps through Appium's TV drivers. iOS tests run on simulators or on a signed real device. See [Supported platforms](https://optics-framework.org/docs/platforms/).

Maestro's [supported platforms](https://docs.maestro.dev/get-started/supported-platform) page lists Android emulators and physical devices, iOS simulators, and web. Its [web support](https://docs.maestro.dev/get-started/supported-platform/web-browser) is in beta and runs on Chromium only. Maestro works with native, React Native and Flutter apps, and its docs cover moving between apps and into system settings.

**If you need to test on a physical iPhone, Optics supports it today.** Maestro's README says that physical iOS devices aren't supported yet.

## TV apps

Optics tests [Android TV, Samsung Tizen and LG webOS](https://optics-framework.org/docs/platforms/tv) through Appium, with remote-control keys. On Tizen and webOS, you move the focus with key names such as `UP` and `ENTER`, and touch keywords fail with E0105.

Maestro's [`pressKey`](https://docs.maestro.dev/reference/commands-available/presskey) command includes Android TV remote keys, such as `Remote Dpad Up` and `Remote Media Play Pause`. Its supported platforms page doesn't list Tizen or webOS.

## Locked devices and apps that block screenshots

Optics can test a device that has no automation software on it. A [BLE dongle](https://optics-framework.org/docs/platforms/production) pairs with it as a Bluetooth mouse and keyboard, and a camera shows Optics the screen. This works when USB debugging is off or the app blocks screenshots. See [Test apps that block screenshots](https://optics-framework.org/docs/guides/protected-apps).

Maestro's docs don't cover this kind of setup.

## Test format

An Optics test is rows in CSV or YAML files. Each row is a keyword and its values, such as `Press Element,${sign_in}`. Steps live in reusable modules, test cases list modules, and elements live in their own file, so a changed button means one edit. Anyone who can use a spreadsheet can read the suite. You can also call the same keywords from [Python](https://optics-framework.org/docs/create/python) or [Robot Framework](https://optics-framework.org/docs/create/robot). See [Write a test suite](https://optics-framework.org/docs/create/write).

A Maestro test is a [flow](https://docs.maestro.dev/maestro-flows), a YAML file of commands such as `tapOn` and `assertVisible`. Logic and data go in [JavaScript](https://docs.maestro.dev/maestro-flows/javascript/javascript-overview), with `runScript` and `evalScript`.

## Finding elements

Optics gives each element several identities and tries them in order. You can list an XPath, visible text and an image for the same button. Text is looked up in the UI tree first, then read from a screenshot with OCR. Images are found by matching a cropped picture on the screen. When a redesign breaks one value, the next one takes over. See [How Optics finds elements](https://optics-framework.org/docs/elements/).

On top of that, optional [AI self-heal](https://optics-framework.org/docs/elements/self-heal) asks a Gemini model to finish a step when every value fails. It's off by default.

Maestro finds elements through the accessibility layer, with [selectors](https://docs.maestro.dev/reference/selectors/core-selectors) such as text and id. Its docs describe experimental AI commands: [`assertWithAI`](https://docs.maestro.dev/reference/commands-available/assertwithai) checks the screen against a sentence, and [`extractTextWithAI`](https://docs.maestro.dev/reference/commands-available/extracttextwithai) reads text from a screenshot into a variable. Its docs don't describe finding an element to tap by OCR or by a template image.

**If your app draws text in images, canvases or video players, Optics can find it.** Its OCR and image fallbacks work when the UI tree is empty.

## Waiting

Maestro [waits automatically](https://docs.maestro.dev/get-started/what-is-maestro) for content and animations, so you rarely add sleeps.

In Optics, assertions such as Assert Presence wait up to their timeout, but action keywords don't wait. Put an assertion before a step that needs a new screen. See [Action keywords don't wait](https://optics-framework.org/docs/reference/keywords/#action-keywords-dont-wait).

## Creating tests and AI agents

Optics has four ways to create a test, and each writes the same files:

- [Write it](https://optics-framework.org/docs/create/write) in a spreadsheet or editor.
- [Record it](https://optics-framework.org/docs/create/record) in `optics live`, a terminal session that runs each step on the device and saves the ones that work.
- [Describe it](https://optics-framework.org/docs/create/describe) in plain English, and a Gemini model drives the app.
- [Delegate it](https://optics-framework.org/docs/create/agent) to your AI agent through `optics mcp`.

The `optics mcp` server gives the agent a tool for each keyword and resources for the screenshot, the elements on screen and the project format. The agent then writes a suite for `optics execute`. See the [MCP server reference](https://optics-framework.org/docs/reference/mcp).

Maestro has [Maestro Studio](https://docs.maestro.dev/maestro-studio), a desktop app for building and debugging flows visually. Its [MCP server](https://docs.maestro.dev/get-started/maestro-mcp) ships inside the CLI. It lets the agent inspect the screen, take screenshots, run inline YAML and submit runs to Maestro Cloud, and it includes Maestro Viewer, a web view of the device.

## Running and reporting

Optics runs on your machine or in CI. A run writes a JUnit report and annotated screenshots to `execution_output/`, and [error detection](https://optics-framework.org/docs/run/error-detection) can fail a run that ends on a crash dialog. One run uses one device. To test several devices at once, start one `optics execute` process per device. See [Run tests in CI](https://optics-framework.org/docs/run/ci).

The Maestro CLI runs flows locally or in CI. It writes JUnit or HTML reports, and its [`--shards` options](https://docs.maestro.dev/maestro-cli/maestro-cli-commands-and-options) split a run across connected devices. Maestro Cloud runs flows in parallel on hosted devices, and needs a Maestro Cloud account.

## Which one fits

Choose **Optics** when you need:

- Smart TVs on Tizen or webOS, physical iPhones, or locked devices.
- Elements that the UI tree can't see, found with OCR or image matching.
- Suites that non-developers read and edit in a spreadsheet.
- Python or Robot Framework from the same keywords.

Choose **Maestro** when you want:

- A single binary with no Appium server to run.
- Automatic waiting with no extra assertions.
- A desktop app for building tests visually.
- A hosted service that runs suites in parallel for you.

## See also

- [What Optics adds to Appium](https://optics-framework.org/docs/guides/optics-and-appium)
- [Get started with Optics](https://optics-framework.org/docs/get-started/)
- [Frequently asked questions](https://optics-framework.org/docs/help/faq)
