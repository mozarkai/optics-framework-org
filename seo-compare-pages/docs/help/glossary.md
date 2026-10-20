# Glossary

> Learn the terms used across the Optics docs.

Terms are listed alphabetically. Each entry links to the page that explains it in full.

## A

### AOI (area of interest)

An AOI, or area of interest, is a rectangle that limits where Optics looks for an element, given as percentages of the screen from 0 to 100. Use it when the same text or icon appears in several places. See [Search part of the screen](https://optics-framework.org/docs/elements/area-of-interest).

### Appium

Appium is the open-source automation server Optics uses to drive Android, iOS and TV apps. You run the Appium server yourself, and Optics connects to it at the `url` in `config.yaml`. See [Drivers](https://optics-framework.org/docs/reference/engines#drivers).

## B

### BLE driver

The BLE driver makes Optics act as a Bluetooth mouse and keyboard, for devices that allow no automation software. A camera watches the screen, and Optics finds elements with OCR and image matching. See [Production devices](https://optics-framework.org/docs/platforms/production).

## C

### Capabilities

Capabilities are the settings Optics passes to a driver when it starts a session, such as the device name, the app to open or the browser to use. They go under `capabilities` for each driver in `config.yaml`. See [driver_sources](https://optics-framework.org/docs/reference/config#driver-sources).

### config.yaml

`config.yaml` is the settings file in each project. It says which driver to use, how to look at the screen, and how to log and report. See [config.yaml](https://optics-framework.org/docs/reference/config).

### CSV

CSV (comma-separated values) is the plain-text table format most Optics suites use, one row per step. Any spreadsheet app or text editor can open it. See [Choose CSV or YAML](https://optics-framework.org/docs/create/write#choose-csv-or-yaml).

## D

### Driver

A driver is the engine that controls the target: Appium for phones and TVs, Playwright or Selenium for browsers, or the BLE driver for locked-down devices. You enable one under `driver_sources` in `config.yaml`. See [Drivers](https://optics-framework.org/docs/reference/engines#drivers).

### Dry run

A dry run, started with `optics dry_run`, checks a project for unknown keywords, missing modules and undefined variables without tapping or typing anything. Run one before every commit. See [`optics dry_run`](https://optics-framework.org/docs/reference/cli#optics-dry-run).

## E

### Element

An element is a name for something on screen, such as `sign_in`, plus one or more values that tell Optics how to find it. Steps refer to it as `${sign_in}`. See [Define elements](https://optics-framework.org/docs/elements/define).

### Element source

An element source is a way for Optics to look at the screen: ask the app for an element, read its UI tree, or take a screenshot. Each driver has its own, listed under `elements_sources` in `config.yaml`. See [Element sources](https://optics-framework.org/docs/reference/engines#element-sources).

### Elements file

An elements file is a CSV whose header starts with `Element_Name,Element_ID`, listing each element's name and values. The project template keeps it in `test_data/elements.csv`. See [Elements](https://optics-framework.org/docs/reference/files#elements).

### Engine

An engine is an optional add-on that gives Optics a capability: a driver, an element source, an OCR engine, image matching or an AI model. You install engines with `optics setup` and turn them on in `config.yaml`. See [Engines and extras](https://optics-framework.org/docs/reference/engines).

### Error definition

An error definition is a row in a CSV that names a message your app shows when something goes wrong, such as "Something went wrong". At the end of a run, Optics checks the last screen for these messages and reports any it finds. See [Catch error screens](https://optics-framework.org/docs/run/error-detection).

### Execution output

The execution output is the `execution_output/` folder in a project, where each run writes its JUnit report, screenshots and logs. See [Outputs](https://optics-framework.org/docs/reference/files#outputs).

### Extra

An extra is the pip name for an optional engine, such as `appium`, `easyocr` or `llm`, installed with `optics setup --install <name>` or `pip install "optics-framework[<name>]"`. Bundles such as `web` and `all` install several at once. See [Engines and extras](https://optics-framework.org/docs/reference/engines).

## F

### Fallback

A fallback is a second (or third) value for an element that Optics tries when the first one isn't found. For example, an element can have an XPath, then its text, then an image. See [How Optics finds elements](https://optics-framework.org/docs/elements/).

## I

### Image detection

Image detection finds an element by matching a small picture of it, called a template, against a screenshot. Turn it on with `templatematch` under `image_detection` in `config.yaml`. See [Turn on image matching](https://optics-framework.org/docs/elements/text-and-images#turn-on-image-matching).

### Include and exclude

Include and exclude are `config.yaml` lists that pick which test cases a run includes or skips, by name. Optics has no command-line flag for this. See [include and exclude](https://optics-framework.org/docs/reference/config#include-and-exclude).

### Index

An index picks one of several matches for the same element, counting from 0, as in `index=1` for the second match. See [Pick one of several matches](https://optics-framework.org/docs/elements/define#pick-one-of-several-matches).

## J

### JUnit report

The JUnit report is `junit_output.xml`, an XML file of every test case's result that CI systems such as GitHub Actions and Jenkins can display. Optics writes it to the execution output after every run. See [Read the results](https://optics-framework.org/docs/run/results).

## K

### Keyword

A keyword is one action or check that a step performs, such as `Press Element`, `Enter Text` or `Assert Presence`. Run `optics list` to see them all. See [Keywords](https://optics-framework.org/docs/reference/keywords/).

## L

### LLM

An LLM (large language model) is the AI model behind plain-English mode and self-heal. Optics supports Google's Gemini models, configured under `llm_models` in `config.yaml`. See [llm_models](https://optics-framework.org/docs/reference/config#llm-models).

### Locator

A locator is a value that tells Optics how to find an element: an XPath, visible text, a CSS selector or an image file name. Locators live in the elements file. See [Choose the kind of value](https://optics-framework.org/docs/elements/define#choose-the-kind-of-value).

## M

### MCP

MCP (Model Context Protocol) is an open standard that lets AI agents use outside tools. `optics mcp` starts an MCP server that gives an agent Optics keywords as tools. See [Let your AI agent build tests](https://optics-framework.org/docs/create/agent).

### Module

A module is a named, reusable list of steps, such as *Sign In* or *Add To Cart*. Test cases are made of modules. See [Modules](https://optics-framework.org/docs/get-started/concepts#modules).

## O

### OCR

OCR (optical character recognition) reads text from a screenshot. Optics uses it to find text the UI tree doesn't contain, such as words drawn inside an image. See [Turn on OCR](https://optics-framework.org/docs/elements/text-and-images#turn-on-ocr).

## P

### Page source

The page source is the app's or web page's UI tree written out as text: XML on Android and iOS, HTML on the web. Optics searches it for XPaths and text before it falls back to screenshots. See [How Optics finds elements](https://optics-framework.org/docs/elements/).

### Plain-English mode

Plain-English mode is the part of `optics live` where you type a goal in plain English and an AI model works out the steps. Press Ctrl+N to switch to it. See [Describe a test in plain English](https://optics-framework.org/docs/create/describe).

### Playwright

Playwright is a browser automation library that Optics uses as a driver for web testing. It needs no separate server. See [Web](https://optics-framework.org/docs/platforms/web).

### Preflight

The preflight is the check `optics execute` runs before a test starts, to make sure the Appium or Selenium server answers and an Android device is connected. Set `OPTICS_SKIP_PREFLIGHT=1` to skip it. See [`optics execute`](https://optics-framework.org/docs/reference/cli#optics-execute).

### Project

A project is a folder that holds one suite: its `config.yaml`, test cases, modules and elements. Optics finds files anywhere in the folder by their header row. See [Project files](https://optics-framework.org/docs/reference/files).

## S

### Selenium

Selenium is a browser automation tool that Optics can use as a driver for web testing, through a Selenium server or Grid. It supports Chrome and Firefox. See [Web](https://optics-framework.org/docs/platforms/web).

### Self-heal

Self-heal is an optional feature in which an AI model looks at the screen and tries to finish a step when Optics can't find its element. Turn it on with `ai_self_heal: true`. See [Recover failing steps with AI self-heal](https://optics-framework.org/docs/elements/self-heal).

### Session

A session is one connection between Optics and a device or browser, from when the driver starts until it closes. Each `optics execute` run, `optics live` session or API session has its own. See [What happens during a run](https://optics-framework.org/docs/get-started/concepts#what-happens-during-a-run).

### Step

A step is one row in a module: a keyword plus the values it needs, such as `Enter Text,${search_bar},Trail Runner 2`. See [Write the steps as modules](https://optics-framework.org/docs/create/write#write-the-steps-as-modules).

### Suite

A suite is all the test cases in one project, run together by `optics execute`. See [how to organize a suite](https://optics-framework.org/docs/create/organise).

### Suite Setup and Suite Teardown

Suite Setup and Suite Teardown are test cases with special names. Suite Setup runs once before every other test case, and Suite Teardown runs once after them, so they're the place to open and close the app. See [Setup and teardown](https://optics-framework.org/docs/reference/files#setup-and-teardown).

## T

### Template (image)

A template is a cropped picture of an element, such as an icon, that image detection looks for on a screenshot. Refer to it by file name in the elements file. See [Capture a good template](https://optics-framework.org/docs/elements/text-and-images#capture-a-good-template).

### Test case

A test case is a flow you want to check, made of modules run in order, such as *Shopper can check out*. Each test case passes or fails on its own. See [Test cases](https://optics-framework.org/docs/get-started/concepts#test-cases).

### Text detection

Text detection finds an element by reading the text on a screenshot with an OCR engine, such as EasyOCR or Tesseract. Turn it on under `text_detection` in `config.yaml`. See [Turn on OCR](https://optics-framework.org/docs/elements/text-and-images#turn-on-ocr).

## U

### UI tree

The UI tree is the structure of everything an app or web page shows, with each element's type, text and id. Optics reads it through the [page source](#page-source). See [How Optics finds elements](https://optics-framework.org/docs/elements/).

## V

### Variable

A variable is a named value written as `${name}` in a step, defined in the elements file or created by a step such as `Evaluate`. Optics replaces it only when it fills a whole cell. See [Variables](https://optics-framework.org/docs/advanced/variables).

## X

### XPath

An XPath is a path through the app's UI tree that points to one element, such as `//*[@resource-id='login']`. It's the fastest and most precise kind of locator. See [XPath](https://optics-framework.org/docs/elements/define#xpath).
