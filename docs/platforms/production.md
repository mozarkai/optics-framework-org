---
title: Test production devices
nav: Production devices
summary: Test locked devices and live apps through a Bluetooth mouse and keyboard and a camera.
level: Advanced
time: 30 min
---

::scene{name="production" caption="Optics sees the screen through a camera, finds the element with OCR, and taps it by moving a Bluetooth mouse, then parks the pointer in the corner."}

Optics can test a device with no automation software on it at all. A **BLE dongle** (a small USB Bluetooth adapter) pairs with the device as an ordinary Bluetooth mouse and keyboard. A **camera** pointed at the screen shows Optics what's there. Optics finds things in the camera picture with OCR and image matching, then moves the pointer and taps.

## When to use it

Use this setup when the usual drivers can't reach the device:

- **USB debugging or developer mode isn't allowed**, for example on locked company phones or retail devices.
- **The app blocks screenshots**, as banking and streaming apps often do. The camera sees the screen anyway.
- **You monitor the live app.** Synthetic monitoring runs the same journey on a real, unmodified device and app, the way a customer would.

If you can use Appium or a browser driver, do. They're faster, read the UI tree directly, and support every keyword.

## What you need

- **A USB serial BLE HID dongle.** It plugs into your machine as a serial port, and pairs with the device as a Bluetooth mouse and keyboard.
- **A way to see the screen.** Either a camera or capture card that your machine sees as a webcam, or a TCP frame server that sends a picture on request.
- **An OCR engine**, such as EasyOCR, to read text in the camera picture.
- **Image templates** (optional), cropped pictures of icons that have no text. See [Find elements by text and image](/docs/elements/text-and-images).
- **A stand** that holds the camera square over the screen, so the picture doesn't shift between runs.

## Set up

:::steps
### Install the engines

```shell
$ optics setup --install ble easyocr
```

The `ble` engine adds serial-port support. The camera source and image matching need no extra install.

### Pair the dongle with the device

Plug the dongle into your machine. On the device, open Bluetooth settings and pair with the dongle like any keyboard. A pointer appears on screen once it's connected.

### Find the dongle's serial port

| System | Command | Looks like |
|---|---|---|
| macOS | `ls /dev/cu.usbmodem*` | `/dev/cu.usbmodem1101` |
| Linux | `ls /dev/ttyACM*` | `/dev/ttyACM0` |
| Windows | Device Manager, under **Ports (COM & LPT)** | `COM3` |

Instead of a path, you can give the dongle's USB product description, such as `MZ-BLE-VMK-001-v1.2.1`. Optics finds the matching port for you, which helps when the port number changes between reboots.

### Point the camera at the screen

Mount the camera straight on, with the screen upright and filling the picture edge to edge. Optics turns positions in the camera picture straight into pointer moves, so anything around the screen throws the taps off.

### Write config.yaml

```yaml title="config.yaml"
driver_sources:
  - ble:
      enabled: true
      capabilities:
        device_id: "Birch test phone"        # a label for the device
        port: /dev/ttyACM0                   # or the dongle's USB product description
        pixel_width: 1080                    # size of the screen in the camera picture
        pixel_height: 2336
        mickeys_width: 1080                  # pointer units to cross the screen
        mickeys_height: 2336
        x_invert: 1                          # -1 if the pointer moves the wrong way
        y_invert: 1
elements_sources:
  - camera_screenshot:
      enabled: true
      capabilities:
        camera_index: 0                      # or url: "192.168.1.20:9000" for a frame server
text_detection:
  - easyocr: {enabled: true}
image_detection:
  - templatematch: {enabled: true}
```

### Calibrate, then run

