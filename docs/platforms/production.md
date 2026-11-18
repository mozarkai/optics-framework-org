---
title: Test production devices
nav: Production devices
summary: Test a locked phone, tablet or computer through a Bluetooth dongle and a camera, with no app on the device.
level: Advanced
time: 30 min
---

::scene{name="production" caption="Optics sees the screen through a camera, finds the element with OCR, and taps it through the Bluetooth dongle. On iOS, the pointer then moves to the top-right corner."}

Optics can test a device that has no automation software on it. An **airhand dongle** in a USB port of your computer pairs with the device over Bluetooth. The device sees a keyboard, a mouse and a media remote. A **camera** aimed at the screen shows Optics the screen. Optics finds elements in the camera frame with OCR and image matching, then the dongle taps and types.

```text
camera_screenshot ──frame──> OCR or image match ──(x, y)──> ble driver ──> airhand dongle ──Bluetooth──> device
```

The `ble` driver works with iOS, iPadOS, Android, macOS, Windows and Linux. The camera is optional. Without it, Optics taps by position and presses keys.

## When to use it

Use this setup when the usual drivers cannot reach the device:

- **USB debugging or developer mode is not permitted**, for example on company phones or on retail devices.
- **The app blocks screenshots or detects developer mode**, as banking, streaming and anti-tamper apps often do. The camera sees the screen.
- **You monitor the live app.** The test runs on a real device and the store version of the app, as a customer uses it.

If Appium can reach the device, use Appium. It has more to give:

| Area | Appium | BLE and camera |
|---|---|---|
| Locators | XPath, ids, hidden and off-screen elements | Visible text and images |
| App lifecycle | Install, launch by id, clear data, deep links | Through the UI: system search, home screen, App Switcher |
| Gestures | Exact drags, pinch, multi-touch | One finger. The `Swipe` distance changes from run to run. |
| Typing | Any Unicode text | ASCII text on a US keyboard layout |
| Debug data | Page source, failed elements, device logs | Screenshots |

## What you need

