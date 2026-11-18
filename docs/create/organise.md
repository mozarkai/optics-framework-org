---
title: Organise a suite
summary: Structure a growing suite with setup and teardown, shared modules, several files and run selection.
level: Intermediate
time: 8 min
---

A handful of tests fits in three files. A suite that covers a whole app needs a little structure so changes stay small. This page covers the tools Optics gives you for that.

## Open and close the app once

Name a test case **Suite Setup** and it runs once, before every other test case. **Suite Teardown** runs once at the end. Use them to launch and close the app, so each test case can focus on its own flow:

```csv title="test_cases/test_cases.csv"
test_case,test_step
Suite Setup,Launch Birch
Shopper can sign in,Sign In
Shopper can search,Sign In
Shopper can search,Search For Shoes
Suite Teardown,Close Birch
```

```csv title="modules/modules.csv"
module_name,module_step,param_1
Launch Birch,Launch App
Close Birch,Close And Terminate App
```

A name that ends with "Suite Setup" also works, such as `Birch Suite Setup`. Matching ignores case. Setup and teardown run even when you [select which tests run](#run-only-some-test-cases).

A test case whose name ends with **Setup** runs before each test case, and **Teardown** runs after each one. Use them to give each test a fresh start.

If Suite Setup fails, the test cases do not run, and the report shows them as skipped. Suite Teardown still runs. If the per-test setup fails, only its test case is skipped.

:::tip
Give each role to one test case only. Two test cases whose names end with "Setup" stop the run before it starts. A name such as *Setup wizard works* is an ordinary test case, because it does not end with "Setup".
:::

## Reuse modules

A module can appear in as many test cases as you like. Keep each module small and focused on one screen or one task, such as *Sign In*, *Search For Shoes* or *Open Cart*. When that screen changes, you fix one module and every test that uses it follows.

To call one module from inside another, use `Execute Module`:

```csv title="modules/modules.csv"
module_name,module_step,param_1
Buy Trail Runners,Execute Module,Search For Shoes
Buy Trail Runners,Press Element,Trail Runner 2
Buy Trail Runners,Press Element,Add to cart
```

Listing a module's name as a step on its own doesn't work; you need `Execute Module`. Steps inside a module called this way use only the first value of each element, so give important elements a value that's reliable on its own. [Conditions and loops](/docs/advanced/conditions) explains the details.

## Split a suite across files

Optics reads every CSV and YAML file in the project folder and its subfolders, and recognises each by its first row (or top-level key in YAML). So you can split a large suite however suits your team:

```tree
birch-tests/
├── config.yaml
├── checkout/
│   ├── test_cases.csv
│   └── modules.csv
├── search/
│   ├── test_cases.csv
│   └── modules.csv
└── elements/
    ├── shared.csv
    └── checkout.csv
```

When two files define the same thing:

- **Elements** with the same name are merged, and every value becomes a fallback.
- **Modules** and **test cases** with the same name: the one read last wins, and Optics logs a warning. Keep names unique.

:::tip
Optics also reads files inside `execution_output/`. Keep stray CSV or YAML files, and copies of old suites, out of the project folder so they don't get picked up.
:::

## Run only some test cases

Name the test cases to run, or to skip, on the command line. Wildcards `*` and `?` work, and case does not matter:

```shell
$ optics execute birch-tests --include "shopper can*" --exclude "Shopper can pay with a gift card"
```

For a fixed selection, list the names in `config.yaml` instead. A flag replaces these lists for that run:

```yaml title="config.yaml"
include:
  - Shopper can sign in
  - Shopper can search
exclude:
  - Shopper can pay with a gift card
```

Optics applies `include` first, then removes the `exclude` matches. Suite Setup and Suite Teardown always run. A name that matches no test case stops the run before it starts. [Pick test cases](/docs/reference/cli#pick-test-cases) gives the full rules.

## Run the same suite on different devices

Keep one config file in a project. Optics uses the config it finds in the project folder, so two of them would compete. To run the same suite on several targets, keep one config per target outside the project and copy the one you need into place before the run:

```tree
birch/
├── configs/
│   ├── pixel-8.yaml
│   └── chrome.yaml
└── birch-tests/
    ├── config.yaml        # copied from configs/ before each run
    └── …
```

```shell
$ cp configs/pixel-8.yaml birch-tests/config.yaml
$ optics execute birch-tests
```

## Name things so failures explain themselves

The run's tree and the JUnit report use your names, so a good name saves a trip into the files:

- **Test cases** describe an outcome: *Shopper can add a backpack*, not *Test 3*.
- **Modules** describe a task: *Sign In*, *Apply Discount Code*.
- **Elements** describe what's on screen: `sign_in`, `cart_badge`, `promo_code_field`.

## See also

- [Write a test suite](/docs/create/write)
- [Write tests in YAML](/docs/create/yaml)
- [Project files reference](/docs/reference/files)
