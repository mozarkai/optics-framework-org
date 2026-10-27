# Write tests in YAML

> Keep a whole flow in one indented file, and learn the quoting rules that make YAML steps work.

YAML suites hold the same test cases, modules and elements as CSV, in one file you can read top to bottom. Optics loads both formats into the same suite, so a project can mix them.

## A complete suite in one file

`checkout.yaml`:

```yaml
Test Cases:
  - Suite Setup:
      - Launch Birch
  - Shopper can add trail runners:
      - Sign In
      - Add To Cart

Modules:
  - Launch Birch:
      - Launch App
  - Sign In:
      - Enter Text ${email_field} ava@birch.shop
      - Enter Text ${password_field} ${password}
      - Press Element ${sign_in}
      - Assert Presence "Picked for you"
  - Add To Cart:
      - Press Element "Trail Runner 2"
      - Press Element "Add to cart"
      - Assert Presence "Added to cart" timeout_str=10

Elements:
  email_field: "//*[@resource-id='com.birch.shop:id/email']"
  password_field: "//*[@resource-id='com.birch.shop:id/password']"
  sign_in:
    - "//*[@resource-id='com.birch.shop:id/login']"
    - Sign in
  password: correct-horse
```

Keep `config.yaml` as its own file. You can split the suite into several YAML files, or keep elements in CSV and steps in YAML.

## The rules

### Section names are exact

Write the three top-level keys exactly as `Test Cases`, `Modules` and `Elements`, with that capitalization. Other spellings, such as `test_cases:`, are recognised as a suite file but load nothing, and the run then reports that there are no test cases.

### Each step is one line

A step is a single string: the keyword name, then its values separated by spaces. Optics matches the longest keyword name it knows at the start of the line, so `Press Element Sign in` is read as the keyword `Press Element` with the value `Sign`, then `in` as a second value. Quote any value that contains spaces:

```yaml
- Press Element "Sign in"
- Enter Text ${email_field} "Ava Birch"
```

A step that is exactly a module name runs that module.

### Named values

`name=value` sets one parameter by name, like `timeout_str=10` above. Quote the value if it contains spaces: `event_name="tap sign in"`.

### Expressions with = in them

Optics splits a quoted value on its first `=` to support named values. That breaks quoted expressions that contain `==`. Write such expressions without spaces, and without quotes:

```yaml
# Works
- Condition ${status}=='ready' "Go Home" "Sign In"
# Doesn't work: the quotes around the expression are kept
- Condition "${status} == 'ready'" "Go Home" "Sign In"
```

Quoted values without `=` are fine, such as `"Go Home"`.

### Module names as values

When a keyword takes a module name, such as `Run Loop` or `Execute Module`, quote names that contain spaces: `Run Loop "Search One" term "trail runner|pace knit"`.

### Elements

An element is a single value or a list. A list gives fallbacks, tried in order:

```yaml
Elements:
  sign_in: ["//*[@resource-id='com.birch.shop:id/login']", "Sign in", sign_in.png]
```

Quote XPaths. They contain characters YAML treats specially, such as `[`, `@` and `:`.

## What stays in CSV

- **Error definitions** are CSV only. See [Catch error screens](https://optics-framework.org/docs/run/error-detection).
- **`/save` in `optics live`** always writes CSV, even in a YAML project. Move the steps into your YAML file afterwards, or keep the CSV next to it.

## See also

- [Write a test suite](https://optics-framework.org/docs/create/write), with CSV and YAML side by side
- [Project files reference](https://optics-framework.org/docs/reference/files)
