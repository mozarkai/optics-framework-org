---
title: Test mobile websites and WebViews
nav: Mobile web
summary: Test web pages in Chrome, Safari and in-app WebViews on a real phone, in the same session as the native app.
description: Automate mobile web testing in Chrome on Android, Safari on iOS and in-app WebViews with Optics, an open-source framework that finds CSS and DOM XPath locators through Appium without context switching.
level: Intermediate
time: 15 min
---

Optics tests web pages on Android and iOS phones through the same Appium session that tests native apps. One test can open an app, follow a link into Chrome or Safari, fill a web form, and go back to the app. Your steps never switch contexts.

To test a website in a desktop browser, or in a browser that only emulates a phone, use [Playwright](/docs/platforms/web#emulate-a-phone) instead. This page is for real mobile browsers and WebViews.

## How it works

The session stays in the native context. Visible text, resource ids, native XPath and OCR work on web pages too. Chrome and Safari put the text, links and fields of the page into the native UI tree.

Web locators, `css=...` and DOM XPath such as `//button[@type='submit']`, go to the `appium_web` element source. For each lookup, it:

1. finds the web content of the app in front, and its front tab. On Android, that is Chrome or a debuggable WebView. On iOS, it is Safari, an in-app Safari sheet (`SFSafariViewController`), an inspectable `WKWebView` or another inspectable browser.
2. finds the element in the page and scrolls it into view. It closes the on-screen keyboard if the keyboard covers the element.
3. converts the position of the element to screen coordinates.
4. goes back to the native context.

The tap or text entry that follows is a native action at that position.

## Before you begin

- An [Android](/docs/platforms/android) or [iOS](/docs/platforms/ios) setup that works: Appium, its driver, and a device or emulator.
- On Android, Chrome on the device.

## Set up

:::steps
### Start Appium so that it can get chromedriver

Android web lookups need the chromedriver that matches the device's Chrome. Let Appium download it:

```shell
$ appium server --allow-insecure uiautomator2:chromedriver_autodownload
```

Or set `appium:chromedriverExecutableDir` to a folder of chromedriver binaries. iOS needs no extra driver.

### Write config.yaml

Enable `appium_web` next to the other Appium sources. `optics quickstart` and `optics configure` do this for Android and iOS projects.

:::tabs{group="platform"}
::tab[Android]
```yaml title="config.yaml"
driver_sources:
  - appium:
      enabled: true
      url: "http://localhost:4723"
      capabilities:
        platformName: Android
        automationName: UiAutomator2
        deviceName: emulator-5554
        browserName: Chrome        # start in Chrome; remove it to start in your app
elements_sources:
  - appium_find_element: {enabled: true}
  - appium_page_source:  {enabled: true}
  - appium_web:          {enabled: true}
  - appium_screenshot:   {enabled: true}
```

With `browserName: Chrome`, the session starts in Chrome and web addresses open in Chrome, whatever the default browser is. To test an app that opens web pages, set `appPackage` and `appActivity` instead.

::tab[iOS]
```yaml title="config.yaml"
driver_sources:
  - appium:
      enabled: true
      url: "http://localhost:4723"
      capabilities:
        platformName: iOS
        automationName: XCUITest
        deviceName: "iPhone 17"
        bundleId: com.apple.mobilesafari   # or your app's bundle id
elements_sources:
  - appium_find_element: {enabled: true}
  - appium_page_source:  {enabled: true}
  - appium_web:          {enabled: true}
  - appium_screenshot:   {enabled: true}
```

Do not set `browserName: Safari`. It turns off the web lookups that `appium_web` uses.
:::

### Let Optics read the page

:::tabs{group="platform"}
::tab[Android]
Chrome needs no setup. An app's WebView is readable only when the app calls `WebView.setWebContentsDebuggingEnabled(true)`. Debug builds usually do.

::tab[iOS]
No extra driver is needed: XCUITest reads web pages through the Web Inspector of Safari. Simulators need no setup. On a real device, turn on **Web Inspector** and **Remote Automation** in **Settings > Apps > Safari > Advanced**.

Safari and in-app Safari sheets are always readable. An app's `WKWebView` is readable when the app sets `isInspectable = true`. Apps built with the iOS 16.4 SDK or later need this, also in debug builds.

Chrome, Firefox and other iOS browsers are read the same way when they allow inspection. Firefox tabs allow it by default. Chrome needs **Settings > Content Settings > Web Inspector**.
:::

### Run the sample

The `mobile_web` sample searches Wikipedia in Chrome on Android:

```shell
$ optics init wiki --template mobile_web
$ optics execute wiki
```
:::

## Open web pages

Launch App and Launch Other App open a URL in the app that handles it. For a web address, that is a browser.

```csv title="modules/modules.csv"
module_name,module_step,param_1
Open shop,Launch App,https://shop.example.com/
Back to the app,Launch App,com.example.shop
```

On iOS, Launch App opens the URL in Safari. To go back to your app, use Launch App with its bundle id.

To open a page in Chrome on Android when another browser is the default, call the deep link with the package of Chrome:

```csv title="modules/modules.csv"
module_name,module_step,param_1
Open Shop In Chrome,Execute Script,"{""script"": ""mobile: deepLink"", ""args"": {""url"": ""https://shop.example.com/"", ""package"": ""com.android.chrome""}}"
```

## Locators for web pages

| Locator | Example | Found by |
|---|---|---|
| Visible text | `Sign in` | The native UI tree, then OCR |
| HTML id | `searchInput` | The native UI tree. Chrome gives HTML ids as resource ids. |
| CSS | `css=input[name='q']`, `#searchInput` | `appium_web` |
| DOM XPath | `//button[@type='submit']` | The native sources first, then `appium_web`. Assertions skip the native sources for an XPath that only HTML has. |

An XPath that names an Android or iOS class (`android.widget.Button`, `XCUIElementTypeButton`) or a native attribute (`@resource-id`, `@text`, `@bounds` and the like) outside quotes goes only to the native sources. Web locators search the top page, not the inside of an `iframe`. Use text locators or OCR for content in a frame. A web locator that matches nothing fails at once.

Assert Presence with a web locator checks the page, so an element that is off screen passes. Assert Visibility passes only when the element is in the visible part of the page.

Assert Text reads the text of a web element. Is Element checks the `enabled`, `disabled`, `checked` and `unchecked` states of a web control, and `aria-disabled` and `aria-checked` count too.

## Move between apps and the browser

Every lookup reads the screen as it is now, so a test follows the user from one app to the next:

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2
Read the policy,Press Element,Refund policy
Read the policy,Assert Presence,css=h1,30
Read the policy,Get Text,css=h1,store_as=policy_title
Read the policy,Go Back
Read the policy,Assert Presence,Refund policy,20
```

- **App to browser.** A link in an app opens Chrome or a Chrome Custom Tab. Web locators then find elements in that page. Go Back closes the tab.
- **Browser to app.** A link that an app handles, such as a Play Store link, opens that app. Its native elements are available immediately.
- **Two apps can open the link.** Android asks which app to use. Answer with Detect And Press on the app's name, then on `Just once`.

Nothing in a test says which app is in front. On iOS, when several web views are on screen, web locators use the one that holds the element.

## Covered elements

When a banner, a dialog or a panel covers the element, Optics does not tap it, because the tap will hit the cover. The step fails with "is covered by another element on the page". Close the cover first. Get Text still reads a covered element.

## Chrome's first-run pop-ups

A new Chrome shows pop-ups over the page, such as a notification prompt or a sign-in offer. You cannot tap the page while one is open. Give Chrome the notification permission before you open a page:

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2
Prepare Chrome,Launch App
Prepare Chrome,Execute Script,"{""script"": ""mobile: changePermissions"", ""args"": {""permissions"": ""android.permission.POST_NOTIFICATIONS"", ""appPackage"": ""com.android.chrome"", ""action"": ""grant""}}"
Prepare Chrome,Launch App,https://www.wikipedia.org/
Prepare Chrome,Detect And Press,negative_button,5
```

Detect And Press closes a pop-up only if it shows, and does not fail if it does not. Give it a timeout of 5 seconds or more, because the pop-up appears after the page loads. Other buttons to close: `No thanks` or `negative_button` for the notification prompt, and `Stay signed out` or `signin_fre_dismiss_button` for the sign-in offer.

## Screen elements

With `appium_web` on, Get Interactive Elements, Get Screen Elements, the MCP `elements` resource and the plain-English mode of `optics live` list the web page next to the native elements. One call returns:

- the native elements, such as the toolbar of Chrome or the app around a WebView.
- every control, text and image of the web page, with its bounds on the screen. An element outside the visible part of the page has `offscreen: true`. A press on it by locator scrolls it into view.
- a `loc` on each web control and text: a `css=` or `xpath=` locator that matches only that element. Copy it into your elements file.

A web entry replaces the copy of it that UiAutomator2 or XCUITest shows in the native tree.

`loc` stays the same between runs. It uses a test attribute (`data-testid`), an id, a name or label, or the text of the element. When those are shared, it names the element inside its card or row, for example `xpath=//article[.//h2[normalize-space()='Red Mug']]//button[normalize-space()='Add to cart']`. A CSS path is the last choice. It skips generated ids and classes, and it matches "Cart (0)" by its first words, so a count that changes does not change it.

## Limits

- A web lookup takes one to two seconds on a remote device. Use native locators where they work.
- iOS sign-in sheets (`ASWebAuthenticationSession`) cannot be read. Use text locators or OCR.
- Optics adds capabilities that keep web lookups fast. Values in your `capabilities` replace them. The [config.yaml reference](/docs/reference/config#appium-capabilities) lists them.
- On Android, Optics adds `ensureWebviewsHavePages: false` and `extractChromeAndroidPackageFromContextName: true`, so a frozen app in the background with WebView debugging on adds at most 2 s to a web lookup.
- On iOS, Optics adds `includeSafariInWebviews: true`, `additionalWebviewBundleIds: ["*"]`, `webviewConnectRetries: 3` and `webviewAtomWaitTimeout: 5000`, so Optics sees the web content of every app, and a page that does not answer costs seconds, not minutes.

## If it isn't working

- **"No web content found in the foreground app".** The app's WebView is not debuggable. Turn on WebView debugging, or use text locators and OCR.
- **"Cannot read the web page shown by …".** The link opened in a browser that Optics cannot read, such as Samsung Internet. Make Chrome the default browser.
- **"Cannot tell which browser tab is on screen".** Several Chrome tabs show the same address. Close the extra tabs.
- **"is in the page but not displayed".** The locator matches a hidden element. Use a locator for the visible one.
- **A Custom Tab ignores the first tap.** Chrome ignores the first tap on a Custom Tab that opens immediately after another one closes. Press the field once before you type.

## See also

- [Test Android apps](/docs/platforms/android)
- [Test iOS apps](/docs/platforms/ios)
- [Test websites](/docs/platforms/web)
- [Define elements](/docs/elements/define)