Follow [Calibrate the pointer](/docs/platforms/production#calibrate-the-pointer) below, then start the app on the device by hand and run:

```shell
$ optics execute birch-production
```

There's no preflight for this setup, so check the dongle and camera before you start a long run.
:::

## Settings

### `ble` driver

| Name | Default | What it does |
|---|---|---|
| `device_id` | Required | A name for the device. |
| `port` | Required | The dongle's serial port (`/dev/ttyACM0`, `/dev/cu.usbmodem1101`, `COM3`), or its USB product description. |
| `pixel_width`, `pixel_height` | `0` | The size of the device screen in camera-picture pixels. Set both. Optics fails to start when they're `0`. |
| `mickeys_width`, `mickeys_height` | `0` | How many pointer units it takes to cross the screen. Set both. Optics fails to start when they're `0`. |
| `x_invert`, `y_invert` | `1` | Set to `-1` to flip the direction the pointer moves on that axis. |

### `camera_screenshot` source

| Name | Default | What it does |
|---|---|---|
| `camera_index` | None | The webcam or capture card to use. `0` is the first one your system finds. |
| `url` | None | A TCP frame server as `host:port`. Use instead of `camera_index`. |
| `header_size` | `8` | Frame server only. The length of the size header in bytes, `4` or `8`. |
| `byte_order` | `little` | Frame server only. The byte order of the size header, `little` or `big`. |

Set either `camera_index` or `url`. With neither, Optics stops with "No camera_index or valid URL provided".

A frame server receives the line `screenshot`, then replies with the picture's size in a `header_size`-byte unsigned number, followed by the picture as JPEG or PNG.

## Calibrate the pointer

Optics resets the pointer to a corner before each tap, then moves it by the distance it calculated from the camera picture. Calibration makes that distance land in the right place.

1. **Set the pixel size.** Set `pixel_width` and `pixel_height` to the size of the camera picture. Take one with `Capture Screenshot` and check its size.
2. **Start with equal units.** Set `mickeys_width` and `mickeys_height` to the same numbers as the pixels.
3. **Tap a far corner.** Run a one-step module, `Press By Percentage,90,90`, and watch where the pointer lands.
4. **Adjust.** If the pointer stops short of the spot, raise the mickeys for that axis. If it overshoots, lower them. Repeat until the tap lands.
5. **Fix the direction.** If the pointer moves left when it should move right, set `x_invert: -1`. Do the same with `y_invert` for up and down.

Calibrate again whenever you move the camera, change the device, or change its display size or orientation.

## What works and what doesn't

| Works | How |
|---|---|
| Press Element, Detect And Press | With text values (found by OCR) or image values. Optics moves the pointer there and taps. |
| Press By Coordinates, Press By Percentage | Taps a spot in the camera picture. |
| Enter Text | Finds the field by OCR or image, taps it, then types through the Bluetooth keyboard. |
| Enter Text Direct | Types into the field that has focus. |
| Assert Presence, Validate Screen | Read the camera picture with OCR or image matching. |
| Swipe, Swipe By Percentage, Swipe From Element | Press, drag and release with the pointer. |
| Scroll | Up and down only. |

| Doesn't work | Instead |
|---|---|
| Launch App, Launch Other App | Start the app by hand, or tap its icon on the home screen with Press Element. |
| XPath and UI-tree text | There's no UI tree. Use visible text, which OCR reads, or images. |
| Get Text, Get App Version, Execute Script | Not available over Bluetooth. |
| Back, Volume, Power and other phone-only keys | A Bluetooth keyboard has no such keys. Tap the app's own back button. |
| Named keys such as `Enter` | On 1.10.5, `Press Keycode,Enter` and `<enter>` type the letters of the key's name. Tap the on-screen key instead. |
| [Error detection](/docs/run/error-detection) at the end of a run | It needs the page source, which a camera can't provide. Add Assert Presence checks for error messages you care about. |

`optics live`, `optics serve` and `optics mcp` run Launch App when they start, so that first step fails with this setup. Start the app by hand before you begin.

Here is a sign-in journey written for a production phone. Every value is text that OCR can read on screen:

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2
Open Birch,Press Element,Birch
Open Birch,Assert Presence,Sign in,20
Sign in,Enter Text,Email,ava@birch.shop
Sign in,Enter Text,Password,@:trailrunner
Sign in,Press Element,Sign in
Sign in,Assert Presence,Trail Runner 2,20
```

The first step taps the Birch icon on the home screen, so the run starts from there.

## Known gaps

- **Camera correction isn't applied.** `deskew_corners`, `rotation`, `out_width` and `out_height` under `camera_screenshot` have no effect in 1.10.5. Frame the camera straight on, with the screen upright, instead.
- **The doctor reports a failure.** `optics doctor` expects an element source whose name starts with `ble_`, and none exists. It shows ❌ for `config: ble element source`. Ignore that row, and don't use `optics doctor --check` on this project in CI.

## If it isn't working

- **"Could not resolve serial port for product description".** No connected port has that description. Check the dongle is plugged in, or use the port path instead.
- **Optics stops at start with a division error.** `pixel_width`, `pixel_height`, `mickeys_width` or `mickeys_height` is `0` or missing. Set all four.
- **"No camera_index or valid URL provided".** Add `camera_index` or `url` under the `camera_screenshot` capabilities.
- **Taps land in the wrong place.** Recalibrate. Check that the screen fills the camera picture and that nothing moved.
- **Text isn't found.** Improve the picture: even light, no glare, the camera in focus. Use an [area of interest](/docs/elements/area-of-interest) to search a smaller part of the screen.
- **The pointer doesn't move.** Check the device is still paired with the dongle and that its pointer shows on screen.

## See also

- [Find elements by text and image](/docs/elements/text-and-images)
- [Search part of the screen](/docs/elements/area-of-interest)
- [Engines reference](/docs/reference/engines)
- [config.yaml reference](/docs/reference/config)
