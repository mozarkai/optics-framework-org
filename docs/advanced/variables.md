---
title: Variables
summary: Store values, compute new ones during a run, and use them in later steps.
level: Advanced
time: 8 min
---

In Optics, a variable is an element that holds a value instead of a locator. You define some in your elements file, and some keywords create or change them while the test runs. Any step can then use the value with `${name}`.

## Define a variable

Add a row to an elements file, like any element:

```csv title="test_data/elements.csv"
Element_Name,Element_ID
email,ava@birch.shop
search_term,trail runner
discount_code,WELCOME10
```

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2
Search,Enter Text,${search_bar},${search_term}
```

## Where ${name} works

**As a whole value.** `${search_term}` on its own in a cell is replaced by the variable's value. When a variable has several values, they're tried in order, the same as [element fallbacks](/docs/elements/define).

**Inside other text.** `Hello ${name}` becomes `Hello Ava`. Inside a longer value, a variable gives its first value. Write `$${name}` to type the text `${name}` itself.

**Inside expressions.** A few keywords read `${name}` anywhere in their text: the expressions in `Evaluate` and `Condition`, the query in `Read Data`, and the URL, headers and body of an API call in `Invoke API`. These use the variable's first value.

## Create variables during a run

These keywords write a variable. Write the **name** of the variable on its own, without `${}`:

| Keyword | Writes | Example |
|---|---|---|
| `Evaluate` | The result of an expression | `Evaluate,total,${price} + 5` |
| `Date Evaluate` | A date some days away | `Date Evaluate,delivery_date,${order_date},+5 days` |
| `Read Data` | A value from a CSV or JSON file, or an environment variable | `Read Data,admin_email,test_data/users.csv,role == 'admin';select=email` |
| `Invoke API` | Values from an API response | See [Call APIs in a test](/docs/advanced/api-calls) |
| `Run Loop` | The current item, once per pass | See [Data-driven tests](/docs/advanced/data-driven) |
| Any keyword with `store_as=name` | What the keyword returns | `Get Text,${price_label},store_as=price` |

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2,param_3
Check Total,Evaluate,expected_total,${price} * 2
Check Total,Assert Presence,${expected_total}
```

:::mistake[Writing ${total} as the name]
`Evaluate,${total},${price} + 5` doesn't create `total`. Optics replaces `${total}` before the keyword runs, so the step fails with "Element not found: total", or writes to a variable named after its old value. Write `Evaluate,total,${price} + 5`.
:::

### Keep what a keyword returns

Add `store_as=name` to a step whose keyword returns a value, such as Get Text or Execute Script. Later steps use it as `${name}`:

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2
Check Order,Get Text,${order_number_label},store_as=order_number
Check Order,Enter Text,${search_bar},${order_number}
Check Order,Assert Text,${first_result},Order ${order_number}
```

Get Text on a text field returns what the field holds, so you can copy a value from one field to another.

### Declare run-time variables for dry runs

`optics dry_run` checks that every `${name}` is defined, but it doesn't run the keywords that create variables. Add a placeholder row for each variable a keyword creates, so the dry run passes. The keyword replaces the placeholder during the real run:

```csv title="test_data/elements.csv"
Element_Name,Element_ID
price,64
expected_total,placeholder
```

This works for `Evaluate`, `Read Data`, `Invoke API`, `Run Loop` and `store_as`. Don't add a placeholder for `Date Evaluate`: in Optics 1.10.5 it adds its result after the placeholder instead of replacing it, so `${delivery_date}` would give `placeholder`. The dry run reports the date variable as missing, which you can ignore.

## Values are text

Every value is text, even when it looks like a number. That matters in expressions:

- **Evaluate** puts the value into the expression as you wrote it. `${price} + 5` with `price` set to `64` becomes `64 + 5`, which is `69`. To join text, quote it: `'${first_name}' + ' ' + '${last_name}'`.
- **Condition** puts quotes around each value. `${count} == '3'` works. `${count} > 2` fails, because it compares text with a number. Compare against quoted text, or compute the comparison with Evaluate first. See [Conditions and loops](/docs/advanced/conditions).

Evaluate allows arithmetic (`+ - * / % **`), comparisons, `and`, `or`, `not` and `x if condition else y`. It doesn't allow function calls such as `int()`.

## Hide sensitive values

Start a value with `@:` to keep it out of log files: `password,@:correct-horse`. Optics logs `****` and types the value without the prefix.

Values that Read Data or `store_as` keep under a name such as `password`, `pin`, `otp`, `token`, `secret` or `api_key` are masked as `****` too.

For real secrets, don't commit them at all. Read them from the environment at run time:

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2
Sign In,Read Data,password,ENV:BIRCH_PASSWORD
Sign In,Enter Text,${password_field},${password}
```

Add `password,placeholder` to your elements file so `optics dry_run` accepts `${password}`, and set `BIRCH_PASSWORD` in your shell or CI secrets.

## See also

- [Data-driven tests](/docs/advanced/data-driven)
- [Conditions and loops](/docs/advanced/conditions)
- [Flow control keywords](/docs/reference/keywords/flow)
