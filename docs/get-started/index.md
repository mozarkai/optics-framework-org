---
title: Get started with Optics
nav: Overview
summary: Learn what Optics does, what it tests, and the fastest way to see it run.
---

Optics is open-source test automation for apps on Android, iOS, the web and TV. You describe what a person does in your app, such as signing in or adding a product to the cart. Optics repeats it on a real device, an emulator or a browser, and tells you when the app stops behaving.

::scene{name="fourways" caption="Four ways to create a test. Each one writes the same plain-text suite, which runs the same way on every build."}

## How a test works

A test is a short list of steps in a file, one action per row. A step reads like a sentence: **Press Element** *Sign in*, **Enter Text** *email field* *ava@birch.shop*.

You don't write code to find things on screen. Optics looks for each element several ways, cheapest first: by its position in the app's UI tree, by its visible text, by reading a screenshot, and by matching a picture of it. When a redesign breaks one way, the next one takes over, so tests break less often.

When a run finishes, you get a pass or fail for every step, screenshots of what Optics saw, and a JUnit report that any CI system can read.

## What you can test

| Target | How Optics drives it |
|---|---|
| Android and iOS apps | Through [Appium](/docs/platforms/android), on emulators, simulators and real phones |
| Websites | Through [Playwright or Selenium](/docs/platforms/web), no device needed |
| Android TV, Samsung Tizen, LG webOS | Through Appium, with the remote's arrow keys. See [TV](/docs/platforms/tv) |
| Locked-down production devices | As a Bluetooth mouse and keyboard, with a camera watching the screen. See [Production devices](/docs/platforms/production) |

Optics runs on macOS, Linux and Windows with Python 3.12 or newer. There is no account, cloud service or API key. Everything runs on your machine or in your CI.

## When Optics is not the right tool

Optics tests what a person does through the interface. Reach for something else for unit tests, load testing, API-only contract tests, or pixel-by-pixel visual comparison.

## Start here

:::cards{cols="2"}
- [Quickstart](/docs/get-started/quickstart): Install Optics and run a working test in about five minutes. {Recommended}
- [Install Optics](/docs/get-started/install): Every install option, plus the drivers and engines each platform needs.
- [Write your first test](/docs/get-started/first-test): Build a test from scratch against a real online store, step by step.
- [How Optics works](/docs/get-started/concepts): The four ideas every test is built from.
:::
