# Keywords

> Every keyword you can use in a step, grouped by what it does.

A keyword is one action or check, such as `Press Element` or `Assert Presence`. Each row of a module is one keyword followed by its parameters. This page covers the rules every keyword shares, then lists all of them.

`modules/modules.csv`:

```csv
module_name,module_step,param_1,param_2
Sign In,Enter Text,${email_field},ana@birch.example
Sign In,Press Element,${sign_in}
Sign In,Assert Presence,Welcome,20
```

## Keyword names

Write keyword names in Title Case in CSV and YAML files: `Press Element`, `Assert Presence`. In `optics live`, the MCP server and Python, the same keyword is written in snake_case: `press_element`, `assert_presence`.

The runner ignores capitalization and collapses spaces, so `Press Element`, `press element` and `press_element` all reach the same keyword. If you misspell a name, the error suggests the closest match. Run `optics list` to print every keyword name in snake_case.

## Parameters

Parameters are positional. They fill the keyword's parameters in the order shown in each parameter table on these pages.

To set a parameter by name, write `name=value`. This works only when `name` is a real parameter of that keyword. Use it to skip parameters you want to leave at their defaults:

```csv
Browse,Press Element,Trail Runner 2,index=1
```

Here `index=1` sets the fifth parameter of Press Element and leaves `repeat`, `offset_x` and `offset_y` at their defaults.

**Common mistake:**
Leaving a cell empty doesn't skip a parameter. Empty cells are dropped, so the next value slides into the empty slot. `Press By Percentage,50,90,,tap_cta` sets `repeat` to `tap_cta` and fails. Write `Press By Percentage,50,90,event_name=tap_cta` instead.

A value like `text=Sign in` or `css=#cart` stays positional, because `text` and `css` aren't parameter names. Values that start with `/`, `//` or `(` are never treated as named, and `==`, `!=`, `<=` and `>=` don't count as `=`.

