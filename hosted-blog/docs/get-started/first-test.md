# Write your first test

> Build a test from scratch that signs in to an online store and adds a product to the cart.

You'll write a complete test by hand: open a store, sign in, add a backpack to the cart, and check that it worked. Along the way you'll meet the four files every Optics project uses, and see what happens when a test fails.

The test runs in a browser against [Sauce Labs' demo store](https://www.saucedemo.com), a public site built for practising test automation. You don't need a phone, an emulator or an account.

**Before you begin:**
Install Optics and the Playwright engine. If you ran the [quickstart](https://optics-framework.org/docs/get-started/quickstart), you already have both.

```shell
$ optics setup --install playwright
```

### Create an empty project

```shell
$ optics init first-test
```

Optics asks which template to start from. Type `1` for **(Blank project)** and press Enter. You get a folder with empty files and headers already in place:

```tree
first-test/
├── config.yaml
├── test_cases/test_cases.csv
├── modules/modules.csv
└── test_data/elements.csv
```

The folder names are only a convention. Optics recognises each file by the column names in its first row, so you can move files around later.

### Tell Optics to use a browser

`config.yaml` says what Optics drives. Replace its contents with this:

`config.yaml`:

```yaml
driver_sources:
  - playwright:
      enabled: true

elements_sources:
  - playwright_find_element:
      enabled: true
  - playwright_page_source:
      enabled: true
  - playwright_screenshot:
      enabled: true

log_level: WARNING
```

`driver_sources` picks the browser driver. `elements_sources` lists the ways Optics may look at the page: asking the browser directly, reading the page's HTML, and taking screenshots. `log_level: WARNING` keeps the terminal quiet so you can read the results.

### Name the things you'll touch

Before writing steps, give each field and button a name. Open `test_data/elements.csv` and add four rows under the header:

`test_data/elements.csv`:

```csv
Element_Name,Element_ID
username_field,//input[@id='user-name']
password_field,//input[@id='password']
login_button,//input[@id='login-button']
backpack_add_button,//button[@id='add-to-cart-sauce-labs-backpack']
```

The left column is the name you'll use in steps. The right column tells Optics how to find it. These are **XPaths**: paths into the page's structure. `//input[@id='user-name']` means "the input whose id is `user-name`".

**Finding an element's id:**
Open the store in Chrome, right-click a field and choose **Inspect**. The highlighted HTML shows the element's `id`. You don't always need XPaths: [Define elements](https://optics-framework.org/docs/elements/define) shows how to use visible text and pictures instead.

### Write the steps

Steps live in **modules**: small, reusable groups of actions. Open `modules/modules.csv` and add three modules:

`modules/modules.csv`:

```csv
module_name,module_step,param_1,param_2
Open the store,Launch App,https://www.saucedemo.com
Sign in,Enter Text,${username_field},standard_user
Sign in,Enter Text,${password_field},secret_sauce
Sign in,Press Element,${login_button}
Sign in,Assert Presence,Products
Add the backpack to the cart,Press Element,${backpack_add_button}
Add the backpack to the cart,Assert Presence,Remove
```

Read each row left to right: the module it belongs to, a **keyword** (the action), then the values the keyword needs. `${username_field}` refers to the name you defined in the previous step. `Products` and `Remove` are plain text that should appear on screen: the products page title, and the label the backpack's button changes to once it's in the cart.

**Enter Text fails in browsers on Optics 1.10.5:**
On 1.10.5, every Enter Text in a browser fails with `Object of type Locator is not JSON serializable`. A fix is on its way in the next release. Until you upgrade, click the field and type into it in two steps. Replace the two `Enter Text` rows with these four:

`modules/modules.csv`:

```csv
Sign in,Press Element,${username_field}
Sign in,Enter Text Direct,standard_user
Sign in,Press Element,${password_field}
Sign in,Enter Text Direct,secret_sauce
```

### Turn the modules into a test case

A **test case** is a named flow made of modules, run in order. Open `test_cases/test_cases.csv`:

`test_cases/test_cases.csv`:

```csv
test_case,test_step
Shopper can add a backpack,Open the store
Shopper can add a backpack,Sign in
Shopper can add a backpack,Add the backpack to the cart
```

### Check the test without running it

`optics dry_run` reads every file and checks that each keyword exists and each `${name}` is defined. It doesn't click anything, so it's a quick way to catch typos:

```shell
$ optics dry_run first-test
```

```terminal
Test Suite
└── Shopper can add a backpack                                  |  0.00s |    PASS
    ├── Open the store                                          |  0.00s |    PASS
    ├── Sign in                                                 |  0.00s |    PASS
    └── Add the backpack to the cart                            |  0.00s |    PASS
╭──────────────────────────────────────────────────────╮
│ Total Test Cases: 1 | Passed: 1 | Failed: 0          │
╰──────────────────────────────────────────────────────╯
```

### Run it

```shell
$ optics execute first-test
```

A browser window opens, signs in and adds the backpack. The terminal prints every step with its time:

```terminal
Test Suite
└── Shopper can add a backpack                                     |  1.88s |    PASS
    ├── Open the store                                             |  0.85s |    PASS
    │   └── Launch App (https://www.saucedemo.com)                 |  0.85s |    PASS
    ├── Sign in                                                    |  0.82s |    PASS
    │   ├── Enter Text (//input[@id='user-name'], standard_user)   |  0.17s |    PASS
    │   ├── Enter Text (//input[@id='password'], secret_sauce)     |  0.09s |    PASS
    │   ├── Press Element (//input[@id='login-button'])            |  0.11s |    PASS
    │   └── Assert Presence (Products)                             |  0.45s |    PASS
    └── Add the backpack to the cart                               |  0.21s |    PASS
        ├── Press Element (//button[@id='add-to-cart-sauce-labs... |  0.11s |    PASS
        └── Assert Presence (Remove)                               |  0.09s |    PASS
╭──────────────────────────────────────────────────────╮
│ Total Test Cases: 1 | Passed: 1 | Failed: 0          │
╰──────────────────────────────────────────────────────╯
```

You've written and run a test. Everything Optics produced is in `first-test/execution_output/`: a screenshot taken before each step, and `junit_output.xml`, a standard report your CI can read.

## Watch a test fail

A test is only useful if it fails when the app is broken. Pretend the store renamed its button: change the last row of `modules.csv` to look for `Removed` instead of `Remove`, then run the test again.

```terminal
    └── Add the backpack to the cart                               | 20.74s |    FAIL
        ├── Press Element (//button[@id='add-to-cart-sauce-labs... |  0.12s |    PASS
        └── Assert Presence (Removed)                              | 20.51s |    FAIL
╭──────────────────────────────────────────────────────╮
│ Total Test Cases: 1 | Passed: 0 | Failed: 1          │
╰──────────────────────────────────────────────────────╯
╭─────────────────── Failure details ──────────────────╮
│ Shopper can add a backpack → step 'Assert Presence   │
│ (Removed)' — Keyword 'Assert Presence' failed after  │
│ fallback attempts                                    │
╰──────────────────────────────────────────────────────╯
```

The run is slower this time because Assert Presence keeps looking for the text, in case the page is still loading, before it gives up. The tree shows exactly which step failed, and the **Failure details** box names it. The command also exits with code `1`, which is how CI knows to mark the build red. Change `Removed` back to `Remove` before you continue.

## Make the test survive a redesign

Locators break when developers rename things. Optics lets an element have more than one value and tries them in order until one works. Add a second row for `login_button` that uses the button's visible text, and break the first one on purpose:

`test_data/elements.csv`:

```csv
Element_Name,Element_ID
username_field,//input[@id='user-name']
password_field,//input[@id='password']
login_button,//input[@id='sign-in-button']
login_button,Login
backpack_add_button,//button[@id='add-to-cart-sauce-labs-backpack']
```

Run the test again. It still passes: the XPath finds nothing, so Optics tries the text `Login` and clicks the button. Put the correct id back afterwards, but keep the text row as a safety net. [How Optics finds elements](https://optics-framework.org/docs/elements/) explains every fallback.

## What you learned

- A project is a **config** (what to drive), **elements** (names for things on screen), **modules** (steps) and **test cases** (flows).
- Steps are keywords with values. `${name}` refers to an element.
- `optics dry_run` checks your files. `optics execute` runs them and writes results to `execution_output/`.
- An element can have several values, so one broken locator doesn't break the test.

## Next steps

- [How Optics works](https://optics-framework.org/docs/get-started/concepts): The ideas behind what you just built, in more depth.
- [Record a test](https://optics-framework.org/docs/create/record): Build the same test by doing it, one step at a time.
- [Read the results](https://optics-framework.org/docs/run/results): Screenshots, logs and the JUnit report.
- [Set up Android testing](https://optics-framework.org/docs/platforms/android): Run tests on a phone or emulator.
