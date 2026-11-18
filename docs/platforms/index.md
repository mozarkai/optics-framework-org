---
title: Supported platforms
nav: Overview
summary: Learn which platforms Optics drives, what each one needs, and which keywords behave differently.
description: Optics tests Android, iOS, mobile web, websites, Android TV, Samsung Tizen, LG webOS, macOS, Linux and Windows desktop apps, and locked production devices. See the driver, element sources and limits for each platform.
---

::scene{name="platforms" caption="One test on a phone, a TV and a browser. Phones and browsers press the element itself. Tizen and webOS TVs have no touch, so their steps move the focus with remote keys."}

Optics runs the same tests on phones, TVs, browsers, desktop apps and locked production devices. A **driver** controls the device, and **element sources** are the ways Optics looks at the screen. You pick both in `config.yaml`.

## Support matrix

| Platform | Driver | Element sources | Notes |
|---|---|---|---|
| Android | `appium` (UiAutomator2) | `appium_find_element`, `appium_page_source`, `appium_web`, `appium_screenshot` | Needs the Appium server, adb, and a phone or emulator. |
| iOS | `appium` (XCUITest) | `appium_find_element`, `appium_page_source`, `appium_web`, `appium_screenshot` | Needs a Mac with Xcode, and a simulator or a signed real device. |
| Mobile web (Chrome, Safari, WebViews) | `appium` | `appium_web` with the Android or iOS sources | Same setup as Android or iOS. Finds `css=` and DOM XPath locators in the page. |
| Android TV | `appium` (UiAutomator2) | `appium_find_element`, `appium_page_source`, `appium_screenshot` | Same setup as Android. Move around with D-pad key numbers. |
| Samsung Tizen | `appium` (`platformName: TizenTV`) | `appium_find_element`, `camera_screenshot` | Element keywords move the remote focus. Touch keywords fail with E0105. |
| LG webOS | `appium` (`platformName: LGTV`) | `appium_find_element`, plus OCR | Element keywords move the remote focus. Touch keywords fail with E0105. |
| Web (Playwright) | `playwright` | `playwright_find_element`, `playwright_page_source`, `playwright_screenshot` | No server. Opens Chromium, Firefox or WebKit on your machine, or connects to a remote browser. Can emulate a phone. |
| Web (Selenium) | `selenium` | `selenium_find_element`, `selenium_page_source`, `selenium_screenshot` | Needs a WebDriver server or Grid. Chrome or Firefox. |
| Desktop (macOS, Linux, Windows) | `appium` (`automationName: Xa11y`) | `appium_find_element`, `appium_page_source`, `appium_screenshot` | Needs Appium and appium-xa11y-driver on the computer that shows the app. Windows is experimental. |
| Production devices (BLE + camera) | `ble` | `camera_screenshot`, plus OCR or image matching | Taps through a Bluetooth mouse and keyboard, and sees the screen through a camera. |

Enable one driver and the element sources whose names start with that driver's name. The [config.yaml reference](/docs/reference/config) lists every key, and the [engines reference](/docs/reference/engines) lists what each engine installs.

## Choose a driver for web

We recommend **Playwright** for most people. It needs no server, `optics setup` installs its browser for you, and it runs on your own machine.

Use **Selenium** when you already run a Selenium Grid, or need Firefox or a real Chrome on remote machines. It needs a WebDriver server running before each run. [Test websites](/docs/platforms/web) covers both.

## What changes between platforms

Between phones, browsers and desktop apps, only `config.yaml` changes. Your test cases, modules and keywords stay the same. To run a suite on another platform, copy the project and swap the driver and element sources.

TVs on Samsung Tizen and LG webOS are the exception. They have no touch screen, so the element keywords press remote keys to move the focus. Touch keywords such as Swipe and Scroll fail with E0105 there. Use Press Keycode for single remote keys. [Test TV apps](/docs/platforms/tv) shows the locators and key names.

Element values usually do change, because each platform names things differently. Give an element one row per platform, and Optics tries each value in turn:

```csv title="test_data/elements.csv"
Element_Name,Element_ID
sign_in,//android.widget.Button[@text='Sign in']
sign_in,//XCUIElementTypeButton[@name='Sign in']
sign_in,Sign in
```

The last row is plain text, which works on any platform with a UI tree, and with OCR on any platform that takes screenshots. [Define elements](/docs/elements/define) explains fallback values.

## What doesn't work everywhere

Most keywords work on every platform. These are the exceptions:

| Keyword | Where it differs |
|---|---|
| Swipe, Scroll and other touch keywords | Fail with E0105 on Samsung Tizen and LG webOS. Press Element and Enter Text move the remote focus instead. |
| Press Keycode | Takes Android key numbers on Android and Android TV, remote key names on Tizen and webOS, key names such as `Enter` on Playwright, and key combinations such as `primary+s` on a desktop. Not supported on Selenium or iOS. |
| Swipe | Not supported on Selenium. On Playwright it scrolls the page up or down. |
| Launch App | Opens a package, a bundle id or a URL on Appium, an app on a desktop, and a URL on Playwright. On Selenium it opens `browserURL`. Not supported on production devices. |
| Go Back | Goes back one page in a browser, and presses Back on Android. On iOS it taps the navigation bar's back button. Fails with E0105 on TVs, desktops and production devices. |
| XPath and UI-tree text | Not available on production devices, which only have camera pictures. Use OCR and images. |
| [Error detection](/docs/run/error-detection) | Needs the page source, so it doesn't run on production devices. |

The [keyword reference](/docs/reference/keywords/) lists each keyword's behavior per driver.

## Platform guides

:::cards{cols="2"}
- [Android](/docs/platforms/android): Set up Appium and adb, then run on a phone or emulator.
- [iOS](/docs/platforms/ios): Run on a simulator or a signed device with XCUITest.
- [Web](/docs/platforms/web): Test websites with Playwright or Selenium. {Recommended}
- [Mobile web](/docs/platforms/mobile-web): Test Chrome, Safari and WebViews on a real phone.
- [TV](/docs/platforms/tv): Drive Android TV, Samsung Tizen and LG webOS with remote keys.
- [Desktop](/docs/platforms/desktop): Test native apps on macOS, Linux and Windows. {New}
- [Production devices](/docs/platforms/production): Test locked devices through Bluetooth and a camera. {Advanced}
:::
