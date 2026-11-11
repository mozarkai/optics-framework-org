---
title: Test macOS, Linux and Windows desktop apps with one framework
nav: Desktop apps
summary: Test native desktop apps on macOS, Linux and Windows with the same CSV tests that you use for phones and browsers.
description: Automate native desktop app testing on macOS, Linux and Windows with Optics, an open-source framework that drives apps through Appium and the OS accessibility tree. One CSV test format for desktop, mobile and web.
level: Intermediate
time: 10 min
---

You can test a desktop app the way a user uses it: open the app, click buttons, type text, press key combinations and check what the window shows. Optics drives native apps on macOS, Linux and Windows through **Appium** and **appium-xa11y-driver**. Your tests are rows in CSV files, so one suite style covers your desktop, phone and web apps.

This page walks you through the job and links to the pages that hold the details. [Test desktop apps](/docs/platforms/desktop) is the full reference.

## Check what each OS supports

The driver reads the accessibility tree of the OS. You pick the OS with `platformName` in `config.yaml`.

| OS | `platformName` | `app` | Status |
|---|---|---|---|
| macOS | `Mac` | A bundle id, such as `com.apple.TextEdit` | Supported |
| Linux (X11) | `Linux` | An executable, such as `mousepad` | Supported |
| Windows | `Windows` | An executable, such as `notepad.exe` | Experimental |

The same keywords work on all three OSs. Press Keycode takes key combinations such as `primary+s`, where `primary` is Cmd on macOS and Ctrl elsewhere. Go Back and Get App Version are phone keywords, and they fail with **E0105** on a desktop.

## Set up

:::steps
### Install Optics with the Appium engine

[Install Optics](/docs/get-started/install), then add the Appium engine:

```shell
$ optics setup --install appium
```

### Prepare the Host

The Host is the computer that shows the app. Run the setup script of the driver there. It installs Node.js, Appium and the driver, and runs Appium as a service. [Set up the Host](/docs/platforms/desktop#set-up-the-host) has the command for each OS.

On macOS, give the Accessibility and Screen & System Audio Recording permissions to the Node.js path that the script prints. Then restart Appium.

### Make a project and run it

```shell
$ optics init notes --template desktop_editor
$ optics doctor notes
$ optics execute notes
```

Or run `optics quickstart` and choose `desktop`. It asks for the OS, the app and the Appium URL, and writes `config.yaml` for you.
:::

## Write the test

A desktop test is a list of steps on the app's elements. This module types a note, selects it all and deletes it:

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2
Open Editor,Launch App
Type A Note,Enter Text,${Editor},Hello from Optics
Type A Note,Assert Text,${Editor},Hello from Optics
Clear The Note,Press Keycode,primary+a
Clear The Note,Enter Text Using Keyboard,<backspace>
Close Editor,Close And Terminate App
```

Elements are XPath over the accessibility tree, such as `//button[@name="Save"]` or `//text_area`, or visible text. The tree differs between OSs, so give an element one column for each OS. [Find elements](/docs/platforms/desktop#find-elements) shows the tree and the locators.

## Keep desktop tests reliable

- **Start each app clean.** On macOS, add `appArguments: ["-ApplePersistenceIgnoreState", "YES"]`, so the app does not open old documents.
- **Keep your app in front.** Keys and clicks go to the app in front. A dialog of a different app makes the step fail. Use Launch App to bring the app back.
- **Use ids on macOS and Windows.** An `@id` stays the same when the label text changes. Linux has no ids, so use `@name` there.
- **Run Optics on the Host in CI.** Each step is one round trip, so a tunnel makes a suite slower.

## Run it on every build

Run the suite with `optics execute`, as you would a phone suite. The driver gives a Linux Host in Docker and a setup script for Windows runners. [Run in CI](/docs/platforms/desktop#run-in-ci) has GitHub Actions jobs for both.

## See also

- [Test desktop apps](/docs/platforms/desktop), the full desktop reference
- [Supported platforms](/docs/platforms/)
- [Press Keycode](/docs/reference/keywords/actions#press-keycode)
- [Define elements](/docs/elements/define)
