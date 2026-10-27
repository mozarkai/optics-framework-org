# How Optics works

> Learn the five ideas every Optics test is built from, and what happens when a test runs.

An Optics test is data, not code. You write down **what** a person does in plain rows. Optics works out **how** to do each step on the screen in front of it.

## Keywords

A **keyword** is one action or check, such as `Press Element`, `Enter Text` or `Assert Presence`. Every step in a test is one keyword plus the values it needs. Keywords fall into four groups:

| Group | Use it to | Examples |
|---|---|---|
| App management | Open and close the app or website | `Launch App`, `Close And Terminate App` |
| Actions | Tap, type, swipe and press keys | `Press Element`, `Enter Text`, `Scroll` |
| Verification | Check what's on screen | `Assert Presence`, `Validate Element` |
| Flow control | Repeat steps, branch, read data, call APIs | `Run Loop`, `Condition`, `Read Data` |

The same keywords work on every platform. `Press Element` taps on a phone and clicks in a browser. The [keyword reference](https://optics-framework.org/docs/reference/keywords/) lists all of them, and `optics list` prints them in your terminal.

## Elements

An **element** is a name for something on screen, like `sign_in` or `search_bar`. Steps use the name inside `${…}`, and `elements.csv` says how to find it:

`test_data/elements.csv`:

```csv
Element_Name,Element_ID
sign_in,//*[@resource-id='login']
sign_in,Sign in
search_bar,//*[@resource-id='search']
```

Keeping locators in one file means a redesign is a one-line change, not an edit to every test. An element can have several values. `sign_in` above can be found by its id or by its text, and Optics tries them in order until one works.

A value can be an XPath (a path through the app's UI tree), visible text, or the file name of a picture of the element. Elements can also hold plain data, such as a username, so one file holds everything a test might change.

## Modules

A **module** is a named, reusable sequence of steps, like *Sign In* or *Add To Cart*. Write a flow once as a module and reuse it in as many test cases as you like. When the sign-in screen changes, you fix one module.

## Test cases

A **test case** is a flow you want to check, made of modules in order. *Checkout* might run *Sign In*, *Add To Cart* and *Pay*. Each test case passes or fails on its own.

Two names are special. A test case called **Suite Setup** runs before all the others, and **Suite Teardown** runs after them. Use them to launch the app once and close it at the end.

## Configuration

`config.yaml` says what Optics drives and how it may look at the screen. It holds lists of **engines**:

- A **driver** controls the target: Appium for phones and TVs, Playwright or Selenium for browsers, or a Bluetooth keyboard and mouse for locked-down devices.
- **Element sources** are ways to look at the screen: ask the app directly, read its UI tree, or take a screenshot.
- **Text detection** (OCR) and **image detection** are optional. They let Optics find elements on a screenshot when the UI tree can't help.

The tests themselves never mention engines. That's why the same test runs on a phone today and against a different device tomorrow.

## What happens during a run

When you run `optics execute`, Optics:

1. Reads every file in the project folder and decides what each one is from its column names.
2. Runs **Suite Setup**, then each test case in order, then **Suite Teardown**.
3. For each step, takes a screenshot, finds the element, and performs the action.
4. If a step fails, skips the rest of that test case and moves on to the next one. One broken flow doesn't stop the run.
5. At the end, checks the last screen for known error messages, if you've [defined any](https://optics-framework.org/docs/run/error-detection).
6. Writes the results to `execution_output/`, and exits with `0` if every test case passed or `1` if any failed.

### How Optics finds an element

For each value of an element, Optics tries the cheapest ways first. An XPath is looked up in the UI tree. Text is looked up in the UI tree, and if it isn't there, Optics reads a screenshot with OCR. A picture is matched against a screenshot. If everything fails and you've switched on [AI self-heal](https://optics-framework.org/docs/elements/self-heal), an AI model looks at the screen and tries to recover.

[How Optics finds elements](https://optics-framework.org/docs/elements/) covers the full order and how to tune it.

## See also

- [Write your first test](https://optics-framework.org/docs/get-started/first-test)
- [Choose how to create tests](https://optics-framework.org/docs/create/)
- [Project files reference](https://optics-framework.org/docs/reference/files)
- [Glossary](https://optics-framework.org/docs/help/glossary)
