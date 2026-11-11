---
title: Test desktop apps on macOS, Linux and Windows
nav: Desktop
summary: Test native desktop apps on macOS, Linux and Windows. Optics reads the accessibility tree of the OS through Appium.
description: Automate native desktop app testing on macOS, Linux and Windows with Optics, an open-source framework that reads the OS accessibility tree through Appium and appium-xa11y-driver. Set up the Host, write config.yaml and run CSV tests.
level: Intermediate
time: 20 min
---

Optics tests native desktop apps on macOS, Linux and Windows. It uses the same CSV files, keywords and reports as for phones and browsers. A test can open an editor, type a note, press a key combination, open a calculator and check a result.

:::note
Windows support is experimental. It is tested on Windows Server 2022 with Notepad and the classic Calculator. [Limits](#limits) has the details for each OS.
:::

## How it works

Optics talks to an **Appium** server. Appium uses **appium-xa11y-driver**, which reads the accessibility tree of the OS: the same data that a screen reader uses. Each button, field and menu item in the tree is an element that Optics can find, press and read.

Appium and the driver run on the **Host**: the computer that shows the app. Optics can run on the Host too, or on a different computer that connects to the Host.

```text
Optics  ──WebDriver──>  Appium + appium-xa11y-driver  ──accessibility API──>  your app
                        └───────────── on the Host ─────────────┘
```

| OS | Accessibility API | Display |
|---|---|---|
| macOS | AXUIElement | The desktop of the user that is logged in |
| Linux | AT-SPI2 | An X11 display. The setup script starts one if there is none. |
| Windows | UI Automation | The desktop of the user that is logged in |

## Before you begin

- [Optics installed](/docs/get-started/install) with the Appium engine: `optics setup --install appium`.
- A Host that runs macOS, Linux with X11 (Debian 13 is tested), or Windows (Windows Server 2022 is tested).
- On macOS, access to System Settings to give two permissions one time.
- On Windows, an administrator one time, if the Visual C++ runtime is not installed.

The setup script installs its own Node.js, Appium 3 and the driver. You do not need Node.js before you start.

## Set up

:::steps
### Set up the Host

Run the setup script on the Host. The script installs Appium and the driver, and starts Appium as a service on `127.0.0.1:4723`. It is safe to run the script again: it changes only what is missing.

:::tabs{group="desktop"}
::tab[macOS]
```shell
$ curl -fsSLO https://raw.githubusercontent.com/chinmayajha/appium-xa11y-driver/v0.1.2/hosts/mac/setup.sh
$ bash setup.sh
```

The service is the LaunchAgent `appium-xa11y`. Its log is `~/Library/Logs/appium-xa11y.log`.

::tab[Linux]
```shell
$ curl -fsSLO https://raw.githubusercontent.com/chinmayajha/appium-xa11y-driver/v0.1.2/hosts/linux/setup.sh
$ bash setup.sh
```

The script installs Xvfb, Openbox, D-Bus and AT-SPI with `apt`. That step needs root: run the script as root, or with `sudo` access. If the script cannot get root, it prints the command to run yourself.

The service is the systemd user unit `appium-xa11y`. It uses the X11 display that is there. If there is no display, it starts Xvfb on `:99`. To see the log, run `journalctl --user -u appium-xa11y`.

::tab[Windows]
In PowerShell:

```powershell
PS> iwr https://raw.githubusercontent.com/chinmayajha/appium-xa11y-driver/v0.1.2/hosts/windows/setup.ps1 -OutFile setup.ps1
PS> powershell -ExecutionPolicy Bypass -File setup.ps1
```

The service is the logon task `appium-xa11y` of the user that runs the script. That user must stay logged on to the desktop. The log is `%LOCALAPPDATA%\appium-xa11y\appium.log`.
:::

### Give the permissions (macOS only)

macOS lets an app read other apps only when you give it **Accessibility**. Screenshots also need **Screen & System Audio Recording**. At the end, the setup script prints the path of the Node.js that runs Appium.

1. Open **System Settings > Privacy & Security > Accessibility**.
2. Click **+**, press **Cmd+Shift+G**, paste the path, and add it. Make sure that its switch is on.
3. Do the same steps in **Privacy & Security > Screen & System Audio Recording**.
4. Restart Appium:

```shell
$ launchctl kickstart -k gui/$(id -u)/appium-xa11y
```

:::mistake
Do not give the permissions to your terminal app. The service does not run in your terminal. Give them to the Node.js path that the script prints. Give them to the terminal app only when you start Appium yourself with `host.sh run`.
:::

### Check that Appium runs

```shell
$ curl -s http://127.0.0.1:4723/status
{"value":{"ready":true,"message":"The server is ready to accept new connections", ...}}
```

If you get no answer, read the log of the service. [If it isn't working](#if-it-isnt-working) lists the usual causes.

### Make a project

`optics quickstart` asks what you want to automate. Choose `desktop`, then the OS and the app. It writes `config.yaml` for you and can make the sample project.

Or make the sample project yourself:

```shell
$ optics init notes --template desktop_editor
```

The `desktop_editor` sample opens TextEdit on macOS, types a note, checks it, clears it and closes the editor. On Linux or Windows, change `platformName` and `app` in `notes/config.yaml` first. [Write config.yaml](#write-config-yaml) shows the values.

### Check and run

```shell
$ optics doctor notes
$ optics execute notes
```

`optics doctor` can warn that `adb` is missing. A desktop project does not need adb, so you can ignore it. Then `optics execute` runs the sample:

```terminal
│ Total Test Cases: 3 | Passed: 3 | Failed: 0 │
```
:::

## Write config.yaml {#write-config-yaml}

A desktop project uses the `appium` driver with three settings: the OS, `automationName: Xa11y` and the app. To write them with questions in place of YAML, run `optics configure notes` and choose `desktop`.

:::tabs{group="desktop"}
::tab[macOS]
```yaml title="config.yaml"
driver_sources:
  - appium:
      enabled: true
      url: "http://127.0.0.1:4723"
      capabilities:
        platformName: Mac
        automationName: Xa11y
        app: com.apple.TextEdit
        appArguments: ["-ApplePersistenceIgnoreState", "YES"]
elements_sources:
  - appium_find_element: {enabled: true}
  - appium_page_source:  {enabled: true}
  - appium_screenshot:   {enabled: true}
```

`appArguments` makes the app start with no windows from the last time. Without it, TextEdit and other document apps open the documents of the last session.

::tab[Linux]
```yaml title="config.yaml"
driver_sources:
  - appium:
      enabled: true
      url: "http://127.0.0.1:4723"
      capabilities:
        platformName: Linux
        automationName: Xa11y
        app: mousepad
elements_sources:
  - appium_find_element: {enabled: true}
  - appium_page_source:  {enabled: true}
  - appium_screenshot:   {enabled: true}
```

`optics quickstart` suggests `gedit`. Many systems do not have it. Use an editor that is installed, such as `mousepad`.

::tab[Windows]
```yaml title="config.yaml"
driver_sources:
  - appium:
      enabled: true
      url: "http://127.0.0.1:4723"
      capabilities:
        platformName: Windows
        automationName: Xa11y
        app: notepad.exe
elements_sources:
  - appium_find_element: {enabled: true}
  - appium_page_source:  {enabled: true}
  - appium_screenshot:   {enabled: true}
```
:::

`optics quickstart` also turns on `appium_web`. It has no effect on a desktop app, so you can keep it or remove it.

### Capabilities

| Capability | Value | Default |
|---|---|---|
| `platformName` | `Mac`, `Linux` or `Windows` | Required |
| `automationName` | `Xa11y` | Optics sets `Xa11y` when you leave it out |
| `app` | The app to start. See [Find the app id](#find-the-app-id). | Set `app` or `appName` |
| `appArguments` | A list of arguments for `app` | None |
| `appName` | The name of an app that runs now. The session attaches to it and does not start it. | None |
| `launchTimeout` | Milliseconds to wait for the app's first window | `20000` |
| `terminateOnDelete` | Stop the apps that the session started when the session ends. Apps that ran before stay open. | `true` |
| `failureArtifacts` | A folder on the Host. When a command fails, the driver saves the page source and a screenshot there. | None |

You can also put the driver's capabilities in `appium:options`, as in other Appium projects. Optics reads both forms.

:::warning
Set `app` or `appName`. If you set neither, the session fails with E0104. Without an app, the driver attaches to the app in front, which can be your terminal or your AI agent.
:::

### Find the app id

| OS | `app` | Example | How to find it |
|---|---|---|---|
| macOS | A bundle id or an `.app` path | `com.apple.TextEdit`, `/Applications/Calculator.app` | `osascript -e 'id of app "TextEdit"'` |
| Linux | An executable on the `PATH`, or a full path | `mousepad`, `/usr/bin/gnome-calculator` | `which mousepad` |
| Windows | An executable on the `PATH`, or a full path | `notepad.exe`, `C:\Program Files\App\app.exe` | `where notepad` |

On Windows, some executables are launchers that start a different process and exit, for example `calc.exe`. The session attaches to the app that the launcher starts.

### Attach to an app that runs

Use `appName` in place of `app` to test an app that is already open. The session does not start it and does not stop it at the end.

```yaml title="config.yaml"
      capabilities:
        platformName: Mac
        automationName: Xa11y
        appName: TextEdit
```

`appName` is the name that the OS shows for the app, for example `TextEdit` on macOS or `mousepad` on Linux.

## Use a Host on a different computer

Appium has no authentication. Keep it on `127.0.0.1`, and connect to it through a tunnel:

```shell
$ ssh -N -L 4723:127.0.0.1:4723 user@host
```

Then keep `url: "http://127.0.0.1:4723"` in `config.yaml`. Each step is one round trip through the tunnel, so a suite is slower over a network. To write and try a suite, run Optics on your computer. For CI and long suites, run Optics on the Host.

### Run a Linux Host in Docker

The driver has a Dockerfile for a Linux Host with Xvfb and the sample apps:

```shell
$ git clone --branch v0.1.2 https://github.com/chinmayajha/appium-xa11y-driver
$ docker build -f appium-xa11y-driver/docker/linux/Dockerfile -t appium-xa11y-linux appium-xa11y-driver
$ docker run -d --name appium -p 127.0.0.1:4723:4723 appium-xa11y-linux
```

The container has `mousepad` and `gnome-calculator`. To test your own app, install it in an image that starts from this one.

## Find elements

Each element in the tree is one XML tag. The tag is the role, such as `button`, `text_field`, `text_area`, `menu_item`, `static_text` or `window`. Each element has these attributes:

| Attribute | Meaning |
|---|---|
| `name` | The accessible name, usually the visible label |
| `value` | The text or value, for example the text in a field |
| `label` | The accessible description |
| `id` | The id that the app sets: AXIdentifier on macOS, AutomationId on Windows. It is always empty on Linux. |
| `type` | The role of the OS, for example `AXButton`, `push button` or `Button` |
| `enabled`, `visible`, `focused`, `selected`, `checked` | The state |
| `clickable`, `checkable`, `editable`, `scrollable` | What you can do with the element |
| `x`, `y`, `width`, `height` | The position on the screen |

Write locators in `test_data/elements.csv`:

| Locator | Example | Use it when |
|---|---|---|
| XPath with the id | `//button[@id="AllClear"]` | The app sets ids. This is the most stable locator on macOS and Windows. |
| XPath with the name | `//button[@name="Save"]` | The element has a label. On Linux, use this, because there are no ids. |
| XPath with the role | `//text_area` | There is only one element of that role, such as the editor. |
| Visible text | `Save` | You want a locator that works on all OSs. |

### Give one element a value for each OS

The same app has different trees on each OS. Give the element one column for each value, and Optics tries each value in turn. The `desktop_editor` sample uses this for the editor:

```csv title="test_data/elements.csv"
Element_Name,Element_ID_text_area,Element_ID_web_area
Editor,//text_area,//web_area
```

The editor is a `text_area` in TextEdit and mousepad, and a `web_area` in Notepad. A calculator shows the differences well:

| Key | macOS Calculator | Linux gnome-calculator | Windows classic Calculator |
|---|---|---|---|
| 7 | `//button[@id="Seven"]` | `//button[@name="7"]` | `//button[@id="137"]` |
| + | `//button[@id="Add"]` | `//button[@name="+"]` | `//button[@id="93"]` |
| = | `//button[@id="Equals"]` | `//button[@name="="]` | `//button[@id="121"]` |
| Clear | `//button[@id="AllClear"]` | `//button[@name="C"]` | `//button[@id="81"]` |

### See the tree

To see the tree of your app, add a `Capture Pagesource` step. Optics writes the tree to `execution_output/page_sources_log.xml`.

```csv title="modules/modules.csv"
module_name,module_step
Look at the app,Launch App
Look at the app,Capture Pagesource
```

`Get Interactive Elements` lists only the elements that you can press or type into. [`optics live`](/docs/create/record) shows the elements on the screen while you try steps one at a time.

The macOS menu bar is not in the tree. To use a menu command, press its key combination with Press Keycode.

## Press keys and key combinations

On a desktop, Press Keycode takes a key combination, or **chord**. Join the keys with `+`:

```csv title="modules/modules.csv"
module_name,module_step,param_1
Select all,Press Keycode,primary+a
Save,Press Keycode,cmd+s
New tab,Press Keycode,ctrl+t
Close a dialog,Press Keycode,Escape
```

`primary` is Cmd on macOS and Ctrl on Linux and Windows. Use `primary` when one test must run on all three OSs.

| Key | Names you can use |
|---|---|
| Cmd, Windows key | `cmd`, `command`, `meta`, `super`, `win`, `windows` |
| Ctrl | `ctrl`, `control` |
| Alt, Option | `alt`, `option`, `opt` |
| Shift | `shift` |
| Cmd on macOS, Ctrl elsewhere | `primary` |
| Enter | `enter`, `return` |
| Escape | `esc`, `escape` |
| Arrows | `up`, `down`, `left`, `right`, `arrowup`, `arrowdown`, `arrowleft`, `arrowright` |
| Delete | `backspace`, `delete`, `del` |
| Other keys | `tab`, `space`, `insert`, `home`, `end`, `pageup`, `pagedown`, `plus` |
| Function keys | `f1` to `f24` |
| Letters, digits, symbols | The character itself: `a`, `7`, `/` |

Key names are not case sensitive. An unknown name fails with `Unknown key '<name>'`. To press `+`, use `plus`.

## Type text

Enter Text types into an element. Enter Text Using Keyboard types into the element that has the focus.

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2
Write,Enter Text,${Editor},hello world
Write,Assert Text,${Editor},hello world
Fix the typo,Enter Text Using Keyboard,<backspace>
Clear,Clear Element Text,${Editor}
```

A value that is one special key in angle brackets presses that key: `<enter>`, `<tab>`, `<backspace>`, `<space>`, `<escape>`, `<left>`, `<right>`, `<up>`, `<down>`, `<insert>`, `<delete>`, `<home>`, `<end>`, `<pageup>`, `<pagedown>`, `<f1>` to `<f12>`. Phone keys such as `<back>` or `<volume_up>` fail with E0105.

Clear Element Text selects all the text with Cmd+A or Ctrl+A, then deletes it.

:::tip
On a macOS test Host, turn off inline predictive text: **System Settings > Keyboard > Text Input > Edit > Show inline predictive text**. A prediction adds words to a field, and Optics cannot set the text while it shows.
:::

## Scroll and swipe

Scroll and Swipe By Percentage work in the window of the app:

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2,param_3,param_4
Move down,Scroll,down
Drag up,Swipe By Percentage,50,70,up,30
```

Scroll turns the mouse wheel. Swipe drags with the mouse. Percentages are of the app's window, not of the screen.

## Work with more than one app

Launch Other App starts or brings a second app to the front, and the session follows it. Launch App with no value goes back to the app in `config.yaml`. Force Terminate App stops an app.

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2
Add numbers,Launch Other App,gnome-calculator
Add numbers,Press Element,${Seven}
Add numbers,Press Element,${Plus}
Add numbers,Press Element,5
Add numbers,Press Element,${Equals}
Add numbers,Assert Presence,12
Add numbers,Force Terminate App,gnome-calculator
Back to the editor,Launch App
```

Keys, typing and mouse actions go to the app in front. If a different app is in front, for example a system dialog, the step fails and sends nothing. Use Launch App to bring the app back to the front.

## Keywords that differ on a desktop

| Keyword | On a desktop |
|---|---|
| Press Keycode | Takes a chord, such as `primary+s`. Not an Android key number. |
| Launch App | Starts `app`, or brings it to the front if it runs. |
| Close And Terminate App | Closes the app that the session started. |
| Go Back | Fails with E0105. Press the app's key combination for back instead. |
| Get App Version | Fails with E0105. |
| Enter Text with phone keys | `<back>`, `<menu>` and the volume keys fail with E0105. |

All other keywords work as on a phone: Press Element, Assert Presence, Get Text, Scroll, Detect And Press and the others.

## Call the driver directly

Execute Script calls an `xa11y:` method of the driver. Use it for what no keyword does:

```csv title="modules/modules.csv"
module_name,module_step,param_1
Front window,Execute Script,"{""script"": ""xa11y: focusWindow""}"
Type,Execute Script,"{""script"": ""xa11y: typeText"", ""args"": {""text"": ""via script""}}"
```

| Method | Arguments | What it does |
|---|---|---|
| `xa11y: chord` | `keys` | Presses a chord, as Press Keycode does |
| `xa11y: typeText` | `text` | Types into the app in front |
| `xa11y: focusWindow` | `name` (optional) | Brings a window to the front |
| `xa11y: closeWindow` | `name` (optional) | Closes a window |
| `xa11y: launch` | `app`, `arguments` (optional) | Starts an app, and the session follows it |
| `xa11y: switchApp` | `name` or `pid` | Follows a different app, but does not bring it to the front |
| `xa11y: listApps`, `xa11y: listWindows`, `xa11y: activeAppInfo` | None | Lists the apps or windows, or gives the app in front |

To keep the result, for example the list of windows, add `store_as=name`. Other scripts fail with `unknown method`. The driver cannot run JavaScript.

## Use other parts of Optics

- **[Error detection](/docs/run/error-detection) and [self-heal](/docs/elements/self-heal)** read the page source, so they work on a desktop.
- **[OCR and images](/docs/elements/text-and-images)** work with `appium_screenshot`. On macOS, screenshots need the Screen & System Audio Recording permission.
- **[The MCP server](/docs/reference/mcp)** starts a desktop session with `driver: appium`, the `app`, and the capabilities above. An AI agent can then drive the app.
- **[Python](/docs/create/python), [Robot Framework](/docs/create/robot) and [the HTTP API](/docs/advanced/http-api)** take the same config.

## Run in CI

Run Optics on the Host, next to Appium. These GitHub Actions steps start a Host on a hosted runner, then run your suite:

:::tabs{group="desktop"}
::tab[Linux]
```yaml title=".github/workflows/desktop.yml"
jobs:
  desktop:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/checkout@v4
        with:
          repository: chinmayajha/appium-xa11y-driver
          ref: v0.1.2
          path: xa11y-driver
      - name: Start the Linux Host
        run: |
          docker build -q -f xa11y-driver/docker/linux/Dockerfile -t appium-xa11y-linux xa11y-driver
          docker run -d --name appium -p 127.0.0.1:4723:4723 appium-xa11y-linux
          for _ in $(seq 90); do curl -sf http://127.0.0.1:4723/status > /dev/null && break; sleep 2; done
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install "optics-framework[appium]"
      - run: optics execute tests/desktop
```

The app runs in the container, so it must be installed in the image.

::tab[Windows]
```yaml title=".github/workflows/desktop.yml"
jobs:
  desktop:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/checkout@v4
        with:
          repository: chinmayajha/appium-xa11y-driver
          ref: v0.1.2
          path: xa11y-driver
      - name: Prepare the Windows Host
        shell: powershell
        run: xa11y-driver/hosts/windows/setup.ps1 -NoService
      - name: Start Appium
        shell: bash
        run: |
          powershell -NoProfile -ExecutionPolicy Bypass -File "$LOCALAPPDATA/appium-xa11y/host.ps1" > appium.log 2>&1 &
          for _ in $(seq 90); do curl -sf http://127.0.0.1:4723/status > /dev/null && break; sleep 2; done
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install "optics-framework[appium]"
      - run: optics execute tests/desktop
```
:::

Hosted macOS runners do not give the Accessibility permission. For macOS, use a self-hosted runner on a Mac where you gave the permissions one time. [Run in CI](/docs/run/ci) covers reports and artifacts.

## Limits

:::tabs{group="desktop"}
::tab[macOS]
- The menu bar is not in the tree. Use key combinations for menu commands.
- A screenshot fails while a different process records the screen. Stop that process. If screenshots still fail, restart Appium.
- On a Mac with more than one display, screenshots show only the main display.
- Inline predictive text blocks typing. Turn it off on the Host.

::tab[Linux]
- Only X11. On Wayland, GTK 4 elements have no position.
- Elements have no `id`. Use `@name`, the role or visible text.
- GTK 4 apps work on GTK 4.18 (Debian 13). On GTK 4.14 (Ubuntu 24.04), they have no window and no positions. GTK 3 apps work on both.
- Some menu items have spaces at the end of their names. Use `contains(@name, "Save")` or visible text for them.

::tab[Windows]
- Tested only on Windows Server 2022, with Notepad and the classic Calculator. On Windows 10 and 11, `calc.exe` starts a different Calculator app.
- Typing goes to the caret, so the driver clicks the field first. This brings its window to the front.
- The driver needs the Microsoft Visual C++ 2015–2022 runtime. The setup script installs it.
:::

## If it isn't working

- **No answer from `http://127.0.0.1:4723/status`.** Appium does not run. Read the log of the service, then restart it: `launchctl kickstart -k gui/$(id -u)/appium-xa11y` on macOS, `systemctl --user restart appium-xa11y` on Linux, or `Stop-ScheduledTask -TaskName appium-xa11y; Start-ScheduledTask -TaskName appium-xa11y` on Windows.
- **A message about the Accessibility or Screen Recording permission.** On macOS, give both permissions to the Node.js path that the setup script printed, then restart Appium.
- **E0104: "A Mac session needs its app when it starts".** Set `app` or `appName` in the capabilities.
- **"'<app>' showed no window, and started no app of its own, within 20000 ms".** The app id is wrong, or the app starts slowly. Check the id with [Find the app id](#find-the-app-id), or set `launchTimeout` to a larger value.
- **"<app> has no window to activate".** The app runs, but it has no open window. Open a window first, for example with Press Keycode `primary+n`.
- **"<app> is not the frontmost app (<other> is)".** A different app is in front, so keys and clicks would go to it. Close the dialog that is in front, or use Launch App to bring your app to the front.
- **"Unknown key '<name>'".** Press Keycode got a key name that the driver does not know. Use a name from [Press keys and key combinations](#press-keys-and-key-combinations).
- **E0105: "'go_back' is not supported on Mac".** The keyword works only on phones. See [Keywords that differ on a desktop](#keywords-that-differ-on-a-desktop).
- **"DISPLAY ':1' is not a local X11 display".** On Linux, the driver needs a local X11 display. Remove the `--display` option and run the setup script again, so that it starts Xvfb.
- **An old document opens on macOS.** The app restored its last session. Add `appArguments: ["-ApplePersistenceIgnoreState", "YES"]`.
- **The element is not found on Linux, but the locator has `@id`.** Linux has no ids. Use `@name` or visible text.
- **`optics doctor` warns about adb.** A desktop project does not need adb. The warning does not stop the run.

## See also

- [Test desktop apps with one framework](/docs/guides/desktop-apps)
- [Define elements](/docs/elements/define)
- [Keyword reference](/docs/reference/keywords/)
- [config.yaml reference](/docs/reference/config)
- [appium-xa11y-driver on GitHub](https://github.com/chinmayajha/appium-xa11y-driver)
