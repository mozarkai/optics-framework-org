---
title: Use Optics from Python
nav: Python
summary: Call Optics keywords from pytest or any Python script when a test needs real code.
level: Advanced
time: 10 min
---

Every keyword is also a method on the `Optics` class. Use it when a test needs logic the suite files can't express, or when your team already runs everything through pytest. You keep the same fallbacks, OCR and image matching as a CSV suite.

:::note
If CSV or YAML files can express your test, prefer them. Anyone on the team can read and review a suite file, and the runner gives you the step tree, screenshots and error detection for free. See [Choose how to create tests](/docs/create/).
:::

## Write a test with pytest

This test signs in to the Sauce Labs demo store, adds a backpack to the cart, and checks the cart badge and the price in the cart. It runs as written with `pip install "optics-framework[playwright]" pytest`.

```python title="test_checkout.py"
import pytest
from optics_framework import Optics

CONFIG = {
    "driver_sources": [{"playwright": {"enabled": True}}],
    "elements_sources": [
        {"playwright_find_element": {"enabled": True}},
        {"playwright_page_source": {"enabled": True}},
        {"playwright_screenshot": {"enabled": True}},
    ],
}


@pytest.fixture
def optics():
    with Optics(CONFIG) as session:  # quits the browser when the test ends
        yield session


def test_shopper_can_add_a_backpack(optics):
    optics.launch_app("https://www.saucedemo.com")
    optics.enter_text("//input[@id='user-name']", "standard_user")
    optics.enter_text("//input[@id='password']", "secret_sauce")
    optics.press_element(["//input[@id='login-button']", "Login"])  # fallbacks
    optics.assert_presence("Products", timeout="10")
    price = optics.get_text("//div[@data-test='inventory-item-price']")
    optics.press_element("//button[@id='add-to-cart-sauce-labs-backpack']")
    optics.assert_text("//span[@data-test='shopping-cart-badge']", "1")
    optics.press_element("//a[@data-test='shopping-cart-link']")
    optics.assert_text("//div[@data-test='inventory-item-price']", price)
```

```shell
$ pytest test_checkout.py
```

## Configure the session

Pass the same lists you'd put in `config.yaml`, as a Python dict. `driver_sources` and `elements_sources` are required, and each must be a list. Without them, `setup` raises `ValueError: Missing required configuration key: driver_sources`. The SDK reads these keys:

| Key | What it's for |
|---|---|
| `driver_sources`, `elements_sources` | What to drive and how to look at the screen. See the [config reference](/docs/reference/config). |
| `text_detection`, `image_detection` | OCR and image matching engines, if you use them. |
| `project_path` | A folder to search for image files and to resolve relative paths in `read_data` and `add_api`. Required for image elements. |
| `execution_output_path` | Where screenshots and results go. |

`ai_self_heal` and `llm_models` work as they do in `config.yaml`. The SDK doesn't apply `log_level`.

You can give the config in four ways.

### Pass a dict

Give the dict to `Optics()` or to `setup()`. Both create a new session.

```python
from optics_framework import Optics

config = {
    "driver_sources": [
        {
            "appium": {
                "enabled": True,
                "url": "http://localhost:4723",
                "capabilities": {
                    "platformName": "Android",
                    "deviceName": "emulator-5554"
                }
            }
        }
    ],
    "elements_sources": [
        {"appium_find_element": {"enabled": True}}
    ],
    "text_detection": [
        {"easyocr": {"enabled": True}}
    ],
    "image_detection": [
        {"templatematch": {"enabled": True}}
    ],
    "project_path": "/path/to/project"
}

optics = Optics(config=config)
```

### Read a config file

`setup_from_file` reads a JSON or YAML file:

```python
from optics_framework import Optics

optics = Optics()
optics.setup_from_file("config.yaml")
```

```yaml title="config.yaml"
driver_sources:
  - appium:
      enabled: true
      url: "http://localhost:4723"
      capabilities:
        platformName: "Android"
        deviceName: "emulator-5554"

elements_sources:
  - appium_find_element:
      enabled: true

text_detection:
  - easyocr:
      enabled: true

image_detection:
  - templatematch:
      enabled: true

project_path: "/path/to/project"
```

A missing file raises `FileNotFoundError`. Any other problem raises `ValueError: Failed to read configuration file`. To change a value first, load the file yourself and pass the dict:

