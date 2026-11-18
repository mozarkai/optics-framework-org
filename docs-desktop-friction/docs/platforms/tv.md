# Test TV apps

> Drive Android TV, Samsung Tizen and LG webOS apps with remote-control keys and focus.

Optics tests TV apps through **Appium**, the same server it uses for phones. Each TV platform has its own Appium driver, and you pick it with `platformName` in `config.yaml`. On a TV you move around with remote-control keys and check what is on screen with assertions. On Tizen and webOS, the element keywords also work. They move the remote focus for you.

| TV platform | `platformName` | Appium driver | How you move around |
|---|---|---|---|
| Android TV | `Android` | UiAutomator2 | Android key numbers, plus taps and typing |
| Samsung Tizen | `TizenTV` | [appium-tizen-tv-driver](https://github.com/headspinio/appium-tizen-tv-driver) | Remote key names, and element keywords that move focus |
| LG webOS | `LGTV` | [appium-lg-webos-driver](https://github.com/headspinio/appium-lg-webos-driver) | Remote key names, and element keywords that move focus |

The examples use a TV app for Birch, a sample shoe store, with rows of shoes such as "Trail Runner 2" and "Pace Knit".

## Before you begin

You need Optics with the Appium engine and the Appium server:

```shell
$ optics setup --install appium
$ npm install -g appium
```

Each TV also needs its own setup: developer mode on the TV, the vendor's tools, and the TV on the same network as your machine. Those steps belong to each Appium driver, and its project page covers them.

## Android TV

Android TV uses the same setup as an Android phone. Follow [Test Android apps](https://optics-framework.org/docs/platforms/android), with `platformName: Android` and the TV's serial from `adb devices` as `udid`. Connect to the TV with `adb connect <tv-ip>` when it is not on a cable.

Touch and typing keywords work on Android TV, but most TV apps expect the D-pad. Send it with Press Keycode and Android key numbers:

| Remote button | Number |
|---|---|
| Up / Down / Left / Right | `19` / `20` / `21` / `22` |
| Select (center) | `23` |
| Back | `4` |
| Home | `3` |
| Play/pause | `85` |

Remote key names such as `UP` do not work on Android TV. They only apply to Tizen and webOS.

## Samsung Tizen

Install the Tizen driver into Appium:

```shell
$ appium driver install --source=npm appium-tizen-tv-driver
```

Then configure Optics:

`config.yaml`:

```yaml
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
  - appium_find_element: {enabled: true}
```

Optics reads `platformName` and the app id (`appPackage`, with or without the `appium:` prefix). It passes every other capability to the Tizen driver unchanged. The [driver's README](https://github.com/headspinio/appium-tizen-tv-driver) explains each one, including how to get the `rcToken`.

A native screenshot makes a Tizen TV stop answering, so `appium_screenshot` refuses to take one there. To capture the screen, add the `camera_screenshot` element source. See [BLE and camera](https://optics-framework.org/docs/reference/config#ble-and-camera) for its settings.

## LG webOS

Install the webOS driver into Appium:

```shell
$ appium driver install --source=npm appium-lg-webos-driver
```

Then configure Optics:

`config.yaml`:

```yaml
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
  - appium_find_element: {enabled: true}
  - appium_screenshot: {enabled: true}
```

`appium_find_element` finds text in the app's DOM. Add an OCR engine (`optics setup --install easyocr`) to read text that the app draws as an image, or [image matching](https://optics-framework.org/docs/elements/text-and-images) for icons. The [driver's README](https://github.com/headspinio/appium-lg-webos-driver) explains the capabilities.

## Check the setup

Start `appium` in another terminal, then run the doctor:

```shell
$ optics doctor birch-tv
```

The doctor's checks are written for phones. On Tizen and webOS it warns that `deviceName`, `appPackage` or `appActivity` is missing. You can ignore those warnings, and the `adb` rows, as long as `config: driver` and `config: appium element source` show ✅.

Before each run, `optics execute` checks that the Appium server answers at `url`. It does not check the TV itself.

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

On webOS, these names also work:

| Key name | Button |
|---|---|
| `VOL_UP` or `VOLUME_UP` | Volume up |
| `VOL_DOWN` or `VOLUME_DOWN` | Volume down |
| `MUTE`, `UNMUTE` | Mute and unmute |
| `CHAN_UP`, `CHAN_DOWN` | Channel up and down |

Names are not case-sensitive. On Tizen and webOS, a name that starts with `KEY_`, such as `KEY_MENU`, is sent as is. Any other name fails with **E0104**. The message lists the names that Optics knows.

## Find elements and move focus

A Tizen or webOS app is a web page, so `appium_find_element` finds elements in its DOM. Use these locators:

| Locator | What it matches |
|---|---|
| `Featured` or `text=Featured` | An element whose visible text, `aria-label`, `title` or `alt` is exactly this text |
| `css=.tile.active` | An element that a CSS selector matches |

A TV has no touch screen, so the element keywords press remote keys instead of taps:

| Keyword | What it does on a TV |
|---|---|
| Press Element | Presses the arrow keys until the element has focus, then presses `ENTER`. |
| Enter Text | Types into the element. See [Type on a TV](#type-on-a-tv). |
| Clear Element Text | Presses the backspace key of the on-screen keyboard until the field stops changing. |
| Get Text | Reads the text of the element, or the value of a field. |
| Assert Presence | Waits for the element to appear. Use it in place of Sleep. |

Optics reads the focus from the page after each key press, so you do not count presses. Each focus move costs one key press, and a key press takes 1 to 2 seconds on a TV. When 60 key presses do not bring the focus to the element, the step fails with `E0201`. The same error shows when the element is not on the screen.

## Type on a TV

Enter Text works on a TV in two ways. Optics picks the way from the element:

- **A real `<input>` or `<textarea>`.** Optics types the text into the field directly.
- **A field that the app draws itself.** Optics moves the focus over the on-screen keyboard and presses each key. When the keyboard does not show a character, Optics switches the layer (`123`, `abc`) and looks again.

`modules/modules.csv`:

```csv
module_name,module_step,param_1,param_2
Search,Enter Text,Search box,trail runner
Search,Enter Text,Search box,<enter>
```

After the last key, Optics reads the field. If the field does not show the text, the step fails with **E0405**. No fallback value types the text a second time. A different letter case gives only a warning. Some apps choose the case themselves, for example a capital first letter.

Enter Text also takes special keys in angle brackets:

| Text | What it presses |
|---|---|
| `<space>`, `<backspace>`, `<enter>` | The key with that name on the on-screen keyboard |
| `<escape>`, `<up>`, `<down>`, `<left>`, `<right>` | The `BACK` or arrow key of the remote |

Other special keys, such as `<tab>`, fail with E0105 on an app keyboard.

**Tip:**
When the screen has more than one field, press the field first with Press Element. Then Optics types into the field that has focus.

## Keywords that fail on Tizen and webOS

Some keywords do not apply to a TV. They fail with **E0105** ("not supported"):

- Press By Coordinates, Press By Percentage
- Swipe, Swipe By Percentage, Swipe From Element, Swipe Until Element Appears
- Scroll, Scroll From Element, Scroll Until Element Appears
- Select Dropdown Option
- Is Element with the `checked` or `unchecked` state
- Enter Text Direct, Enter Text Using Keyboard and any keyword that enters text without an element
- Go Back. Use `Press Keycode,BACK` instead.

Move the focus with an arrow key, or with Press Element on the element that you need.

These keywords work:

- Launch App, Press Keycode, Close And Terminate App, Sleep, Execute Script and the flow keywords
- Press Element, Detect And Press, Enter Text, Enter Number, Clear Element Text and Get Text
- Assert Presence, Assert Visibility, Validate Element, Validate Screen and Is Element

## Know the limits of screenshots and video

A native screenshot makes a Tizen TV stop answering. For this reason `appium_screenshot` refuses it there with **E0303**. Use `camera_screenshot` to capture the screen, and see [BLE and camera](https://optics-framework.org/docs/reference/config#ble-and-camera) for its settings.

DRM-protected video appears black in a screenshot. To check playback, check elements in the app, such as a pause button or a progress bar.

## Example: open a title from a grid

A TV app usually shows rows of tiles. This module moves down one row, right one tile, opens it and starts playback. It checks the screen after each move that changes the page:

`modules/modules.csv`:

```csv
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

`test_cases/test_cases.csv`:

```csv
test_case,test_step
Watch a shoe video,Open Birch TV
Watch a shoe video,Open the second shoe in Running
Watch a shoe video,Watch the video
Watch a shoe video,Go home
```

A few habits make TV tests reliable:

- **Assert after each page change.** Keys do not wait for the app. Assert Presence waits for the next page, so the following key lands in the right place.
- **Start from a known place.** Begin each test with Launch App and an assertion on the first screen. Do not rely on where an earlier test left the focus.
- **Remember that Validate Screen never fails a step.** Use it for optional checks. Use Assert Presence for checks that must pass.
- **Use the text that the page holds.** A text locator must match the element text, `aria-label`, `title` or `alt` exactly.
- **Let Optics move the focus.** Press Element moves the focus for you. It still works when the layout changes.

## See also

- [Test Android apps](https://optics-framework.org/docs/platforms/android)
- [Find elements by text and image](https://optics-framework.org/docs/elements/text-and-images)
- [Press Keycode](https://optics-framework.org/docs/reference/keywords/actions#press-keycode)
- [Verification keywords](https://optics-framework.org/docs/reference/keywords/verification)
- [Error codes](https://optics-framework.org/docs/reference/errors)
