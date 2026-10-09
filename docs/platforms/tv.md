---
title: Test TV apps
nav: TV
summary: Drive Android TV, Samsung Tizen and LG webOS apps with remote-control keys.
level: Intermediate
time: 20 min
---

Optics tests TV apps through **Appium**, the same server it uses for phones. Each TV platform has its own Appium driver, and you pick it with `platformName` in `config.yaml`. On a TV you move around with remote-control keys and check what's on screen with assertions.

| TV platform | `platformName` | Appium driver | How you move around |
|---|---|---|---|
| Android TV | `Android` | UiAutomator2 | Android key numbers, plus taps and typing |
| Samsung Tizen | `TizenTV` | [appium-tizen-tv-driver](https://github.com/headspinio/appium-tizen-tv-driver) | Remote key names only |
| LG webOS | `LGTV` | [appium-lg-webos-driver](https://github.com/headspinio/appium-lg-webos-driver) | Remote key names only |

The examples use a TV app for Birch, a sample shoe store, with rows of shoes such as "Trail Runner 2" and "Pace Knit".

## Before you begin

You need Optics with the Appium engine and the Appium server:

```shell
$ optics setup --install appium
$ npm install -g appium
```

Each TV also needs its own setup: developer mode on the TV, the vendor's tools, and the TV on the same network as your machine. Those steps belong to each Appium driver, and its project page covers them.

## Android TV

Android TV uses the same setup as an Android phone. Follow [Test Android apps](/docs/platforms/android), with `platformName: Android` and the TV's serial from `adb devices` as `udid`. Connect to the TV with `adb connect <tv-ip>` when it isn't on a cable.

Touch and typing keywords work on Android TV, but most TV apps expect the D-pad. Send it with Press Keycode and Android key numbers:

| Remote button | Number |
|---|---|
| Up / Down / Left / Right | `19` / `20` / `21` / `22` |
| Select (center) | `23` |
| Back | `4` |
| Home | `3` |
| Play/pause | `85` |

Remote key names such as `UP` don't work on Android TV. They only apply to Tizen and webOS.

## Samsung Tizen

Install the Tizen driver into Appium:

```shell
$ appium driver install --source=npm appium-tizen-tv-driver
```

Then configure Optics:

```yaml title="config.yaml"
driver_sources:
  - appium:
      enabled: true
      url: "http://localhost:4723"
      capabilities:
        platformName: TizenTV
        appium:automationName: TizenTV
        appium:deviceAddress: 192.168.1.50
        appium:rcToken: "14184553"
        appium:appPackage: com.birch.tv
        appium:app: /path/to/birch.wgt
        appium:chromedriverExecutableDir: /path/to/chromedrivers
elements_sources:
  - appium_page_source: {enabled: true}
  - appium_screenshot:  {enabled: true}
```

Optics reads `platformName` and the app id (`appPackage`, with or without the `appium:` prefix). It passes every other capability to the Tizen driver unchanged. The [driver's README](https://github.com/headspinio/appium-tizen-tv-driver) explains each one, including how to get the `rcToken`.

## LG webOS

Install the webOS driver into Appium:

```shell
$ appium driver install --source=npm appium-lg-webos-driver
```

Then configure Optics:

```yaml title="config.yaml"
driver_sources:
  - appium:
      enabled: true
      url: "http://localhost:4723"
      capabilities:
        platformName: LGTV
        appium:automationName: webOS
        appium:deviceHost: 192.168.1.50
        appium:appId: com.birch.tv
        appium:rcMode: rc
        appium:useSecureWebsocket: true
        appium:newCommandTimeout: 600
elements_sources:
  - appium_screenshot: {enabled: true}
text_detection:
  - easyocr: {enabled: true}               # reads text on the TV screenshot
```

This setup finds things on screen with screenshots only, so add an OCR engine (`optics setup --install easyocr`) to check text, or [image matching](/docs/elements/text-and-images) for icons. The [driver's README](https://github.com/headspinio/appium-lg-webos-driver) explains the capabilities.

## Check the setup

Start `appium` in another terminal, then run the doctor:

```shell
$ optics doctor birch-tv
```

The doctor's checks are written for phones. On Tizen and webOS it warns that `deviceName`, `appPackage` or `appActivity` is missing. You can ignore those warnings, and the `adb` rows, as long as `config: driver` and `config: appium element source` show ✅.

Before each run, `optics execute` checks that the Appium server answers at `url`. It doesn't check the TV itself.

## Move around with remote keys

On Tizen and webOS, Press Keycode takes the name of a remote button:

| Key name | Button |
|---|---|
| `UP`, `DOWN`, `LEFT`, `RIGHT` | Arrow keys |
| `ENTER`, `OK`, `SELECT` | OK, the center button |
| `BACK` | Back |
| `HOME` | Home |
| `PLAY`, `PAUSE`, `STOP` | Playback |
| `REWIND`, `FF` | Rewind and fast-forward. `FAST_FORWARD` also works. |

Names aren't case-sensitive. On Tizen, any raw Samsung key name that starts with `KEY_`, such as `KEY_MENU`, is also sent as is. On webOS, unknown names are passed to the TV unchanged.

## What doesn't work on Tizen and webOS

TVs have no touch screen, so touch and typing keywords fail with **E0105** ("not supported") on Tizen and webOS:

- Press Element, Detect And Press, Press By Coordinates, Press By Percentage, Select Dropdown Option
- Swipe, Swipe By Percentage, Swipe From Element, Swipe Until Element Appears
- Scroll, Scroll From Element, Scroll Until Element Appears
- Enter Text, Enter Text Direct, Enter Text Using Keyboard, Enter Number, Clear Element Text, Get Text

These still work: Launch App, Press Keycode, Assert Presence, Assert Visibility, Validate Element, Validate Screen, Is Element, Capture Screenshot, Sleep, Execute Script, the flow keywords, and Close And Terminate App.

To type on a TV, move over the on-screen keyboard with arrow keys and press `ENTER` on each letter.

## Example: open a title from a grid

A TV app usually shows rows of tiles. This module moves down one row, right one tile, opens it and starts playback. It checks the screen after each move that changes the page:

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2
Open Birch TV,Launch App
Open Birch TV,Assert Presence,Featured,30
Open the second shoe in Running,Press Keycode,DOWN
Open the second shoe in Running,Press Keycode,RIGHT
Open the second shoe in Running,Press Keycode,ENTER
Open the second shoe in Running,Assert Presence,Trail Runner 2,10
Watch the video,Press Keycode,ENTER
Watch the video,Sleep,5
Watch the video,Press Keycode,PAUSE
Watch the video,Validate Screen,Paused,5
Go home,Press Keycode,BACK
Go home,Press Keycode,BACK
Go home,Assert Presence,Featured,10
```

```csv title="test_cases/test_cases.csv"
test_case,test_step
Watch a shoe video,Open Birch TV
Watch a shoe video,Open the second shoe in Running
Watch a shoe video,Watch the video
Watch a shoe video,Go home
```

A few habits make TV tests reliable:

- **Assert after each page change.** Keys don't wait for the app. Assert Presence waits for the next page, so the following key lands in the right place.
- **Start from a known place.** Begin each test with Launch App and an assertion on the first screen. Don't rely on where an earlier test left the focus.
- **Remember that Validate Screen never fails a step.** Use it for checks that are nice to have, and Assert Presence for checks that must pass.
- **Use text you can see.** On webOS, Assert Presence reads the screen with OCR, so check words that are drawn large and clear.

## See also

- [Test Android apps](/docs/platforms/android)
- [Find elements by text and image](/docs/elements/text-and-images)
- [Press Keycode](/docs/reference/keywords/actions#press-keycode)
- [Verification keywords](/docs/reference/keywords/verification)
- [Error codes](/docs/reference/errors)
