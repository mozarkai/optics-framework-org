# Test apps that block screenshots or USB debugging

> Automate a banking or streaming app on a locked phone, with a Bluetooth dongle for input and a camera for eyes.

Some apps do not let a driver test them. Banking and streaming apps often block screenshots, so a driver sees a black screen. Company phones and retail devices often do not permit USB debugging or developer mode, so Appium cannot connect.

Optics can test these apps with no automation software on the device. An **airhand dongle** pairs with the phone as a Bluetooth keyboard, mouse and media remote. A **camera** aimed at the screen shows Optics the screen. Optics reads text in the camera frame with OCR and finds icons with image matching. Then the dongle taps and types.

This page helps you decide if you need this setup, and shows a sign-in test for it. [Test production devices](https://optics-framework.org/docs/platforms/production) gives the full procedure and every setting.

## Decide if you need it

Use the Bluetooth and camera setup when:

- **The app blocks screenshots.** The camera sees the screen.
- **USB debugging or developer mode is not permitted** on the device.
- **You monitor the live app.** The test runs on a real device and the store version of the app, as a customer uses it.

If Appium or a browser driver can reach the device, use it. It reads the UI tree, is faster and supports every keyword. See [Supported platforms](https://optics-framework.org/docs/platforms/).

If Appium works and the app blocks screenshots only on some screens, keep Appium and add a camera for those screens. See [Add a camera to an Appium run](https://optics-framework.org/docs/platforms/production#add-a-camera-to-an-appium-run).

## Get the hardware

- **An nRF52840 USB dongle** with the [airhand](https://github.com/chinmayajha/airhand/tree/v0.1.2#quick-start) firmware, version 0.1.2 or later.
- **A camera.** A webcam or capture card, a URL that returns a screenshot, or a TCP frame server.
- **A stand** that holds the camera and the phone in position.

You also need an OCR engine: Apple Vision on a Mac, RapidOCR on Linux and Windows.

## Set up

### Install the engines

```shell
$ optics setup --install ble apple-vision       # ble rapidocr on Linux and Windows
```

### Pair the phone

Install the airhand firmware on the dongle. Then select **airhand** in the Bluetooth settings of the phone. On an iPhone, also turn on AssistiveTouch. [Set up](https://optics-framework.org/docs/platforms/production#set-up) gives each step.

### Write config.yaml

Set the `platform` and the screen size (`frame`) of the phone, and aim a camera at the screen:

`config.yaml`:

```yaml
driver_sources:
  - ble:
      enabled: true
      capabilities:
        platform: android
        frame: {width: 1080, height: 2400}
elements_sources:
  - camera_screenshot:
      enabled: true
      capabilities:
        camera_index: 0
        find_screen: brightness
        out_width: 1080
        out_height: 2400
text_detection:
  - rapidocr: {enabled: true}
```

There is no calibration. `find_screen: brightness` finds the screen in the camera frame at the start of the run.

### Check the setup

```shell
$ optics doctor
```

Correct each ⚠️ row in the **Bluetooth** section before you start a run.

## Write the test with visible text

There is no UI tree on this setup, so XPath does not work. Each element is text that OCR can read on the screen, or a cropped image of an icon:

`modules/modules.csv`:

```csv
module_name,module_step,param_1,param_2
Open Birch,Launch App,Birch
Open Birch,Assert Presence,Sign in,20
Sign in,Enter Text,Email,ava@birch.shop
Sign in,Enter Text,Password,@:trailrunner
Sign in,Press Element,Sign in,index=1
Sign in,Assert Presence,Trail Runner 2,20
```

`Launch App` opens the app by the name that the phone shows. On Android, it searches the app drawer. Enter Text finds the field with OCR, taps it, then types through the Bluetooth keyboard. The `@:` prefix masks the password in logs. See [Keep data in elements too](https://optics-framework.org/docs/elements/define#keep-data-in-elements-too).

"Sign in" shows two times on this screen: in "Sign in to continue shopping" and on the button. `index=1` selects the second match from the top, which is the button.

`Press Element` reads one frame and does not wait. After a step that changes the screen, put an `Assert Presence` before it.

## Know the limits

- **ASCII text only.** The dongle types on a US keyboard layout.
- **No Back key on iOS.** Tap the back button of the app.
- **No error detection at the end of the run.** It needs a page source. Add `Assert Presence` checks for the error messages that you know.
- **One finger.** There is no pinch or multi-touch, and the `Swipe` distance changes from run to run.

[What works and what does not](https://optics-framework.org/docs/platforms/production#what-works-and-what-does-not) lists each keyword.

## Make text easier to read

Most failures on this setup come from the camera frame. Light the screen evenly, remove glare and focus the camera. When the same word shows two times, search one part of the screen with an [area of interest](https://optics-framework.org/docs/elements/area-of-interest). When Optics cannot see the screen, it saves the frame as `camera_blind_<time>.jpg` in the output folder.

## See also

- [Test production devices](https://optics-framework.org/docs/platforms/production), the full procedure
- [Find elements by text and image](https://optics-framework.org/docs/elements/text-and-images)
- [Engines reference](https://optics-framework.org/docs/reference/engines)
