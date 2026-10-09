---
title: Conditions and loops
summary: Run different modules depending on what's on screen or in a variable, and handle optional screens such as popups.
level: Advanced
time: 8 min
---

Most tests follow one path. Sometimes the app doesn't: a welcome popup appears only on first launch, a returning user skips sign-in, or a feature is behind a flag. Optics handles these with three keywords: `Detect And Press` for optional taps, `Condition` for branches, and `Execute Module` for running one module from another.

## Tap something only if it appears

For a popup that may or may not show, `Detect And Press` waits for the element and taps it if it appears. If it doesn't, the step still passes:

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2
Launch Birch,Launch App
Launch Birch,Detect And Press,Allow notifications,5
Launch Birch,Detect And Press,Not now,5
```

The second value is how many seconds to wait (30 by default). Keep it short: the step always waits the full time when the element never appears.

## Branch with Condition

`Condition` checks one or more conditions in order and runs the module paired with the first one that's true:

```text
Condition, <condition 1>, <module 1>, <condition 2>, <module 2>, …, <otherwise module>
```

The last module, with no condition in front of it, runs when nothing matched. It's optional.

### Branch on what's on screen

A condition can be a **module name**. Optics runs that module: if it passes, the condition is true. Write a small module that checks for something, and use it as the test:

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2,param_3
Is Signed In,Assert Presence,Picked for you,5
Start Shopping,Condition,Is Signed In,Go To Search,Sign In
```

If the home screen's *Picked for you* appears within 5 seconds, Optics runs `Go To Search`. Otherwise it runs `Sign In`. Put `!` in front to flip a condition: `Condition,!Is Signed In,Sign In`.

:::warning
The checking module really runs, so keep it to checks with short timeouts. A failed check waits its full timeout, and an action in it would change the app.
:::

### Branch on a variable

A condition can also be an **expression** that compares variables:

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2,param_3,param_4,param_5
Choose Flow,Condition,${account_type} == 'business',Business Checkout,${account_type} == 'gift',Gift Checkout,Standard Checkout
```

Optics puts each variable's value in quotes before checking, so always compare with **quoted text**: `${account_type} == 'business'`, `${count} == '3'`.

### Compare numbers

Because values are compared as text, `${count} > 5` fails. Compute the comparison with `Evaluate` first, then check its result:

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2,param_3
Check Cart,Evaluate,cart_is_big,${count} > 5
Check Cart,Condition,${cart_is_big} == 'True',Offer Free Shipping
```

`Evaluate` puts values into the expression without quotes, so `${count} > 5` works there and stores `True` or `False`. Declare `cart_is_big,placeholder` in your elements file for dry runs.

## Run one module from another

`Execute Module` runs a module's steps as part of another module:

```csv title="modules/modules.csv"
module_name,module_step,param_1
Buy Trail Runners,Execute Module,Sign In
Buy Trail Runners,Execute Module,Search For Shoes
Buy Trail Runners,Press Element,Add to cart
```

A module name written on its own as a step doesn't run that module. Use `Execute Module`.

## Rules for modules run by these keywords

Modules run by `Condition`, `Execute Module` and [`Run Loop`](/docs/advanced/data-driven) follow simpler rules than top-level steps:

- Each element uses only its **first value**. Fallbacks don't apply.
- **`name=value` parameters aren't available.** Give values in order: `Assert Presence,Picked for you,5`, not `timeout_str=5`.
- Their steps don't appear separately in the run tree. A failure message names the step that failed.

If a branch needs fallbacks, give it its own test case instead and choose which test cases run with `include` and `exclude` in `config.yaml`.

## See also

- [Variables](/docs/advanced/variables)
- [Data-driven tests](/docs/advanced/data-driven)
- [Flow control keywords](/docs/reference/keywords/flow)
