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

The suite reads `config.yaml`, so the same suite style works for a desktop app with a [desktop config](https://optics-framework.org/docs/platforms/desktop#write-config-yaml). On a desktop, `Press Keycode` takes a key combination such as `primary+a`.

Run it like any Robot suite:

```shell
$ robot checkout.robot
```

## How Optics keywords behave in Robot

- **Setup takes the config's contents, not its path.** Read the file with `Get File` as shown above, then pass the text to `Setup`. If you use image elements, add `project_path: .` to the config so Optics can find the pictures.
- **Pass fallbacks as a list.** `Create List` builds the values to try in order. Writing several plain arguments fills the keyword's next parameters instead.
- **Separate several elements with a pipe** inside one argument: `Picked for you|Search Birch`.
- **Named arguments use the Python names**: `timeout=20`, `rule=any`, `index=1`.
- **There is no `store_as`.** Keep the return value in a Robot variable: `${price}=    Get Text    ${PRICE_LABEL}`, then `Assert Text    ${CART_TOTAL}    ${price}`. Assert Text fails on different text.
- **`Go Back`** goes back one screen, and **`Is Element`** accepts the states `checked` and `unchecked`.
- **Robot replaces `${…}` itself.** To pass an Optics variable to `Evaluate` or `Condition`, escape it: `\${total}`.
- **`Sleep` and `Evaluate` exist in Robot's BuiltIn library too.** Robot warns and uses the Optics version, which only accepts whole seconds. Write `BuiltIn.Sleep    2s` or `Optics.Sleep    2` to be explicit.

The [keyword reference](https://optics-framework.org/docs/reference/keywords/) lists every keyword. The Python-only keywords in [Use Optics from Python](https://optics-framework.org/docs/create/python#python-only-methods), such as `Add Element` and `Add Module`, work in Robot too.

## Import the library

Import the `Optics` class by its full path:

```robot
*** Settings ***
Library    optics_framework.optics.Optics
```

To give it a shorter name, add `WITH NAME` and the name:

```robot
*** Settings ***
Library    optics_framework.optics.Optics    WITH NAME    Optics
```

Robot creates one Optics library for the whole run. The session stays open across test cases and suites until `Quit`. A new `Setup` replaces it.

## Set up the session

`Setup    config=…` takes the config as JSON or YAML text. Keep it in a variable:

```robot
*** Settings ***
Library    optics_framework.optics.Optics

*** Variables ***
${CONFIG}    {"driver_sources": [{"appium": {"enabled": true, "url": "http://localhost:4723"}}], "elements_sources": [{"appium_find_element": {"enabled": true}}]}

*** Test Cases ***
Test With Config
    Setup    config=${CONFIG}
    Launch App    com.example.app
    Quit
```

`Setup From File` takes the path of a JSON or YAML file:

```robot
*** Test Cases ***
Test With YAML Config
    Setup From File    config.yaml
    Launch App    com.example.app
    Quit
```

For a desktop app, give the Appium driver the desktop, `automationName: Xa11y` and the app. Run Appium with `appium-xa11y-driver` on the machine that shows the app:

```robot
*** Settings ***
Library    optics_framework.optics.Optics

*** Variables ***
${CONFIG}    {"driver_sources": [{"appium": {"enabled": true, "url": "http://127.0.0.1:4723", "capabilities": {"platformName": "Mac", "automationName": "Xa11y", "app": "com.apple.TextEdit"}}}], "elements_sources": [{"appium_find_element": {"enabled": true}}, {"appium_page_source": {"enabled": true}}, {"appium_screenshot": {"enabled": true}}]}

*** Test Cases ***
Type A Note
    Setup    config=${CONFIG}
    Launch App
    Enter Text    //text_area    Hello from Optics
    Assert Text    //text_area    Hello from Optics
    Press Keycode    cmd+a
    Enter Text Using Keyboard    <backspace>
    Close And Terminate App
    Quit
```

`Press Keycode` takes a key combination: `cmd+a` on macOS, `ctrl+a` on Linux and Windows, or `primary+a` on all three.

`Setup    config=config.yaml` doesn't read the file. It fails with `Missing required configuration key: driver_sources`. Use `Setup From File` for a path.

`Setup` also takes the deprecated `driver_sources`, `elements_sources`, `text_detection` and `image_detection` arguments as Python literals. Optics logs a warning. Use `config=` instead. See [Configure the session](https://optics-framework.org/docs/create/python#configure-the-session) for every option.

## Examples by task

Each keyword takes the parameters of the Python method, in the same order. See [Every method](https://optics-framework.org/docs/create/python#every-method).

```robot
*** Settings ***
Library    optics_framework.optics.Optics
Suite Setup    Setup From File    config.yaml
Suite Teardown    Quit

*** Test Cases ***
App Keywords
    Launch App    com.example.app
    ${version}=    Get App Version
    Log    App version: ${version}
    ${session_id}=    Get Driver Session Id
    Log    Session ID: ${session_id}

Tap And Type
    Press Element    Submit
    ${fallbacks}=    Create List    button1    button2    //button[@id='submit']
    Press Element    ${fallbacks}
    Press By Coordinates    100    200
    Press By Percentage    50    50
    Press Element With Index    button    0
    Enter Text    username_field    testuser
    Enter Text Direct    text
    Enter Text Using Keyboard    <enter>
    Enter Number    number_field    123
    Clear Element Text    input_field

Swipe And Scroll
    Swipe    540    1500    up    800
    Swipe By Percentage    50    50    up    25
    Swipe Until Element Appears    target_element    direction=up
    Swipe From Element    source_element    left    300
    Scroll    down
    Scroll Until Element Appears    target_element    direction=down
    Scroll From Element    source_element    down    400

Keys And Scripts
    Press Keycode    4
    ${text}=    Get Text    element_id
    Log    Element text: ${text}
    Sleep    2
    ${result}=    Execute Script    {"script": "mobile: shell", "args": {"command": "echo hello"}}
    Log    Script result: ${result}

Check The Screen
    Validate Element    welcome_message
    Assert Presence    element1|element2    rule=all
    Assert Presence    element1|element2    rule=any
    ${found}=    Validate Screen    header|content|footer
    ${screenshot}=    Capture Screenshot
    Log    Screenshot: ${screenshot}
    ${page_source}=    Capture Pagesource
    Log    Page source: ${page_source}
    ${elements}=    Get Interactive Elements
    Log    Elements: ${elements}

Variables And Flow
    Add Element    submit_button    //button[@id='submit']
    ${element_value}=    Get Element Value    submit_button
    Log    Element value: ${element_value}
    Press Element    ${element_value}
    Add Element    status    ready
    Add Element    count    15
    ${steps}=    BuiltIn.Evaluate    [("Press Element", ["Continue"])]
    Add Module    Proceed    ${steps}
    Condition    \${status} == 'ready'    Proceed
    Condition    \${count} > 10    Proceed
    Run Loop    Proceed    3
    Evaluate    \${total}    \${count} * 2
    ${future_date}=    Date Evaluate    \${future_date}    2026-10-10    +1 day
    ${data}=    Read Data    \${users}    users.csv    status=='active';select=username,email
    Add API    api.yaml
    ${response}=    Invoke API    users.get_user
    Log    API response: ${response}
```

Good to know:

- Robot passes every argument as text, so numbers such as `100` work.
- Optics doesn't look up `${name}` in action keywords. Pass the list that `Get Element Value` returns, or a Robot variable that holds the locator.
- `Condition` and `Run Loop` run modules that you define with `Add Module`. `Add Module` takes a list of `(keyword, [values])` pairs. Here, `BuiltIn.Evaluate` builds that list. A plain `Evaluate` or `Sleep` runs the Optics keyword.
- `Read Data`, `Evaluate` and `Date Evaluate` take the variable to write first. `Invoke API` takes `collection.api`.

## Organize suites

Put shared steps in a resource file and import it in each suite:

`keywords.robot`:

```robot
*** Settings ***
Library    optics_framework.optics.Optics

*** Keywords ***
Login
    [Arguments]    ${username}    ${password}
    Enter Text    username_field    ${username}
    Enter Text    password_field    ${password}
    Press Element    login_button
    Validate Element    welcome_message

Logout
    Press Element    logout_button
    Validate Element    login_screen
```

`login_test.robot`:

```robot
*** Settings ***
Documentation    Example test suite using Optics Framework
Library    optics_framework.optics.Optics
Resource    keywords.robot

*** Variables ***
${CONFIG_FILE}    config.yaml
${APP_PACKAGE}    com.example.app

*** Test Cases ***
Login Test
    [Documentation]    Sign in and sign out
    [Tags]    smoke    login
    Setup From File    ${CONFIG_FILE}
    Launch App    ${APP_PACKAGE}
    Login    testuser    testpass
    Logout
    Quit
```

## Run suites

```shell
$ robot tests/login_test.robot
$ robot --include smoke tests/
$ robot --exclude flaky tests/
$ robot -v CONFIG_FILE:config.yaml -v APP_PACKAGE:com.example.app tests/
$ robot --outputdir results tests/
```

`--include` and `--exclude` pick test cases by tag. `-v` sets a variable from the command line. `--outputdir` sets where Robot writes its log and report.

## Good practice

- Keep the config in a YAML file, and load it with `Setup From File`.
- Keep locators and test data in variables, and large data sets in files. For many data sets, use Robot's data-driven tests.
- Put shared keywords in resource files, group test cases in suites, and tag them, for example `smoke` or `flaky`.
- Handle expected failures with Robot's built-in keywords, such as `Run Keyword And Return Status`.
- Add `[Documentation]` to each test case.

## Generate Robot code from a suite

If you already have a CSV or YAML suite, `optics generate` can write a starting `.robot` file from it. See [Generate pytest or Robot code](https://optics-framework.org/docs/advanced/generate).

## See also

- [Use Optics from Python](https://optics-framework.org/docs/create/python)
- [config.yaml reference](https://optics-framework.org/docs/reference/config)
