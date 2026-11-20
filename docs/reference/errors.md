---
title: Error codes
summary: Learn what each Optics error code means and how to fix it.
layout: wide
---

When a step or command fails, Optics usually attaches a code such as `E0201`. The code tells you which part of Optics failed. The reason says why in plain words, and most failures also give a hint with the next step. This page lists every code in Optics 1.11.5 and what to do about each one.

## How codes are built

A code is a letter followed by four digits.

| Part | Meaning |
|---|---|
| First letter | `E` is an error. `X` is an error after Optics tried every fallback or caught an exception. `W` is a warning. |
| First two digits | The family: `01` driver, `02` elements, `03` screenshots, `04` keywords, `05` files and config, `06` engines and modules, `07` test cases and variables, `08` general, `09` `optics live`. |
| Last two digits | The specific problem in that family. |

Codes in the `E02` family and `X0201` mean that Optics did not find the element. When a step uses an element with fallback values, only these codes make Optics try the next value. Any other code fails the step straight away.

## Where codes appear

| Where | What it looks like |
|---|---|
| `optics execute` and `optics dry_run` tree | A **Failures** panel after the totals. For each failed step it shows where the step is (`<test case> › <module> › <keyword>`), the reason, and the hint on the next line. The panel does not show the code. |
| `--output plain` | `FAIL keyword "Press Element" (10.0s): <reason> [E0201]`. The lines of the module and the test case show only ` [E0201]`. |
| `--output jsonl` and `logs.json` | A `message` field with the reason, a `code` field and the hint in `extra.hint`. |
| Log files (`file_log: true`) | The reason, as an error line in `execution_logs.log`. |
| `Cannot start` panel | A red panel titled `Cannot start: <code>`, such as `Cannot start: E0104`, with the reason and the next step. Optics shows it when a run cannot start. |
| `optics live` history | `✗ press_element ${sign_in}` with `[E0201] ...` on the line below |
| HTTP API (`optics serve`) | A `detail` object with `code`, a `message` with the reason, a `hint` and a `cause` field that holds the deeper cause. See [HTTP API](/docs/reference/http-api#errors). |
| JUnit report (`junit_output.xml`) | A `code` attribute on each `<failure>`, `<error>` and failed `<kw>`. The `message` attribute is the reason. The text of a `<failure>` adds the hint on the next line. See [Read results](/docs/run/results#read-the-junit-report). |
| MCP server (`optics mcp`) | `[E0201] not found: ...` in the tool reply, with a `Next:` line and the current screen rows. A miss with a known cause, such as an XPath that is not valid, says the cause in place of `not found`. See [MCP server](/docs/reference/mcp#errors). |

Optics says why a step failed once. When an error wraps another error, the reason joins the two and leaves out the parts that repeat. A step of a nested module names the modules in front of the reason: `Inner › Press Element: login_button is not on the screen. Looked for '//button[@id='login']'.`

The `cause` field of the HTTP API holds the innermost error of the chain, on one line of at most 300 characters. Optics leaves it out when the reason already contains it.

Not every failure has a code. See [Messages without a code](#messages-without-a-code).

## E01: Driver and session

| Code | What happened | What to do |
|---|---|---|
| `E0101` | **The driver is not ready.** A keyword ran before the driver session started. In `optics live` this happens when the automatic `launch_app` failed. | Start with `Launch App`. In `optics live`, run `launch_app` again and read its error first. |
| `E0102` | **Could not start the session.** The driver couldn't create a session. The Appium server refused it, Playwright couldn't open or connect to the browser, or the request took too long (`Timed out after <n> seconds`). When the Appium server refuses the session, the reason starts with `Appium could not start a session:`, followed by the first line of Appium's own text. When the Appium server has no driver for the `automationName`, the reason is `The Appium server at <url> has no driver for automationName '<name>'. Install the driver for that server. If it is installed, the server uses a different APPIUM_HOME, or another Appium server uses this port. Appium said: <text>`. On a desktop, Appium also refuses a session when `platformName` is not the OS of the Host. On Playwright, each call has a limit of `action_timeout_ms` (15 seconds). Launch App can take up to `connect_timeout_ms` + `navigation_timeout_ms` + `action_timeout_ms` (165 seconds). | Check that the server is running and the device is connected with `optics doctor <folder>`. Check the capabilities, especially `appPackage`, `appActivity` or `bundleId`. Read the Appium server's own log for the cause. For a missing driver, install it on the server that the `url` reaches. `optics doctor` shows the `APPIUM_HOME` that it read. On a desktop, set `platformName` to the OS of the Host: see [Desktop](/docs/platforms/desktop#capabilities). For a remote browser, check the `url` and `headers`. Raise the [Playwright timeouts](/docs/reference/config#playwright-capabilities) for slow pages. |
| `E0104` | **The driver configuration is incomplete.** A required driver setting is missing or wrong: empty Appium `capabilities`, no `platformName`, an unsupported `platformName`, or no server `url`. Also raised when `Press Keycode` gets a remote key name that a Samsung or LG TV does not know (`Unknown remote key '<name>' for <TV>. Known keys: ...`). The message lists the names that work. Also raised when `Get App Version` gets a name that is not an Android package name, such as `com.example.app`. Also raised when a desktop session has neither `app` nor `appName` (`A Mac session needs its app when it starts`). | Fill in the driver settings in [config.yaml](/docs/reference/config#examples-by-platform). `platformName` must be `Android`, `iOS`, `TizenTV`, `LGTV`, `Mac`, `Linux` or `Windows`. On a desktop, set `app` or `appName`: see [Desktop](/docs/platforms/desktop#write-config-yaml). For a TV key, use a name from [Move around with remote keys](/docs/platforms/tv#move-around-with-remote-keys). |
| `E0105` | **This keyword does not work on this platform.** You used a keyword on a Samsung or LG TV that needs a touch screen: a coordinate tap, a swipe, a scroll, `Select Dropdown Option`, the `checked` state of `Is Element`, typing without an element, or `Go Back`. Also raised by `Enter Text` with a special key that an app keyboard does not have, such as `<tab>`. Also raised by `Go Back` on a driver without it (`'go_back' is not supported by the <Driver> driver.`) and by a special key that Playwright cannot map. On a desktop, raised by `Go Back`, `Get App Version` and phone keys such as `<back>` (`'go_back' is not supported on Mac. Supported here: android, ios.`). On the BLE driver, raised by `Get App Version`, `Execute Script`, `Go Back` on iOS and the `power` and `camera` keys (`'<keyword>' is not supported by the BLEDriver driver.`). | On a desktop, press the app's key combination with `Press Keycode`: see [Keywords that differ on a desktop](/docs/platforms/desktop#keywords-that-differ-on-a-desktop). On a TV, move the focus with `Press Element`, or press a remote key with `Press Keycode`, such as `UP`, `DOWN`, `ENTER` or `BACK`. See [Test TV apps](/docs/platforms/tv#keywords-that-fail-on-tizen-and-webos). On the BLE driver, see [What works and what does not](/docs/platforms/production#what-works-and-what-does-not). |
| `E0106` | **The driver session ended.** The Appium or Selenium server dropped the session, for example after a timeout, a device disconnect or a server restart. A refused connection to the server in the middle of a run also counts. Optics doesn't reconnect. Also raised when Appium cannot go back to the app after it read a web page. In `optics execute`, a keyword with this error ends as `ERROR`, not `FAIL`, and its test case does the same. | Run the tests again. Over HTTP or MCP, end the session and start a new one. If it keeps happening, raise `newCommandTimeout` in the capabilities. |

## E02: Elements

| Code | What happened | What to do |
|---|---|---|
| `E0201` | **The element is not on the screen.** No strategy found the element on the current screen. The reason names the element and the values Optics looked for: `'Sign in' is not on the screen.` for a plain value, `login_button is not on the screen. Looked for '//button[@id='login']' and 'Sign in'.` for a `${name}` with fallback values, and `None of 'a' and 'b' is on the screen.` for several values without a name. An XPath that is not valid XPath 1.0 adds why: `'//button[@id='x'' is not on the screen, and it is not valid XPath 1.0: Invalid predicate`. Also raised when a `${name}` variable isn't defined (`${name} is not defined in the project's elements`), when an image value has no `image_detection` engine (`Cannot find <element>: No image detection engine is configured`), or when `Scroll Until Element Appears` or `Swipe Until Element Appears` time out (`'<element>' did not appear after swiping up for 5s.`), or when `index` is larger than the number of matches on Appium (`'<element>' matched N element(s); index i is out of range.`). On web pages it also means: `'<element>' is covered by another element on the page.`, `'<element>' is in the page but not displayed.`, `'<element>' matched N web element(s); index i is out of range.`, `Cannot read the web page shown by '<app>'` or `Cannot place the web element: its centre is outside the web view that shows the page.` When no OCR engine is enabled, the hint says `OCR is off, so text that shows only in images was not searched.` | Check the locator against the screen with `optics live` or the page source. Put `Assert Presence` before the step if the element appears late. Playwright actions wait up to `element_timeout_ms` (10 seconds), but other drivers do not wait. Add fallback values in `Element_ID_*` columns. Enable `easyocr` if you locate by visible text. |
| `X0201` | **The element was not found with any of its locators.** Optics found the element, but the action failed on it each time: `<element> is on the screen, but Press Element failed on it`. The element may be hidden, covered, disabled, or the wrong match. Also raised when each value of an element failed: `None of the <n> values of <name> worked: <reason>`. | Use `index` to pick the right match, an [area of interest](/docs/elements/area-of-interest) to narrow the search, or a more specific locator. Make sure that no other element covers it and that it is enabled. Turn on [AI self-heal](/docs/elements/self-heal) for popups that get in the way. |
| `E0202` | **The element source cannot do this.** The enabled element sources can't do what the keyword asked, usually listing interactive elements (`Could not list the elements on the screen`). | Enable `appium_page_source` or `playwright_page_source`. Selenium can't list interactive elements; use the page source instead. |
| `E0205` | **The element locator is not valid.** An area of interest is out of range, a `rule` isn't `any` or `all`, or an `id:` value has no id after the prefix (`'id:' names no id; write it as id:<id>.`). | Keep area values between 0 and 100, with `aoi_x + aoi_width` and `aoi_y + aoi_height` at most 100. Set `rule` to `any` or `all`. Write an id value as `id:<id>`. |
| `E0206` | **Unknown popup on screen.** A step did not find its element, and the screen shows a dialog that no popup rule covers: `A popup with no rule is on screen: '<text>'`. Optics presses nothing and saves a screenshot and the page source. Optics looks for popups only when the project has popup rules, and only on Appium. `E0206` is in the `E02` family, so Optics still tries the next fallback value. | Add a rule for this popup to `test_data/popup_rules.json`, or close it in a step before this step. See [Popups with no rule](/docs/advanced/popups#popups-with-no-rule). |

## E03: Screenshots

| Code | What happened | What to do |
|---|---|---|
| `E0303` | **The screenshot is empty or black.** Optics couldn't take a screenshot (`Could not take a screenshot`), got a black image (`The screenshot is black`), or has no screenshot source enabled. Also raised when `appium_screenshot` runs on a Samsung Tizen TV: `This TV cannot take a screenshot through Appium; use camera_screenshot`. | Enable the screenshot source for your driver, such as `appium_screenshot`. Check that the device screen is on and unlocked. Some apps block screenshots on secure screens. For a Tizen TV, use `camera_screenshot`. See [BLE and camera](/docs/reference/config#ble-and-camera). |
| `E0304` | **The image is too large or is not a valid image.** An image is not PNG, JPEG, GIF, BMP, WebP or TIFF, or it is larger than 64 MiB or 67,108,864 pixels. Examples are a template upload over HTTP and a camera frame. | Send a smaller image in one of these formats. For a camera, lower the resolution of the frame server. |
| `E0305` | **The camera does not see the device screen.** With `camera_screenshot`, the phone or the camera moved, the screen is off, or no screen was found in the camera frame. Optics saves the frame as `camera_blind_<time>.jpg`. Element keywords stop at once: no fallback value and no wait can help. | Put the phone back in its place, turn on its screen, and run again. For a screen with a black edge, show a bright screen when the run starts. See [BLE and camera](/docs/reference/config#ble-and-camera). |

## E04: Keywords and parameters

| Code | What happened | What to do |
|---|---|---|
| `E0401` | **The action failed.** The keyword ran but couldn't complete: an app didn't launch (`Could not open <app>: <reason>`), an element wasn't visible or enabled for `Is Element`, typing failed, a script failed, an API request failed, or a module run by `Run Loop`, `Condition` or `Execute Module` failed. A step inside a module names the modules first: `Inner › Press Element: <reason>`. A `Condition` whose target module fails also fails its step. Also raised when `Assert Text` finds other text (`Element '<element>' shows '<text>' but expected '<expected>'.`), when `Assert Equality` finds two different values (`Expected '<expected>', got '<actual>'.`), when `Is Element` finds the wrong state or finds the element only by OCR or image, when iOS `Go Back` finds no back button, or when a deep link does not open. In `optics live`, also shown for errors a keyword logged without failing. When the locator of `Assert Text` or `Is Element` matches more than one element, the message ends with `The locator matches <n> elements; only the first was checked.` | Read the reason; it names the cause. For nested modules, the reason of the inner step comes after the module names. For a locator with several matches, make it match one element, for example `(//p)[2]`. |
| `X0401` | **The action failed.** A keyword failed with an error that has no Optics code, such as `invalid literal for int() with base 10: 'abc'`. The JUnit report gives this code to the failed step. | Read the message of the `<failure>`. |
| `E0402` | **Keyword not found.** No keyword has that name: `'<name>' is not a keyword. Did you mean '<keyword>'?`. A test step that names neither a module nor a keyword gives `'<name>' is not a keyword or a module.` | Check the spelling with `optics list`. Case and spaces don't matter. For a test step, check the module name in modules.csv, including case. |
| `E0403` | **The keyword parameters are not valid.** A parameter has the wrong form: an expression that can't be evaluated (`Cannot evaluate the condition '<condition>': ...`), a comparison of text with a number, a bad loop count, a query that matches no data, an `Invoke API` id without a dot, an `Invoke API` response that is not JSON, a key name that Playwright does not know. Also raised for an unknown `${name}` inside a longer value (`Variable '${name}' in '<value>' is not defined.`), for a `store_as` with no name or no value to store, or when the page source can't be read. Also raised for a number out of range: `'repeat' must be a number from 1 to 100, got '<value>'`. Pixel coordinates and lengths go from 0 to 16,384, and percentages from 0 to 100. Also raised when a step does not give its keyword the parameters that it takes: `Press Element cannot take these params: missing a required argument: 'element'`. The other forms are `too many positional arguments` and `multiple values for argument '<name>'`. `optics dry_run` and `optics execute` give the same message. Over HTTP and MCP, also raised for too many positional parameters. | Read the reason. Run the `optics list <keyword>` command in the hint to see the parameters in column order. In `Condition`, write `${name}` without quotes: `${size} == '9'` or `${size} > 5`. Use `collection.api` for `Invoke API`. Write `store_as=<name>` only on a keyword that returns a value. See [Keywords](/docs/reference/keywords/). |
| `E0405` | **Action ran, but the screen does not show its result.** The action ran, but the check after it failed. On a Samsung or LG TV, `Enter Text` types on the on-screen keyboard and then reads the field. The error shows when the field does not show the text or typing stopped part way. It also shows when `Clear Element Text` leaves text in the field. On the BLE driver, `Launch App`, `Launch Other App` and `Force Terminate App` raise it when no launch method opened the app: `No launch method opened '<name>': tried <methods>. Set capabilities.launch to the methods that open apps on this device`. No fallback value runs the action again, because the action already ran. In `optics mcp`, this error has the kind `silent_failure`. | Look at the failure screenshot to see what the screen showed after the action. Check the field on the TV. Press the field with `Press Element` first when the screen has more than one field. Then run the step again. See [Type on a TV](/docs/platforms/tv#type-on-a-tv). For the BLE driver, set `capabilities.launch` to the methods that open apps on that device. See [Open apps](/docs/platforms/production#open-apps). |
| `E0406` | **Expression or filter refused: unsafe or too costly.** An `Evaluate`, `Condition` or `Read Data` expression uses something other than values, names, arithmetic, comparisons, `in`, `and`, `or` and `not`. Function calls are refused. In a `Read Data` filter, `&`, `\|` and `~` work as `and`, `or` and `not`. Also raised for an expression that is too large to compute, such as `2**10**10`. | Remove the function call, or compute the value in an earlier step. See [Flow control keywords](/docs/reference/keywords/flow). |
| `E0407` | **Popup keeps coming back.** A popup rule dismissed its popup more times than its `max_per_step` or `max_per_run` allows: `Popup '<rule>' came back too often (step <n>/<max>, run <n>/<max>)`. The step fails, and the run continues. | Find out why the popup comes back. Raise the limit of the rule only if the popup really shows that often. See [Limits](/docs/advanced/popups#limits). |
| `E0408` | **Popup stopped the step.** A popup rule matched, and the step cannot continue: the popup stayed after the action of the rule (`Popup '<rule>' is still on screen after '<action>'`), or the rule says to stop (`Popup '<rule>' ended the step; nothing was pressed`). A rule marked `sensitive`, or with `then: stop_run`, ends the run, and the test cases that did not start are skipped. | Check the action of the rule against the screenshots that Optics saved. If the popup must not stop the test, change `then` to `retry_step`. See [After the action](/docs/advanced/popups#after-the-action). |
| `E0409` | **Popup dismissed, the step looks for its element again.** A popup rule dismissed its popup, and the step tries again. Optics uses this code inside a step. You do not see it in a report. | Nothing. |

## E05: Files and config

| Code | What happened | What to do |
|---|---|---|
| `E0501` | **A required setting or file is missing.** A file, folder or setting Optics needs isn't there: the project folder doesn't exist, no driver or element source is enabled, a `Read Data` file or `ENV:` variable is missing, a CSV is empty, or config.yaml can't be parsed. Also raised when a project has no test cases file or no modules file (`Missing required files in <folder>: test_cases, modules`). Also raised for a Playwright setting that is not valid (`device`, `storage_state`, `protocol`, `context`), for an environment variable in `url` or `headers` that is not set, and when `optics serve` or `optics mcp` get `${NAME}`, a `storage_state` path or `Read Data` with `ENV:`. Also raised for a Chrome or Edge `profile` that matches none or more than one (`No browser profile '<name>'. Profiles: ...`). Also raised for `profile` and `user_data_dir` set together, for a `profile` over HTTP, `optics serve` or a remote `url`, and for `user_data_dir` in an API session. Also raised for a `credentials_path` file that is missing or is not a Google service account key. Also raised for a `$NAME` or `${NAME}` in config.yaml when the environment variable is not set or is empty (`The config uses ${NAME}, but the NAME environment variable is not set or is empty.`), and for a `./` path in config.yaml that does not exist. `optics serve` and `optics mcp` over HTTP also raise it for `project_path`, `credentials_path`, a `file:` URL and a `Read Data` file, and `optics serve` for `OPTICS_CORS_ORIGINS=*`. In `optics live`, also raised by `/save` with nothing recorded and by plain-English mode with no LLM engine enabled. | Check the path or setting in the message. Set the environment variable before the run. For a profile, pick one from the list in the message. See [Start signed in with a browser profile](/docs/platforms/web#start-signed-in-with-a-browser-profile). Run `optics doctor <folder>` to check config.yaml. Enable one driver and its element sources. |
| `E0503` | **A setting has a value that is not valid.** A config list or API file has the wrong shape, or a YAML file can't be parsed. Also raised for an empty `--include` or `--exclude` name. Also raised for an elements file with `Element_Name` but no `Element_ID` column, for example `Element_Name,Element_Locator`: `The elements file has Element_Name but no Element_ID column, so no element has a locator.` Also raised when two test cases have the same setup or teardown role: `The test cases have more than one test setup: '<first>' and '<second>'`. | Write each engine as a list item with a name: `- appium: {enabled: true, ...}`. Check YAML indentation. See [config.yaml](/docs/reference/config#engine-lists) and [API definitions](/docs/reference/files#api-definitions). For an elements file, use the header `Element_Name,Element_ID`. For two setups, keep one name that ends with "Setup" and rename the other. See [Setup and teardown](/docs/reference/files#setup-and-teardown). |

## E06: Modules and engines

| Code | What happened | What to do |
|---|---|---|
| `E0601` | **Module not found.** One of: an enabled engine name doesn't exist, or its extra isn't installed (for example `openai` without the `openai` extra), or an `openai` or `anthropic` engine has no `model` or key, or has a `timeout_s`, `response_format` or `platform` that is not valid, or its client cannot start; `Execute Module`, `Run Loop` or `Condition` names a module that doesn't exist; `Invoke API` names an unknown collection or API; or `--runner` has an unknown value. | Check the name in the message. Install the extra with `optics setup --install <name>`. Check module names against modules.csv, including case and spaces. |
| `E0603` | **Could not create an engine.** The name under an engine key matches a file inside Optics, but that file isn't an engine of that kind, for example a helper module's name. | Use one of the names listed for that key in [config.yaml](/docs/reference/config#engine-lists) or [Engines and extras](/docs/reference/engines). |

## E07: Test cases and variables

| Code | What happened | What to do |
|---|---|---|
| `E0701` | **The run failed.** A run or a session action failed and Optics wrapped the cause. Also raised when the run order can't be built. | Read the reason after `Execution failed:`. |
| `E0702` | **Test case not found.** No test cases were loaded, an HTTP session no longer exists, or a variable used in `Evaluate`, `Condition` or a `Read Data` query isn't defined. Also raised when an `include` or `exclude` name matches no test case, matches only setup or teardown test cases, or leaves no test case to run. In `optics live`, also raised when the session can't start or switch devices. | Check that your test cases file is found (see [Project files](/docs/reference/files#how-optics-finds-your-files)). Define the variable in elements.csv or create it in an earlier step. Fix the test case names that the message shows. |
| `E0706` | **Run stopped before the test case finished.** You pressed [[Ctrl]]+[[C]], or Optics received SIGTERM. The report gives this code to the test case and the keyword that were in progress. | Run the tests again. |

## E08: General

| Code | What happened | What to do |
|---|---|---|
| `E0801` | **Unexpected error.** The LLM request failed, the model refused it, the model returned a reply Optics couldn't read, the reply hit the output limit, or a keyword produced no result and no error. | Check your LLM key, model name and quota. If the message names `max_tokens`, raise `capabilities.max_tokens`. Retry the step. If it repeats, rerun with `log_level: DEBUG` and report it. |

## E09: optics live

| Code | What happened | What to do |
|---|---|---|
| `E0901` | **Named element not defined in this project.** You typed `${name}` in `optics live`, and no elements file defines it. | Add the name to elements.csv, or type the locator directly. Use `/elements` to see the names Optics found. |

## Reserved codes

These codes exist in Optics 1.11.5, but nothing raises them. If you see one, it came from a newer version or your own code.

| Code | Default message |
|---|---|
| `E0103` | Could not end the session |
| `W0104` | The driver configuration is incomplete |
| `W0203` | The element has an unexpected format |
| `E0204` | Timed out while looking for the element |
| `E0301` | Screenshots are off |
| `W0302` | Using the next camera driver |
| `W0404` | This keyword is deprecated |
| `X0502` | Could not read a file |
| `W0503` | A setting has a value that is not valid; it is ignored |
| `W0602` | No valid instance; it is ignored |
| `X0604` | Could not import a module |
| `E0703` | Could not resolve a parameter |
| `E0704` | The test case timed out |
| `W0705` | The test case was skipped |
| `E0802` | Unhandled error |

## Messages without a code

These common failures have no Optics code. The JUnit report and `--output plain` give a failed step of this kind the code `X0401`.

| Message | What happened | What to do |
|---|---|---|
| `API '<name>' returned status 200, expected 404.` | An `Invoke API` call got another HTTP status than `expected_status`. | Check the status in the API definition. See [Invoke API](/docs/reference/keywords/flow#invoke-api). |
| `invalid literal for int() with base 10: '2.5'` | A timeout or a count is not a whole number. | Use whole numbers. See [Troubleshooting](/docs/help/troubleshooting#invalid-literal-int). |
| `Cannot start` panel | The preflight couldn't reach the Appium or Selenium server, or found no Android device. Also shown for `include` or `exclude` names that are not valid. When the panel has a code, its title shows it, such as `Cannot start: E0104` for `No driver enabled in <folder>/config.yaml`. | Follow the command in the panel, for example start `appium`. Set `OPTICS_SKIP_PREFLIGHT=1` to skip the check. For test case names, see [Pick test cases](/docs/reference/cli#pick-test-cases). |
