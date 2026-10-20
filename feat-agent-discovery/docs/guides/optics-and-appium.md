# What Optics adds to Appium

> Optics runs on top of Appium. Keep your Appium server and devices, and add readable suites, fallback locators, OCR and AI agents.

Optics doesn't replace Appium. For Android, iOS and TV apps, Optics drives the device **through** an Appium server. Appium still talks to the device. Optics decides what to press, finds it on screen several ways, and turns the steps into a suite anyone on the team can read.

If you already run Appium, you keep your server, drivers, devices and capabilities. Optics adds a layer on top.

## What stays the same

- **The Appium server.** You run it as before, locally or remotely. Set its address as `url` in `config.yaml`. A device farm works too, as long as you can reach its Appium server.
- **The drivers.** UiAutomator2 for Android and Android TV, XCUITest for iOS, and the Tizen and webOS drivers for TVs.
- **Your capabilities.** Optics reads only `platformName` and the app id. It passes every other capability to Appium unchanged. See [Appium capabilities](https://optics-framework.org/docs/reference/config#appium-capabilities).
- **Your inspector.** [Appium Inspector](https://github.com/appium/appium-inspector) still shows each element's id, text and XPath.
- **Driver commands.** The Execute Script keyword runs Appium `mobile:` commands. See [Execute Script](https://optics-framework.org/docs/reference/keywords/actions#execute-script).

## What Optics adds

### Tests anyone can read

An Optics test is rows in CSV or YAML files, not code. Each row is a keyword and its values:

`modules/modules.csv`:

```csv
module_name,module_step,param_1,param_2
Sign in,Enter Text,${email_field},ava@birch.shop
Sign in,Press Element,${sign_in}
Sign in,Assert Presence,Picked for you,20
```

Steps live in reusable modules, and test cases list the modules they run. Testers can write and review the suite in a spreadsheet. See [Write a test suite](https://optics-framework.org/docs/create/write).

### Locators that fall back

An Appium locator either matches or fails. In Optics, an element can have several values, and Optics tries them in order:

`test_data/elements.csv`:

```csv
Element_Name,Element_ID
sign_in,//*[@resource-id='com.birch.shop:id/login']
sign_in,Sign in
sign_in,sign_in.png
```

When a redesign changes the id, the text value takes over. Name the element once, and every step that uses `${sign_in}` follows. See [Define elements](https://optics-framework.org/docs/elements/define).

### OCR and image matching

Text drawn inside an image, a canvas or a video player isn't in the UI tree, so Appium can't find it. Optics can. It reads text from a screenshot with OCR, and finds icons by matching a cropped picture. It uses them only after the UI tree fails, because they're slower. See [Find elements by text and image](https://optics-framework.org/docs/elements/text-and-images).

Optional [AI self-heal](https://optics-framework.org/docs/elements/self-heal) goes one step further. When every value fails, a Gemini model looks at the screen and tries to finish the step. It's off by default.

### A live recorder

`optics live` opens a terminal session next to the device. You type a step, it runs straight away, and the steps that work are saved as a module. You can also switch to plain-English mode and let a Gemini model drive. See [Record a test](https://optics-framework.org/docs/create/record) and [Describe a test](https://optics-framework.org/docs/create/describe).

### Data-driven tests

`Run Loop` runs one module for each value in a list, such as each user or search term. See [Run a flow with different data](https://optics-framework.org/docs/advanced/data-driven).

### An MCP server for AI agents

`optics mcp` lets an AI agent such as Claude Code or Cursor drive the device through Optics keywords, then write the suite. See [Let your AI agent drive a real phone](https://optics-framework.org/docs/guides/ai-agent-phone).

### Results and error screens

`optics execute` writes a JUnit report and a screenshot of each step. See [Read the results](https://optics-framework.org/docs/run/results). [Error detection](https://optics-framework.org/docs/run/error-detection) fails a run that ends on a crash dialog or an error message you list.

### Targets beyond Appium

The same keywords run on websites through [Playwright or Selenium](https://optics-framework.org/docs/platforms/web). Between phones and browsers, only `config.yaml` changes. On [locked devices](https://optics-framework.org/docs/platforms/production), Optics skips Appium and taps through a Bluetooth mouse and keyboard, with a camera watching the screen.

## Keep your code if you want it

If your team writes tests in Python, you don't have to give that up. The `Optics` class exposes every keyword as a method, so you keep the fallbacks, OCR and image matching inside pytest. Robot Framework works the same way. See [Use Optics from Python](https://optics-framework.org/docs/create/python) and [Use Optics in Robot Framework](https://optics-framework.org/docs/create/robot).

`optics generate` goes the other way: it turns a CSV suite into a pytest or Robot Framework file. See [Generate pytest or Robot code](https://optics-framework.org/docs/advanced/generate).

## Move existing Appium tests

Optics has no importer for Appium scripts. Rebuild each flow by [recording](https://optics-framework.org/docs/create/record) it in `optics live`, or ask an AI agent to explore the app and write the suite through [MCP](https://optics-framework.org/docs/create/agent). Your config can point at the Appium server and capabilities you already use.

## Get started

- [Test Android apps](https://optics-framework.org/docs/platforms/android): Set up Appium and adb, then run on a phone or emulator.
- [Test iOS apps](https://optics-framework.org/docs/platforms/ios): Run on a simulator or a signed device with XCUITest.
- [Test TV apps](https://optics-framework.org/docs/platforms/tv): Drive Android TV, Samsung Tizen and LG webOS.
- [Optics vs Maestro](https://optics-framework.org/docs/guides/optics-vs-maestro): Compare Optics with a framework that doesn't use Appium.