```python
import yaml
from optics_framework import Optics

with open("birch-tests/config.yaml") as f:
    config = yaml.safe_load(f)
config["project_path"] = "birch-tests"

with Optics(config) as optics:
    optics.launch_app()
```

### Pass YAML or JSON text

`setup(config=...)` also takes the config as text. Text that starts with `{` or `[` is read as JSON. Other text is read as YAML. Invalid text raises `OpticsError` with code `E0503`.

```python
from optics_framework import Optics

yaml_config = """
driver_sources:
  - appium:
      enabled: true
      url: "http://localhost:4723"
elements_sources:
  - appium_find_element:
      enabled: true
"""

optics = Optics()
optics.setup(config=yaml_config)
```

:::mistake
`setup(config="config.yaml")` doesn't read the file. Optics reads the text `config.yaml` as YAML and raises `ValueError: Missing required configuration key: driver_sources`. Use `setup_from_file` for a path.
:::

### Pass each list on its own

This older form still works, but it logs a warning that it's deprecated. It takes `driver_sources`, `elements_sources`, `image_detection`, `text_detection` and `execution_output_path_param`. It has no `project_path`, so image elements don't work with it.

```python
optics.setup(
    driver_sources=[{"appium": {"enabled": True, "url": "http://localhost:4723"}}],
    elements_sources=[{"appium_find_element": {"enabled": True}}]
)
```

`execution_output_path_param` also works with `config=`. It sets `execution_output_path` when the config doesn't.

### Test a desktop app

A desktop app uses the Appium driver with the OS and the app. Run Appium with `appium-xa11y-driver` on the machine that shows the app. See [Test desktop apps](/docs/platforms/desktop) for the setup:

```python title="test_notes.py"
from optics_framework import Optics

optics = Optics()
optics.setup(config={
    "driver_sources": [{"appium": {"enabled": True, "url": "http://127.0.0.1:4723", "capabilities": {
        "platformName": "Mac", "automationName": "Xa11y", "app": "com.apple.TextEdit"}}}],
    "elements_sources": [{"appium_find_element": {"enabled": True}},
                         {"appium_page_source": {"enabled": True}},
                         {"appium_screenshot": {"enabled": True}}],
})
optics.launch_app()
optics.enter_text("//text_area", "Hello from Optics")
optics.assert_text("//text_area", "Hello from Optics")
optics.press_keycode("primary+a")
optics.enter_text_using_keyboard("<backspace>")
optics.close_and_terminate_app()
optics.quit()
```

`press_keycode` takes a key combination. `primary` is Cmd on macOS and Ctrl on Linux and Windows. You can also write `cmd+a` or `ctrl+a`.

## How calls differ from suite files

