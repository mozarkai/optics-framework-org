---
title: Test iOS apps
nav: iOS
summary: Set up Appium with the XCUITest driver, then run your tests on an iOS simulator or device.
level: Intermediate
time: 25 min
---

Optics drives iOS apps through **Appium** and its **XCUITest** driver, which uses Apple's own UI testing tools. You run the Appium server on a Mac, and Optics talks to it. iOS testing needs macOS, because Xcode only runs there.

This page uses Birch, a sample shoe store app with the bundle id `com.birch.shop`. Replace it with your own app.

## Before you begin

You need:

- A Mac with [Xcode](https://developer.apple.com/xcode/) installed from the App Store. Open it once to accept the license and install its components, then run `xcode-select --install` for the command-line tools.
- Optics installed. See [Install Optics](/docs/get-started/install).
- [Node.js](https://nodejs.org/) 20 or newer, to run the Appium server.
- A build of your app: a `.app` for the simulator, or a signed build for a real device.

## Set up

:::steps
### Install the Appium engine

```shell
$ optics setup --install appium
```

### Install the Appium server and the XCUITest driver

```shell
$ npm install -g appium
$ appium driver install xcuitest
```

### Start a simulator

List the simulators Xcode provides:

```shell
$ xcrun simctl list devices
== Devices ==
-- iOS 17.5 --
    iPhone 15 (5D1C2A60-8F0E-4B7A-9C41-2E6F0C3B9A17) (Shutdown)
    iPhone 15 Pro (A3E9F7B2-1C44-4D2B-8E0A-7B5D9C6E2F01) (Shutdown)
```

Boot one by name and open the Simulator app to watch it:

```shell
$ xcrun simctl boot "iPhone 15"
$ open -a Simulator
```

### Install the app and find its bundle id

Install your simulator build, then read its **bundle id**, the app's unique name:

```shell
$ xcrun simctl install booted Birch.app
$ plutil -extract CFBundleIdentifier raw Birch.app/Info.plist
com.birch.shop
```

### Write config.yaml

Create a project with `optics init birch-ios`, then replace its `config.yaml`:

```yaml title="config.yaml"
driver_sources:
  - appium:
      enabled: true
      url: "http://127.0.0.1:4723"
      capabilities:
        platformName: iOS                    # picks the iOS setup
        automationName: XCUITest
        deviceName: "iPhone 15"              # the simulator's name
        bundleId: com.birch.shop             # required: the app Launch App opens
        # udid: <device udid>                # real devices
elements_sources:
  - appium_find_element: {enabled: true}
  - appium_page_source:  {enabled: true}
  - appium_screenshot:   {enabled: true}
```

If you have several iOS versions installed, add `platformVersion: "17.5"` so Appium picks the right simulator.

### Check the setup

```shell
$ optics doctor birch-ios
```

Without `bundleId`, the doctor shows a failure, because XCUITest has nothing to launch:

```terminal
Project
  ✅ config: driver                    appium enabled
  ✅ config: appium element source     enabled: appium_find_element, appium_page_source, appium_screenshot
  ❌ config: appium settings           bundleId missing in capabilities
      → Edit config.yaml in this project folder.
```

The `adb` rows in the Mobile section are for Android. Ignore them on iOS, even when the doctor lists the adb hint under "Before your first real run".

### Start Appium and run

Start the server in a second terminal and leave it running:

```shell
$ appium
```

Then run the tests:

```shell
$ optics execute birch-ios
```

Before the run, Optics checks that the Appium server answers at `url`. Set `OPTICS_SKIP_PREFLIGHT=1` to skip that check. The first session on a new simulator takes a few minutes, because Appium builds its helper app, WebDriverAgent, and installs it.
:::

## Test on a real device

A real iPhone or iPad needs a few more steps:

1. Connect the device, trust the Mac, and turn on **Developer Mode** in **Settings > Privacy & Security**.
2. Find its id with `xcrun xctrace list devices` and set it as `udid` under `capabilities`.
3. Sign WebDriverAgent with your Apple developer team, so it can be installed on the device.

Signing is the step that most often goes wrong. Follow the [Appium XCUITest driver docs](https://appium.github.io/appium-xcuitest-driver/latest/) for real-device setup.

## Write steps for iOS

iOS elements have types such as `XCUIElementTypeButton` and attributes such as `name`, `label` and `value`. Use them in XPaths:

```csv title="test_data/elements.csv"
Element_Name,Element_ID
email_field,//XCUIElementTypeTextField[@name='Email']
password_field,//XCUIElementTypeSecureTextField[@name='Password']
sign_in,//XCUIElementTypeButton[@name='Sign in']
sign_in,Sign in
back_button,//XCUIElementTypeButton[@name='Back']
```

Plain text such as `Sign in` is matched against the accessibility id and the `name`, `label` and `value` attributes. A value that starts with `XCUIElementType`, such as `XCUIElementTypeSwitch`, finds elements by type; add `index` to pick one of several.

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2
Open Birch,Launch App
Open Birch,Assert Presence,Sign in,20
Sign in,Enter Text,${email_field},ava@birch.shop
Sign in,Press Element,${sign_in}
Sign in,Assert Presence,Trail Runner 2,15
```

To see the real names in your app, open it in [`optics live`](/docs/create/record) or [Appium Inspector](https://github.com/appium/appium-inspector).

## Keys on iOS

iOS has no Back key and no Android key numbers, so Press Keycode doesn't work on iOS. Instead:

- **Go back.** Tap the app's own back button, such as `${back_button}` above.
- **Press Home.** Run XCUITest's `mobile: pressButton` command with Execute Script. Its buttons are `home`, `volumeup` and `volumedown`:

  ```csv title="modules/modules.csv"
  module_name,module_step,param_1
  Go home,Execute Script,"{""script"": ""mobile: pressButton"", ""args"": {""name"": ""home""}}"
  ```

- **Type and submit.** Type with Enter Text on a field, then tap the keyboard's own submit key by its label. Enter Text Direct, Enter Text Using Keyboard and `<enter>`-style keys are built on Android key commands.

## If it isn't working

- **The doctor shows ❌ for `bundleId`.** Add `bundleId` under `capabilities`. Only the plain key name counts for this check.
- **"No Appium server reachable".** Start `appium` in another terminal, and make `url` match its port.
- **Appium can't find the XCUITest driver.** Run `appium driver install xcuitest`, then restart `appium`.
- **Appium can't find the simulator.** Make `deviceName` match a name from `xcrun simctl list devices`, and add `platformVersion` if several iOS versions are installed.
- **WebDriverAgent fails to build or install on a device.** This is a signing problem. See the [XCUITest driver docs](https://appium.github.io/appium-xcuitest-driver/latest/).
- **`E0104` "Unsupported platform".** Check the spelling of `platformName`. Use `iOS`.
- **An element isn't found.** Actions don't wait, so put `Assert Presence` before them. [Troubleshooting](/docs/help/troubleshooting) covers more cases.

## See also

- [Test Android apps](/docs/platforms/android)
- [Define elements](/docs/elements/define)
- [Run tests in CI](/docs/run/ci)
- [config.yaml reference](/docs/reference/config)
