# Supported platforms

> Learn which platforms Optics drives, what each one needs, and which keywords behave differently.

Optics runs the same tests on phones, TVs, browsers and locked production devices. A **driver** controls the device, and **element sources** are the ways Optics looks at the screen. You pick both in `config.yaml`.

## Support matrix

| Platform | Driver | Element sources | Notes |
|---|---|---|---|
| Android | `appium` (UiAutomator2) | `appium_find_element`, `appium_page_source`, `appium_screenshot` | Needs the Appium server, adb, and a phone or emulator. |
| iOS | `appium` (XCUITest) | `appium_find_element`, `appium_page_source`, `appium_screenshot` | Needs a Mac with Xcode, and a simulator or a signed real device. |
| Android TV | `appium` (UiAutomator2) | `appium_find_element`, `appium_page_source`, `appium_screenshot` | Same setup as Android. Move around with D-pad key numbers. |
| Samsung Tizen | `appium` (`platformName: TizenTV`) | `appium_page_source`, `appium_screenshot` | Remote keys only. Touch and typing keywords fail with E0105. |
| LG webOS | `appium` (`platformName: LGTV`) | `appium_screenshot`, plus OCR | Remote keys only. Touch and typing keywords fail with E0105. |
| Web (Playwright) | `playwright` | `playwright_find_element`, `playwright_page_source`, `playwright_screenshot` | No server. Installs and opens its own Chromium. |
| Web (Selenium) | `selenium` | `selenium_find_element`, `selenium_page_source`, `selenium_screenshot` | Needs a WebDriver server or Grid. Chrome or Firefox. |
| Production devices (BLE + camera) | `ble` | `camera_screenshot`, plus OCR or image matching | Taps through a Bluetooth mouse and keyboard, and sees the screen through a camera. |

Enable one driver and the element sources whose names start with that driver's name. The [config.yaml reference](https://optics-framework.org/docs/reference/config) lists every key, and the [engines reference](https://optics-framework.org/docs/reference/engines) lists what each engine installs.

## Choose a driver for web

We recommend **Playwright** for most people. It needs no server, `optics setup` installs its browser for you, and it runs on your own machine.

Use **Selenium** when you already run a Selenium Grid, or need Firefox or a real Chrome on remote machines. It needs a WebDriver server running before each run. [Test websites](https://optics-framework.org/docs/platforms/web) covers both.

## What changes between platforms

Between phones and browsers, only `config.yaml` changes. Your test cases, modules and keywords stay the same. To run a suite on another platform, copy the project and swap the driver and element sources.

TVs on Samsung Tizen and LG webOS are the exception. They have no touch screen, so Press Element and the typing keywords fail with E0105 there. Write those flows with Press Keycode steps that move the focus, such as `Press Keycode,RIGHT` and then `Press Keycode,ENTER`. [Test TV apps](https://optics-framework.org/docs/platforms/tv) shows the key names.

Element values usually do change, because each platform names things differently. Give an element one row per platform, and Optics tries each value in turn:

`test_data/elements.csv`:

```csv
Element_Name,Element_ID
sign_in,//android.widget.Button[@text='Sign in']
sign_in,//XCUIElementTypeButton[@name='Sign in']
sign_in,Sign in
```

The last row is plain text, which works on any platform with a UI tree, and with OCR on any platform that takes screenshots. [Define elements](https://optics-framework.org/docs/elements/define) explains fallback values.

## What doesn't work everywhere

Most keywords work on every platform. These are the exceptions:

| Keyword | Where it differs |
|---|---|
| Press Element, Enter Text, Swipe, Scroll and other touch or typing keywords | Fail with E0105 on Samsung Tizen and LG webOS. Use Press Keycode with remote keys instead. |
| Press Keycode | Takes Android key numbers on Android and Android TV, remote key names on Tizen and webOS, and key names such as `Enter` on Playwright. Not supported on Selenium or iOS. |
| Swipe | Not supported on Selenium. On Playwright it turns the mouse wheel. |
| Scroll | Up and down only on Appium. Left and right are ignored. |
| Launch App | Opens a package or bundle id on Appium and a URL on Playwright. On Selenium it opens `browserURL`. Not supported on production devices. |
| Enter Text, Get Text | Fail in Playwright on Optics 1.10.5. See [Test websites](https://optics-framework.org/docs/platforms/web) for the workaround. |
| XPath and UI-tree text | Not available on production devices, which only have camera pictures. Use OCR and images. |
| [Error detection](https://optics-framework.org/docs/run/error-detection) | Needs the page source, so it doesn't run on production devices. |

The [keyword reference](https://optics-framework.org/docs/reference/keywords/) lists each keyword's behavior per driver.

## Platform guides

- [Android](https://optics-framework.org/docs/platforms/android): Set up Appium and adb, then run on a phone or emulator.
- [iOS](https://optics-framework.org/docs/platforms/ios): Run on a simulator or a signed device with XCUITest.
- [Web](https://optics-framework.org/docs/platforms/web): Test websites with Playwright or Selenium. (Recommended)
- [TV](https://optics-framework.org/docs/platforms/tv): Drive Android TV, Samsung Tizen and LG webOS with remote keys.
- [Production devices](https://optics-framework.org/docs/platforms/production): Test locked devices through Bluetooth and a camera. (Advanced)
