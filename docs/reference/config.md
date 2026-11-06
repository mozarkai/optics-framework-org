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
| `nl_agent` | See [nl_agent](#nl-agent) | Settings for the plain-English mode of `optics live`. |
| `log_level` | `INFO` | `DEBUG`, `INFO`, `WARNING`, `ERROR` or `CRITICAL`, any case. Unknown values become `INFO`. |
| `file_log` | `false` | Writes `internal_logs.log` and `execution_logs.log` to the output folder. |
| `log_path` | None | One file for both logs instead of two. Used only with `file_log: true`. |
| `json_log` | `false` | Writes a JSON array of every test, module and keyword event to `logs.json` at the end of the run. |
| `json_path` | None | Where to write the JSON events instead of `<output>/logs.json`. `~` is expanded. |
| `console` | `true` | **Has no effect.** Nothing reads it. Use `log_level` to control console output. |
| `execution_output_path` | `<project>/execution_output` | Where results, screenshots and logs go. A path that starts with `./` or `../` is relative to the project folder. Other relative paths are relative to the folder you run `optics` from. |
| `include` | None | Run only these test cases. See [include and exclude](#include-and-exclude). |
| `exclude` | None | Skip these test cases. |
| `ai_self_heal` | `false` | Lets an LLM try to recover when an element can't be found. See [ai_self_heal](#ai-self-heal). |
| `strict_element_match` | `false` | Turns off fuzzy and partial text matching. See [strict_element_match](#strict-element-match). |
| `save_captures` | `true` | Whether Optics writes screenshots of steps and captures. See [save_captures](#save-captures). |
| `halt_duration` | `0.1` | Seconds to wait after a keyword fails every fallback. It isn't a pause between steps. |
| `event_attributes_json` | None | Path to a JSON file of event attributes. When it includes an `eventUrl`, events you label with `event_name` are sent there at the end of the session. |
| `project_path` | The project folder | The CLI always sets this to the folder you pass, so leave it out. It only matters for the Python SDK. |

:::note
If you set `execution_output_path` yourself, create the folder first. This applies to a `./` path too. JUnit results and logs create their own folders, but screenshots fail to save without a warning if the folder is missing.
:::

## Use environment variables and project paths

Any text value in config.yaml can name an environment variable or a file in the project. Use this to keep secrets out of the file, and to keep a project runnable after you copy it to another computer. Optics resolves each reference when it reads the file.

| Write | Optics uses |
|---|---|
| `$NAME` or `${NAME}` | The value of `NAME`. If `NAME` is not set or is empty, the command stops with [E0501](/docs/reference/errors#e05-files-and-config). |
| `${NAME:-default}` | The value of `NAME`, or `default` when `NAME` is not set or is empty. |
| `$$` | A literal `$`. |
| `./file` or `../file` | The full path of the file, counted from the project folder and not from the folder you run `optics` in. |

```yaml title="config.yaml"
driver_sources:
  - playwright:
      enabled: true
      capabilities:
        $from: $PW_CAPS
        viewport: {width: 800, height: 600}
        storage_state: ./auth.json
execution_output_path: ./out/run2
log_level: ${LEVEL:-INFO}
```

- A reference can be part of a longer string, for example `https://${HUB_HOST}/wd/hub`.
- A variable can hold a `./` path. Optics resolves it in the same way.
- A `./` path must point to a file or folder that exists. The output paths `execution_output_path`, `log_path`, `json_path` and `project_path` do not need to exist.
- The result is always a string. Optics converts it for its own settings, such as `enabled`, `file_log` and `halt_duration`. A driver capability that needs a number or a boolean gets the text. For example, `headless: ${HEADLESS:-true}` fails on Playwright with `headless: expected boolean, got string`. Use `$from` for such values.

To take a whole map from one variable, write `$from` in the map and set the variable to a JSON object. The keys next to `$from` replace the keys of the object. Optics does not resolve references or paths inside the object, and the JSON types stay as they are:

```shell
$ export PW_CAPS='{"browser": "chromium", "headless": true, "viewport": {"width": 100, "height": 100}}'
```

With this variable, the example above starts Chromium without a window and with an 800 x 600 page.

If a reference or path fails, the command stops before the first test and names the problem. These are the messages that `optics execute` and `optics doctor` show:

```terminal
The config uses $LEVEL, but the LEVEL environment variable is not set or is empty.
The config refers to ./missing.json, but /home/ava/birch-tests/missing.json does not exist.
The config takes $from: $PW_CAPS, but its value is not a JSON object.
```

The last message does not show the value of the variable.

:::note
The commands `optics execute`, `optics dry_run`, `optics live` and `optics doctor` resolve references. The Python SDK, `optics serve` and `optics mcp` take the settings as data and resolve nothing. `optics configure --edit` keeps references as you wrote them when it saves the file.
:::

A Playwright `url` and `capabilities.headers` are the exception. The driver resolves them when it connects, so it can mask the values in its errors. An unset variable in them still stops the command when it reads the file. Do not use `$from` in `headers`. Write each header on its own line.

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
| `playwright` | `playwright` | Chromium, Firefox or WebKit, on this computer or a remote browser. See [Playwright capabilities](#playwright-capabilities). |
| `ble` | `ble` | Any device paired with a Bluetooth mouse-and-keyboard dongle. For devices with no automation access. |

### elements_sources

Enable the sources that match your driver. We recommend the locator, page source and screenshot sources for your driver. With Appium, add `appium_web` to find elements in web pages.

| Name | Needs driver | What it gives you |
|---|---|---|
| `appium_find_element` | `appium` | Finds elements by XPath, accessibility id and class. |
| `appium_page_source` | `appium` | Searches the UI tree by XPath and text, with fuzzy matching. Lists interactive elements. |
| `appium_screenshot` | `appium` | Screenshots for OCR, image matching and AI self-heal. |
| `appium_web` | `appium` | Finds `css=` and DOM XPath locators in Chrome and WebViews on Android, and in Safari and WebViews on iOS. Lists the page's interactive elements. It does not tap an element that another element covers. See [Test mobile websites](/docs/platforms/mobile-web). |
| `selenium_find_element` | `selenium` | Finds elements by XPath, text, id, name, CSS and link text. |
| `selenium_page_source` | `selenium` | Searches the page HTML. Doesn't list interactive elements. |
| `selenium_screenshot` | `selenium` | Screenshots for OCR and image matching. |
| `playwright_find_element` | `playwright` | Finds elements by `xpath=`, `css=`, `text=`, `label=`, `placeholder=`, `role=`, `id=`, `data-testid=`, `data-test=` and `data-test-id=` locators. A value with no prefix is tried as text, label, placeholder, button name and link name. |
| `playwright_page_source` | `playwright` | Searches the page and lists interactive elements. |
| `playwright_screenshot` | `playwright` | Screenshots for OCR and image matching. |
| `camera_screenshot` | Any | Frames from a webcam, an HTTP(S) screenshot URL or a TCP frame server. Used with `ble`. |

`optics doctor` fails a project when no enabled element source starts with the enabled driver's name.

### text_detection

| Name | Extra | Settings |
|---|---|---|
| `easyocr` | `easyocr` | None. Accurate but slow on CPU. Downloads its models on first use. The language is always English. |
| `pytesseract` | `pytesseract` | None. Needs the Tesseract program installed and on your PATH. |
| `google_vision` | `google-vision` | `capabilities.credentials_path`: a service account key file. Without it, Optics uses Application Default Credentials, such as `GOOGLE_APPLICATION_CREDENTIALS`. `googlevision` also works. |
| `remote_ocr` | None | `url` (required): your OCR service. `capabilities`: `timeout` (30), `method` (`easyocr`), `language` (`en`). Optics posts screenshots to `<url>/detect-text`. |

### image_detection

| Name | Extra | Settings |
|---|---|---|
| `templatematch` | None | `capabilities.sift_nfeatures` (2000). Finds template images, including scaled or rotated ones. Images are found by file name anywhere in the project. |
| `remote_oir` | None | `url` (required): your image service. `capabilities`: `timeout` (30), `method` (`template_matching`). Optics posts to `<url>/detect-image`. |

### llm_models

Optics supports three LLM engines: `gemini`, `openai` and `anthropic`. Each has an extra of the same name, and the `llm` bundle installs all three. Use environment variables for keys, not `config.yaml`. If you enable more than one entry, Optics tries them in list order and moves to the next when a call fails.

Each engine also takes `timeout_s` under `capabilities`: the seconds that one request can take, default `60`. A value that is not a positive number fails with [E0601](/docs/reference/errors#e06-modules-and-engines).

#### gemini

| Setting | Default | What it does |
|---|---|---|
| `model` | `gemini-2.5-flash` | The Gemini model. |
| `use_vertexai` | From `GOOGLE_GENAI_USE_VERTEXAI` | `true` uses Vertex AI instead of the Gemini API. |
| `project`, `location` | From `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` | The Vertex AI project and region. |
| `temperature` | The model's default | Sampling temperature. |
| `credentials_path` | None | A Vertex AI service account key file. It selects Vertex AI and sets the project to the `project_id` of the key. |

```yaml
llm_models:
  - gemini:
      enabled: true
      capabilities:
        model: gemini-2.5-flash
```

Gemini reads its key from `GEMINI_API_KEY` or `GOOGLE_API_KEY`. For Vertex AI, set `GOOGLE_GENAI_USE_VERTEXAI=true` with `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` and `GOOGLE_APPLICATION_CREDENTIALS`. Optics accepts `api_key` or `gemini_api_key` in `capabilities` too, but warns when you use it.

To use a service account key file, set `credentials_path` and leave out the API key:

```yaml
llm_models:
  - gemini:
      enabled: true
      capabilities:
        credentials_path: ./credentials/vertex.json
        location: us-east4
```

`credentials_path` selects Vertex AI. The project is the `project_id` of the key, unless you set `project`. The location is `global`, unless you set `location`. If the file is missing or is not a service account key, Optics stops with E0501. This happens before the first test when `ai_self_heal` is `true`.

#### openai

Works with OpenAI and any server that offers an OpenAI-compatible Chat Completions API. Set the entry's `url` to the server's base URL, or leave it out to call OpenAI. `OPENAI_BASE_URL` works in place of `url`.

| Setting | Default | What it does |
|---|---|---|
| `model` | None (required) | The model name as the server spells it, for example `gpt-5-mini`, or `anthropic/claude-sonnet-5-5` on OpenRouter. |
| `api_key_env` | `OPENAI_API_KEY` | The environment variable that holds the key. |
| `response_format` | `json_schema` | Set `json_object` if the server rejects JSON-schema output. Optics then puts the schema in the prompt instead. |
| `max_tokens` | The server's limit | The longest reply the model may write. |
| `temperature` | The model's default | Sampling temperature. |

| Server | `url` | Key |
|---|---|---|
| OpenAI | Leave it out | `OPENAI_API_KEY` |
| OpenRouter | `https://openrouter.ai/api/v1` | `OPENROUTER_API_KEY`, with `api_key_env: OPENROUTER_API_KEY` |
| Azure OpenAI | `https://<resource>.openai.azure.com/openai/v1/` | Your Azure key, in the variable named by `api_key_env` |
| Ollama | `http://localhost:11434/v1` | None |
| vLLM, LM Studio | The server's `/v1` URL | None |

```yaml
llm_models:
  - openai:
      enabled: true
      url: https://openrouter.ai/api/v1
      capabilities:
        model: anthropic/claude-sonnet-5-5
        api_key_env: OPENROUTER_API_KEY
```

#### anthropic

Use Claude through the Claude API, Amazon Bedrock or Google Vertex AI. For Bedrock or Vertex AI, also install `anthropic[bedrock]` or `anthropic[vertex]` into the same Python environment as Optics.

| Setting | Default | What it does |
|---|---|---|
| `model` | None (required) | The model ID, for example `claude-sonnet-5-5`. Bedrock and Vertex AI use their own model IDs. |
| `platform` | `anthropic` | `anthropic` (the Claude API), `bedrock` or `vertex`. |
| `region` | From the environment | The Bedrock or Vertex AI region. |
| `project` | From the environment | The Vertex AI project. |
| `api_key_env` | `ANTHROPIC_API_KEY` | The environment variable that holds the Claude API key. Only for `platform: anthropic`. |
| `max_tokens` | `4096` | The longest reply the model may write. |
| `temperature` | The model's default | Sampling temperature. |

| Platform | Credentials |
|---|---|
| `anthropic` | `ANTHROPIC_API_KEY`, or the variable `api_key_env` names |
| `bedrock` | Your usual AWS credentials, such as `AWS_PROFILE` and `AWS_REGION` |
| `vertex` | Google Cloud application default credentials |

The entry's `url`, if you set it, replaces the API address on all three platforms.

### nl_agent

Settings for the plain-English mode of `optics live`. They apply only when an `llm_models` entry is enabled.

```yaml
nl_agent:
  vision: auto
  max_steps: 15
  escalation_model: ""
```

| Setting | Default | What it does |
|---|---|---|
| `vision` | `auto` | When Optics sends a screenshot with the screen elements. `auto` sends one when the element list is not sufficient, for example after a failed step. `always` and `never` do what they say. |
| `max_steps` | `15` | The maximum number of steps for one instruction. It must be 1 or more. |
| `escalation_model` | `""` | A stronger model for difficult steps, such as a retry after a failure. It uses the engine of the first enabled `llm_models` entry. Empty uses the same model for all steps. |

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

Before `optics execute`, Optics checks that the Appium server answers. If the server is on this computer, it also checks that `adb devices` lists a device.
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
        browser: chromium                  # or firefox, webkit
        headless: false                    # true: no window
elements_sources:
  - playwright_find_element: {enabled: true}
  - playwright_page_source:  {enabled: true}
  - playwright_screenshot:   {enabled: true}
log_level: INFO
```

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

Chrome starts with `--disable-blink-features=AutomationControlled` and without the automation switch, so `navigator.webdriver` is `false`. Optics adds no other Chrome argument. In a Linux container or in CI, pass `--no-sandbox` and `--disable-dev-shm-usage` in `goog:chromeOptions`:

```yaml title="config.yaml (Selenium in a container)"
driver_sources:
  - selenium:
      enabled: true
      url: "http://localhost:4444/wd/hub"
      capabilities:
        browserName: chrome
        goog:chromeOptions:
          args: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage"]
```

Optics sends these arguments with its own. It sends the other keys of `goog:chromeOptions`, such as `excludeSwitches`, to the browser as well.
:::

### Appium capabilities

Optics reads `platformName`, the app id and `browserName`. It passes every other capability to Appium unchanged. You can write any key with the `appium:` prefix, for example `appium:udid`.

| platformName | App id capability | Defaults Optics adds (your values win) |
|---|---|---|
| `Android` | `appPackage` and `appActivity` | `newCommandTimeout: 3600`, `noReset: true`, `forceAppLaunch: true`, `shouldTerminateApp: true`, `nativeWebScreenshot: true`, `connectHardwareKeyboard: true`, `ignoreHiddenApiPolicyError: true` and `settings: {waitForIdleTimeout: 1000}` |
| `iOS` | `bundleId` | The same defaults without `ignoreHiddenApiPolicyError`, with `ensureWebviewsHavePages: true` and `settings: {waitForIdleTimeout: 1}` |
| `TizenTV` | `appPackage` | `newCommandTimeout: 3600`, `rcMode: remote`, `noReset: true` |
| `LGTV` | `appId` | `newCommandTimeout: 600`, `rcMode: rc`, `useSecureWebsocket: true`, `autoExtendDevMode: false`, `noReset: true` |

Any other `platformName` fails with [E0104](/docs/reference/errors#e01-driver-and-session). Optics waits up to 300 seconds for Appium to create a session. To attach to an Appium session that is already running, add `appium:existingSessionId`. Optics starts a new session if it cannot attach.

**Idle wait.** Before each action, Appium waits until the app is idle. `waitForIdleTimeout` sets the limit: 1000 ms on Android and 1 s on iOS. Optics merges your `appium:settings` with its defaults key by key. Set `0` to turn off the wait:

```yaml
capabilities:
  appium:settings:
    waitForIdleTimeout: 0
```

**Web pages.** These defaults let `appium_web` read web pages quickly:

| platformName | Defaults |
|---|---|
| `Android` | `ensureWebviewsHavePages: false`, `extractChromeAndroidPackageFromContextName: true` |
| `iOS` | `includeSafariInWebviews: true`, `additionalWebviewBundleIds: ["*"]`, `webviewConnectRetries: 1`, `webviewAtomWaitTimeout: 5000` |

The iOS defaults apply only to app sessions. With `browserName` or `autoWebview`, the session starts in the browser and Optics leaves them out. See [Test mobile websites](/docs/platforms/mobile-web).

### Playwright capabilities

Optics reads each key from `capabilities` or from the top level of the `playwright` entry. [Web](/docs/platforms/web) shows how to use them.

| Capability | Default | What it does |
|---|---|---|
| `browser` | `chromium` | `chromium`, `firefox` or `webkit`. `optics setup` downloads only Chromium. |
| `headless` | `false` | `true` starts the browser without a window. A remote browser ignores it. |
| `channel` | None | `chrome`, `chrome-beta` or `msedge`. Starts that installed browser in place of Playwright's Chromium. A remote browser ignores it. |
| `profile` | None | A local Chrome or Edge profile: its directory (`Default`, `Profile 1`), its name or its account email. The run starts with a copy of its sign-ins. Not with `url`, `storage_state` or `user_data_dir`. See [Start signed in with a browser profile](/docs/platforms/web#start-signed-in-with-a-browser-profile). |
| `user_data_dir` | None | A folder that the browser keeps as its user data directory. Sign-ins stay from run to run. Not with `url`, `storage_state` or `profile`. A path that starts with `./` must exist. |
| `viewport` | `{width: 1280, height: 800}` | The page size. It replaces the screen size of a `device`. |
| `device` | None | A Playwright device name, such as `"iPhone 15"`. It sets the screen size, user agent and touch input. An unknown name fails with [E0501](/docs/reference/errors#e05-files-and-config). See [Emulate a phone](/docs/platforms/web#emulate-a-phone). |
| `storage_state` | None | A browser state file that Playwright saved, relative to the project folder. The run starts with its cookies and storage. Not with `profile` or `user_data_dir`. See [Start signed in from a saved file](/docs/platforms/web#start-signed-in-from-a-saved-file). |
| `protocol` | `cdp` | How Optics connects to the browser in `url`: `cdp` (Chromium only) or `playwright`. See [Use a remote browser](/docs/platforms/web#use-a-remote-browser). |
| `headers` | None | HTTP headers for the connection to a remote browser, as `{name: value}`. |
| `context` | `new` | `existing` uses the remote browser's own context and open tab. You cannot use it with `device` or `storage_state`. |
| `element_timeout_ms` | `10000` | The wait for an element before an action. |
| `navigation_timeout_ms` | `60000` | The limit for a page load from Launch App or Go Back. |
| `navigation_wait_until` | `domcontentloaded` | The load event that a page load waits for: `domcontentloaded`, `load`, `networkidle` or `commit`. |
| `settle_timeout_ms` | `3000` | The wait for the page to stop changes before Optics reads it. `0` turns it off. |
| `connect_timeout_ms` | `90000` | The limit for the connection to a remote browser. |
| `action_timeout_ms` | `15000` | The limit for each other browser call, such as a key press or a screenshot. |

Optics ignores a capability that it does not know and logs a warning. Local Chromium starts without the automation flags, so `navigator.webdriver` is `false`.

Set `url` on the entry to connect to a remote browser instead of starting one. `${NAME}` in `url` or in a `headers` value is read from the environment. If the variable is not set, the run stops with E0501. Sessions that `optics serve` and `optics mcp` start refuse `${NAME}` in `url` and `headers`, a `storage_state` file path and `user_data_dir`. They accept `profile` only from `optics mcp` on stdio.

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
  - appium_find_element: {enabled: true}
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
  - appium_find_element: {enabled: true}
  - appium_screenshot: {enabled: true}
```

On Tizen and webOS, `appium_find_element` finds `text=` and `css=` locators in the app's DOM, and the element keywords press remote keys to move the focus. Touch keywords fail with [E0105](/docs/reference/errors#e01-driver-and-session). A Tizen TV needs `camera_screenshot` in place of `appium_screenshot`. See [Test TV apps](/docs/platforms/tv).

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
        camera_index: 0                   # a webcam, or url: for a screenshot URL or a TCP frame server
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
| `url` | None | An `http://` or `https://` URL that Optics fetches with `GET`, or a TCP frame server as `ip:port`. |
| `token` | None | HTTP only. Optics sends it as `Authorization: Bearer <token>`. Optics masks it in logs. |
| `header_size` | `8` | TCP only. Bytes in the frame server's length header: `4` or `8`. |
| `byte_order` | `little` | TCP only. The length header's byte order: `little` or `big`. |

With an HTTP URL, Optics decodes the body as an image. Any status other than 200 fails with the status and the `code` and `message` of the server's JSON reply. Optics does not follow redirects, because a redirect will send the token again.

If you set neither `url` nor `camera_index`, Optics reads these environment variables. A value in config.yaml wins over a variable.

| Variable | Used for |
|---|---|
| `WEBCAM_SCREENSHOT_URL` | The screenshot URL. |
| `WEBCAM_SCREENSHOT_TOKEN` | The bearer token. Optics also uses it when you set `url` and no `token`. |
| `WEBCAM_SCREENSHOT_TCP_PORT` | A TCP frame server at `127.0.0.1` on this port. Optics uses it when `WEBCAM_SCREENSHOT_URL` is not set. |

Keep the token out of the file: `token: ${CAMERA_TOKEN}`.

The BLE driver can't launch apps, so `Launch App` fails. Open the app by hand or with keys before the run. XPath and text locators don't work without a UI tree; use text that OCR can read, or image templates. See [Test production devices](/docs/platforms/production).

## include and exclude

Run a subset of test cases. The [`--include` and `--exclude` flags](/docs/reference/cli#pick-test-cases) do the same for one run and replace these keys.

```yaml
include:
  - Shopper can*
exclude:
  - Shopper can check out
```

- A name must match the full `test_case` name. Matching ignores case and extra spaces. `*` and `?` are wildcards.
- You can set both. Optics applies `include` first, then removes the `exclude` matches.
- Each name must match a test case. A name that matches nothing stops the run before it starts, with a suggestion for the name.
- Suite Setup, Suite Teardown and the per-test setup and teardown always run. See [Setup and teardown](/docs/reference/files#setup-and-teardown).

## Logging

| Key | Default | What it does |
|---|---|---|
| `log_level` | `INFO` | The level for the console and the log files. Set `DEBUG` to see every strategy Optics tries. |
| `file_log` | `false` | Writes `internal_logs.log` and `execution_logs.log` to the output folder. Each rotates at 10 MB and keeps 10 old files. |
| `log_path` | None | Sends both logs to this one file. |
| `json_log` | `false` | Writes `logs.json`: a list of events with name, status, timings and log lines for each test case, module and keyword. |
| `json_path` | None | Writes the JSON events here instead. |
| `console` | `true` | No effect. |

With `file_log: true` and no `execution_output_path`, Optics also writes a copy of both logs to `logs/` in the folder you ran `optics` from.

Optics masks secrets as `****` in the console, the log files, the result tree and the Failure details:

- Values you write with the `@:` prefix, such as `@:s3cret`.
- Values that `store_as` or `Read Data` saves under a secret name. A name is secret if it contains one of these words: `pass`, `password`, `passwd`, `passcode`, `pwd`, `pin`, `otp`, `secret`, `token`, `key`, `apikey`, `auth`, `authorization`, `bearer` or `credential`. `password1` and `myAPIToken` are secret names. Optics masks only values of 4 or more characters.
- Text values in config.yaml under a secret name, such as `appium:keystorePassword`. Also the values of environment variables with a secret name, such as `HUB_TOKEN`. A key that ends in `_env`, such as `api_key_env`, holds the name of a variable and is not a secret.
- Passwords in URLs (`https://user:****@host`) and query parameters with a secret name (`?token=****`).

Optics also masks secret-named capability values in the debug logs of Appium and Selenium sessions.

See [Read results](/docs/run/results).

## ai_self_heal

When an element can't be found, self-heal sends a screenshot to an LLM and lets it try up to five corrective steps, such as scrolling or closing a popup.

```yaml
ai_self_heal: true
llm_models:
  - gemini:
      enabled: true
```

- It needs an enabled `llm_models` entry, that engine's extra and key, and a screenshot element source such as `appium_screenshot`. Without them it does nothing, and the run isn't affected.
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

When `false`, Optics does not write:

- the files from `Capture Screenshot`, `Capture Pagesource` and `Get Screen Elements`,
- the screenshot before each action, the detection screenshots and the area-of-interest screenshots,
- `failed_steps_elements.json`.

Optics still writes the page source logs and the end-of-run screenshot. `optics serve` always turns captures off.

## Starter config

`optics init` writes a commented config.yaml with every engine disabled. To get started, enable one driver, enable its three element sources, and install the driver's extra with `optics setup --install <name>`. See [Install Optics](/docs/get-started/install).
