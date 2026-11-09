# Error codes

> Learn what each Optics error code means and how to fix it.

When a step or command fails, Optics usually attaches a code such as `E0201`. The code tells you which part of Optics failed, and the message after it says why. This page lists every code in Optics 1.11.3 and what to do about each one.

## How codes are built

A code is a letter followed by four digits.

| Part | Meaning |
|---|---|
| First letter | `E` is an error. `X` is an error after Optics tried every fallback or caught an exception. `W` is a warning. |
| First two digits | The family: `01` driver, `02` elements, `03` screenshots, `04` keywords, `05` files and config, `06` engines and modules, `07` test cases and variables, `08` general, `09` `optics live`. |
| Last two digits | The specific problem in that family. |

Codes in the `E02` family and `X0201` mean "element not found". When a step uses an element with fallback values, only these codes make Optics try the next value. Any other code fails the step straight away.

## Where codes appear

| Where | What it looks like |
|---|---|
| `optics execute` "Failure details" box | `<test> → step '<step>' — Keyword '<keyword>' failed: E0401: <message>`, with ` (cause: <cause>)` at the end when there is a deeper cause |
| Log files (`file_log: true`) | The same reason as the Failure details box, as an error line in `execution_logs.log`. A deeper cause follows as ` caused by: <cause>`. |
| Error panels | A red panel with the code as its title. A deeper cause shows on a `Caused by:` line. |
| `optics live` history | `✗ press_element ${sign_in}` with `[E0201] ...` on the line below |
| HTTP API (`optics serve`) | A `code` field in the error body, or the code inside a `detail` string. A `cause` field holds the deeper cause. See [HTTP API](https://optics-framework.org/docs/reference/http-api#errors). |
| JUnit report (`junit_output.xml`) | A `code` attribute on each `<failure>`, `<error>` and failed `<kw>`. See [Read results](https://optics-framework.org/docs/run/results#read-the-junit-report). |
| MCP server (`optics mcp`) | `[E0201] not found: ...` in the tool reply, with a `Next:` line and the current screen rows. See [MCP server](https://optics-framework.org/docs/reference/mcp#errors). |

The cause is the innermost error of the chain, on one line of at most 300 characters. Optics leaves it out when the message already contains it.

Not every failure has a code. See [Messages without a code](#messages-without-a-code).

## E01: Driver and session

| Code | What happened | What to do |
|---|---|---|
| `E0101` | **Driver not initialized.** A keyword ran before the driver session started. In `optics live` this happens when the automatic `launch_app` failed. | Start with `Launch App`. In `optics live`, run `launch_app` again and read its error first. |
| `E0102` | **Failed to start session.** The driver couldn't create a session. The Appium server refused it, Playwright couldn't open or connect to the browser, or the request took too long. On Playwright, each call has a limit of `action_timeout_ms` (15 seconds). Launch App can take up to `connect_timeout_ms` + `navigation_timeout_ms` + `action_timeout_ms` (165 seconds). | Check that the server is running and the device is connected with `optics doctor <folder>`. Check the capabilities, especially `appPackage`, `appActivity` or `bundleId`. Read the Appium server's own log for the cause. For a remote browser, check the `url` and `headers`. Raise the [Playwright timeouts](https://optics-framework.org/docs/reference/config#playwright-capabilities) for slow pages. |
| `E0104` | **Driver config incomplete.** A required driver setting is missing or wrong: empty Appium `capabilities`, no `platformName`, an unsupported `platformName`, or no server `url`. Also raised when `Press Keycode` gets a remote key name that a Samsung or LG TV does not know (`Unknown remote key '<name>' for <TV>. Known keys: ...`). The message lists the names that work. Also raised when `Get App Version` gets a name that is not an Android package name, such as `com.example.app`. | Fill in the driver settings in [config.yaml](https://optics-framework.org/docs/reference/config#examples-by-platform). `platformName` must be `Android`, `iOS`, `TizenTV` or `LGTV`. For a TV key, use a name from [Move around with remote keys](https://optics-framework.org/docs/platforms/tv#move-around-with-remote-keys). |
| `E0105` | **Keyword not supported on this device platform.** You used a keyword on a Samsung or LG TV that needs a touch screen: a coordinate tap, a swipe, a scroll, `Select Dropdown Option`, the `checked` state of `Is Element`, typing without an element, or `Go Back`. Also raised by `Enter Text` with a special key that an app keyboard does not have, such as `<tab>`. Also raised by `Go Back` on a driver without it (`'go_back' is not supported by the <Driver> driver.`) and by a special key that Playwright cannot map. | Move the focus with `Press Element`, or press a remote key with `Press Keycode`, such as `UP`, `DOWN`, `ENTER` or `BACK`. See [Test TV apps](https://optics-framework.org/docs/platforms/tv#keywords-that-fail-on-tizen-and-webos). |
| `E0106` | **Driver session is no longer active.** The Appium or Selenium server dropped the session, for example after a timeout, a device disconnect or a server restart. A refused connection to the server in the middle of a run also counts. Optics doesn't reconnect. Also raised when Appium cannot go back to the app after it read a web page. In `optics execute`, a keyword with this error ends as `ERROR`, not `FAIL`, and its test case does the same. | Run the tests again. Over HTTP or MCP, end the session and start a new one. If it keeps happening, raise `newCommandTimeout` in the capabilities. |

## E02: Elements

| Code | What happened | What to do |
|---|---|---|
| `E0201` | **Element not found.** No strategy found the element on the current screen. Also raised when a `${name}` variable isn't defined, when OCR is needed but no `text_detection` engine is enabled, or when `Scroll Until Element Appears` or `Swipe Until Element Appears` time out. On web pages it also means: `'<element>' is covered by another element on the page.`, `'<element>' is in the page but not displayed.`, `'<element>' matched N web element(s); index i is out of range.`, `Cannot read the web page shown by '<app>'` or `Cannot place the web element: its centre is outside the web view that shows the page.` | Check the locator against the screen with `optics live` or the page source. Put `Assert Presence` before the step if the element appears late. Playwright actions wait up to `element_timeout_ms` (10 seconds), but other drivers do not wait. Add fallback values in `Element_ID_*` columns. Enable `easyocr` if you locate by visible text. |
| `X0201` | **Element not found after all fallbacks.** Optics found the element, or tried every fallback value, but the action failed each time. The element may be hidden, covered, disabled, or the wrong match. | Use `index` to pick the right match, an [area of interest](https://optics-framework.org/docs/elements/area-of-interest) to narrow the search, or a more specific locator. Turn on [AI self-heal](https://optics-framework.org/docs/elements/self-heal) for popups that get in the way. |
| `E0202` | **Unsupported operation for element source.** The enabled element sources can't do what the keyword asked, usually listing interactive elements. | Enable `appium_page_source` or `playwright_page_source`. Selenium can't list interactive elements; use the page source instead. |
| `E0205` | **Invalid element type.** An area of interest is out of range, or a `rule` isn't `any` or `all`. | Keep area values between 0 and 100, with `aoi_x + aoi_width` and `aoi_y + aoi_height` at most 100. Set `rule` to `any` or `all`. |

## E03: Screenshots

| Code | What happened | What to do |
|---|---|---|
| `E0303` | **Screenshot empty or black.** Optics couldn't take a screenshot, got a black image, or has no screenshot source enabled. Also raised when `appium_screenshot` runs on a Samsung Tizen TV: `This TV cannot take a screenshot through Appium; use camera_screenshot`. | Enable the screenshot source for your driver, such as `appium_screenshot`. Check that the device screen is on and unlocked. Some apps block screenshots on secure screens. For a Tizen TV, use `camera_screenshot`. See [BLE and camera](https://optics-framework.org/docs/reference/config#ble-and-camera). |
| `E0304` | **Image too large to decode or not a valid image.** An image is not PNG, JPEG, GIF, BMP, WebP or TIFF, or it is larger than 64 MiB or 67,108,864 pixels. Examples are a template upload over HTTP and a camera frame. | Send a smaller image in one of these formats. For a camera, lower the resolution of the frame server. |

## E04: Keywords and parameters

| Code | What happened | What to do |
|---|---|---|
| `E0401` | **Action failed.** The keyword ran but couldn't complete: an app didn't launch, an element wasn't visible or enabled for `Is Element`, typing failed, a script failed, an API request failed, or a module run by `Run Loop`, `Condition` or `Execute Module` failed. Also raised when `Assert Text` finds other text (`Element '<element>' shows '<text>' but expected '<expected>'.`), when `Assert Equality` finds two different values (`Expected '<expected>', got '<actual>'.`), when `Is Element` finds the wrong state or finds the element only by OCR or image, when iOS `Go Back` finds no back button, or when a deep link does not open. In `optics live`, also shown for errors a keyword logged without failing. | Read the message after the code; it names the cause. For nested modules, the inner error is included. |
| `X0401` | **Action failed with exception.** A keyword failed with an error that has no Optics code. The JUnit report gives this code to the failed step. | Read the message of the `<failure>`. |
| `E0402` | **Keyword not found.** No keyword has that name. | Check the spelling with `optics list`. Case and spaces don't matter. |
| `E0403` | **Invalid keyword parameters.** A parameter has the wrong form: an expression that can't be evaluated, a numeric comparison on string values, a bad loop count, a query that matches no data, an `Invoke API` id without a dot, an `Invoke API` response that is not JSON, a key name that Playwright does not know. Also raised for an unknown `${name}` inside a longer value (`Variable '${name}' in '<value>' is not defined.`), for a `store_as` with no name or no value to store, or when the page source can't be read. Also raised for a number out of range: `'repeat' must be a number from 1 to 100, got '<value>'`. Pixel coordinates and lengths go from 0 to 16,384, and percentages from 0 to 100. Over HTTP and MCP, also raised for too many positional parameters. | Read the message. In `Condition` and `Evaluate`, compare with quoted values: `${size} == '9'`, not `${size} > 5`. Use `collection.api` for `Invoke API`. Write `store_as=<name>` only on a keyword that returns a value. See [Keywords](https://optics-framework.org/docs/reference/keywords/). |
| `E0405` | **Action ran, but the screen does not show its result.** The action ran, but the check after it failed. On a Samsung or LG TV, `Enter Text` types on the on-screen keyboard and then reads the field. The error shows when the field does not show the text or typing stopped part way. It also shows when `Clear Element Text` leaves text in the field. No fallback value runs the action again, because the action already ran. In `optics mcp`, this error has the kind `silent_failure`. | Read the message. Check the field on the TV. Press the field with `Press Element` first when the screen has more than one field. Then run the step again. See [Type on a TV](https://optics-framework.org/docs/platforms/tv#type-on-a-tv). |
| `E0406` | **Expression or filter refused.** An `Evaluate`, `Condition` or `Read Data` expression uses something other than values, names, arithmetic, comparisons, `in`, `and`, `or` and `not`. Function calls and the pandas operators `&`, `\|` and `~` are refused. Also raised for an expression that is too large to compute, such as `2**10**10`. | Remove the function call, or compute the value in an earlier step. In a `Read Data` filter, write `and`, `or` and `not`. See [Flow control keywords](https://optics-framework.org/docs/reference/keywords/flow). |

## E05: Files and config

| Code | What happened | What to do |
|---|---|---|
| `E0501` | **Missing required files.** A file, folder or setting Optics needs isn't there: the project folder doesn't exist, no driver or element source is enabled, a `Read Data` file or `ENV:` variable is missing, a CSV is empty, or config.yaml can't be parsed. Also raised for a Playwright setting that is not valid (`device`, `storage_state`, `protocol`, `context`), for an environment variable in `url` or `headers` that is not set (`Environment variable NAME is not set`), and when `optics serve` or `optics mcp` get `${NAME}`, a `storage_state` path or `Read Data` with `ENV:`. Also raised for a Chrome or Edge `profile` that matches none or more than one (`No browser profile '<name>'. Profiles: ...`). Also raised for `profile` and `user_data_dir` set together, for a `profile` over HTTP, `optics serve` or a remote `url`, and for `user_data_dir` in an API session. Also raised for a `credentials_path` file that is missing or is not a Google service account key. Also raised for a `$NAME` or `${NAME}` in config.yaml when the environment variable is not set or is empty, and for a `./` path in config.yaml that does not exist. `optics serve` and `optics mcp` over HTTP also raise it for `project_path`, `credentials_path`, a `file:` URL and a `Read Data` file, and `optics serve` for `OPTICS_CORS_ORIGINS=*`. In `optics live`, also raised by `/save` with nothing recorded and by plain-English mode with no LLM engine enabled. | Check the path or setting in the message. Set the environment variable before the run. For a profile, pick one from the list in the message. See [Start signed in with a browser profile](https://optics-framework.org/docs/platforms/web#start-signed-in-with-a-browser-profile). Run `optics doctor <folder>` to check config.yaml. Enable one driver and its element sources. |
| `E0503` | **Config parser error.** A config list or API file has the wrong shape, or a YAML file can't be parsed. Also raised for an empty `--include` or `--exclude` name. Also raised when two test cases have the same setup or teardown role: `The test cases have more than one test setup: '<first>' and '<second>'`. | Write each engine as a list item with a name: `- appium: {enabled: true, ...}`. Check YAML indentation. See [config.yaml](https://optics-framework.org/docs/reference/config#engine-lists) and [API definitions](https://optics-framework.org/docs/reference/files#api-definitions). For two setups, keep one name that ends with "Setup" and rename the other. See [Setup and teardown](https://optics-framework.org/docs/reference/files#setup-and-teardown). |

## E06: Modules and engines

| Code | What happened | What to do |
|---|---|---|
| `E0601` | **Module not found.** One of: an enabled engine name doesn't exist, or its extra isn't installed (for example `openai` without the `openai` extra), or an `openai` or `anthropic` engine has no `model` or key, or has a `timeout_s`, `response_format` or `platform` that is not valid, or its client cannot start; `Execute Module`, `Run Loop` or `Condition` names a module that doesn't exist; `Invoke API` names an unknown collection or API; or `--runner` has an unknown value. | Check the name in the message. Install the extra with `optics setup --install <name>`. Check module names against modules.csv, including case and spaces. |
| `E0603` | **Factory init failed.** The name under an engine key matches a file inside Optics, but that file isn't an engine of that kind, for example a helper module's name. | Use one of the names listed for that key in [config.yaml](https://optics-framework.org/docs/reference/config#engine-lists) or [Engines and extras](https://optics-framework.org/docs/reference/engines). |

## E07: Test cases and variables

| Code | What happened | What to do |
|---|---|---|
| `E0701` | **Execution failed.** A run or a session action failed and Optics wrapped the cause. Also raised when the run order can't be built. | Read the wrapped message after `Execution failed:`. |
| `E0702` | **Test case not found.** No test cases were loaded, an HTTP session no longer exists, or a variable used in `Evaluate`, `Condition` or a `Read Data` query isn't defined. Also raised when an `include` or `exclude` name matches no test case, matches only setup or teardown test cases, or leaves no test case to run. In `optics live`, also raised when the session can't start or switch devices. | Check that your test cases file is found (see [Project files](https://optics-framework.org/docs/reference/files#how-optics-finds-your-files)). Define the variable in elements.csv or create it in an earlier step. Fix the test case names that the message shows. |
| `E0706` | **Run stopped before the test case finished.** You pressed Ctrl+C, or Optics received SIGTERM. The report gives this code to the test case and the keyword that were in progress. | Run the tests again. |

## E08: General

| Code | What happened | What to do |
|---|---|---|
| `E0801` | **Unexpected error.** The LLM request failed, the model refused it, the model returned a reply Optics couldn't read, the reply hit the output limit, or a keyword produced no result and no error. | Check your LLM key, model name and quota. If the message names `max_tokens`, raise `capabilities.max_tokens`. Retry the step. If it repeats, rerun with `log_level: DEBUG` and report it. |

## E09: optics live

| Code | What happened | What to do |
|---|---|---|
| `E0901` | **Named element not defined in this project.** You typed `${name}` in `optics live`, and no elements file defines it. | Add the name to elements.csv, or type the locator directly. Use `/elements` to see the names Optics found. |

## Reserved codes

These codes exist in Optics 1.11.3, but nothing raises them. If you see one, it came from a newer version or your own code.

| Code | Default message |
|---|---|
| `E0103` | Failed to end session |
| `W0104` | Driver config incomplete (warning) |
| `W0203` | Element format mismatch |
| `E0204` | Timeout locating element |
| `E0301` | Screenshot disabled |
| `W0302` | Fallback to next camera supported driver |
| `W0404` | Keyword deprecated |
| `X0502` | File read exception |
| `W0503` | Config parser warning (can be ignored) |
| `W0602` | No valid instances, ignoring it |
| `X0604` | Import related problem |
| `E0703` | Parameter resolution failed |
| `E0704` | Test case timeout |
| `W0705` | Test case skipped |
| `E0802` | Unhandled exception |

## Messages without a code

These common `optics execute` and `optics dry_run` failures have no code.

| Message | What happened | What to do |
|---|---|---|
| `Keyword not found: <name>. Did you mean '<keyword>'?` | A module step names a keyword that doesn't exist. | Fix the spelling. Run `optics list` to see every keyword. |
| `Unknown keyword or module: '<name>'` | A test step names neither a module nor a keyword. | Check the module name in modules.csv, including case. |
| `Element not found: <name>` | A step uses `${name}`, and no elements file defines it. | Add the name to elements.csv, or create it in an earlier step. |
| `Keyword '<name>' failed after fallback attempts; last error: <error>` | Every fallback value of the element failed. | Check each value in the element's row. See `E0201` and `X0201` above. |
| `API '<name>' returned status 200, expected 404.` | An `Invoke API` call got another HTTP status than `expected_status`. | Check the status in the API definition. See [Invoke API](https://optics-framework.org/docs/reference/keywords/flow#invoke-api). |
| `Missing required files in <folder>: test_cases, modules` | Optics found no test cases file or no modules file. | Check the header rows. See [Project files](https://optics-framework.org/docs/reference/files). |
| `No driver enabled in <folder>/config.yaml` | A module that the run reaches uses an action, app or verification keyword, and no `driver_sources` entry has `enabled: true`. The panel title is `Cannot start: E0104`. A suite of flow control keywords needs no driver. | Run `optics configure <folder>`, or `optics doctor <folder>` to find the problem. |
| `Cannot start` panel | The preflight couldn't reach the Appium or Selenium server, or found no Android device. Also shown for `include` or `exclude` names that are not valid. | Follow the command in the panel, for example start `appium`. Set `OPTICS_SKIP_PREFLIGHT=1` to skip the check. For test case names, see [Pick test cases](https://optics-framework.org/docs/reference/cli#pick-test-cases). |

Plain Python errors, such as `ValueError: invalid literal for int()` when a timeout is `2.5`, also fail a step without a code. Timeouts and counts must be whole numbers. See [Troubleshooting](https://optics-framework.org/docs/help/troubleshooting).
