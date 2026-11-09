---
title: Run your first test
nav: Quickstart
summary: Install Optics and run a working test in a browser in about five minutes.
level: Beginner
time: 5 min
---

You'll install Optics, let it create a small project from a working sample, and run that project in a browser. You don't need a phone or an emulator for this.

:::steps
### Install Optics

Run the installer for your system. It puts Optics in its own folder (`~/.optics`), so it doesn't touch the rest of your Python setup. You need Python 3.12 or newer.

:::tabs{group="os"}
::tab[macOS and Linux]
```shell
$ curl -fsSL https://optics-framework.org/install | sh
```
::tab[Windows]
```powershell
PS> irm https://optics-framework.org/install.ps1 | iex
```
::tab[pip]
```shell
$ pip install optics-framework
```
:::

Open a new terminal window, then check that the `optics` command works:

```shell
$ optics --version
Optics Framework 1.11.2
```

### Create a project

Run the guided setup:

```shell
$ optics quickstart
```

It asks a few questions. Every question has a default, shown in brackets. For this quickstart, answer like this:

| Question | Answer |
|---|---|
| What do you want to automate? | `web` |
| Install Playwright, Selenium now? | Yes |
| Start from the 'playwright' example? | Yes |
| Project name | Press Enter to keep `my-optics-project` |
| Where should the project live? | Press Enter for the current folder |
| Overwrite the template's config.yaml with your own answers? | No |

Optics installs the browser engine, copies the sample into `my-optics-project`, and checks your setup. Rows marked ⚠️ in that check are optional extras you can add later.

### Run the test

When Optics asks **Run your first test now?**, answer yes. You can also run it yourself at any time:

```shell
$ optics execute my-optics-project
```

A browser window opens, visits example.com, looks for some text and closes. Every step passes:

```terminal
Test Suite
├── Playwright Suite Setup                               |      3.03s |    PASS
│   └── Open Example Page                                |      3.03s |    PASS
│       └── Launch App (https://example.com)             |      3.03s |    PASS
├── TC1 Verify Landing                                   |      0.12s |    PASS
│   └── Verify Example Page                              |      0.12s |    PASS
│       └── Validate Element (text=This domain is for... |      0.12s |    PASS
└── Playwright Suite Teardown                            |      0.06s |    PASS
    └── Close Browser                                    |      0.06s |    PASS
        └── Close And Terminate App                      |      0.06s |    PASS
╭──────────────────────────────────────────────────────────────────────────────╮
│ Total Test Cases: 3 | Passed: 3 | Failed: 0                                  │
╰──────────────────────────────────────────────────────────────────────────────╯
```

### Break the test on purpose

This step is optional. It shows you how Optics reports a failure. Open `my-optics-project/test_data/elements.csv` and change the `Description` row to text that the page does not show:

```csv title="test_data/elements.csv"
Element_Name,Element_ID
Description,text=Welcome to Example
```

Run the test again. This time it fails:

```terminal
├── TC1 Verify Landing                                   |     10.74s |    FAIL
│   └── Verify Example Page                              |     10.74s |    FAIL
│       └── Validate Element (text=Welcome to Example)   |     10.01s |    FAIL
...
│ Total Test Cases: 3 | Passed: 2 | Failed: 1                                  │
╭────────────────────────────── Failure details ───────────────────────────────╮
│ TC1 Verify Landing → step 'Validate Element (text=Welcome to Example)' —     │
│ Keyword 'Validate Element' failed after fallback attempts; last error:       │
│ E0201: ['text=Welcome to Example'] not found based on rule 'all'. OCR        │
│ was not tried: no text_detection engine is configured.                       │
╰──────────────────────────────────────────────────────────────────────────────╯
```

The tree shows where the run stopped: the test case `TC1 Verify Landing`, its module `Verify Example Page`, and the step `Validate Element`. **Failure details** gives the step, the value it looked for and the last error. Optics waited for the text, and the page did not show it. The OCR note tells you that Optics did not also read the screenshot, because no [OCR engine](/docs/elements/text-and-images#turn-on-ocr) is configured.

Change the `Description` row back to its original text. Run the test again, and every step passes.
:::

## What just happened

The project is three small spreadsheets and a settings file:

```tree
my-optics-project/
├── config.yaml                  # which browser or device to use
├── test_cases/test_cases.csv    # which flows to run
├── modules/modules.csv          # the steps in each flow
├── test_data/elements.csv       # names for things on screen
└── execution_output/            # results, written by each run
```

Open `modules/modules.csv` in any editor or spreadsheet app. Each row is one step: a **module** name, a **keyword** such as `Launch App`, and the values that keyword needs.

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2
Open Example Page,Launch App,https://example.com
Verify Example Page,Validate Element,${Description}
Close Browser,Close And Terminate App
```

`${Description}` is a name defined in `elements.csv`. Steps refer to things on screen by name, so when the page changes you update one line in `elements.csv` instead of every test.

## Testing a phone app instead

Choose `mobile` when `optics quickstart` asks what you want to automate. Optics then starts from a sample for the Android Contacts app. Before the run, you need an Android emulator or phone connected, and an Appium server running. [Set up Android testing](/docs/platforms/android) walks through both.

## Next steps

:::cards{cols="2"}
- [Write your first test](/docs/get-started/first-test): Build a sign-in and add-to-cart test against a real online store. {Next}
- [How Optics works](/docs/get-started/concepts): Test cases, modules, elements and keywords, explained.
- [Install Optics](/docs/get-started/install): Every install option, and the engines for each platform.
- [Choose how to create tests](/docs/create/): Write, record, describe in plain English, or hand it to an AI agent.
:::
