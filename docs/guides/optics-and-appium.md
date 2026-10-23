---
title: What Optics adds to Appium
nav: Optics and Appium
summary: Optics runs on top of Appium. Keep your Appium server and devices, and add readable suites, fallback locators, OCR and AI agents.
description: Optics is an open-source framework that runs on top of Appium. Keep your Appium server, drivers and capabilities, and add CSV suites, fallback locators, OCR and image matching, a live recorder and an MCP server for AI agents.
---

Optics doesn't replace Appium. For Android, iOS and TV apps, Optics drives the device **through** an Appium server. Appium still talks to the device. Optics decides what to press, finds it on screen several ways, and turns the steps into a suite anyone on the team can read.

If you already run Appium, you keep your server, drivers, devices and capabilities. Optics adds a layer on top.

## What stays the same

- **The Appium server.** You run it as before, locally or remotely. Set its address as `url` in `config.yaml`. A device farm works too, as long as you can reach its Appium server.
- **The drivers.** UiAutomator2 for Android and Android TV, XCUITest for iOS, and the Tizen and webOS drivers for TVs.
- **Your capabilities.** Optics reads only `platformName` and the app id. It passes every other capability to Appium unchanged. See [Appium capabilities](/docs/reference/config#appium-capabilities).
- **Your inspector.** [Appium Inspector](https://github.com/appium/appium-inspector) still shows each element's id, text and XPath.
- **Driver commands.** The Execute Script keyword runs Appium `mobile:` commands. See [Execute Script](/docs/reference/keywords/actions#execute-script).

## What Optics adds

### Tests anyone can read

An Optics test is rows in CSV or YAML files, not code. Each row is a keyword and its values:

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2
Sign in,Enter Text,${email_field},ava@birch.shop
Sign in,Press Element,${sign_in}
Sign in,Assert Presence,Picked for you,20
```

Steps live in reusable modules, and test cases list the modules they run. Testers can write and review the suite in a spreadsheet. See [Write a test suite](/docs/create/write).

### Locators that fall back

An Appium locator either matches or fails. In Optics, an element can have several values, and Optics tries them in order:

```csv title="test_data/elements.csv"
Element_Name,Element_ID
sign_in,//*[@resource-id='com.birch.shop:id/login']
sign_in,Sign in
sign_in,sign_in.png
```

When a redesign changes the id, the text value takes over. Name the element once, and every step that uses `${sign_in}` follows. See [Define elements](/docs/elements/define).

### OCR and image matching

Text drawn inside an image, a canvas or a video player isn't in the UI tree, so Appium can't find it. Optics can. It reads text from a screenshot with OCR, and finds icons by matching a cropped picture. It uses them only after the UI tree fails, because they're slower. See [Find elements by text and image](/docs/elements/text-and-images).

Optional [AI self-heal](/docs/elements/self-heal) goes one step further. When every value fails, an AI model looks at the screen and tries to finish the step. It's off by default.

### A live recorder

`optics live` opens a terminal session next to the device. You type a step, it runs straight away, and the steps that work are saved as a module. You can also switch to plain-English mode and let an AI model drive. See [Record a test](/docs/create/record) and [Describe a test](/docs/create/describe).

### Data-driven tests

`Run Loop` runs one module for each value in a list, such as each user or search term. See [Run a flow with different data](/docs/advanced/data-driven).

### An MCP server for AI agents

`optics mcp` lets an AI agent such as Claude Code or Cursor drive the device through Optics keywords, then write the suite. See [Let your AI agent drive a real phone over MCP](/docs/guides/ai-agent-phone).

### Results and error screens

`optics execute` writes a JUnit report and a screenshot of each step. See [Read the results](/docs/run/results). [Error detection](/docs/run/error-detection) fails a run that ends on a crash dialog or an error message you list.

### Targets beyond Appium

The same keywords run on websites through [Playwright or Selenium](/docs/platforms/web). Between phones and browsers, only `config.yaml` changes. On [locked devices](/docs/platforms/production), Optics skips Appium and taps through a Bluetooth mouse and keyboard, with a camera watching the screen.

## Keep your code if you want it

If your team writes tests in Python, you don't have to give that up. The `Optics` class exposes every keyword as a method, so you keep the fallbacks, OCR and image matching inside pytest. Robot Framework works the same way. See [Use Optics from Python](/docs/create/python) and [Use Optics in Robot Framework](/docs/create/robot).

`optics generate` goes the other way: it turns a CSV suite into a pytest or Robot Framework file. See [Generate pytest or Robot code](/docs/advanced/generate).

## Move existing Appium tests

Optics has no importer for Appium scripts. Rebuild each flow by [recording](/docs/create/record) it in `optics live`, or ask an AI agent to explore the app and write the suite through [MCP](/docs/create/agent). Your config can point at the Appium server and capabilities you already use.

## Get started

:::cards{cols="2"}
- [Test Android apps](/docs/platforms/android): Set up Appium and adb, then run on a phone or emulator.
- [Test iOS apps](/docs/platforms/ios): Run on a simulator or a signed device with XCUITest.
- [Test TV apps](/docs/platforms/tv): Drive Android TV, Samsung Tizen and LG webOS.
- [Optics vs Maestro](/docs/guides/optics-vs-maestro): Compare Optics with a framework that doesn't use Appium.
:::