- **An nRF52840 USB dongle** with the [airhand](https://github.com/chinmayajha/airhand/tree/v0.1.2#quick-start) firmware, version 0.1.2 or later.
- **A device** that accepts a Bluetooth keyboard and mouse. On an iPhone or iPad, you must turn on AssistiveTouch.
- **A camera**, if the test must read the screen. Use one of these:
  - A webcam or capture card that your computer sees as a camera (`camera_index`).
  - An HTTP(S) URL that returns a picture of the screen (`url`).
  - A TCP frame server (`url: ip:port`).
- **An OCR engine** to read text in the camera frame: Apple Vision on a Mac, RapidOCR on Linux and Windows.
- **A stand** that holds the camera and the device in position. Optics stops the run when one of them moves.

## Set up

This procedure makes a project that tests the Settings app on an iPhone 12 through a webcam.

:::steps
### Install the engines

```shell
$ optics setup --install ble apple-vision       # ble rapidocr on Linux and Windows
```

The `ble` engine installs the `airhand` package. The camera source and image matching need no extra package.

:::tip
Each step reads the screen one time: one capture and one OCR pass. Most of the time of a step is OCR, so a camera setup gets the most from `apple_vision` or `rapidocr`.
:::

### Install the firmware on the dongle

Press the RESET button on the dongle. Then install the airhand firmware zip over USB with `nrfutil`. The [airhand 0.1.2 README](https://github.com/chinmayajha/airhand/tree/v0.1.2#quick-start) gives the commands.

### Pair the device

On the device, open the Bluetooth settings and select **airhand**.

On an iPhone or iPad, also do these steps:

1. Turn on AssistiveTouch in **Settings > Accessibility > Touch**.
2. Set the hardware keyboard layout to U.S. in **Settings > General > Keyboard > Hardware Keyboard**.
3. Turn off **Auto-Capitalization** and **Smart Punctuation**, so that typed text arrives as Optics sends it.

### Make the project

Run `optics quickstart` and answer `bluetooth`. The wizard offers to install the `ble` engine, makes the project and asks about the device. This example names the project `iphone-settings`:

```text
What do you want to automate? [mobile/web/desktop/bluetooth] (mobile): bluetooth
Install BLE now? [y/n] (y):
…
Which device does the dongle drive? [ios/android/macos/windows/linux] (ios):
Dongle USB serial number (empty: the only plugged-in dongle) ():
Screen width in pixels (1080): 1170
Screen height in pixels (1920): 2532
Camera screenshot URL (empty: no camera) ():
```

For a project that you have, run `optics configure <folder>` to ask the same questions. The wizard writes the `ble` entry with `platform` and `frame`. If you give a camera URL, it also enables `camera_screenshot` at the same size.

### Write config.yaml

Replace the generated entries with the webcam setup:

```yaml title="config.yaml"
driver_sources:
  - ble:
      enabled: true
      capabilities:
        platform: ios
        frame: {width: 1170, height: 2532}     # the screen in pixels: the same as out_width x out_height
elements_sources:
  - camera_screenshot:
      enabled: true
      capabilities:
        camera_index: 0                        # the first camera of your computer
        find_screen: brightness                # find the screen in the camera frame
        out_width: 1170
        out_height: 2532
text_detection:
  - apple_vision: {enabled: true}              # rapidocr on Linux and Windows
image_detection:
  - templatematch: {enabled: true}
```

With one dongle plugged in, you do not set `serial`. Positions go to the dongle as fractions of `frame`, so there is no calibration.

### Check the setup

```shell
$ optics doctor iphone-settings
…
Bluetooth
  ⚠️ ble dongle                  No airhand dongle is plugged in
      → Plug in the airhand dongle named in config.yaml.

Project
  ✅ config: driver              ble enabled
  ✅ config: ble element source  enabled: camera_screenshot
  ✅ config: ble settings        required settings present
  ✅ config: project             driver, element sources and settings look runnable
```

This output is from a computer with no dongle. With the dongle plugged in, the `ble dongle` row shows the dongle, and a `ble paired device` row shows "connected and encrypted". Correct each ⚠️ row before you start a run.

### Aim the camera at the screen

Put the device in the stand, with the full screen in the camera frame. Open a bright screen, for example Settings in light mode. Optics finds the screen at the first capture of the run. See [Find the screen](#find-the-screen).

### Write the suite

Each value is text that OCR can read on the screen. `Press Element` reads one frame and does not wait, so an `Assert Presence` comes before it after each change of screen.

:::tabs{group="format"}
::tab[CSV]
```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2
Open About,Launch App,Settings
Open About,Assert Presence,General,10
Open About,Press Element,General
Open About,Assert Presence,About,10
Open About,Press Element,About
Open About,Assert Presence,iOS Version,10
Close Settings,Force Terminate App,Settings
```

```csv title="test_cases/test_cases.csv"
test_case,test_step
Check the iOS version,Open About
Check the iOS version,Close Settings
```
::tab[YAML]
```yaml title="tests.yaml"
Test Cases:
  - Check the iOS version:
      - Open About
      - Close Settings
Modules:
  - Open About:
      - Launch App Settings
      - Assert Presence General 10
      - Press Element General
      - Assert Presence About 10
      - Press Element About
      - Assert Presence "iOS Version" 10
  - Close Settings:
      - Force Terminate App Settings
```
:::

`Launch App` takes the name of the app as the device shows it. On iOS, it opens Spotlight, types the name and presses Enter.

### Run the suite

```shell
$ optics execute iphone-settings
```

`optics dry_run` also opens the dongle. Without a dongle, both commands stop before the first step:

```text
╭──────────────────────────── Cannot start: E0106 ─────────────────────────────╮
│ No airhand dongle is plugged in                                              │
│                                                                              │
│ Check the setup with:  optics doctor                                         │
…
```
:::

## Find the screen

The camera frame shows more than the screen. Optics must know where the four corners of the screen are, so that it can cut the screen from the frame and make it straight. Set one of these on `camera_screenshot`:

| Setting | What Optics does |
|---|---|
| `find_screen: brightness` | The driver presses `brightnessdown` 8 times, then `brightnessup` 8 times. Only the screen changes, so Optics finds it on any page that is not black. If the screen does not change, Optics uses `frame`. |
| `find_screen: frame` | Optics finds the bright area inside the dark bezel in one frame. The page must be bright from edge to edge. No driver is necessary. |
| `deskew_corners` | You give the four corners as `"x,y"`: top left, top right, bottom right, bottom left. |

When Optics finds the screen, it saves `camera_screen_found_<time>.jpg` in the output folder, with the screen marked. The log gives the corners as a `deskew_corners` value. Open the picture after the first run. If the mark is correct, you can put that value in config.yaml in place of `find_screen`.

The screen in the camera must have the same shape as `out_width` x `out_height`, with a tolerance of 4%. If an edge of the screen is black, for example in dark mode, Optics cannot find that edge and stops with `E0305`.

At each capture, Optics compares the area around the screen with the first capture:

- **The device or the camera moved.** With `find_screen`, Optics finds the screen again. With `deskew_corners`, the run stops with `E0305`.
- **The screen is dark for 3 seconds.** The run stops with `E0305` and "the screen is off".

With `E0305`, Optics saves the frame as `camera_blind_<time>.jpg`. `Press Element` and the other element keywords stop at once, because no fallback can help.

## Settings

### `ble` driver

| Name | Default | What it does |
|---|---|---|
| `platform` | Required | `ios`, `android`, `macos`, `windows` or `linux`. It selects the keys for Back, Home, search and select all. |
| `frame` | Required | `{width, height}`: the size in pixels of the positions that keywords use. Use the camera frame size (`out_width` x `out_height`). Without a camera, use the screen size of the device. |
| `serial` | None | The USB serial number of the dongle. Set it when more than one dongle is plugged in. Optics finds the dongle again by this number after you plug it in again. |
| `port` | None | A fixed serial port, such as `/dev/cu.usbmodem1101` or `COM5`, in place of `serial`. Set `serial` or `port`, not both. |
| `launch` | The default of the platform | The methods that `Launch App` tries, in sequence. See [Open apps](#open-apps). |
| `app_search` | None | Android only. The position `{x, y}` of the search box in the app drawer, in `frame` pixels. |

### Open apps

`Launch App`, `Launch Other App` and `Force Terminate App` take the name of the app as the device shows it, for example `Settings`. The config.yaml of each device tells Optics how to open apps. Thus one suite runs on phones with different launchers.

| Method | Steps | Default for |
|---|---|---|
| `launcher_key` | The launcher shortcut (Cmd+Space or Ctrl+Esc), the name, Enter | `ios`, `macos`, `windows` |
| `drawer_search` | Home, Meta (the app drawer), the name, Enter | `android` |
| `drawer_tap` | Home, Meta, a tap on `app_search`, the name, Up, Enter | `android` with `app_search` |
| `search_key` | The Search media key, the name, Enter | None |
| `home_icon` | Home, then a tap on the icon above the name of the app. It needs a camera and finds only apps on the first home screen. | Last on `ios` and `android` |

```yaml title="config.yaml"
capabilities:
  platform: android
  frame: {width: 1080, height: 2400}
  launch: [search_key, drawer_search, home_icon]
```

With a camera and an OCR engine, Optics checks each method. After it types the name, the screen must show the name two times: in the search box and as a result. If a method fails, Optics presses Home and tries the next method. When all methods fail, `Launch App` stops with `E0405`. When a method other than the first opens the app, the log gives the `launch` value that tries that method first.

Without a camera, Optics uses the first method that needs no camera and does not check the result. On `linux`, there is no default method. Without `launch: [search_key]`, `Launch App` fails with `E0105`.

On iOS, do not press `home` just before `Launch App`. Home a few seconds after Spotlight opened an app shows Spotlight again.

### `camera_screenshot` source

| Name | Default | What it does |
|---|---|---|
| `camera_index` | None | The camera to use. `0` is the first camera of your computer. |
| `camera_width`, `camera_height` | The largest size of the camera | The size that the camera captures at. Set both or neither. |
| `url` | None | An `http://` or `https://` URL, or a TCP frame server as `ip:port`. Use it in place of `camera_index`. |
| `token` | None | HTTP only. Optics sends it as `Authorization: Bearer <token>` and masks it in logs. |
| `find_screen` | None | `brightness` or `frame`. See [Find the screen](#find-the-screen). |
| `deskew_corners` | None | The four corners of the screen in the camera frame, as `"x,y"`. Set `deskew_corners` or `find_screen`, not both. |
| `out_width`, `out_height` | `1080`, `1920` | The size of the frame that OCR reads, at most 8192 on each side. Set the screen size of the device. |
| `rotation` | None | `clockwise` or `counterclockwise`. Optics turns the frame a quarter turn after it cuts out the screen. |
| `header_size` | `8` | Frame server only. The length of the size header in bytes, `4` or `8`. |
| `byte_order` | `little` | Frame server only. The byte order of the size header, `little` or `big`. |

With `camera_index`, each capture is a new frame. Optics discards the frames that the camera kept in its buffer, so a frame after a tap shows the screen after the tap. When the camera opens, Optics waits 1 second for the exposure. Then it locks focus, white balance and exposure, if the camera lets it.

Without `find_screen` or `deskew_corners`, and when you set `out_width` and `out_height`, Optics scales each frame to that size. Use this only for a source that shows the screen and nothing more, such as a capture card.

If you set neither `camera_index` nor `url`, Optics reads these environment variables. A value in config.yaml wins over a variable.

| Variable | Used for |
|---|---|
| `WEBCAM_SCREENSHOT_URL` | The screenshot URL. |
| `WEBCAM_SCREENSHOT_TOKEN` | The bearer token for `WEBCAM_SCREENSHOT_URL`. Optics sends it to no other URL. |
| `WEBCAM_SCREENSHOT_TCP_PORT` | A TCP frame server at `127.0.0.1` on this port, when `WEBCAM_SCREENSHOT_URL` is not set. |

For a `url` in config.yaml, write `token: ${WEBCAM_SCREENSHOT_TOKEN}` to keep the token out of the file. For an HTTP URL, Optics sends a `GET` request and reads the reply as a picture. A status other than 200 fails, and the log shows the status with the `code` and `message` of the JSON reply. Optics does not follow redirects, so the token goes to no other server.

A frame server receives the line `screenshot`. It replies with the size of the picture in a `header_size`-byte number, then the picture as JPEG or PNG.

## What works and what does not

| Keyword | How it works over Bluetooth |
|---|---|
| Press Element, Assert Presence, Validate Screen | With a camera. Optics finds text with OCR or an image with template matching. |
| Enter Text | Finds the field with the camera, taps it, then types. |
| Enter Text Using Keyboard, Enter Text Direct | Types into the field that has focus. ASCII text on a US layout only. |
| Press By Coordinates, Press By Percentage | Taps a position in `frame`. |
| Press Keycode | A key (`enter`, `escape`, `tab`, `f1` to `f24`, the arrows), a combination (`cmd+space`, `ctrl+shift+t`) or a media key (`home`, `back`, `volumeup`, `volumedown`, `mute`, `playpause`, `brightnessup`, `brightnessdown`). `search` opens the system search. `power` and `camera` fail with `E0105`. |
| Clear Text | Selects all text (Cmd+A on iOS and macOS, Ctrl+A on the others), then presses Backspace. |
| Go Back | The Back key on Android, Cmd+[ on macOS, Alt+Left on Windows and Linux. iOS has no Back: the step fails with `E0105`. Tap the back button of the app. |
| Scroll | iOS turns the mouse wheel for up and down, about half a screen each time, and drags for left and right. Android drags slowly for 4 seconds. A computer turns the wheel. |
| Swipe, Swipe By Percentage | A drag. On a phone, the content can move farther than the drag. |
| Launch App, Launch Other App | By the name on the device. See [Open apps](#open-apps). |
| Force Terminate App | iOS and Android. Opens the app, then closes it from the App Switcher, so that the next `Launch App` starts from the first screen. |
| Get App Version, Execute Script | Not available. The step fails with `E0105`. |
| Get Text | Not available. OCR and image matching give a position, not the text of an element. |
| XPath, CSS and UI-tree text | There is no UI tree. Use visible text or images. |
| [Error detection](/docs/run/error-detection) | It needs a page source. Add `Assert Presence` checks for the error messages that you know. |

On the iOS home screen, tap the icon of an app, not its name. Use an image of the icon, or use `Launch App`.

On Android, the dongle acts as a touch screen, so taps are touches with no pointer. This needs firmware 0.1.2 or later. On iOS and iPadOS, the pointer moves to the top-right corner after each tap and swipe. Thus it does not hide the next element from the camera.

If the device disconnects from the dongle, a keyword waits up to 10 seconds for it, then the run stops with `E0106`.

## Without a camera

Set `elements_sources: []`. Then the suite uses positions and keys only: `Press By Percentage`, `Press By Coordinates`, `Swipe`, `Scroll`, `Enter Text Using Keyboard`, `Press Keycode`, `Clear Text` and `Launch App`. A keyword that must see the screen, such as `Press Element` or `Assert Presence`, stops with `E0501`. Optics saves no screenshots.

`optics doctor` shows a warning for this setup: "no screen source: only keywords that do not read the screen run".

## Use it in optics live, serve and MCP

`optics live`, `optics serve` and `optics mcp` work with the `ble` driver. `optics live` needs an enabled element source, so use it with a camera. A session with a camera and no other element source gets the screen rows from OCR. Each row is a text that OCR reads, so `observe`, `check` and the plain-English mode of `optics live` can see the screen. OCR cannot tell a button from a label, and it can read a line differently in a new frame.

For `optics serve` and `optics mcp`, start a session with `driver: ble` and the `platform` and `frame` capabilities. A remote session names the dongle by `serial`, never by `port`. It uses only the camera that the server sets in `WEBCAM_SCREENSHOT_URL`, and a `url` on `camera_screenshot` is refused. See [MCP server](/docs/reference/mcp).

## Add a camera to an Appium run

Some apps block screenshots only on some screens, such as a payment screen. If Appium can reach the device, keep Appium and add a camera for those screens. On a protected screen, the Appium screenshot is black, and Optics uses the camera frame.

List `camera_screenshot` after `appium_screenshot`:

```yaml title="config.yaml"
elements_sources:
  - appium_find_element: {enabled: true}
  - appium_screenshot: {enabled: true}
  - camera_screenshot:
      enabled: true
      capabilities:
        url: http://127.0.0.1:8080/screenshot
        deskew_corners: ["212,88", "868,95", "861,1262", "205,1255"]
        out_width: 1080
        out_height: 2400
```

Optics maps OCR and image matches on the camera frame into the Appium window, as it does for an Appium screenshot. Appium then taps the correct point on the device.

:::tip
Set `deskew_corners` or `find_screen: frame`, so that the frame shows only the screen. Set `out_width` and `out_height` to the screenshot size of the device, so that the frame has the same shape as the screen. With `deskew_corners`, a moved camera stops the run with `E0305`.
:::

## Migrate from the v1 driver

The driver before 1.11.5 used a different dongle and needed calibration. The new driver needs airhand firmware. A dongle with other firmware stops the session with `E0501`.

| v1 setting | Now |
|---|---|
| `port` as the USB product name | `serial`, the USB serial number, or nothing with one dongle |
| `pixel_width`, `pixel_height` | `frame: {width, height}` |
| `mickeys_width`, `mickeys_height`, `x_invert`, `y_invert` | Remove them. There is no calibration. |
| `device_id` | Remove it. |
| None | Add `platform`. |

Optics refuses a config that has a v1 setting. `optics doctor` shows the setting to remove:

```text
  ❌ config: ble settings        capabilities: Value error, device_id, mickeys_height, mickeys_width, pixel_height, pixel_width belong to the v1 ble driver; see 'Migrating from the v1 ble driver' in the configuration docs
```

## If it is not working

- **"No airhand dongle is plugged in" (`E0106`).** Plug in the dongle, then run `optics doctor` again.
- **"no device connected".** On the device, select **airhand** in the Bluetooth settings.
- **"connected, but the link is not encrypted".** On the device, forget **airhand** and pair again.
- **"set serial (the dongle's USB serial number) or port, not both".** Remove one of the two from config.yaml.
- **"launch methods drawer_search need a key or an app_search that platform ios does not have".** Remove the method from `launch`, or use a method of the platform.
- **"The camera does not see the device screen" (`E0305`).** Open `camera_blind_<time>.jpg` in the output folder. Make sure that the screen is on, bright and in the frame, and that nothing moved.
- **`Launch App` fails with `E0405`.** No launch method opened the app. Set `launch` to the methods that open apps on this device.
- **Typed text is not correct on iOS.** Set the hardware keyboard layout to U.S. and turn off Auto-Capitalization and Smart Punctuation.
- **Text is not found.** Make the light even, remove glare and focus the camera. Use an [area of interest](/docs/elements/area-of-interest) to search a smaller part of the screen.

## See also

- [Test apps that block automation](/docs/guides/protected-apps)
- [Find elements by text and image](/docs/elements/text-and-images)
- [Engines reference](/docs/reference/engines)
- [config.yaml reference](/docs/reference/config#ble-and-camera)
