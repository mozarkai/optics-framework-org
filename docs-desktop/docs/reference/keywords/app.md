# App management keywords

> Learn how to start, switch, close and inspect the app or browser under test.

App management keywords start and stop the app or browser that your test drives. Most suites call Launch App in a setup module and Close And Terminate App in a teardown module.

`modules/modules.csv`:

```csv
module_name,module_step,param_1,param_2
Open Birch,Launch App,com.birch.shop
Close Birch,Close And Terminate App
```

See [Keywords](https://optics-framework.org/docs/reference/keywords/) for the rules all keywords share.

## Start and switch

### Launch App

Starts the app or browser under test, or brings the app to the front.

| Parameter | Default | What it does |
|---|---|---|
| `app_identifier` | Empty | Appium: the Android package or iOS bundle id, or a URL or deep link. Playwright and Selenium: the URL to open. Empty uses the app from your config. |
| `app_activity` | Empty | Appium on Android: the activity to start. Selenium: the browser name, `chrome` or `firefox`. |
| `event_name` | Empty | Label for a timed event. See [Event names](https://optics-framework.org/docs/reference/keywords/#event-names). |

```csv
Open Birch,Launch App,com.birch.shop
Open Birch,Launch App,com.birch.shop,com.birch.shop.MainActivity
Open Birch Web,Launch App,https://birch.example
```

```yaml
- Launch App com.birch.shop
```

Good to know:

- On Appium, Launch App starts a session if none is running. If a session is already running and you give an identifier, it brings that app to the front.
- On Appium, a value that contains `://` opens as a URL or deep link. A web address opens in the device browser. See [Mobile web](https://optics-framework.org/docs/platforms/mobile-web).
- With no parameters, Launch App uses the app, URL and browser from your [config](https://optics-framework.org/docs/reference/config). On Playwright, it opens the browser and no page.
- On Selenium, `app_identifier` and `app_activity` apply only when Launch App starts the session. Later calls reopen the configured URL.
- On Playwright, a second Launch App opens the URL in the same browser. The `browser`, `headless`, `viewport` and `device` capabilities set the browser. See [Web](https://optics-framework.org/docs/platforms/web#emulate-a-phone).
- On a desktop, Launch App starts `app` from the config, or brings it to the front if it runs. A value starts that app, or brings it to the front: a bundle id or `.app` path on macOS, an executable on Linux and Windows. See [Desktop](https://optics-framework.org/docs/platforms/desktop#work-with-more-than-one-app).
- The BLE driver (a Bluetooth keyboard and mouse) can't launch apps. Open the app by tapping its icon instead.

### Start Appium Session

Starts a driver session without naming an app. It's the same as Launch App with no parameters, and it works with every driver despite its name.

| Parameter | Default | What it does |
|---|---|---|
| `event_name` | Empty | Label for a timed event. |

```csv
Open Birch,Start Appium Session
```

### Launch Other App

Switches to another app, or opens a deep link or URL.

| Parameter | Default | What it does |
|---|---|---|
| `app_name` | Required | An Android package, iOS bundle id, deep link or URL. |
| `event_name` | Empty | Label for a timed event. |

```csv
Share Product,Launch Other App,com.android.settings
Open Deep Link,Launch Other App,birch://product/trail-runner-2
Open Help,Launch Other App,https://birch.example/help
```

```yaml
- Launch Other App com.android.settings
```

Good to know:

- On Appium, a value containing `://` opens as a deep link or URL. Anything else is started or brought to the front as an app.
- On a desktop, it starts the app, or brings it to the front if it runs, and later steps act on it. Launch App with no value goes back to the app from the config.
- On Playwright, the URL opens in a new tab.
- On Selenium, the current tab navigates to the URL.
- In Python the parameter is called `bundleid`.

## Close

### Close And Terminate App

Ends the driver session, which closes the app or browser, and sends any recorded events.

This keyword takes no parameters.

```csv
Close Birch,Close And Terminate App
```

```yaml
- Close And Terminate App
```

Good to know:

- On a desktop, it stops only the apps that the session started. An app that you attached to with `appName` stays open.
- After this keyword, later steps have no session. Put it in your last module or a teardown test case. See [Organise tests](https://optics-framework.org/docs/create/organise).

### Force Terminate App

Kills a specific app.

| Parameter | Default | What it does |
|---|---|---|
| `app_name` | Required | The Android package or iOS bundle id to kill. |
| `event_name` | Empty | Label for a timed event. |

```csv
Reset Birch,Force Terminate App,com.birch.shop
```

```yaml
- Force Terminate App com.birch.shop
```

Good to know:

- On Appium, errors are logged and the step passes, even if the app wasn't killed. With no session it does nothing.
- On a desktop, give the same app id as for Launch Other App, for example `gnome-calculator`.
- On Selenium, it closes the current browser window and ignores `app_name`.
- Playwright doesn't support it. The step fails.

## Inspect

### Get App Version

Reads the installed app's version.

| Parameter | Default | What it does |
|---|---|---|
| `app_package` | Empty | The Android package or iOS bundle id. Empty uses the app from your config. |

```csv
App Info,Get App Version,com.birch.shop
```

Good to know:

- On Android, Optics reads the version through adb. On iOS, it uses ideviceinstaller, which must be installed.
- To keep the version in a variable, add [`store_as=name`](https://optics-framework.org/docs/reference/keywords/#store-as).
- On a desktop, the step fails with error E0105.
- Selenium doesn't support it, so the step fails. On Playwright it returns a "not supported" message, and passing `app_package` fails the step.

### Get Driver Session Id

Returns the id of the current driver session.

This keyword takes no parameters.

```csv
App Info,Get Driver Session Id
```

Good to know:

- To keep the id in a variable, add [`store_as=name`](https://optics-framework.org/docs/reference/keywords/#store-as).
- On Playwright, it returns nothing, so `store_as` fails. Selenium and the BLE driver do not support it, and the step fails.

### Initialise Setup

Does nothing. It exists for compatibility and writes a debug log line only.

This keyword takes no parameters.

```csv
Setup,Initialise Setup
```
