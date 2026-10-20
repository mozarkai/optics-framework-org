# Use Optics in Robot Framework

> Import Optics as a Robot Framework library and use its keywords in .robot files.

Optics is also a [Robot Framework](https://robotframework.org) library. If your team already writes `.robot` suites, you can add Optics keywords to them and get its fallbacks, OCR and image matching without changing tools.

## Before you begin

Robot Framework isn't installed with Optics. Add it to the same environment:

```shell
$ pip install robotframework "optics-framework[appium]"
```

Swap `appium` for the engine you use. You also need a `config.yaml` with `driver_sources` and `elements_sources`. Any Optics project's config works.

## Write a suite

`checkout.robot`:

```robot
*** Settings ***
Library           OperatingSystem
Library           optics_framework.optics.Optics
Suite Setup       Open Optics
Suite Teardown    Quit

*** Variables ***
${EMAIL_FIELD}    //*[@resource-id="com.birch.shop:id/email"]

*** Keywords ***
Open Optics
    ${config}=    Get File    ${CURDIR}/config.yaml
    Setup    config=${config}

*** Test Cases ***
Shopper Can Sign In
    Launch App
    Detect And Press    Allow    timeout=5
    Enter Text    ${EMAIL_FIELD}    ava@birch.shop
    ${sign_in}=    Create List    //*[@resource-id="com.birch.shop:id/login"]    Sign in
    Press Element    ${sign_in}
    Assert Presence    Picked for you|Search Birch    timeout=20    rule=any
```

Run it like any Robot suite:

```shell
$ robot checkout.robot
```

## How Optics keywords behave in Robot

- **Setup takes the config's contents, not its path.** Read the file with `Get File` as shown above, then pass the text to `Setup`. If you use image elements, add `project_path: .` to the config so Optics can find the pictures.
- **Pass fallbacks as a list.** `Create List` builds the values to try in order. Writing several plain arguments fills the keyword's next parameters instead.
- **Separate several elements with a pipe** inside one argument: `Picked for you|Search Birch`.
- **Named arguments use the Python names**: `timeout=20`, `rule=any`, `index=1`.
- **Robot replaces `${…}` itself.** To pass an Optics variable to `Evaluate` or `Condition`, escape it: `\${total}`.
- **`Sleep` and `Evaluate` exist in Robot's BuiltIn library too.** Robot warns and uses the Optics version, which only accepts whole seconds. Write `BuiltIn.Sleep    2s` or `Optics.Sleep    2` to be explicit.

The [keyword reference](https://optics-framework.org/docs/reference/keywords/) lists every keyword. The Python-only keywords in [Use Optics from Python](https://optics-framework.org/docs/create/python#python-only-methods), such as `Add Element` and `Add Module`, work in Robot too.

## Generate Robot code from a suite

If you already have a CSV or YAML suite, `optics generate` can write a starting `.robot` file from it. See [Generate pytest or Robot code](https://optics-framework.org/docs/advanced/generate).

## See also

- [Use Optics from Python](https://optics-framework.org/docs/create/python)
- [config.yaml reference](https://optics-framework.org/docs/reference/config)
