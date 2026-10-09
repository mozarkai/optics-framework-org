# Run your first test

> Install Optics and run a working test in a browser in about five minutes.

You'll install Optics, let it create a small project from a working sample, and run that project in a browser. You don't need a phone or an emulator for this.

### Install Optics

Run the installer for your system. It puts Optics in its own folder (`~/.optics`), so it doesn't touch the rest of your Python setup. You need Python 3.12 or newer.

**macOS and Linux**

```shell
$ curl -fsSL https://optics-framework.org/install | sh
```
**Windows**

```powershell
PS> irm https://optics-framework.org/install.ps1 | iex
```
**pip**

```shell
$ pip install optics-framework
```

Open a new terminal window, then check that the `optics` command works:

```shell
$ optics --version
Optics Framework 1.10.5
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

A browser window opens, visits a page, checks some text on it and closes. The terminal shows each step as it runs:

```terminal
Test Suite
├── Playwright Suite Setup                                 |  3.54s |    PASS
│   └── Open Example Page                                  |  3.54s |    PASS
│       └── Launch App (https://example.com)               |  3.54s |    PASS
├── TC1 Verify Landing                                     |  0.11s |    PASS
│   └── Verify Example Page                                |  0.11s |    PASS
│       └── Validate Element (text=This domain is for…)    |  0.11s |    PASS
└── Playwright Suite Teardown                              |  0.12s |    PASS
    └── Close Browser                                      |  0.12s |    PASS
        └── Close And Terminate App                        |  0.12s |    PASS
╭──────────────────────────────────────────────────────╮
│ Total Test Cases: 3 | Passed: 3 | Failed: 0          │
╰──────────────────────────────────────────────────────╯
```

**TC1 Verify Landing fails on Optics 1.10.5:**
The example page changed its wording after 1.10.5 shipped, so the sample looks for text that is no longer there. Open `my-optics-project/test_data/elements.csv` and replace its second line with:

`test_data/elements.csv`:

```csv
Heading,text=This domain is for use in documentation examples
```

Then run `optics execute my-optics-project` again. The next release ships the corrected sample.

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

`modules/modules.csv`:

```csv
module_name,module_step,param_1,param_2
Open Example Page,Launch App,https://example.com
Verify Example Page,Validate Element,${Heading}
Close Browser,Close And Terminate App
```

`${Heading}` is a name defined in `elements.csv`. Steps refer to things on screen by name, so when the page changes you update one line in `elements.csv` instead of every test.

## Testing a phone app instead

Choose `mobile` when `optics quickstart` asks what you want to automate. Optics then starts from a sample for the Android Contacts app. Before the run, you need an Android emulator or phone connected, and an Appium server running. [Set up Android testing](https://optics-framework.org/docs/platforms/android) walks through both.

## Next steps

- [Write your first test](https://optics-framework.org/docs/get-started/first-test): Build a sign-in and add-to-cart test against a real online store. (Next)
- [How Optics works](https://optics-framework.org/docs/get-started/concepts): Test cases, modules, elements and keywords, explained.
- [Install Optics](https://optics-framework.org/docs/get-started/install): Every install option, and the engines for each platform.
- [Choose how to create tests](https://optics-framework.org/docs/create/): Write, record, describe in plain English, or hand it to an AI agent.
