---
title: What to learn next
nav: Next steps
summary: Pick your next page based on what you want Optics to do for you.
level: Beginner
---

You've run a test and know the basic pieces. Optics has a lot more in it, and you don't need most of it on day one. Start from the goal closest to yours.

## I want to test my own app

:::cards{cols="3"}
- [Android](/docs/platforms/android): Emulators and phones through Appium.
- [iOS](/docs/platforms/ios): Simulators and iPhones through Appium.
- [Web](/docs/platforms/web): Any website through Playwright or Selenium.
:::

## I want to create tests faster

:::cards{cols="2"}
- [Record a test](/docs/create/record): Run steps one at a time against the live app and save the ones that worked. {No code}
- [Describe a test in plain English](/docs/create/describe): Let an AI model drive the app from a sentence, then keep its steps. {AI}
- [Let your AI agent build tests](/docs/create/agent): Connect Optics to Claude, Cursor or any MCP client. {AI}
- [Use Optics from Python](/docs/create/python): Call keywords from pytest or your own scripts. {Code}
:::

## I want tests that break less

:::cards{cols="2"}
- [Define elements](/docs/elements/define): Give elements fallback values that survive redesigns.
- [Find elements by text and image](/docs/elements/text-and-images): Use OCR and pictures when the UI tree can't help.
:::

## I want to run tests every day

:::cards{cols="2"}
- [Run tests in CI](/docs/run/ci): Run the suite on every pull request.
- [Catch error screens](/docs/run/error-detection): Fail the run when the app shows a crash or "Session expired".
:::

## A suggested order

If you're learning Optics from scratch, this order adds one idea at a time:

1. [Write a test suite](/docs/create/write): the file formats in full.
2. [Define elements](/docs/elements/define): locators that last.
3. [Run a suite](/docs/run/) and [read the results](/docs/run/results).
4. [Organise a suite](/docs/create/organise): setup, teardown and reuse.
5. [Variables](/docs/advanced/variables) and [data-driven tests](/docs/advanced/data-driven): one flow, many inputs.
6. [Run tests in CI](/docs/run/ci), then work through the [readiness checklist](/docs/run/checklist).
