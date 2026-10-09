---
title: config.yaml
summary: Every setting in a project's config.yaml.
layout: wide
---

A project's config.yaml tells Optics which driver to use, how to find elements, and where to write logs and results. Every setting lives in the project; there's no global config file and no environment variable that overrides it.

Run [`optics configure`](/docs/reference/cli#optics-configure) to write a working file by answering a few questions, then edit it by hand with this page.

## How Optics finds the file

| Command | Which file it reads |
|---|---|
| `optics execute`, `optics dry_run` | Any YAML file in the project tree that has `driver_sources` and `elements_sources`. The file name doesn't matter. If there are several, the last one found wins. |
| `optics live` | The first YAML file in the project tree with any config key. |
| `optics doctor`, `optics configure`, `optics generate` | Exactly `<folder>/config.yaml`. |
| `optics serve`, `optics mcp` | None. Settings come from each session request. |

We recommend one file named `config.yaml` at the project root, so every command reads the same settings.

Settings you leave out take their defaults. Optics ignores keys it doesn't know, so a typo such as `log_levle` is silently skipped.

:::warning
If config.yaml has a wrong value type, `optics execute` logs the problem, skips the file and runs with defaults. The run then stops with "No driver enabled". Run `optics doctor <folder>` to find the problem.
:::

## Top-level keys

| Key | Default | What it does |
|---|---|---|
| `driver_sources` | All disabled | The driver that controls the device or browser. See [driver_sources](#driver-sources). |
| `elements_sources` | All disabled | Where Optics looks for elements: the driver's UI tree, its locators, or its screenshots. `element_sources` is accepted as an alias. |
| `text_detection` | All disabled | OCR engines for finding elements by on-screen text. |
| `image_detection` | All disabled | Engines for finding elements by image templates. |
| `llm_models` | All disabled | The LLM for AI self-heal and the plain-English mode of `optics live`. |
| `log_level` | `INFO` | `DEBUG`, `INFO`, `WARNING`, `ERROR` or `CRITICAL`, any case. Unknown values become `INFO`. |
| `file_log` | `false` | Writes `internal_logs.log` and `execution_logs.log` to the output folder. |
| `log_path` | None | One file for both logs instead of two. Used only with `file_log: true`. |
| `json_log` | `false` | Writes a JSON array of every test, module and keyword event to `logs.json` at the end of the run. |
| `json_path` | None | Where to write the JSON events instead of `<output>/logs.json`. `~` is expanded. |
| `console` | `true` | **Has no effect in 1.10.5.** Nothing reads it. Use `log_level` to control console output. |
| `execution_output_path` | `<project>/execution_output` | Where results, screenshots and logs go. Relative paths are relative to the folder you run `optics` from. |
| `include` | None | Run only these test cases. See [include and exclude](#include-and-exclude). |
| `exclude` | None | Skip these test cases. |
| `ai_self_heal` | `false` | Lets an LLM try to recover when an element can't be found. See [ai_self_heal](#ai-self-heal). |
| `strict_element_match` | `false` | Turns off fuzzy and partial text matching. See [strict_element_match](#strict-element-match). |
| `save_captures` | `true` | Whether `Capture Screenshot`, `Capture Pagesource` and `Get Screen Elements` write files. See [save_captures](#save-captures). |
| `halt_duration` | `0.1` | Seconds to wait after a keyword fails every fallback. It isn't a pause between steps. |
| `event_attributes_json` | None | Path to a JSON file of event attributes. When it includes an `eventUrl`, events you label with `event_name` are sent there at the end of the session. |
| `project_path` | The project folder | The CLI always sets this to the folder you pass, so leave it out. It only matters for the Python SDK. |

:::note
If you set `execution_output_path` yourself, create the folder first. JUnit results and logs create their own folders, but screenshots fail to save without a warning if the folder is missing.
:::

## Engine lists

`driver_sources`, `elements_sources`, `text_detection`, `image_detection` and `llm_models` are lists. Each item is an engine name with its settings:

```yaml
driver_sources:
  - appium:                 # engine name
      enabled: true         # required: only enabled entries are loaded
      url: "http://127.0.0.1:4723"
      capabilities:         # engine-specific settings
        platformName: Android
```

| Field | Default | What it does |
|---|---|---|
| `enabled` | Required | Only enabled entries are loaded. A disabled entry with any name is ignored. |
| `url` | None | The server address, for engines that use one. |
| `capabilities` | `{}` | Settings passed to the engine. |

When several entries in one list are enabled, Optics tries them in the order you list them. For element sources this is the order in which strategies run.

An enabled entry with an unknown name fails with [E0601](/docs/reference/errors#e06-modules-and-engines). So does an enabled engine whose extra isn't installed. A list you write replaces the default list completely.

### driver_sources

Enable one driver. `optics live` refuses more than one, and `optics doctor` warns about it.

| Name | Extra | What it drives |
|---|---|---|
| `appium` | `appium` | Android, iOS, Android TV, Samsung Tizen TV and LG webOS TV apps through an Appium server. |
| `selenium` | `selenium` | Chrome or Firefox through a Selenium server or Grid. |
| `playwright` | `playwright` | A local Chromium browser. No server needed. |
| `ble` | `ble` | Any device paired with a Bluetooth mouse-and-keyboard dongle. For devices with no automation access. |

### elements_sources

Enable the sources that match your driver. We recommend all three for your driver: locators, page source and screenshots.

| Name | Needs driver | What it gives you |
|---|---|---|
| `appium_find_element` | `appium` | Finds elements by XPath, accessibility id and class. |
| `appium_page_source` | `appium` | Searches the UI tree by XPath and text, with fuzzy matching. Lists interactive elements. |
| `appium_screenshot` | `appium` | Screenshots for OCR, image matching and AI self-heal. |
| `selenium_find_element` | `selenium` | Finds elements by XPath, text, id, name, CSS and link text. |
| `selenium_page_source` | `selenium` | Searches the page HTML. Doesn't list interactive elements. |
| `selenium_screenshot` | `selenium` | Screenshots for OCR and image matching. |
| `playwright_find_element` | `playwright` | Finds elements by `xpath=`, `css=` and `text=` locators. |
| `playwright_page_source` | `playwright` | Searches the page and lists interactive elements. |
| `playwright_screenshot` | `playwright` | Screenshots for OCR and image matching. |
| `camera_screenshot` | Any | Frames from a webcam or a TCP frame server. Used with `ble`. |

`optics doctor` fails a project when no enabled element source starts with the enabled driver's name.

### text_detection

| Name | Extra | Settings |
|---|---|---|
| `easyocr` | `easyocr` | None. Accurate but slow on CPU. Downloads its models on first use. The language is always English. |
| `pytesseract` | `pytesseract` | None. Needs the Tesseract program installed and on your PATH. |
| `google_vision` | `google-vision` | None. Credentials come from `GOOGLE_APPLICATION_CREDENTIALS`. `googlevision` also works. |
| `remote_ocr` | None | `url` (required): your OCR service. `capabilities`: `timeout` (30), `method` (`easyocr`), `language` (`en`). Optics posts screenshots to `<url>/detect-text`. |

### image_detection

| Name | Extra | Settings |
|---|---|---|
| `templatematch` | None | `capabilities.sift_nfeatures` (2000). Finds template images, including scaled or rotated ones. Images are found by file name anywhere in the project. |
| `remote_oir` | None | `url` (required): your image service. `capabilities`: `timeout` (30), `method` (`template_matching`). Optics posts to `<url>/detect-image`. |

### llm_models

| Name | Extra | Settings |
|---|---|---|
| `gemini` | `llm` | All optional: `model` (`gemini-2.5-flash`), `temperature` (`0.0`), `use_vertexai`, `project`, `location`. |

```yaml
llm_models:
  - gemini:
      enabled: true
      capabilities:
        model: gemini-2.5-flash
```

Gemini reads its credentials from the environment: `GEMINI_API_KEY` or `GOOGLE_API_KEY`, or `GOOGLE_GENAI_USE_VERTEXAI=true` with `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` and `GOOGLE_APPLICATION_CREDENTIALS`. Don't put an API key in config.yaml: Optics accepts `api_key` there but warns, because the file usually ends up in version control.

## Examples by platform

:::tabs{group="platform"}
::tab[Android]
```yaml title="config.yaml"
driver_sources:
  - appium:
      enabled: true
      url: "http://127.0.0.1:4723"        # required; the Appium server
      capabilities:                        # must not be empty
        platformName: Android              # required; picks the Android profile
        automationName: UiAutomator2
        deviceName: emulator-5554
        # udid: emulator-5554              # pin one device when several are connected
        appPackage: com.birch.shop         # the app Launch App opens
        appActivity: com.birch.shop.MainActivity
elements_sources:
  - appium_find_element: {enabled: true}   # XPath, accessibility id, class
  - appium_page_source:  {enabled: true}   # UI tree search (uses strict_element_match)
  - appium_screenshot:   {enabled: true}   # screenshots for OCR, images, self-heal
text_detection:
  - easyocr: {enabled: true}               # extra: easyocr
image_detection:
  - templatematch: {enabled: true}
log_level: INFO
file_log: true
json_log: true
```

Before `optics execute`, Optics checks that the Appium server answers and that `adb devices` lists a device.
::tab[iOS]
```yaml title="config.yaml"
driver_sources:
  - appium:
      enabled: true
      url: "http://127.0.0.1:4723"
      capabilities:
        platformName: iOS                  # picks the iOS profile
        automationName: XCUITest
        deviceName: "iPhone 15"
        bundleId: com.birch.shop           # required on iOS
        # udid: <device udid>              # for a real device
elements_sources:
  - appium_find_element: {enabled: true}
  - appium_page_source:  {enabled: true}
  - appium_screenshot:   {enabled: true}
log_level: INFO
file_log: true
```

`optics doctor` fails an iOS project without `bundleId`. The preflight checks only the Appium server.
::tab[Web]
Use Playwright unless you already run a Selenium Grid. It needs no server.

```yaml title="config.yaml (Playwright)"
driver_sources:
  - playwright:
      enabled: true                        # no url and no server
      capabilities:
        browser: chromium                  # currently ignored, see the note below
        headless: false                    # currently ignored
elements_sources:
  - playwright_find_element: {enabled: true}
  - playwright_page_source:  {enabled: true}
  - playwright_screenshot:   {enabled: true}
log_level: INFO
```

:::note
In 1.10.5 the Playwright driver ignores `browser`, `headless` and `viewport` under `capabilities`. It always opens a visible Chromium window at 1280×800, and waits up to 60 seconds for each page to load.
:::

Open your site with a module step such as `Launch App,https://birch.example`.

```yaml title="config.yaml (Selenium)"
driver_sources:
  - selenium:
      enabled: true
      url: "http://localhost:4444/wd/hub"  # the Selenium server or Grid
      capabilities:                        # must not be empty
        browserName: chrome                # required: chrome or firefox
        browserURL: "https://birch.example"  # opened when the session starts
elements_sources:
  - selenium_find_element: {enabled: true}
  - selenium_page_source:  {enabled: true}
  - selenium_screenshot:   {enabled: true}
log_level: INFO
```

Selenium won't start with empty `capabilities` or without `browserName`. The file `optics configure` writes for `web-selenium` has `capabilities: {}`, so add `browserName` before you run.
:::

### Appium capabilities

Optics reads only `platformName` and the app id; it passes every other capability to Appium unchanged. You can write any key with the `appium:` prefix, for example `appium:udid`.

| platformName | App id capability | Defaults Optics adds (your values win) |
|---|---|---|
| `Android` | `appPackage` and `appActivity` | `noReset`, `newCommandTimeout: 3600`, `forceAppLaunch`, `shouldTerminateApp`, `ignoreHiddenApiPolicyError` and a few others |
| `iOS` | `bundleId` | The same mobile defaults, without `ignoreHiddenApiPolicyError` |
| `TizenTV` | `appPackage` | `newCommandTimeout: 3600`, `rcMode: remote`, `noReset: true` |
| `LGTV` | `appId` | `newCommandTimeout: 600`, `rcMode: rc`, `useSecureWebsocket: true`, `autoExtendDevMode: false`, `noReset: true` |

Any other `platformName` fails with [E0104](/docs/reference/errors#e01-driver-and-session). To attach to an Appium session that's already running, add `appium:existingSessionId`. Optics starts a new session if it can't attach.

## TV

Android TV uses the Android example. Samsung and LG TVs use Appium's TV drivers:

```yaml title="config.yaml (Samsung Tizen)"
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

```yaml title="config.yaml (LG webOS)"
driver_sources:
  - appium:
      enabled: true
      url: "http://localhost:4723"
      capabilities:
        platformName: LGTV
        appium:automationName: webOS
        appium:deviceHost: 192.168.1.50
        appium:appId: com.birch.tv
elements_sources:
  - appium_screenshot: {enabled: true}
```

On Tizen and webOS, touch and typing keywords fail with [E0105](/docs/reference/errors#e01-driver-and-session). Move around with `Press Keycode` and remote keys: `UP`, `DOWN`, `LEFT`, `RIGHT`, `ENTER`, `BACK`, `HOME`, `PLAY`, `PAUSE`, `STOP`, `REWIND`, `FF`. See [Test TV apps](/docs/platforms/tv).

## BLE and camera

The `ble` driver taps and types through a Bluetooth mouse-and-keyboard dongle. A camera or frame server provides the screen, and Optics finds elements with OCR or image templates.

```yaml title="config.yaml"
driver_sources:
  - ble:
      enabled: true
      capabilities:
        device_id: "Birch test phone"     # required
        port: "/dev/ttyACM0"              # required: device path, COM port or USB product name
        pixel_width: 1080                 # the device screen in pixels
        pixel_height: 2336
        mickeys_width: 1080               # the device screen in mouse units
        mickeys_height: 2336
        x_invert: 1                       # 1 or -1
        y_invert: 1
elements_sources:
  - camera_screenshot:
      enabled: true
      capabilities:
        camera_index: 0                   # a webcam, or url: "192.168.1.20:9000" for a TCP frame server
text_detection:
  - easyocr: {enabled: true}
image_detection:
  - templatematch: {enabled: true}
```

| `ble` capability | Default | What it does |
|---|---|---|
| `device_id` | Required | A name for the device. |
| `port` | Required | The dongle's serial port (`/dev/ttyACM0`, `COM3`) or its USB product description. |
| `pixel_width`, `pixel_height` | `0` | The device screen size in pixels. Set them: taps can't be placed without them. |
| `mickeys_width`, `mickeys_height` | `0` | The device screen size in mouse movement units. Set them too. |
| `x_invert`, `y_invert` | `1` | `-1` reverses the direction of mouse movement on that axis. |

| `camera_screenshot` capability | Default | What it does |
|---|---|---|
| `camera_index` | None | The webcam number. Use this or `url`. |
| `url` | None | A TCP frame server as `host:port`. |
| `header_size` | `8` | Bytes in the frame server's length header: `4` or `8`. |
| `byte_order` | `little` | The length header's byte order: `little` or `big`. |

The BLE driver can't launch apps, so `Launch App` fails. Open the app by hand or with keys before the run. XPath and text locators don't work without a UI tree; use text that OCR can read, or image templates. See [Test production devices](/docs/platforms/production).

## include and exclude

Run a subset of test cases. There are no CLI flags for this.

```yaml
include:
  - Shopper can sign in
  - Shopper can add Trail Runner 2 to the cart
# or
exclude:
  - Shopper can check out
```

- Names match the `test_case` column exactly, ignoring case.
- Set one of the two. Setting both fails with [E0403](/docs/reference/errors#e04-keywords-and-parameters).
- Test cases with "setup" or "teardown" in their names always run.

## Logging

| Key | Default | What it does |
|---|---|---|
| `log_level` | `INFO` | The level for the console and the log files. Set `DEBUG` to see every strategy Optics tries. |
| `file_log` | `false` | Writes `internal_logs.log` and `execution_logs.log` to the output folder. Each rotates at 10 MB and keeps 10 old files. |
| `log_path` | None | Sends both logs to this one file. |
| `json_log` | `false` | Writes `logs.json`: a list of events with name, status, timings and log lines for each test case, module and keyword. |
| `json_path` | None | Writes the JSON events here instead. |
| `console` | `true` | No effect in 1.10.5. |

With `file_log: true` and no `execution_output_path`, Optics also writes a copy of both logs to `logs/` in the folder you ran `optics` from.

Values you write with the `@:` prefix, such as `@:s3cret`, are masked as `****` in log files. See [Read results](/docs/run/results).

## ai_self_heal

When an element can't be found, self-heal sends a screenshot to an LLM and lets it try up to five corrective steps, such as scrolling or closing a popup.

```yaml
ai_self_heal: true
llm_models:
  - gemini:
      enabled: true
```

- It needs an enabled `llm_models` entry, the `llm` extra, Gemini credentials, and a screenshot element source such as `appium_screenshot`. Without them it does nothing, and the run isn't affected.
- It applies to keywords that find and act on an element: `Press Element`, `Enter Text`, `Enter Number`, `Clear Element Text`, `Get Text`, `Swipe From Element`, `Scroll From Element`, `Detect And Press` and `Select Dropdown Option`. It doesn't apply to assertions.
- A healed step passes. Check the logs for `AI self-heal:` lines so a real regression doesn't go unnoticed.

`optics serve` and `optics mcp` ignore this key. They use per-session fields and the `OPTICS_AI_SELF_HEAL` variable instead. See [Self-heal](/docs/elements/self-heal).

## strict_element_match

```yaml
strict_element_match: true
```

By default the page-source element sources (`appium_page_source`, `selenium_page_source`, `playwright_page_source`) accept close or partial text matches, so `Sign in` can match `Sign in with email`. Set `strict_element_match: true` to accept only exact matches. Turn it on when similar labels make tests press the wrong element.

## save_captures

```yaml
save_captures: false
```

When `false`, `Capture Screenshot`, `Capture Pagesource` and `Get Screen Elements` stop writing files. Optics still saves the screenshot it takes before each action, the annotated screenshots and the page source logs. `optics serve` always turns captures off.

## Starter config

`optics init` writes a commented config.yaml with every engine disabled. To get started, enable one driver, enable its three element sources, and install the driver's extra with `optics setup --install <name>`. See [Install Optics](/docs/get-started/install).
