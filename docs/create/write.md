---
title: Write a test suite
nav: Write it
summary: Write test cases, modules and elements by hand, in CSV or YAML.
level: Beginner
time: 10 min
---

Writing a suite by hand is the most direct way to create tests, and it's how most edits happen once a suite exists. You need a text editor or a spreadsheet app. This page covers the three files a suite is made of, in the order we recommend writing them.

## Set up a project

Create a project with `optics init`, then fill in its files:

```shell
$ optics init birch-tests
```

Pick **(Blank project)** when asked for a template. You get this layout:

```tree
birch-tests/
├── config.yaml                  # what to drive
├── test_cases/test_cases.csv    # which flows run
├── modules/modules.csv          # the steps
└── test_data/elements.csv       # names for things on screen
```

Optics finds each file by what's inside it, not by its name or folder. A CSV whose first row is `test_case,test_step` is a test-cases file wherever it sits. You can split a big suite across several files of each kind. If you haven't set up `config.yaml` yet, [Install Optics](/docs/get-started/install) and the [platform guides](/docs/platforms/) show what to put in it.

## Choose CSV or YAML

Both formats load into the same suite, and one project can hold both. Pick the one your team reads best:

- **CSV** opens in any spreadsheet. Each step is one row, so a diff shows exactly which step changed.
- **YAML** keeps a whole flow in one indented file, which reads well in a code editor.

The examples on this page show both. Choose a tab and the rest of the page follows. [Write tests in YAML](/docs/create/yaml) covers the YAML rules in detail.

## Name the things on screen

Start with **elements**: a name for each field, button or label your test touches, and how to find it.

:::tabs{group="format"}
::tab[CSV]
```csv title="test_data/elements.csv"
Element_Name,Element_ID
email_field,//*[@resource-id='com.birch.shop:id/email']
password_field,//*[@resource-id='com.birch.shop:id/password']
sign_in,//*[@resource-id='com.birch.shop:id/login']
sign_in,Sign in
search_bar,Search Birch
password,correct-horse
```
::tab[YAML]
```yaml title="birch.yaml"
Elements:
  email_field: "//*[@resource-id='com.birch.shop:id/email']"
  password_field: "//*[@resource-id='com.birch.shop:id/password']"
  sign_in: ["//*[@resource-id='com.birch.shop:id/login']", "Sign in"]
  search_bar: Search Birch
  password: correct-horse
```
:::

The header must be exactly `Element_Name,Element_ID`. Repeat a name, or give a list in YAML, to add **fallbacks**: Optics tries the values in order until one works. Here `sign_in` is found by its id, or by its text if the id changes.

A value can be an XPath, visible text, or the file name of a picture of the element. [Define elements](/docs/elements/define) explains each kind and when to use it.

:::tip
Elements can hold test data too, such as `email,ava@birch.shop`. Keeping data next to locators means one file holds everything that changes between environments.
:::

## Write the steps as modules

A **module** is a named list of steps. Each step is one [keyword](/docs/reference/keywords/) and its values.

:::tabs{group="format"}
::tab[CSV]
```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2
Launch Birch,Launch App
Sign In,Enter Text,${email_field},ava@birch.shop
Sign In,Enter Text,${password_field},${password}
Sign In,Press Element,${sign_in}
Sign In,Assert Presence,Picked for you
Add To Cart,Press Element,${search_bar}
Add To Cart,Enter Text Direct,trail runner
Add To Cart,Press Element,Trail Runner 2
Add To Cart,Press Element,Add to cart
Add To Cart,Assert Presence,Added to cart
```
::tab[YAML]
```yaml title="birch.yaml"
Modules:
  - Launch Birch:
      - Launch App
  - Sign In:
      - Enter Text ${email_field} ava@birch.shop
      - Enter Text ${password_field} ${password}
      - Press Element ${sign_in}
      - Assert Presence "Picked for you"
  - Add To Cart:
      - Press Element ${search_bar}
      - Enter Text Direct "trail runner"
      - Press Element "Trail Runner 2"
      - Press Element "Add to cart"
      - Assert Presence "Added to cart"
```
:::

How a step is read:

- **Keyword names** are case-insensitive. `Press Element`, `press element` and `press_element` all work.
- **Values** fill the keyword's parameters in order. Add more `param_3`, `param_4` columns when a keyword needs them. Empty cells are skipped.
- **`${name}`** is replaced by the element called `name`. It only works when it's the whole value: `${email_field}` works, `Hello ${name}` is typed exactly as written.
- **Named values** like `index=1` or `timeout_str=20` set one parameter by name, so you can skip the ones in between. They only work with the keyword's real parameter names, which the [keyword reference](/docs/reference/keywords/) lists.
- **Plain text** such as `Add to cart` is used as-is. For `Press Element`, plain text means "the element showing this text".

:::mistake[Values with commas in CSV]
A comma ends a CSV cell. Wrap a value that contains commas in double quotes, and double any quotes inside it: `"{""script"": ""mobile: pressKey""}"`. Spreadsheet apps do this for you when they save as CSV.
:::

### Wait for the screen before you act

Action keywords like `Press Element` and `Enter Text` act on the screen as it is at that moment. They don't wait for a page to finish loading. After a step that changes screens, add a check that waits, such as `Assert Presence` (waits up to 30 seconds by default). The `Sign In` module above does this with `Assert Presence,Picked for you`.

## Combine modules into test cases

A **test case** is a flow made of modules, run in order. List one row per module:

:::tabs{group="format"}
::tab[CSV]
```csv title="test_cases/test_cases.csv"
test_case,test_step
Suite Setup,Launch Birch
Shopper can buy running shoes,Sign In
Shopper can buy running shoes,Add To Cart
```
::tab[YAML]
```yaml title="birch.yaml"
Test Cases:
  - Suite Setup:
      - Launch Birch
  - Shopper can buy running shoes:
      - Sign In
      - Add To Cart
```
:::

A test case named **Suite Setup** runs once before the others, and **Suite Teardown** runs once after them. [Organise a suite](/docs/create/organise) covers setup, teardown and sharing modules.

## Check the suite, then run it

Check that every keyword exists and every `${name}` is defined, without touching the device:

```shell
$ optics dry_run birch-tests
```

::scene{name="dryrun" caption="A dry run catches a mistyped keyword and suggests the right one, before anything runs on a device."}

When the dry run passes, run the suite for real:

```shell
$ optics execute birch-tests
```

## See also

- [Keyword reference](/docs/reference/keywords/)
- [Define elements](/docs/elements/define)
- [Project files reference](/docs/reference/files)
- [Record a test](/docs/create/record) to build modules by doing the flow
