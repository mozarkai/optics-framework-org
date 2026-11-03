# Project files

> The file formats Optics reads: test cases, modules, elements, error definitions and API definitions.

An Optics project is a folder of CSV or YAML files plus a config.yaml. This page lists every file format Optics reads, the exact columns and keys, and what a run writes back.

For a guided introduction, see [Write a test](https://optics-framework.org/docs/create/write) and [Write tests in YAML](https://optics-framework.org/docs/create/yaml).

## How Optics finds your files

Optics walks the whole project folder, including subfolders, and decides what each `.csv`, `.yml` and `.yaml` file is by its **content**, not its name or location. You can use any folder layout. We recommend the one `optics init` creates:

```tree
birch-tests/
├── config.yaml
├── test_cases/test_cases.csv
├── modules/modules.csv
├── test_data/elements.csv
└── test_data/error_definitions.csv    # optional
```

| File type | CSV: the header row must contain | YAML: top-level key |
|---|---|---|
| Test cases | `test_case` and `test_step` | `Test Cases` |
| Modules | `module_name` and `module_step` | `Modules` |
| Elements | `Element_Name` and `Element_ID` | `Elements` |
| Error definitions | `error_code` and `match_string` | Not supported |
| API definitions | Not supported | `api` |
| Config | Not applicable | `driver_sources` and `elements_sources` |

A project needs at least one test cases file and one modules file. Elements, error definitions and API files are optional. You can split each type across several files.

**Common mistake:**
Write column names and YAML keys exactly as shown. Optics recognizes `element_name` or `test_cases:` as the right file type, but then reads nothing from it, because the reader expects `Element_Name` and `Test Cases`.

When two files define the same thing:

- **Test cases** and **modules** with the same name: the file read last wins, with a warning in the log.
- **Elements** with the same name: the values are combined into one fallback list.

Image files (`.png`, `.jpg`, `.jpeg`, `.bmp`) anywhere in the project are available as image templates by file name. If two images share a name, one of them is used.

## Test cases

Each row adds one step to a test case. A step names a module. Rows run in order, and a test case can span rows anywhere in the file.

**CSV**

`test_cases/test_cases.csv`:

```csv
test_case,test_step
Suite Setup,Open Birch
Shopper can sign in,Sign In
Shopper can sign in,Check Home Screen
Shopper can add a shoe,Search For Trail Runner
Shopper can add a shoe,Add To Cart
Suite Teardown,Close Birch
```
**YAML**

`test_cases/test_cases.yaml`:

```yaml
Test Cases:
  - Suite Setup:
      - Open Birch
  - Shopper can sign in:
      - Sign In
      - Check Home Screen
  - Shopper can add a shoe:
      - Search For Trail Runner
      - Add To Cart
  - Suite Teardown:
      - Close Birch
```

| Column | What it holds |
|---|---|
| `test_case` | The test case name. Rows with an empty name are skipped. |
| `test_step` | The name of a module to run. Rows with an empty step are skipped. |

Within a test case, the first failing step fails the test case and skips its remaining steps. The next test case still runs.

**Warning:**
A `test_step` that names a keyword instead of a module passes both `dry_run` and `execute` but runs nothing. Put keywords in a module and name the module here.

### Setup and teardown

Optics treats some test case names specially. Matching ignores case and looks for the words anywhere in the name.

| Name contains | Role | When it runs |
|---|---|---|
| `suite` and `setup` | Suite setup | Once, before every other test case. If several match, the last one is used. |
| `suite` and `teardown` | Suite teardown | Once, after every other test case. |
| `setup` without `suite` | Per-test setup | Meant to run before each test. In 1.10.5 it runs only before the first test case. |
| `teardown` without `suite` | Per-test teardown | Meant to run after each test. In 1.10.5 it runs only after the first test case. |

We recommend `Suite Setup` and `Suite Teardown`, which work as expected. Avoid per-test `Setup` and `Teardown` until this is fixed; open and close the app inside each test case's own modules if you need that.

- A failing setup doesn't stop the test cases after it.
- Test cases whose names contain "setup" or "teardown" always run, even when `include` or `exclude` would skip them.
- Don't use "setup" or "teardown" in an ordinary test name. "Setup wizard works" is treated as the per-test setup.

## Modules

Each row is one keyword step. A module is the rows that share a `module_name`, in order.

**CSV**

`modules/modules.csv`:

```csv
module_name,module_step,param_1,param_2,param_3
Open Birch,Launch App,,,
Sign In,Assert Presence,${email_field},20,
Sign In,Enter Text,${email_field},ana@birch.example,
Sign In,Enter Text,${password_field},@:s3cret,
Sign In,Press Element,${sign_in},,
Search For Trail Runner,Press Element,${search_bar},,
Search For Trail Runner,Enter Text,${search_bar},Trail Runner 2,
Add To Cart,Press Element,${add_to_cart},index=0,
Close Birch,Close And Terminate App,,,
```
**YAML**

`modules/modules.yaml`:

```yaml
Modules:
  - Open Birch:
      - Launch App
  - Sign In:
      - Assert Presence ${email_field} 20
      - Enter Text ${email_field} ana@birch.example
      - Enter Text ${password_field} @:s3cret
      - Press Element ${sign_in}
  - Search For Trail Runner:
      - Press Element ${search_bar}
      - Enter Text ${search_bar} "Trail Runner 2"
  - Add To Cart:
      - Press Element ${add_to_cart} index=0
  - Close Birch:
      - Close And Terminate App
```

| Column | What it holds |
|---|---|
| `module_name` | The module name. |
| `module_step` | A keyword name, such as `Press Element`. Case and spaces don't matter: `press_element` works too. To run another module from inside a module, use `Execute Module,<name>`. |
| `param_1`, `param_2`, … | The keyword's parameters, in order. Add as many `param_` columns as you need. |

Parameter rules:

- **Empty cells are dropped**, and the values after them move left. You can't skip a parameter by leaving its cell blank. Use a named parameter instead.
- **Named parameters** are written `name=value`, for example `index=0` or `timeout_str=20`. They work only when `name` is a real parameter of that keyword. Anything else, such as `text=Sign in` or `css=#search`, stays a positional value.
- **Variables** written as a whole cell, `${email_field}`, are replaced with the element's values. `Hello ${name}` isn't substituted; Optics types it as written.
- Values starting with `/`, `//` or `(` are always positional, so XPaths are never mistaken for named parameters.

In YAML, a step is one string. The keyword name is matched first, and the rest is split on spaces. Wrap a value with spaces in quotes: `"Trail Runner 2"`. Wrap multi-word module names you pass as parameters in quotes too: `Run Loop "Add To Cart" 3`.

See [Keywords](https://optics-framework.org/docs/reference/keywords/) for each keyword's parameters.

## Elements

Each row gives a name to a locator or a value. Steps refer to it as `${name}`.

**CSV**

`test_data/elements.csv`:

```csv
Element_Name,Element_ID,Element_ID_text,Element_ID_image
email_field,//android.widget.EditText[@resource-id='com.birch.shop:id/email'],Email,
password_field,//android.widget.EditText[@resource-id='com.birch.shop:id/password'],Password,
sign_in,//android.widget.Button[@text='Sign in'],Sign in,sign_in.png
search_bar,//*[@resource-id='com.birch.shop:id/search'],Search,
add_to_cart,text=Add to cart,,add_to_cart.png
order_total,placeholder,,
```
**YAML**

`test_data/elements.yaml`:

```yaml
Elements:
  email_field:
    - //android.widget.EditText[@resource-id='com.birch.shop:id/email']
    - Email
  sign_in: ["//android.widget.Button[@text='Sign in']", "Sign in", "sign_in.png"]
  search_bar: "//*[@resource-id='com.birch.shop:id/search']"
  add_to_cart: ["text=Add to cart", "add_to_cart.png"]
  order_total: placeholder
```

| Column | What it holds |
|---|---|
| `Element_Name` | The name. Write the header exactly like this. |
| `Element_ID` | The first locator or value. Required. |
| `Element_ID_*` | Fallbacks. Any column whose header starts with `Element_ID`, such as `Element_ID_text`, `Element_ID_image` or `Element_ID_2`, adds another value. They're tried in column order. |

- Empty cells are ignored. Columns that don't start with `Element_ID`, such as `Element_Text`, are ignored.
- A second row with the same name adds more fallback values.
- When a step uses `${name}`, Optics tries each value in turn until the step passes, up to 20 attempts. It moves on only when the element isn't found. Steps inside `Run Loop`, `Condition` and `Execute Module` use only the first value.
- Variables a step creates while running, such as the target of `Evaluate` or `Read Data`, need a row with a placeholder value so `optics dry_run` passes.

Optics decides what kind of locator a value is from its form:

| Value | Treated as |
|---|---|
| Starts with `text=` or `text_only:` | Text. `text_only:` uses OCR only. |
| Ends with `.png`, `.jpg`, `.jpeg` or `.bmp` | An image template, found by file name anywhere in the project. |
| Starts with `css=` | CSS selector. |
| Starts with `xpath=`, `/`, `//` or `(` | XPath. |
| Starts with `android.` or `xcui` | A UI class name. |
| Starts with `.` or `#`, or contains `[` and `]` | CSS selector. |
| Anything else | Text. |

Text like `(optional)` or `Size [US]` is read as XPath or CSS. Add `text=` in front to force text: `text=Size [US]`. See [Define elements](https://optics-framework.org/docs/elements/define).

## Error definitions

A CSV file of messages that mean your app is in a bad state. At the end of `optics execute`, Optics checks the text on the final screen against each `match_string`.

`test_data/error_definitions.csv`:

```csv
error_code,match_string,description,severity
BIRCH_001,Unfortunately,App crashed with a system dialog,critical
BIRCH_002,Something went wrong,Birch showed its generic error screen,high
BIRCH_003,Out of stock,Product page shows out of stock,medium
```

| Column | Required | What it holds |
|---|---|---|
| `error_code` | Yes | Your code for this error. A repeated code replaces the earlier row. |
| `match_string` | Yes | Text to look for. Matching ignores case and finds the text anywhere in the screen's text. It isn't a regular expression. |
| `description` | No | Free text, shown in the results. |
| `severity` | No | Free text, for example `critical`, `high` or `medium`. |

There's no YAML form. A match adds a failing test case to `junit_output.xml` but doesn't change the exit code. See [Detect on-screen errors](https://optics-framework.org/docs/run/error-detection).

## API definitions

A YAML file with a top-level `api:` key defines HTTP calls that the `Invoke API` keyword makes. You can also put the `api:` block inside config.yaml.

`test_data/api.yaml`:

```yaml
api:
  collections:
    birch:                                  # collection id, used in Invoke API
      name: Birch API
      base_url: https://api.birch.example
      global_headers:
        Accept: application/json
      apis:
        get_product:                        # API id
          name: Get product
          description: Look up Trail Runner 2
          endpoint: /v1/products/trail-runner-2
          request:
            method: GET
            headers: {}
            body: null
          expected_result:
            jsonpath_assertions:
              - path: $.name
                condition: "$ == 'Trail Runner 2'"
            extract:
              product_price: $.price        # saves ${product_price}
```

Call it from a module with `Invoke API,birch.get_product`. Only the top-level key `api` works; a file whose top key is `apis` is recognized but loads nothing. See [Call an API](https://optics-framework.org/docs/advanced/api-calls).

## Escaping and special values

**CSV quoting.** Wrap a cell in double quotes when it contains a comma, and double any quotes inside it:

```csv
module_name,module_step,param_1
Find Shoe,Press Element,"//*[contains(@text,'Trail Runner 2')]"
Go Home,Execute Script,"{""script"": ""mobile: pressKey"", ""args"": {""keycode"": 3}}"
```

**Backslash sequences.** In any cell, `\n` becomes a new line, `\t` a tab, `\r` a carriage return, and `\\` a single backslash.

**Secrets.** Start a value with `@:`, as in `@:s3cret`, to mask it as `****` in log files. Appium, Selenium and BLE remove the prefix before typing. Playwright types the prefix too.

**Encoding.** Save files as UTF-8. Some spreadsheet apps add a byte order mark (BOM) at the start of the file, which can stop Optics recognizing the header row.

**YAML quoting.** A quoted value that contains `=` keeps its quotes. Write conditions without spaces instead: `Condition ${size}=='9' "Pick Size" "Show Error"`.

## Outputs

`optics execute` and `optics dry_run` write to `execution_output/` in the project, unless you set `execution_output_path` in [config.yaml](https://optics-framework.org/docs/reference/config).

```tree
birch-tests/execution_output/
├── junit_output.xml
├── logs.json                                      # json_log: true
├── internal_logs.log                              # file_log: true
├── execution_logs.log                             # file_log: true
├── 2026-10-09T15-04-05-123456-pre_press_element.jpg
├── ...-press_element_element_detection_result.jpg
├── ...-end_of_run.jpg
├── page_sources_log.xml
└── detected_errors_<session_id>.json              # only when error definitions match
```

| File | When it's written | What it holds |
|---|---|---|
| `junit_output.xml` | Every run, including dry runs | One test case per test, with each module and keyword, their status, timings and log lines. Error detection adds a failing `on-screen-error-detection` test case. If another session is already writing the file, Optics names it `junit_output_<session_id>.xml`. |
| `logs.json` | `json_log: true` | A JSON list of every test case, module and keyword event with status and timings. |
| `internal_logs.log`, `execution_logs.log` | `file_log: true` | Text logs. Each rotates at 10 MB. |
| `<time>-pre_<keyword>.jpg` | Every keyword that finds an element | The screen before Optics looked for the element. |
| `<time>-<keyword>_element_detection_result.jpg` | An element was found in the UI tree | The screen with a green box around the element. |
| `<time>-<keyword>_image_detection_result.jpg` | An element was found by OCR or image | The screen with a green box, and a red dot at the tap point for text. |
| `<time>-<keyword>_with_aoi.jpg` | The step used an area of interest | The screen with the area drawn in blue. |
| `<time>-<keyword>.jpg` | Gestures and coordinate keywords, such as `Swipe`, `Scroll`, `Press By Percentage`, `Press Keycode` | The screen when the step ran. |
| `<time>-capture_screenshot.jpg` | `Capture Screenshot`, `Get Screen Elements` | Only when `save_captures` is `true`. |
| `<time>-end_of_run.jpg` | End of `optics execute`, if the app is still open | The final screen. |
| `page_sources_log.xml` | Appium page source reads and the end of the run | Each UI tree, with a timestamp. |
| `page_sources_log.html` | Selenium page source reads and the end of the run | Each page's HTML, with a timestamp. |
| `interactable_elements.json` | `Get Interactive Elements`, `Get Screen Elements` | The latest list of elements on screen. |
| `api_details.log`, `api_details.har` | `Invoke API` | Each request and response. |
| `detected_errors_<session_id>.json` | Error definitions matched at the end of the run | The codes, matched text, descriptions and severities. |

Screenshots are JPEG files named `<timestamp>-<name>.jpg`. The detection-result screenshots use a timestamp with colons in it, which Windows doesn't allow in file names, so they may be missing on Windows.

`optics live` writes elsewhere: `screenshots/session_<time>/` and `logs/optics_live_<time>.log` in the project. See [Read results](https://optics-framework.org/docs/run/results).
