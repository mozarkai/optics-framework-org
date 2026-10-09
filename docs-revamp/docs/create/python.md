# Use Optics from Python

> Call Optics keywords from pytest or any Python script when a test needs real code.

Every keyword is also a method on the `Optics` class. Use it when a test needs logic the suite files can't express, or when your team already runs everything through pytest. You keep the same fallbacks, OCR and image matching as a CSV suite.

**Note:**
If CSV or YAML files can express your test, prefer them. Anyone on the team can read and review a suite file, and the runner gives you the step tree, screenshots and error detection for free. See [Choose how to create tests](https://optics-framework.org/docs/create/).

## Write a test with pytest

This test signs in to the Sauce Labs demo store, adds a backpack to the cart, and reads the cart badge. It runs as written with `pip install "optics-framework[playwright]" pytest`.

`test_checkout.py`:

```python
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
    optics.press_element("//button[@id='add-to-cart-sauce-labs-backpack']")
    badge = optics.get_text("//span[@data-test='shopping-cart-badge']")
    assert badge == "1"
```

```shell
$ pytest test_checkout.py
```

**Typing and reading text in browsers on Optics 1.10.5:**
On 1.10.5, `enter_text` and `get_text` fail with Playwright (`Object of type Locator is not JSON serializable`). The next release fixes it. Until then, click the field with `press_element` and type with `enter_text_direct`.

## Configure the session

Pass the same lists you'd put in `config.yaml`, as a Python dict. `driver_sources` and `elements_sources` are required. The SDK reads these keys:

| Key | What it's for |
|---|---|
| `driver_sources`, `elements_sources` | What to drive and how to look at the screen. See the [config reference](https://optics-framework.org/docs/reference/config). |
| `text_detection`, `image_detection` | OCR and image matching engines, if you use them. |
| `project_path` | A folder to search for image files and to resolve relative paths in `read_data`. Required for image elements. |
| `execution_output_path` | Where screenshots and results go. |

To reuse a project's `config.yaml`, load it yourself and pass the dict:

```python
import yaml
from optics_framework import Optics

with open("birch-tests/config.yaml") as f:
    config = yaml.safe_load(f)
config["project_path"] = "birch-tests"

with Optics(config) as optics:
    optics.launch_app()
```

Settings such as `ai_self_heal`, `llm_models` and `log_level` aren't read by the SDK.

## How calls differ from suite files

- **Method names are snake_case.** `Press Element` is `press_element`. Your editor's autocomplete lists them all.
- **Pass every value as a string.** `optics.press_by_coordinates("540", "1600")` works; numbers raise `TypeError`.
- **A list means "try these in order".** `press_element(["//button[@id='login']", "Login"])` tries the XPath, then the text. To check several elements at once, separate them with a pipe in one string: `assert_presence("Products|Your Cart")`.
- **`${name}` isn't looked up** in action methods. Pass the locator itself, or keep your own dict of locators.
- **Methods return values.** `get_text` returns the text, `capture_screenshot` returns a base64 PNG, and `assert_presence` returns `True`. A failed check raises an exception, which fails the pytest test.
- **Some defaults differ.** `assert_presence` and `assert_visibility` wait 60 seconds by default, and `detect_and_press` waits 10.

## Python-only methods

These have no CSV equivalent:

| Method | What it does |
|---|---|
| `add_element(name, value)` | Add a value to a named element, for use in flow-control methods. |
| `get_element_value(name)` | Return the list of values for a named element. |
| `add_module(name, steps)` | Define a module as a list of `(keyword, [values])` pairs, for `run_loop` and `condition`. |
| `add_api(path_or_dict)` | Load API definitions for `invoke_api`. See [Call APIs in a test](https://optics-framework.org/docs/advanced/api-calls). |
| `add_error_definitions(dict)` | Load on-screen error definitions. |
| `capture_and_detect()` | Check the current screen against those definitions and return the matches. |
| `quit()` | End the session. The `with` block calls it for you. |

```python
optics.add_element("term", "trail runner")
optics.add_module("Search", [("Enter Text", ["//input[@type='search']", "${term}"])])
optics.run_loop("Search", "${term}", "trail runner|pace knit")
```

## See also

- [Use Optics in Robot Framework](https://optics-framework.org/docs/create/robot)
- [Generate pytest code from a suite](https://optics-framework.org/docs/advanced/generate)
- [Keyword reference](https://optics-framework.org/docs/reference/keywords/)