**Note:**
Steps inside a module that runs through [Execute Module, Run Loop or Condition](https://optics-framework.org/docs/reference/keywords/flow) don't support `name=value`. Write every parameter positionally there.

### Every value is a string

Each keyword receives its parameters as text and converts them itself. Timeouts, counts, `index`, `repeat`, lengths and swipe percentages must be whole numbers. A decimal such as `2.5` fails the step. Timeouts are always in seconds.

## Element arguments

Many keywords take an `element`. Optics looks at the text you pass and decides what kind of locator it is. The checks run in this order, and the first match wins:

| If the value… | Optics reads it as |
|---|---|
| starts with `text=` | Text to find on screen |
| starts with `text_only:` | Text to find with OCR (reading the screenshot) only, skipping the app's UI tree |
| ends with `.png`, `.jpg`, `.jpeg` or `.bmp` | An image file name to find on screen |
| starts with `css=` | A CSS selector |
| starts with `xpath=`, `/`, `//` or `(` | An XPath, a path through the app's UI tree |
| starts with `android.` or `xcui` | A UI class name |
| contains `[` and `]`, starts with `.`, or starts with `#` followed by a letter | A CSS selector |
| anything else | Text to find on screen |

Text is matched against the app's UI tree first, then with OCR if you configured text detection. Image file names are matched by file name only, and Optics finds the file anywhere in your project folder. See [Text and images](https://optics-framework.org/docs/elements/text-and-images) for how matching works.

**Common mistake:**
Plain text that looks like another locator type is read as that type. `(optional)` starts with `(`, so it's read as an XPath. `Price [USD]` and `.com` are read as CSS selectors. Write `text=(optional)`, `text=Price [USD]` or `text=.com` to force text.

Other pitfalls:

- `id:` locators always fail. No element source supports them. Use an XPath such as `//*[@resource-id="com.birch.shop:id/cart"]`.
- The `text=` prefix is understood by the Appium and Playwright element sources. OCR and Selenium search for the whole value, including `text=`, so use it only where you need it.
- The `xpath=` prefix works only on Playwright. Use a bare `//…` XPath on Appium and Selenium.
- `.tif` and `.tiff` files aren't treated as images. Save templates as `.png`.

Most of the time you pass `${name}` instead and define the locator in your elements file. See [Define elements](https://optics-framework.org/docs/elements/define).

## Variables

A cell that is exactly `${name}` is replaced with the value of `name` from your elements file, or from a keyword that wrote it ([Read Data, Evaluate, Run Loop, Invoke API](https://optics-framework.org/docs/reference/keywords/flow)).

When an element has several values, Optics tries each one in order until the element is found. It moves on only when the element isn't found. Any other error fails the step at once. If `name` isn't defined anywhere, the step fails before the keyword runs.

**Common mistake:**
`${name}` is replaced only when it's the whole cell. `Hello ${name}` is typed literally, as `Hello ${name}`. The exceptions are expressions and queries in Evaluate, Condition, Read Data and Invoke API, which replace `${name}` anywhere inside them.

See [Variables](https://optics-framework.org/docs/advanced/variables) for how values are stored and passed between steps.

## Areas of interest

Keywords that find one element take four optional parameters: `aoi_x`, `aoi_y`, `aoi_width` and `aoi_height`. They limit the search to a rectangle of the screen, in percent from 0 to 100. The defaults `0`, `0`, `100`, `100` mean the whole screen.

```csv
Checkout,Press Element,Pay now,aoi_y=50,aoi_height=50
```

This searches the bottom half of the screen only. Assertion keywords don't take an area of interest. See [Area of interest](https://optics-framework.org/docs/elements/area-of-interest).

## Picking one of several matches

`index` picks which match to use when more than one element matches. It starts at `0`, the first match. `index=1` is the second match.

- Image matches are counted top to bottom, then left to right.
- On Appium, `index` doesn't apply to XPath. Write `(//android.widget.Button[@text="Add to cart"])[2]` to pick the second XPath match. XPath counts from 1.
- On Selenium, a non-zero `index` skips the native lookup, so only OCR and image matching can use it.

## Event names

Most action and app keywords take an optional `event_name`. When you set it, Optics records a timestamped event with that label right before the action. Events show in the live console and are sent to an events endpoint if you configured one. They never change whether a step passes.

## Action keywords don't wait

Press Element, Enter Text and the other action keywords look at the current screen once. If the element isn't there yet, the step fails at once. Put an assertion before an action when the screen may still be loading:

```csv
Search,Assert Presence,${search_bar},15
Search,Enter Text,${search_bar},Trail Runner 2
```

Use [Detect And Press](https://optics-framework.org/docs/reference/keywords/actions#detect-and-press) for pop-ups that may or may not appear. Assertion keywords are the only ones that wait. See [Verification keywords](https://optics-framework.org/docs/reference/keywords/verification).

## Keywords that never fail a step

These keywords pass even when you might expect a failure. Don't rely on them as checks.

- **Assert Equality** returns false on a mismatch but never fails.
- **Validate Screen** returns false when nothing is found but never fails.
- **Detect And Press** passes and skips the tap when the element doesn't appear.
- **Force Terminate App** on Appium logs any error and passes.
- **Swipe**, **Press By Coordinates** and **Scroll** on Appium log driver errors and pass. Scroll left or right on Appium does nothing and passes.
- **Assert Presence** and **Assert Visibility** pass without checking when every element you give is a CSS selector, an `id:` locator or a class name.
- **Initialise Setup** does nothing.

Keywords that return a value, such as Get Text, Execute Script and Capture Screenshot, can't store it in a variable from CSV or YAML. The value is returned to you over [`optics serve`](https://optics-framework.org/docs/reference/cli), MCP and [Python](https://optics-framework.org/docs/create/python).

## All keywords

### App management

| Keyword | What it does | Page |
|---|---|---|
| Launch App | Start the app or browser, or bring the app to the front | [Launch App](https://optics-framework.org/docs/reference/keywords/app#launch-app) |
| Start Appium Session | Start a driver session without naming an app | [Start Appium Session](https://optics-framework.org/docs/reference/keywords/app#start-appium-session) |
| Launch Other App | Switch to another app, deep link or URL | [Launch Other App](https://optics-framework.org/docs/reference/keywords/app#launch-other-app) |
| Close And Terminate App | End the session and close the app or browser | [Close And Terminate App](https://optics-framework.org/docs/reference/keywords/app#close-and-terminate-app) |
| Force Terminate App | Kill a specific app | [Force Terminate App](https://optics-framework.org/docs/reference/keywords/app#force-terminate-app) |
| Get App Version | Read the installed app's version | [Get App Version](https://optics-framework.org/docs/reference/keywords/app#get-app-version) |
| Get Driver Session Id | Return the current driver session id | [Get Driver Session Id](https://optics-framework.org/docs/reference/keywords/app#get-driver-session-id) |
| Initialise Setup | Do nothing | [Initialise Setup](https://optics-framework.org/docs/reference/keywords/app#initialise-setup) |

### Actions

| Keyword | What it does | Page |
|---|---|---|
| Press Element | Tap or click an element | [Press Element](https://optics-framework.org/docs/reference/keywords/actions#press-element) |
| Press By Percentage | Tap a point given in percent of the screen | [Press By Percentage](https://optics-framework.org/docs/reference/keywords/actions#press-by-percentage) |
| Press By Coordinates | Tap a pixel coordinate | [Press By Coordinates](https://optics-framework.org/docs/reference/keywords/actions#press-by-coordinates) |
| Detect And Press | Tap an element only if it appears | [Detect And Press](https://optics-framework.org/docs/reference/keywords/actions#detect-and-press) |
| Select Dropdown Option | Open a dropdown and pick an option | [Select Dropdown Option](https://optics-framework.org/docs/reference/keywords/actions#select-dropdown-option) |
| Enter Text | Type into a field | [Enter Text](https://optics-framework.org/docs/reference/keywords/actions#enter-text) |
| Enter Number | Type a number into a field | [Enter Number](https://optics-framework.org/docs/reference/keywords/actions#enter-number) |
| Enter Text Direct | Type into the focused field | [Enter Text Direct](https://optics-framework.org/docs/reference/keywords/actions#enter-text-direct) |
| Enter Text Using Keyboard | Type key by key, or press one special key | [Enter Text Using Keyboard](https://optics-framework.org/docs/reference/keywords/actions#enter-text-using-keyboard) |
| Clear Element Text | Empty a text field | [Clear Element Text](https://optics-framework.org/docs/reference/keywords/actions#clear-element-text) |
| Swipe | Swipe from a pixel point | [Swipe](https://optics-framework.org/docs/reference/keywords/actions#swipe) |
| Swipe By Percentage | Swipe from a point given in percent | [Swipe By Percentage](https://optics-framework.org/docs/reference/keywords/actions#swipe-by-percentage) |
| Swipe From Element | Swipe starting on an element | [Swipe From Element](https://optics-framework.org/docs/reference/keywords/actions#swipe-from-element) |
| Swipe Until Element Appears | Swipe until an element shows up | [Swipe Until Element Appears](https://optics-framework.org/docs/reference/keywords/actions#swipe-until-element-appears) |
| Scroll | Scroll the screen up or down | [Scroll](https://optics-framework.org/docs/reference/keywords/actions#scroll) |
| Scroll From Element | Scroll starting on an element | [Scroll From Element](https://optics-framework.org/docs/reference/keywords/actions#scroll-from-element) |
| Scroll Until Element Appears | Scroll until an element shows up | [Scroll Until Element Appears](https://optics-framework.org/docs/reference/keywords/actions#scroll-until-element-appears) |
| Press Keycode | Send a hardware, system or remote key | [Press Keycode](https://optics-framework.org/docs/reference/keywords/actions#press-keycode) |
| Execute Script | Run a driver command or browser JavaScript | [Execute Script](https://optics-framework.org/docs/reference/keywords/actions#execute-script) |
| Get Text | Read an element's text | [Get Text](https://optics-framework.org/docs/reference/keywords/actions#get-text) |
| Sleep | Wait a number of seconds | [Sleep](https://optics-framework.org/docs/reference/keywords/actions#sleep) |
| Press Checkbox | Deprecated: use Press Element | [Press Checkbox](https://optics-framework.org/docs/reference/keywords/actions#press-checkbox) |
| Press Radio Button | Deprecated: use Press Element | [Press Radio Button](https://optics-framework.org/docs/reference/keywords/actions#press-radio-button) |
| Swipe Seekbar To Right Android | Deprecated: use Swipe From Element | [Swipe Seekbar To Right Android](https://optics-framework.org/docs/reference/keywords/actions#swipe-seekbar-to-right-android) |

### Verification

| Keyword | What it does | Page |
|---|---|---|
| Assert Presence | Fail unless elements exist within a timeout | [Assert Presence](https://optics-framework.org/docs/reference/keywords/verification#assert-presence) |
| Assert Visibility | Fail unless elements are on screen within a timeout | [Assert Visibility](https://optics-framework.org/docs/reference/keywords/verification#assert-visibility) |
| Validate Element | Fail unless one element exists within a timeout | [Validate Element](https://optics-framework.org/docs/reference/keywords/verification#validate-element) |
| Validate Screen | Check for elements without failing | [Validate Screen](https://optics-framework.org/docs/reference/keywords/verification#validate-screen) |
| Is Element | Check that an element is visible, invisible, enabled or disabled | [Is Element](https://optics-framework.org/docs/reference/keywords/verification#is-element) |
| Assert Equality | Compare two values without failing | [Assert Equality](https://optics-framework.org/docs/reference/keywords/verification#assert-equality) |
| Capture Screenshot | Take a screenshot | [Capture Screenshot](https://optics-framework.org/docs/reference/keywords/verification#capture-screenshot) |
| Capture Pagesource | Save the current UI tree | [Capture Pagesource](https://optics-framework.org/docs/reference/keywords/verification#capture-pagesource) |
| Get Interactive Elements | List the elements you can tap or type into | [Get Interactive Elements](https://optics-framework.org/docs/reference/keywords/verification#get-interactive-elements) |
| Get Screen Elements | Take a screenshot and list every element | [Get Screen Elements](https://optics-framework.org/docs/reference/keywords/verification#get-screen-elements) |

### Flow control

| Keyword | What it does | Page |
|---|---|---|
| Execute Module | Run another module | [Execute Module](https://optics-framework.org/docs/reference/keywords/flow#execute-module) |
| Run Loop | Repeat a module a number of times or once per value | [Run Loop](https://optics-framework.org/docs/reference/keywords/flow#run-loop) |
| Condition | Run a module only when a condition is true | [Condition](https://optics-framework.org/docs/reference/keywords/flow#condition) |
| Read Data | Load a value from a CSV or JSON file or an environment variable | [Read Data](https://optics-framework.org/docs/reference/keywords/flow#read-data) |
| Evaluate | Compute an expression and save the result | [Evaluate](https://optics-framework.org/docs/reference/keywords/flow#evaluate) |
| Date Evaluate | Add or subtract days from a date and save it | [Date Evaluate](https://optics-framework.org/docs/reference/keywords/flow#date-evaluate) |
| Invoke API | Call an HTTP API and save values from the response | [Invoke API](https://optics-framework.org/docs/reference/keywords/flow#invoke-api) |

## Deprecated keywords

Press Checkbox and Press Radio Button still work but log a warning. Use [Press Element](https://optics-framework.org/docs/reference/keywords/actions#press-element) instead. Swipe Seekbar To Right Android fails on Appium. Use [Swipe From Element](https://optics-framework.org/docs/reference/keywords/actions#swipe-from-element) instead.

## Where each keyword works

- **CSV and YAML suites, `optics live` and `optics serve`** have every keyword on this page.
- **The MCP server** has every keyword except the flow-control ones. Press By Coordinates and Press By Percentage are hidden there unless you turn them on.
- **Python and Robot Framework** have every keyword except Execute Module, Initialise Setup and the three deprecated ones. Some parameters differ. See [Write tests in Python](https://optics-framework.org/docs/create/python).
- **`optics generate`** skips flow-control keywords and a few others when it converts a suite to code.

## Python and Robot Framework only

These keywords exist only in the [Python library](https://optics-framework.org/docs/create/python) and the [Robot Framework library](https://optics-framework.org/docs/create/robot). The CSV and YAML runner reports them as unknown keywords.

| Keyword | What it does |
|---|---|
| Setup | Create a session from a config dictionary or YAML text |
| Setup From File | Create a session from a config file |
| Quit | End the session |
| Add Element | Add a value to a variable, after any values it already has |
| Get Element Value | Return the list of values for a variable |
| Add API | Load API definitions for Invoke API |
| Add Module | Define a module for Run Loop and Condition |
| Add Testcase | Set the session's test cases |
| Add Error Definitions | Add on-screen error definitions |
| Capture And Detect Errors | Check the current screen for defined errors and return any matches |
| Press Element With Index | Press Element with an index |
