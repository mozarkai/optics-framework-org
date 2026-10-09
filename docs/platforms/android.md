---
title: Test Android apps
nav: Android
summary: Set up Appium and adb, then run your tests on an Android phone or emulator.
level: Beginner
time: 20 min
---

Optics drives Android apps through **Appium**, an open-source server that taps, types and reads the screen on a device. You run the Appium server on your machine, Optics talks to it, and Appium talks to the phone or emulator over **adb** (Android Debug Bridge, the SDK's device tool).

This page uses Birch, a sample shoe store app with the package name `com.birch.shop`. Replace it with your own app.

## Before you begin

You need:

- Optics installed. See [Install Optics](/docs/get-started/install).
- [Node.js](https://nodejs.org/) 20 or newer, to run the Appium server.
- The Android SDK. We recommend getting it with [Android Studio](https://developer.android.com/studio), which also creates emulators.
- An emulator, or an Android phone and a USB cable.

## Set up

:::steps
### Install the Appium engine

```shell
$ optics setup --install appium
```

This adds the Python client that Optics uses to talk to Appium. It doesn't install the server.

### Install the Appium server and its Android driver

```shell
$ npm install -g appium
$ appium driver install uiautomator2
```

UiAutomator2 is the Appium driver for Android. It needs the `ANDROID_HOME` environment variable set to your SDK folder, and Java installed. Run `appium driver doctor uiautomator2` to check both.

### Make adb available

adb ships in the SDK's `platform-tools` folder. Add that folder to your PATH, then check it:

```shell
$ adb version
```

On macOS the SDK is usually in `~/Library/Android/sdk`, on Linux in `~/Android/Sdk`, and on Windows in `%LOCALAPPDATA%\Android\Sdk`.

### Start an emulator or connect a phone

For an emulator, open Android Studio's **Device Manager** and start a virtual device.

For a phone, turn on **Developer options** (tap **Build number** seven times in **Settings > About phone**), then turn on **USB debugging**. Connect the cable and accept the "Allow USB debugging?" prompt on the phone.

Check that adb sees it:

```shell
$ adb devices
List of devices attached
emulator-5554	device
```

The first column is the device's serial. `device` in the second column means it's ready. `unauthorized` means you still need to accept the prompt on the phone.

### Find the app's package and activity

Optics needs the app's **package** (its id, such as `com.birch.shop`) and its **activity** (the screen it opens on). Open the app on the device, then ask adb what has focus:

```shell
$ adb shell dumpsys window | grep -E 'mCurrentFocus'
  mCurrentFocus=Window{4f2a1c u0 com.birch.shop/com.birch.shop.MainActivity}
```

The part before the `/` is the package, and the part after it is the activity. If you know the package, you can also ask Android for its launch activity:

```shell
$ adb shell cmd package resolve-activity --brief com.birch.shop
priority=0 preferredOrder=0 match=0x108000 specificIndex=-1 isDefault=true
com.birch.shop/.MainActivity
```

An activity that starts with a dot is short for the package plus that name: `.MainActivity` means `com.birch.shop.MainActivity`.

### Write config.yaml

Create a project with `optics init birch-android`, then replace its `config.yaml`:

```yaml title="config.yaml"
driver_sources:
  - appium:
      enabled: true
      url: "http://127.0.0.1:4723"          # where the Appium server listens
      capabilities:                          # must not be empty
        platformName: Android                # required; picks the Android setup
        automationName: UiAutomator2
        deviceName: emulator-5554
        udid: emulator-5554                  # optional; pins one device
        appPackage: com.birch.shop           # app opened by "Launch App" with no value
        appActivity: com.birch.shop.MainActivity
        # appium:settings: {allowInvisibleElements: true}  # optional; include off-screen elements
elements_sources:
  - appium_find_element: {enabled: true}     # asks Appium for XPaths, ids and text
  - appium_page_source:  {enabled: true}     # searches the app's UI tree
  - appium_screenshot:   {enabled: true}     # screenshots for OCR and image matching
text_detection:
  - easyocr: {enabled: true}                 # needs: optics setup --install easyocr
image_detection:
  - templatematch: {enabled: true}           # finds .png templates anywhere in the project
log_level: INFO
file_log: true
json_log: true
```

Always set `url`. Optics can't connect if it's missing or empty. If you don't need OCR yet, delete the `text_detection` block, because an enabled OCR engine must be installed for every run.

### Check the setup

```shell
$ optics doctor birch-android
```

```terminal
Mobile
  ✅ adb                               found at /Users/you/Library/Android/sdk/platform-tools/adb
  ✅ adb devices                       1 connected: emulator-5554
  ⚠️ appium server                     not reachable at 127.0.0.1:4723
      → Start it in another terminal with the `appium` command.

Project
  ✅ config: driver                    appium enabled
  ✅ config: appium element source     enabled: appium_find_element, appium_page_source, appium_screenshot
  ✅ config: appium settings           required settings present
```

Fix every ❌ row. A ⚠️ on `adb devices` or `appium server` blocks the first run too, and the doctor lists them under "Before your first real run". A ⚠️ for `deviceName`, `appPackage` or `appActivity` means the key is missing from `capabilities`.

### Start Appium

Open a second terminal and leave this running:

```shell
$ appium
```

It listens on port 4723, which matches `url` in the config.

### Run the tests

```shell
$ optics execute birch-android
```

The app opens on the device and the terminal shows each step as it runs.
:::

## Write steps for Android

Tests for Android look like any other Optics test. Elements can be XPaths into the Android UI tree, visible text, or images:

```csv title="test_data/elements.csv"
Element_Name,Element_ID
email_field,//android.widget.EditText[@resource-id='com.birch.shop:id/email']
password_field,//android.widget.EditText[@resource-id='com.birch.shop:id/password']
sign_in,Sign in
password,@:trailrunner
```

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2
Open Birch,Launch App
Open Birch,Assert Presence,Sign in,20
Sign in,Enter Text,${email_field},ava@birch.shop
Sign in,Enter Text,${password_field},${password}
Sign in,Press Element,${sign_in}
Sign in,Assert Presence,Trail Runner 2,15
```

`Launch App` with no value opens `appPackage` from the config. Pass a package to open a different app: `Launch App,com.android.settings`. The `@:` prefix marks `password` as secret, so it's typed without the prefix and masked in log files. To find XPaths and ids, open the app in [`optics live`](/docs/create/record) or [Appium Inspector](https://github.com/appium/appium-inspector).

## What `optics execute` checks first

Before a run starts, `optics execute` runs a **preflight**. For Android it checks that:

1. The Appium server answers at `url`.
2. `adb` is on your PATH.
3. adb reports at least one device in the `device` state.

If a check fails, Optics stops and prints what to do:

```terminal
Cannot start

No Appium server reachable at http://127.0.0.1:4723.

Start one in another terminal:  appium
Then re-run:  optics execute birch-android
```

The adb checks only run when the plain `platformName` key is `Android`, in any capitalization. Optics doesn't read `appium:platformName` for this check. To skip the preflight, for example when Appium and the devices run on a remote device farm, set `OPTICS_SKIP_PREFLIGHT`:

```shell
$ OPTICS_SKIP_PREFLIGHT=1 optics execute birch-android
```

`optics dry_run` has no preflight, so it works without a device.

## Press keys

Press Keycode sends an Android key by its number:

| Key | Number |
|---|---|
| Back | `4` |
| Home | `3` |
| Enter | `66` |
| Backspace | `67` |
| Tab | `61` |
| Volume up / down | `24` / `25` |
| Recent apps | `187` |

```csv title="modules/modules.csv"
module_name,module_step,param_1
Go back,Press Keycode,4
```

Android's [KeyEvent list](https://developer.android.com/reference/android/view/KeyEvent) has every number. To press Enter after typing, you can also write `Enter Text Using Keyboard,<enter>`. See [Press Keycode](/docs/reference/keywords/actions#press-keycode) for details.

## Tips

- **App data is kept between runs.** Optics starts each session with `noReset: true`, so Appium doesn't clear the app's data and a signed-in user stays signed in. Add `noReset: false` to `capabilities` to start every run from a fresh app.
- **Pick a device with `udid`.** When several devices are connected, set `udid` to the serial from `adb devices`. `deviceName` is only a label.
- **Include off-screen elements.** Android leaves elements that are scrolled out of view out of the UI tree. Add `appium:settings: {allowInvisibleElements: true}` under `capabilities` to include them.
- **Switch devices in `optics live`.** When you plug in another Android device during `optics live`, Optics notices and switches the session to it.
- **Android TV uses the same setup.** See [Test TV apps](/docs/platforms/tv) for remote-control keys.

## If it isn't working

- **"No Appium server reachable".** Start `appium` in another terminal. If it runs on another port or machine, make `url` match.
- **"No Android device/emulator attached".** Run `adb devices`. If the phone shows `unauthorized`, accept the prompt on it. If it shows `offline`, reconnect the cable or run `adb kill-server`, then `adb devices` again.
- **`E0104` "Appium capabilities not found in config".** `capabilities` is empty or missing. Add at least `platformName`.
- **`E0104` "Unsupported platform".** Check the spelling of `platformName`. Use `Android`.
- **Appium can't find the UiAutomator2 driver, or complains about `ANDROID_HOME`.** Run `appium driver install uiautomator2`, set `ANDROID_HOME`, and check with `appium driver doctor uiautomator2`.
- **The app opens on the wrong screen.** Check `appActivity`. If the app remembers an old state, set `noReset: false`.
- **A swipe or scroll passes but nothing moves.** Appium gesture errors are logged, not raised. Check the screenshots in `execution_output/`, and only use `up` and `down` with Scroll.
- **An element isn't found.** Actions don't wait, so put `Assert Presence` before them. [Troubleshooting](/docs/help/troubleshooting) covers more cases.

## See also

- [Test TV apps](/docs/platforms/tv)
- [Define elements](/docs/elements/define)
- [Run tests in CI](/docs/run/ci)
- [config.yaml reference](/docs/reference/config)
- [CLI reference](/docs/reference/cli)