- **Method names are snake_case.** `Press Element` is `press_element`. Your editor's autocomplete lists them all.
- **Pass every value as a string.** `optics.press_by_coordinates("540", "1600")` works. A number raises `TypeError: Parameter 'coor_x' must be str or List[str]`.
- **A list means "try these in order".** `press_element(["//button[@id='login']", "Login"])` tries the XPath, then the text. To check several elements at once, separate them with a pipe in one string: `assert_presence("Products|Your Cart")`.
- **`${name}` isn't looked up** in action and verification methods, except `assert_equality`. Pass the locator itself, or the list that `get_element_value(name)` returns. Flow control methods and the steps of modules that they run do read `${name}`.
- **There is no `store_as`.** Keep a return value in a Python variable, as `price` above.
- **Methods return values.** `get_text` returns the text, `capture_screenshot` returns a base64 PNG, `capture_pagesource` returns a dict with `page_source` and `timestamp`, and `assert_presence` returns `True`. A failed check raises an exception, which fails the pytest test. See [Handle errors](#handle-errors).
- **`assert_text`, `is_element` and `go_back`.** `assert_text(element, expected)` fails on different text. `is_element(element, state, timeout)` accepts `visible`, `invisible`, `enabled`, `disabled`, `checked` and `unchecked`. `go_back()` goes back one screen.
- **Some parameters differ.** See the table below.

## Every method

These methods run a keyword. The keyword page gives what each parameter does. Python has fewer parameters for some of them, and other defaults:

- `assert_presence` and `assert_visibility` call the timeout `timeout`, not `timeout_str`, wait 60 seconds by default and have no `fail`.
- `detect_and_press` waits 10 seconds by default.
- `enter_text`, `enter_number`, `clear_element_text`, `get_text`, `swipe_from_element` and `scroll_from_element` have no area of interest and no `index`.
- `launch_other_app` calls its parameter `bundleid` and has no `event_name`.
- `invoke_api(api)` and `read_data(element, source, query)` use other parameter names than the keywords.
- `capture_screenshot` and `capture_pagesource` have no `event_name`.

| Method | Keyword |
|---|---|
| `launch_app(app_identifier=None, app_activity=None, event_name=None)` | [Launch App](/docs/reference/keywords/app#launch-app) |
| `launch_other_app(bundleid)` | [Launch Other App](/docs/reference/keywords/app#launch-other-app) |
| `start_appium_session(event_name=None)` | [Start Appium Session](/docs/reference/keywords/app#start-appium-session) |
| `get_driver_session_id()` | [Get Driver Session Id](/docs/reference/keywords/app#get-driver-session-id) |
| `close_and_terminate_app()` | [Close And Terminate App](/docs/reference/keywords/app#close-and-terminate-app) |
| `force_terminate_app(app_name, event_name=None)` | [Force Terminate App](/docs/reference/keywords/app#force-terminate-app) |
| `get_app_version(app_package=None)` | [Get App Version](/docs/reference/keywords/app#get-app-version) |
| `press_element(element, repeat="1", offset_x="0", offset_y="0", index="0", aoi_x=None, aoi_y=None, aoi_width=None, aoi_height=None, event_name=None)` | [Press Element](/docs/reference/keywords/actions#press-element) |
| `press_by_percentage(percent_x, percent_y, repeat="1", event_name=None)` | [Press By Percentage](/docs/reference/keywords/actions#press-by-percentage) |
| `press_by_coordinates(coor_x, coor_y, repeat="1", event_name=None)` | [Press By Coordinates](/docs/reference/keywords/actions#press-by-coordinates) |
| `detect_and_press(element, timeout="10", event_name=None)` | [Detect And Press](/docs/reference/keywords/actions#detect-and-press) |
| `swipe(coor_x, coor_y, direction="right", swipe_length="50", event_name=None)` | [Swipe](/docs/reference/keywords/actions#swipe) |
| `swipe_by_percentage(percent_x, percent_y, direction="right", swipe_length="50", event_name=None)` | [Swipe By Percentage](/docs/reference/keywords/actions#swipe-by-percentage) |
| `swipe_until_element_appears(element, direction="down", timeout="30", event_name=None)` | [Swipe Until Element Appears](/docs/reference/keywords/actions#swipe-until-element-appears) |
| `swipe_from_element(element, direction="right", swipe_length="50", event_name=None)` | [Swipe From Element](/docs/reference/keywords/actions#swipe-from-element) |
| `scroll(direction="down", event_name=None)` | [Scroll](/docs/reference/keywords/actions#scroll) |
| `scroll_until_element_appears(element, direction="down", timeout="30", event_name=None)` | [Scroll Until Element Appears](/docs/reference/keywords/actions#scroll-until-element-appears) |
| `scroll_from_element(element, direction="down", scroll_length="100", event_name=None)` | [Scroll From Element](/docs/reference/keywords/actions#scroll-from-element) |
| `enter_text(element, text, event_name=None)` | [Enter Text](/docs/reference/keywords/actions#enter-text) |
| `enter_text_direct(text, event_name=None)` | [Enter Text Direct](/docs/reference/keywords/actions#enter-text-direct) |
| `enter_text_using_keyboard(text_input, event_name=None)` | [Enter Text Using Keyboard](/docs/reference/keywords/actions#enter-text-using-keyboard) |
| `enter_number(element, number, event_name=None)` | [Enter Number](/docs/reference/keywords/actions#enter-number) |
| `press_keycode(keycode, event_name=None)` | [Press Keycode](/docs/reference/keywords/actions#press-keycode) |
| `go_back(event_name=None)` | [Go Back](/docs/reference/keywords/actions#go-back) |
| `clear_element_text(element, event_name=None)` | [Clear Element Text](/docs/reference/keywords/actions#clear-element-text) |
| `get_text(element)` | [Get Text](/docs/reference/keywords/actions#get-text) |
| `select_dropdown_option(element, option, timeout="30", event_name=None)` | [Select Dropdown Option](/docs/reference/keywords/actions#select-dropdown-option) |
| `sleep(duration)` | [Sleep](/docs/reference/keywords/actions#sleep) |
| `execute_script(script_or_json, event_name=None)` | [Execute Script](/docs/reference/keywords/actions#execute-script) |
| `validate_element(element, timeout="10", rule="all", event_name=None)` | [Validate Element](/docs/reference/keywords/verification#validate-element) |
| `assert_presence(elements, timeout="60", rule="any", event_name=None)` | [Assert Presence](/docs/reference/keywords/verification#assert-presence) |
| `assert_visibility(elements, timeout="60", rule="any", event_name=None)` | [Assert Visibility](/docs/reference/keywords/verification#assert-visibility) |
| `validate_screen(elements, timeout="30", rule="any", event_name=None)` | [Validate Screen](/docs/reference/keywords/verification#validate-screen) |
| `assert_equality(output, expression, event_name=None)` | [Assert Equality](/docs/reference/keywords/verification#assert-equality) |
| `is_element(element, element_state, timeout, event_name=None)` | [Is Element](/docs/reference/keywords/verification#is-element) |
| `assert_text(element, expected, timeout="10", event_name=None)` | [Assert Text](/docs/reference/keywords/verification#assert-text) |
| `get_interactive_elements(filter_config=None, compact=False)` | [Get Interactive Elements](/docs/reference/keywords/verification#get-interactive-elements) |
| `capture_screenshot()` | [Capture Screenshot](/docs/reference/keywords/verification#capture-screenshot) |
| `capture_pagesource()` | [Capture Pagesource](/docs/reference/keywords/verification#capture-pagesource) |
| `get_screen_elements()` | [Get Screen Elements](/docs/reference/keywords/verification#get-screen-elements) |
| `invoke_api(api)` | [Invoke API](/docs/reference/keywords/flow#invoke-api) |
| `read_data(element, source, query="")` | [Read Data](/docs/reference/keywords/flow#read-data) |
| `run_loop(target, *args)` | [Run Loop](/docs/reference/keywords/flow#run-loop) |
| `condition(*args)` | [Condition](/docs/reference/keywords/flow#condition) |
| `evaluate(param1, param2)` | [Evaluate](/docs/reference/keywords/flow#evaluate) |
| `date_evaluate(param1, param2, param3, param4="%d %B")` | [Date Evaluate](/docs/reference/keywords/flow#date-evaluate) |

Execute Module, Initialise Setup and the deprecated keywords aren't methods.

### Python-only methods

These have no CSV equivalent:

| Method | What it does |
|---|---|
| `setup(config=None, driver_sources=None, elements_sources=None, image_detection=None, text_detection=None, execution_output_path_param=None)` | Create a session. See [Configure the session](#configure-the-session). |
| `setup_from_file(config_file_path)` | Create a session from a JSON or YAML file. |
| `discover_templates(project_path)` | Return every image file under a folder (`.png`, `.jpg`, `.jpeg`, `.bmp`, `.tiff`, `.tif`), by file name. `setup` calls it for `project_path`. |
| `add_element(name, value)` | Add a value to a named element, after any values it already has. |
| `get_element_value(name)` | Return the list of values for a named element. |
| `add_module(module_name, module_def)` | Define a module as a list of `(keyword, [values])` pairs, for `run_loop` and `condition`. |
| `add_testcase(testcase)` | Replace the session's test cases. |
| `add_api(api_data)` | Load API definitions for `invoke_api` from a YAML file or a dict. See [Call APIs](#call-apis). |
| `add_error_definitions(source)` | Load on-screen error definitions. See [Check for errors from Python](/docs/run/error-detection#check-for-errors-from-python). |
| `capture_and_detect(context_label="end_of_run", test_case=None)` | Check the current screen against those definitions and return the matches. |
| `press_element_with_index(element, index="0", event_name=None)` | Press Element with only `element`, `index` and `event_name`. |
| `quit()` | End the session. The `with` block calls it for you. |

## Examples by task

Each block below assumes an `optics` session. Replace the locators with ones from your app.

### Start and stop the app

```python
optics.launch_app(app_identifier="com.example.app")
optics.launch_other_app("com.other.app")

version = optics.get_app_version()
print(f"App version: {version}")
session_id = optics.get_driver_session_id()
print(f"Session ID: {session_id}")

optics.close_and_terminate_app()
optics.force_terminate_app("com.example.app")
```

`force_terminate_app` needs the app's package name or bundle ID.

### Tap and type

```python
optics.press_element("Submit")
optics.press_element(["button1", "button2", "//button[@id='submit']"])
optics.press_by_coordinates("100", "200")
optics.press_by_percentage("50", "50")
optics.press_element_with_index("Add to cart", index="1")
optics.detect_and_press("Allow", timeout="5")
optics.select_dropdown_option("//select[@id='size']", "US 9")

optics.enter_text("//input[@name='user']", "testuser")
optics.enter_text_direct("text")
optics.enter_text_using_keyboard("<enter>")
optics.enter_number("//input[@name='quantity']", "123")
optics.clear_element_text("input_field")
```

`enter_text_direct` and `enter_text_using_keyboard` take no element. They type into the field that has focus.

### Swipe and scroll

```python
optics.swipe("540", "1500", "up", "800")
optics.swipe_by_percentage("50", "50", "up", "25")
optics.swipe_until_element_appears("target_element", direction="up")
optics.swipe_from_element("source_element", "left", "300")

optics.scroll("down")
optics.scroll_until_element_appears("target_element", direction="down")
optics.scroll_from_element("source_element", "down", "400")
```

Swipe takes a start point, a direction and a length, not an end point. Scroll takes only a direction.

### Keys, text and scripts

```python
optics.press_keycode("4")
optics.go_back()

text = optics.get_text("element_id")
print(f"Element text: {text}")

optics.sleep("2")

result = optics.execute_script('{"script": "mobile: shell", "args": {"command": "echo hello"}}')
```

`press_keycode("4")` presses the Android back key. `execute_script` takes one string: a script, or JSON with `script` and `args`.

### Check the screen

```python
optics.validate_element("welcome_message")
optics.assert_presence("element1|element2", rule="all")
optics.assert_presence("element1|element2", rule="any")
found = optics.validate_screen("header|content|footer")
optics.assert_visibility("Products", timeout="10")
optics.is_element("//button[@id='login']", "enabled", "5")
optics.assert_equality(price, "$29.99")
```

`rule="all"` needs every element. `rule="any"` needs one. `validate_screen` returns `True` or `False` and never raises.

### Capture the screen

```python
screenshot = optics.capture_screenshot()
print(f"Screenshot: {screenshot}")

page_source = optics.capture_pagesource()
print(f"Page source: {page_source}")

elements = optics.get_interactive_elements()
for element in elements:
    print(f"Element: {element}")

buttons = optics.get_interactive_elements(["buttons", "inputs"], compact=True)
screen = optics.get_screen_elements()
```

`get_screen_elements` returns a dict with a base64 screenshot and a list of elements.

### Use variables

`add_element` adds a value to a named element. Flow control methods read it as `${name}`. Action methods don't, so pass the values from `get_element_value`:

```python
optics.add_element("submit_button", "//button[@id='submit']")
optics.add_element("submit_button", "Submit")

element_value = optics.get_element_value("submit_button")
print(f"Element value: {element_value}")

optics.press_element(element_value)
```

`element_value` is `["//button[@id='submit']", "Submit"]`, so `press_element` tries the XPath, then the text.

### Branch and loop

`condition` and `run_loop` run modules. Define each module with `add_module` first:

```python
optics.add_module("Proceed", [("Press Element", ["Continue"])])
optics.add_module("Wait", [("Sleep", ["1"])])

optics.add_element("status", "ready")
optics.condition("${status} == 'ready'", "Proceed")

optics.add_element("count", "15")
optics.condition("${count} > 10", "Proceed", "Wait")

optics.run_loop("Wait", "5")
optics.run_loop("Proceed", "${item}", "a|b|c")
```

`condition` takes pairs of a condition and a module, then an optional else module. `run_loop` takes the module first, then a count or pairs of a variable and its values. It returns one list of results for each pass. See [Condition](/docs/reference/keywords/flow#condition) and [Run Loop](/docs/reference/keywords/flow#run-loop).

### Read data and compute values

```python
data = optics.read_data("${users}", "users.csv", "status=='active';select=username,email")
print(f"Data: {data}")
token = optics.read_data("${token}", "ENV:API_TOKEN")

optics.add_element("var1", "10")
optics.add_element("var2", "20")
result = optics.evaluate("${result}", "${var1} + ${var2}")
print(f"Result: {result}")

future_date = optics.date_evaluate("${future_date}", "2026-10-10", "+1 day", "%Y-%m-%d")
past_date = optics.date_evaluate("${past_date}", "2026-10-10", "-7 days")
```

The first value of `read_data`, `evaluate` and `date_evaluate` is the variable to write. Each method also returns the value. A relative file path starts at `project_path`. `read_data` takes a file or `ENV:NAME` only. A list of rows raises `TypeError`. See [Read Data](/docs/reference/keywords/flow#read-data).

### Call APIs

`add_api` loads API definitions from a YAML file or a dict. A relative path starts at `project_path`. The definitions replace the ones the session had. A dict can have the top-level `api` key or start at `collections`.

```python
optics.add_api("api.yaml")
response = optics.invoke_api("users.get_user")
print(f"API response: {response}")
```

`invoke_api` takes the API as `collection.api` and returns the `status_code`, `headers`, `body` and `elapsed_ms` of the response. See [Invoke API](/docs/reference/keywords/flow#invoke-api) for the YAML format.

## Manage sessions

`setup` creates a session, and `quit` ends it:

```python
from optics_framework import Optics

optics = Optics()
optics.setup(config=config)

optics.launch_app(app_identifier="com.example.app")
optics.press_element("button")

optics.quit()
```

`Optics` is a context manager. `with Optics(config) as optics:` calls `quit()` when the block ends, also after an exception. `quit()` logs an error instead of raising it, and does nothing when there is no session.

Each `Optics` object has its own session, so you can drive two apps at once:

```python
from optics_framework import Optics

optics1 = Optics(config=config1)
optics2 = Optics(config=config2)

optics1.launch_app(app_identifier="com.example.app")
optics2.launch_app(app_identifier="com.example.admin")

optics1.quit()
optics2.quit()
```

## Handle errors

Most failures raise `OpticsError`. It has the error `code`, a `message`, and `details` that can be `None`. Compare `code` with the `Code` enum:

```python
from optics_framework import Optics
from optics_framework.common.error import OpticsError, Code

with Optics(config) as optics:
    try:
        optics.press_element("nonexistent_element")
    except OpticsError as e:
        print(f"Error code: {e.code}")
        print(f"Error message: {e.message}")
        print(f"Error details: {e.details}")
        if e.code == Code.E0101:
            print("Driver not initialized")
        elif e.code == Code.E0201:
            print("Element not found")
        else:
            print(f"Other error: {e.message}")
```

- `E0201` means the element wasn't found. When you pass a list of values, Optics tries the next value only after `E0201`, another `E02` code or `X0201`. When every value fails, the error carries the code of the last one.
- `E0101` means there is no driver session. `add_module` and `add_error_definitions` raise it when you call them before `setup`.
- A method other than those two raises `ValueError: Setup not complete. Call setup() first.` before `setup`.
- A value that isn't a string raises `TypeError`.
- An assertion can also raise `AssertionError`.

See [Error codes](/docs/reference/errors) for every code.

## Complete example

This script signs in and keeps the screenshot. It ends the session even when a step fails:

```python
from optics_framework import Optics
from optics_framework.common.error import OpticsError

def test_login_flow():
    config = {
        "driver_sources": [
            {"appium": {"enabled": True, "url": "http://localhost:4723"}}
        ],
        "elements_sources": [
            {"appium_find_element": {"enabled": True}}
        ],
        "project_path": "/path/to/project"
    }

    optics = Optics()

    try:
        optics.setup(config=config)
        optics.launch_app(app_identifier="com.example.app")

        optics.add_element("username", "//input[@id='username']")
        optics.add_element("password", "//input[@id='password']")
        optics.add_element("login_button", "//button[@id='login']")

        optics.enter_text(optics.get_element_value("username"), "testuser")
        optics.enter_text(optics.get_element_value("password"), "testpass")
        optics.press_element(optics.get_element_value("login_button"))

        optics.validate_element("Welcome")

        screenshot = optics.capture_screenshot()
        print(f"Screenshot: {len(screenshot)} characters of base64")

    except OpticsError as e:
        print(f"Test failed: {e.message}")
        raise
    finally:
        optics.quit()

if __name__ == "__main__":
    test_login_flow()
```

## Good practice

- Keep the config in a YAML file, apart from the test code. Read passwords and tokens from environment variables, not from the code.
- End every session. Use a `with` block, or call `quit()` in `finally`.
- Keep locators in one place under clear names, and give fallbacks as lists.
- Catch `OpticsError`, not every exception, and log its `code` and `message`.
- Put shared steps in helper functions, and group tests in Python modules.

## See also

- [Use Optics in Robot Framework](/docs/create/robot)
- [Generate pytest code from a suite](/docs/advanced/generate)
- [Keyword reference](/docs/reference/keywords/)
