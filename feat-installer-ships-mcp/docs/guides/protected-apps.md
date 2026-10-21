# Test apps that block screenshots or USB debugging

> Automate a banking or streaming app on a locked phone, with a Bluetooth dongle for input and a camera for eyes.

Some apps can't be tested the usual way. Banking and streaming apps often block screenshots, so a driver sees a black screen. Locked company phones and retail devices don't allow USB debugging or developer mode, so Appium can't connect at all.

Optics can still test them. It needs no automation software on the device. A **BLE dongle** pairs with the phone as an ordinary Bluetooth mouse and keyboard, and a **camera** pointed at the screen shows Optics what's there. Optics reads text in the camera picture with OCR, finds icons with image matching, then moves the pointer and taps.

This page helps you decide whether you need this setup and points you to each step. [Test production devices](https://optics-framework.org/docs/platforms/production) is the full reference.

## Decide if you need it

Use the Bluetooth and camera setup when:

- **The app blocks screenshots.** The camera sees the screen anyway.
- **USB debugging or developer mode isn't allowed** on the device.
- **You monitor the live app.** The same journey runs on a real, unmodified device and app, the way a customer uses it.

If Appium or a browser driver can reach the device, use them instead. They're faster, read the UI tree directly, and support every keyword. See [Supported platforms](https://optics-framework.org/docs/platforms/).

## Get the hardware

- **A USB serial BLE HID dongle**, which plugs into your machine as a serial port.
- **A camera or capture card** that your machine sees as a webcam, or a TCP frame server that sends a picture on request.
- **A stand** that holds the camera square over the screen, so the picture doesn't shift between runs.

You also need an OCR engine, such as EasyOCR, to read text in the camera picture.

## Set up

### Install the engines

```shell
$ optics setup --install ble easyocr
```

### Pair the dongle and frame the screen

Pair the dongle with the device like any Bluetooth keyboard. Then mount the camera straight on, with the screen upright and filling the picture edge to edge. [Set up](https://optics-framework.org/docs/platforms/production#set-up) shows how to find the dongle's serial port on macOS, Linux and Windows.

### Write config.yaml

Enable the `ble` driver with the dongle's port and the screen size, a `camera_screenshot` element source, and an OCR engine. Copy the [example config](https://optics-framework.org/docs/platforms/production#write-configyaml) and change the port and sizes.

### Calibrate the pointer

Tap a far corner with `Press By Percentage,90,90` and adjust the pointer units until the tap lands. [Calibrate the pointer](https://optics-framework.org/docs/platforms/production#calibrate-the-pointer) has the five steps. Calibrate again whenever you move the camera or change the device.

## Write the test with visible text

There's no UI tree on this setup, so XPath doesn't work. Every element is text that OCR can read on screen, or a cropped image of an icon. Start the app by tapping its icon on the home screen, because Launch App doesn't work over Bluetooth:

`modules/modules.csv`:

```csv
module_name,module_step,param_1,param_2
Open Birch,Press Element,Birch
Open Birch,Assert Presence,Sign in,20
Sign in,Enter Text,Email,ava@birch.shop
Sign in,Enter Text,Password,@:trailrunner
Sign in,Press Element,Sign in
Sign in,Assert Presence,Trail Runner 2,20
```

Enter Text finds the field by OCR, taps it, then types through the Bluetooth keyboard. The `@:` prefix masks the password in logs. See [Keep data in elements too](https://optics-framework.org/docs/elements/define#keep-data-in-elements-too).

## Know the limits

- **No app launch.** Launch App and Launch Other App don't work. Start the app by hand, or tap its icon.
- **No phone-only keys.** A Bluetooth keyboard has no Back, Volume or Power key. Tap the app's own back button.
- **No end-of-run error detection.** It needs the page source. Add Assert Presence checks for the error messages you care about.
- **Scroll moves up and down only.**

[What works and what doesn't](https://optics-framework.org/docs/platforms/production#what-works-and-what-doesnt) lists every keyword, and [Known gaps](https://optics-framework.org/docs/platforms/production#known-gaps) covers version-specific issues.

## Make text easier to read

Most failures on this setup come from the camera picture. Light the screen evenly, avoid glare, and keep the camera in focus. When the same word appears twice, search one part of the screen with an [area of interest](https://optics-framework.org/docs/elements/area-of-interest).

## See also

- [Test production devices](https://optics-framework.org/docs/platforms/production), the full reference
- [Find elements by text and image](https://optics-framework.org/docs/elements/text-and-images)
- [Engines reference](https://optics-framework.org/docs/reference/engines)
