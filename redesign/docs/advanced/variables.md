# Variables

> Store values, compute new ones during a run, and use them in later steps.

In Optics, a variable is an element that holds a value instead of a locator. You define some in your elements file, and some keywords create or change them while the test runs. Any step can then use the value with `${name}`.

## Define a variable

Add a row to an elements file, like any element:

`test_data/elements.csv`:

```csv
Element_Name,Element_ID
email,ava@birch.shop
search_term,trail runner
discount_code,WELCOME10
```

`modules/modules.csv`:

```csv
module_name,module_step,param_1,param_2
Search,Enter Text,${search_bar},${search_term}
```

## Where ${name} works

| You write | Optics uses |
|---|---|
| `${search_term}` as the whole cell | Each value in turn, the same as [element fallbacks](https://optics-framework.org/docs/elements/define) |
| `Hi ${first}!` or `${first} ${last}` | The first value of each name. An unknown name fails the step. |
| `$${first}` | The text `${first}`, not the value |
| `@:${password}` | The value, typed without `@:` and hidden in logs |

`Evaluate`, `Condition`, the query of `Read Data` and the URL, headers and body of `Invoke API` put in the first value themselves. [Values are text](#values-are-text) shows how they quote it.

`optics live` follows the same rules, so a name inside a longer value works in a recorded step too.

## Keep a value for later

Add `store_as=<name>` to a step to keep the value that its keyword returns. Later steps use the value as `${name}`:

`test_data/elements.csv`:

```csv
Element_Name,Element_ID
price_label,//*[@resource-id='com.birch.shop:id/price']
cart_total,//*[@resource-id='com.birch.shop:id/total']
```

`modules/modules.csv`:

```csv
module_name,module_step,param_1,param_2
Check Price,Get Text,${price_label},store_as=price
Check Price,Press Element,Add to cart
Check Price,Assert Text,${cart_total},${price}
```

Get Text reads the price and keeps it as `price`. Assert Text fails the step if the cart total shows different text.

- **Any parameter column** can hold the `store_as=` cell, but the column must have a `param_N` header.
- **The keyword must return a value**, as Get Text, Execute Script, Get App Version and Invoke API do. A keyword that returns nothing, such as Press Element, fails the step.
- **Get Text returns no value** when only OCR or an image found the element.
- **A list or a dictionary** is kept as JSON text.
- **Only CSV and YAML suites** read `store_as`. In [Python](https://optics-framework.org/docs/create/python) and [Robot Framework](https://optics-framework.org/docs/create/robot), use the return value.

## Create variables during a run

These keywords write a variable. Write its name as `${name}`:

| Keyword | Writes | Example |
|---|---|---|
| `Evaluate` | The result of an expression | `Evaluate,${total},${price} + 5` |
| `Date Evaluate` | A date some days away | `Date Evaluate,${delivery_date},${order_date},+5 days` |
| `Read Data` | A value from a CSV or JSON file, or an environment variable | `Read Data,${admin_email},test_data/users.csv,role == 'admin';select=email` |
| `Invoke API` | Values from an API response | See [Call APIs in a test](https://optics-framework.org/docs/advanced/api-calls) |
| `Run Loop` | The current item, once per pass | See [Data-driven tests](https://optics-framework.org/docs/advanced/data-driven) |

`modules/modules.csv`:

```csv
module_name,module_step,param_1,param_2,param_3
Check Total,Evaluate,${expected_total},${price} * 2
Check Total,Assert Presence,${expected_total}
```

`Run Loop` takes its count from a variable too: `Run Loop,Add One Item,${n}`.

## How long a value lasts

A value lasts for the whole run. A value set in one test case is available in later test cases and in Suite Teardown. A new value with the same name replaces the old one. Nothing carries over to the next run.

## Dry runs

`optics dry_run` defines each name that `store_as`, `Evaluate`, `Read Data` and `Date Evaluate` write. You do not need placeholder rows for them. Add a placeholder row only for these names:

- An `extract` name from `Invoke API`.
- A `Run Loop` variable that a top-level step uses. The dry run does not check the steps of the looped module.

`test_data/elements.csv`:

```csv
Element_Name,Element_ID
access_token,placeholder
```

## Values are text

Every value is text, even when it looks like a number. That matters in expressions:

- **Evaluate** puts the value into the expression as you wrote it. `${price} + 5` with `price` set to `64` becomes `64 + 5`, which is `69`. To join text, quote it: `'${first_name}' + ' ' + '${last_name}'`.
- **Read Data** puts quotes around a value in its query, unless the value is already between quotes. `name == ${user}` works.
- **Condition** puts each value in quotes as text. `${count} == '3'` works. `${count} > 2` fails, because it compares text with a number. Compare against quoted text, or compute the comparison with Evaluate first. See [Conditions and loops](https://optics-framework.org/docs/advanced/conditions).

Evaluate allows arithmetic (`+ - * / % **`), comparisons, `in`, `and`, `or`, `not` and `x if condition else y`. It does not allow function calls such as `int()`. An expression with other parts, or one that is too large to compute, fails with E0406.

## Hide sensitive values

Optics writes `****` in place of a secret in the console, the log files, `logs.json`, `junit_output.xml`, `failed_steps_elements.json`, the run tree and error output. Optics masks these items:

- A value that `store_as` or `Read Data` sets under a secret name.
- A value in the elements file or a step that starts with `@:`. When the step runs, Optics also masks the value without the prefix in all later output of the run.
- A text value in `config.yaml` under a secret name, such as `api_key`. This includes a value that the config reads from an environment variable with a secret name.
- A password in a URL: `https://user:****@host`.
- A query parameter with a secret name: `?token=****`.

A name is secret when it contains one of these words: `pass`, `password`, `passwd`, `passcode`, `pwd`, `pin`, `otp`, `secret`, `token`, `key`, `apikey`, `auth`, `authorization`, `bearer` or `credential`. `user_password`, `loginOTP` and `myApiToken` match. `passkey` and `pincode` do not.

A value must have 4 or more characters to be masked. This also applies to a value with `@:`.

Optics does not hide a value from the elements file, `Evaluate`, `Run Loop` or an `Invoke API` `extract` by its name. To hide an elements-file value, start it with `@:`: `password,@:correct-horse`. Optics logs `****` and types the value without the prefix.

For real secrets, do not commit them. Read them from the environment at run time:

`modules/modules.csv`:

```csv
module_name,module_step,param_1,param_2
Sign In,Read Data,${password},ENV:BIRCH_PASSWORD
Sign In,Enter Text,${password_field},${password}
```

Set `BIRCH_PASSWORD` in your shell or CI secrets. `api_details.log` and `api_details.har` are not masked, so a secret in an API call shows there in clear text.

## See also

- [Data-driven tests](https://optics-framework.org/docs/advanced/data-driven)
- [Conditions and loops](https://optics-framework.org/docs/advanced/conditions)
- [Flow control keywords](https://optics-framework.org/docs/reference/keywords/flow)
