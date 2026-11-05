# Generate pytest or Robot code

> Turn a CSV or YAML suite into a pytest or Robot Framework file you can extend with code.

`optics generate` reads a suite and writes the same test as code: a pytest file or a Robot Framework file. Use it when a suite needs logic the files can't express, or when you're moving a suite into a codebase that already runs everything through pytest or Robot.

The generated file is a starting point. Once you edit it, it no longer follows the suite files, so keep the suite as the source of truth for as long as you can.

## Generate a file

```shell
$ optics generate birch-tests
Generated test file: birch-tests/generated/Tests/test_generated.py
Generated requirements file: birch-tests/generated/requirements.txt
```

For Robot Framework:

```shell
$ optics generate birch-tests --framework robot --output checkout.robot
```

| Option | Default | What it does |
|---|---|---|
| `--framework` | `pytest` | `pytest` or `robot`. |
| `--output` | `test_generated.py` or `test_generated.robot` | The file name. It's always written to `<project>/generated/Tests/`. |

The project needs a file named exactly `config.yaml`, plus test cases, modules and an elements file.

## What you get

Each module becomes a function (or Robot keyword), each test case becomes a test, and elements become a dictionary:

`generated/Tests/test_generated.py`:

```python
ELEMENTS = {
    'username_field': "//input[@id='user-name']",
    'login_button': "//input[@id='login-button']",
}

def sign_in(optics: Optics) -> None:
    optics.enter_text(ELEMENTS['username_field'], 'standard_user')
    optics.press_element(ELEMENTS['login_button'])
    optics.assert_presence('Products')

def test_shopper_can_add_a_backpack(optics):
    open_the_store(optics)
    sign_in(optics)
```

Run it with pytest from the `generated/Tests` folder:

```shell
$ pip install -r birch-tests/generated/requirements.txt
$ cd birch-tests/generated/Tests
$ pytest test_generated.py
```

## What isn't converted

- **Only the first value of each element** is used. Fallbacks are dropped. Pass a list to keep them: `optics.press_element([ELEMENTS['login_button'], 'Login'])`.
- **Flow-control keywords** (Run Loop, Condition, Read Data, Evaluate, Invoke API and others) and a few more, such as Select Dropdown Option, aren't converted. Steps that use them are left out of the generated code silently. Check the output against your modules.
- **`store_as` cells** are passed to the method as plain text, such as `get_text(..., 'store_as=price')`, which breaks the call. Use the return value instead. See [Use Optics from Python](https://optics-framework.org/docs/create/python).
- **`${name}` inside other text** is written as typed: `'Hi ${first}!'`.
- **A `${name}` that only exists during the run**, such as a value from `store_as` or Evaluate, stops `optics generate` with "Element 'name' not found in elements".
- **Suite Setup and Suite Teardown** become ordinary tests.
- **Image templates** are copied only if they're in an `input_templates/` folder at the project's top level.

## See also

- [Use Optics from Python](https://optics-framework.org/docs/create/python)
- [Use Optics in Robot Framework](https://optics-framework.org/docs/create/robot)
- [CLI reference](https://optics-framework.org/docs/reference/cli)
