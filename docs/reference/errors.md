# Error codes

> Learn what each Optics error code means and how to fix it.

When a step or command fails, Optics usually attaches a code such as `E0201`. The code tells you which part of Optics failed, and the message after it says why. This page lists every code in Optics 1.10.5 and what to do about each one.

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
| `optics execute` "Failure details" box | `<test> → step '<step>' — Keyword '<keyword>' failed: Code.E0401: <message>` |
| Log files (`file_log: true`) | The same reason as the Failure details box, as an error line in `execution_logs.log`. |
| `optics live` history | `✗ press_element ${sign_in}` with `[E0201] ...` on the line below |
| HTTP API (`optics serve`) | A `code` field in the error body, or the code inside a `detail` string. See [HTTP API](https://optics-framework.org/docs/reference/http-api#errors). |
| MCP server (`optics mcp`) | `[Code.E0106] Driver session is no longer active ...` in the tool error. See [MCP server](https://optics-framework.org/docs/reference/mcp#errors). |

In some places the code has a `Code.` prefix, as in `Code.E0102`. It's the same code. Search for the five characters, for example `E0102`.

Not every failure has a code. See [Messages without a code](#messages-without-a-code).

## E01: Driver and session

| Code | What happened | What to do |
|---|---|---|
| `E0101` | **Driver not initialized.** A keyword ran before the driver session started. In `optics live` this happens when the automatic `launch_app` failed. | Start with `Launch App`. In `optics live`, run `launch_app` again and read its error first. |
| `E0102` | **Failed to start session.** The driver couldn't create a session. The Appium server refused it, Playwright couldn't open the browser, or the request took longer than 15 seconds. | Check that the server is running and the device is connected with `optics doctor <folder>`. Check the capabilities, especially `appPackage`, `appActivity` or `bundleId`. Read the Appium server's own log for the cause. |
| `E0104` | **Driver config incomplete.** A required driver setting is missing or wrong: empty Appium `capabilities`, no `platformName`, an unsupported `platformName`, or no server `url`. | Fill in the driver settings in [config.yaml](https://optics-framework.org/docs/reference/config#examples-by-platform). `platformName` must be `Android`, `iOS`, `TizenTV` or `LGTV`. |
| `E0105` | **Keyword not supported on this device platform.** You used a touch or typing keyword on a Samsung or LG TV, where Appium has no touch screen. | Navigate with `Press Keycode` and remote keys such as `UP`, `DOWN` and `ENTER`. See [Test TV apps](https://optics-framework.org/docs/platforms/tv). |
| `E0106` | **Driver session is no longer active.** The Appium or Selenium server dropped the session, for example after a timeout, a device disconnect or a server restart. Optics doesn't reconnect. | Run the tests again. Over HTTP or MCP, end the session and start a new one. If it keeps happening, raise `newCommandTimeout` in the capabilities. |

## E02: Elements

| Code | What happened | What to do |
|---|---|---|
| `E0201` | **Element not found.** No strategy found the element on the current screen. Also raised when a `${name}` variable isn't defined, when OCR is needed but no `text_detection` engine is enabled, or when `Scroll Until Element Appears` or `Swipe Until Element Appears` time out. | Check the locator against the screen with `optics live` or the page source. Put `Assert Presence` before the step if the element appears late, since actions don't wait. Add fallback values in `Element_ID_*` columns. Enable `easyocr` if you locate by visible text. |
| `X0201` | **Element not found after all fallbacks.** Optics found the element, or tried every fallback value, but the action failed each time. The element may be hidden, covered, disabled, or the wrong match. | Use `index` to pick the right match, an [area of interest](https://optics-framework.org/docs/elements/area-of-interest) to narrow the search, or a more specific locator. Turn on [AI self-heal](https://optics-framework.org/docs/elements/self-heal) for popups that get in the way. |
| `E0202` | **Unsupported operation for element source.** The enabled element sources can't do what the keyword asked, usually listing interactive elements. | Enable `appium_page_source` or `playwright_page_source`. Selenium can't list interactive elements; use the page source instead. |
| `E0205` | **Invalid element type.** An area of interest is out of range, or a `rule` isn't `any` or `all`. | Keep area values between 0 and 100, with `aoi_x + aoi_width` and `aoi_y + aoi_height` at most 100. Set `rule` to `any` or `all`. |

## E03: Screenshots

| Code | What happened | What to do |
|---|---|---|
| `E0301` | **Screenshot disabled.** Optics tried to stop a screenshot stream that wasn't running. | Usually harmless. If it fails a step, rerun with `log_level: DEBUG` and report it. |
| `E0303` | **Screenshot empty or black.** Optics couldn't take a screenshot, got a black image, or has no screenshot source enabled. | Enable the screenshot source for your driver, such as `appium_screenshot`. Check that the device screen is on and unlocked. Some apps block screenshots on secure screens. |

## E04: Keywords and parameters

| Code | What happened | What to do |
|---|---|---|
| `E0401` | **Action failed.** The keyword ran but couldn't complete: an app didn't launch, an element wasn't visible or enabled for `Is Element`, typing failed, a script failed, an API request failed, or a module run by `Run Loop`, `Condition` or `Execute Module` failed. In `optics live`, also shown for errors a keyword logged without failing. | Read the message after the code; it names the cause. For nested modules, the inner error is included. |
| `E0402` | **Keyword not found.** No keyword has that name. | Check the spelling with `optics list`. Case and spaces don't matter. |
| `E0403` | **Invalid keyword parameters.** A parameter has the wrong form: an expression that can't be evaluated, a numeric comparison on string values, a bad loop count, a query that matches no data, an `Invoke API` id without a dot. Also raised when config.yaml sets both `include` and `exclude`, or when the page source can't be read. | Read the message. In `Condition` and `Evaluate`, compare with quoted values: `${size} == '9'`, not `${size} > 5`. Use `collection.api` for `Invoke API`. Set only one of `include` and `exclude`. See [Keywords](https://optics-framework.org/docs/reference/keywords/). |

## E05: Files and config

| Code | What happened | What to do |
|---|---|---|
| `E0501` | **Missing required files.** A file, folder or setting Optics needs isn't there: the project folder doesn't exist, no driver or element source is enabled, a `Read Data` file or `ENV:` variable is missing, a CSV is empty, or config.yaml can't be parsed. In `optics live`, also raised by `/save` with nothing recorded. | Check the path in the message. Run `optics doctor <folder>` to check config.yaml. Enable one driver and its element sources. |
| `E0503` | **Config parser error.** A config list or API file has the wrong shape, or a YAML file can't be parsed. | Write each engine as a list item with a name: `- appium: {enabled: true, ...}`. Check YAML indentation. See [config.yaml](https://optics-framework.org/docs/reference/config#engine-lists) and [API definitions](https://optics-framework.org/docs/reference/files#api-definitions). |

## E06: Modules and engines

| Code | What happened | What to do |
|---|---|---|
| `E0601` | **Module not found.** One of: an enabled engine name doesn't exist, or its extra isn't installed (for example `openai` without the `openai` extra), or an `openai` or `anthropic` engine has no `model` or key; `Execute Module`, `Run Loop` or `Condition` names a module that doesn't exist; `Invoke API` names an unknown collection or API; or `--runner` has an unknown value. | Check the name in the message. Install the extra with `optics setup --install <name>`. Check module names against modules.csv, including case and spaces. |
| `E0603` | **Factory init failed.** The name under an engine key matches a file inside Optics, but that file isn't an engine of that kind, for example a helper module's name. | Use one of the names listed for that key in [config.yaml](https://optics-framework.org/docs/reference/config#engine-lists) or [Engines and extras](https://optics-framework.org/docs/reference/engines). |

## E07: Test cases and variables

| Code | What happened | What to do |
|---|---|---|
| `E0701` | **Execution failed.** A run or a session action failed and Optics wrapped the cause. Also raised when the run order can't be built. | Read the wrapped message after `Execution failed:`. |
| `E0702` | **Test case not found.** No test cases were loaded, an HTTP session no longer exists, or a variable used in `Evaluate`, `Condition` or a `Read Data` query isn't defined. In `optics live`, also raised when the session can't start or switch devices. | Check that your test cases file is found (see [Project files](https://optics-framework.org/docs/reference/files#how-optics-finds-your-files)). Define the variable in elements.csv or create it in an earlier step. |

## E08: General

| Code | What happened | What to do |
|---|---|---|
| `E0801` | **Unexpected error.** The LLM request failed, the model returned a reply Optics couldn't read, or a keyword produced no result and no error. | Check your LLM key, model name and quota. Retry the step. If it repeats, rerun with `log_level: DEBUG` and report it. |

## E09: optics live

| Code | What happened | What to do |
|---|---|---|
| `E0901` | **Named element not defined in this project.** You typed `${name}` in `optics live`, and no elements file defines it. | Add the name to elements.csv, or type the locator directly. Use `/elements` to see the names Optics found. |

## Reserved codes

These codes exist in Optics 1.10.5, but nothing raises them yet. If you see one, it came from a newer version or your own code.

| Code | Default message |
|---|---|
| `E0103` | Failed to end session |
| `W0104` | Driver config incomplete (warning) |
| `W0203` | Element format mismatch |
| `E0204` | Timeout locating element |
| `W0302` | Fallback to next camera supported driver |
| `X0401` | Action failed with exception |
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
| `Element not found: <name>` | A step uses `${name}`, and no elements file defines it. | Add the name to elements.csv. For values a step creates, add a placeholder row. |
| `Keyword '<name>' failed after fallback attempts` | Every fallback value of the element failed. | Check each value in the element's row. See `E0201` and `X0201` above. |
| `Missing required files in <folder>: test_cases, modules` | Optics found no test cases file or no modules file. | Check the header rows. See [Project files](https://optics-framework.org/docs/reference/files). |
| `No driver enabled in <folder>/config.yaml` | No `driver_sources` entry has `enabled: true`, or config.yaml couldn't be read. | Run `optics configure <folder>`, or `optics doctor <folder>` to find the problem. |
| `Cannot start` panel | The preflight couldn't reach the Appium or Selenium server, or found no Android device. | Follow the command in the panel, for example start `appium`. Set `OPTICS_SKIP_PREFLIGHT=1` to skip the check. |

Plain Python errors, such as `ValueError: invalid literal for int()` when a timeout is `2.5`, also fail a step without a code. Timeouts and counts must be whole numbers. See [Troubleshooting](https://optics-framework.org/docs/help/troubleshooting).
