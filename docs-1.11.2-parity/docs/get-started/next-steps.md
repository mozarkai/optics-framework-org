# What to learn next

> Pick your next page based on what you want Optics to do for you.

You've run a test and know the basic pieces. Optics has a lot more in it, and you don't need most of it on day one. Start from the goal closest to yours.

## I want to test my own app

- [Android](https://optics-framework.org/docs/platforms/android): Emulators and phones through Appium.
- [iOS](https://optics-framework.org/docs/platforms/ios): Simulators and iPhones through Appium.
- [Web](https://optics-framework.org/docs/platforms/web): Any website through Playwright or Selenium.

## I want to create tests faster

- [Record a test](https://optics-framework.org/docs/create/record): Run steps one at a time against the live app and save the ones that worked. (No code)
- [Describe a test in plain English](https://optics-framework.org/docs/create/describe): Let an AI model drive the app from a sentence, then keep its steps. (AI)
- [Let your AI agent build tests](https://optics-framework.org/docs/create/agent): Connect Optics to Claude, Cursor or any MCP client. (AI)
- [Use Optics from Python](https://optics-framework.org/docs/create/python): Call keywords from pytest or your own scripts. (Code)

## I want tests that break less

- [Define elements](https://optics-framework.org/docs/elements/define): Give elements fallback values that survive redesigns.
- [Find elements by text and image](https://optics-framework.org/docs/elements/text-and-images): Use OCR and pictures when the UI tree can't help.

## I want to run tests every day

- [Run tests in CI](https://optics-framework.org/docs/run/ci): Run the suite on every pull request.
- [Catch error screens](https://optics-framework.org/docs/run/error-detection): Fail the run when the app shows a crash or "Session expired".

## A suggested order

If you're learning Optics from scratch, this order adds one idea at a time:

1. [Write a test suite](https://optics-framework.org/docs/create/write): the file formats in full.
2. [Define elements](https://optics-framework.org/docs/elements/define): locators that last.
3. [Run a suite](https://optics-framework.org/docs/run/) and [read the results](https://optics-framework.org/docs/run/results).
4. [Organise a suite](https://optics-framework.org/docs/create/organise): setup, teardown and reuse.
5. [Variables](https://optics-framework.org/docs/advanced/variables) and [data-driven tests](https://optics-framework.org/docs/advanced/data-driven): one flow, many inputs.
6. [Run tests in CI](https://optics-framework.org/docs/run/ci), then work through the [readiness checklist](https://optics-framework.org/docs/run/checklist).
