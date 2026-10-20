# Flow control keywords

> Learn how to reuse modules, loop, branch, load data, compute values and call APIs in a suite.

Flow control keywords run other modules, repeat them, choose between them, and create variables you can use in later steps.

`modules/modules.csv`:

```csv
module_name,module_step,param_1,param_2,param_3
Checkout Flow,Execute Module,Sign In
Checkout Flow,Run Loop,Add Product,product,Trail Runner 2|Pace Knit
Checkout Flow,Condition,${coupon} == 'none',Pay Full Price,Apply Coupon
```

## Rules for every flow keyword

- **Targets are module names.** Execute Module, Run Loop and Condition run modules, not single keywords. Multi-word names are fine in CSV. In YAML, quote them: `"Add Product"`.
- **Write the variable you create as a bare name.** Read Data, Evaluate, Date Evaluate and Run Loop take the name of a variable to write. Write `total`, not `${total}`. A `${total}` cell is replaced before the keyword runs, so the step fails if `total` doesn't exist yet. The log shows a harmless warning about the bare name.
- **Values are text.** Every variable holds text. Compare with quoted literals: `${status} == 'ready'`, `${count} == '3'`. A numeric comparison such as `${count} > 3` fails in Condition. See [Compare numbers](#compare-numbers) for the workaround.
- **Lists use pipes.** Separate values with `|`: `Trail Runner 2|Pace Knit`.
- **Steps inside a target are stricter.** In a module run by Execute Module, Run Loop or Condition, write every parameter positionally, because `name=value` isn't recognized there. `${name}` uses only the first value, with no fallback to the next one. Any error inside is reported as error E0401.

Flow control keywords aren't available as MCP tools. They work in CSV and YAML suites, `optics live`, `optics serve` and [Python](https://optics-framework.org/docs/create/python).

## Reuse and repeat

### Execute Module

Runs another module's steps from inside a module.

| Parameter | Default | What it does |
|---|---|---|
| `module_name` | Required | The module to run. |

```csv
Checkout Flow,Execute Module,Sign In
Checkout Flow,Execute Module,Add To Cart
```

```yaml
- Execute Module "Sign In"
```

Good to know:

- Use Execute Module whenever one module calls another. A row whose keyword cell is a module name fails with "Keyword not found".
- A module can't run itself.
- Python doesn't have Execute Module. Call your own Python functions instead.

### Run Loop

Runs a module a number of times, or once for each value in one or more lists.

| Parameter | Default | What it does |
|---|---|---|
| `target` | Required | The module to run. |
| then one of: | | |
| `count` | | A whole number of times to run, 1 or more. |
| `variable`, `values`, … | | Pairs of a variable name and its list of values. Add as many pairs as you need. |

`values` can be:

- a pipe-separated list: `Trail Runner 2|Pace Knit`. Spaces around each value are trimmed.
- a JSON list: `["Trail Runner 2", "Pace Knit"]`.
- `${name}`, where the element `name` holds either of the above.

```csv
Fill Cart,Run Loop,Add Trail Runner,3
Fill Cart,Run Loop,Add Product,product,Trail Runner 2|Pace Knit
Fill Cart,Run Loop,Add Product,product,${featured},size,US 9|US 10
```

```yaml
- Run Loop "Add Product" product "Trail Runner 2|Pace Knit"
```

Inside the target module, use `${product}` to read the current value:

```csv
Add Product,Enter Text,${search_bar},${product}
Add Product,Enter Text,${search_bar},<enter>
Add Product,Assert Presence,${add_to_cart},10
Add Product,Press Element,${add_to_cart}
```

Good to know:

- With several lists, the loop runs as many times as the shortest list.
- The variable keeps its last value after the loop ends.
- A list stored in an elements file needs CSV quoting if it's JSON: `featured,"[""Trail Runner 2"",""Pace Knit""]"`. A pipe list needs none: `featured,Trail Runner 2|Pace Knit`.
- An odd number of parameters after the target, other than a single count, fails with error E0403.

## Branch

### Condition

Runs a module only when a condition is true, like if, else-if and else.

| Parameter | Default | What it does |
|---|---|---|
| `condition`, `target`, … | Required | Pairs of a condition and the module to run when it's true. Add as many pairs as you need. |
| `else_target` | Empty | A module to run when no condition is true. Give it as the last parameter. |

The conditions are checked in order. The first true one runs its target, and the rest are skipped. With an odd number of parameters, the last one is the else target.

A condition is one of two kinds:

- **A module name.** Optics runs that module. If every step passes, the condition is true. Start the name with `!` to flip it: `!Is Signed In` is true when the module fails.
- **An expression.** Each `${name}` is replaced with its value in double quotes, so compare it with a quoted literal. You can use `==`, `!=`, `and`, `or` and `not`. Start the expression with `!` to negate it.

```csv
Start,Condition,Is Signed In,Go Home,Sign In
Start,Condition,!Is Signed In,Sign In
Pay,Condition,${payment} == 'card',Pay By Card,${payment} == 'wallet',Pay By Wallet,Pay On Delivery
```

```yaml
- Condition ${payment}=='card' "Pay By Card" "Pay On Delivery"
```

Good to know:

- A module condition really runs its steps. Use one that only checks, such as a module with a single Assert Presence.
- If no condition is true and there's no else target, the step passes and nothing runs.
- If the target module fails, the step fails.
- In YAML, write the expression without spaces: `${payment}=='card'`. A quoted expression that contains `=` keeps its quotes and fails.

### Compare numbers

Condition compares text, so `${count} > 3` fails. Compute the comparison with [Evaluate](#evaluate) first, which does arithmetic, then test its `True` or `False` result:

```csv
Shipping,Evaluate,free_shipping,${item_count} > 3
Shipping,Condition,${free_shipping} == 'True',Expect Free Shipping,Expect Paid Shipping
```

## Create variables

### Read Data

Loads a value from a CSV or JSON file, or an environment variable, into a variable.

| Parameter | Default | What it does |
|---|---|---|
| `input_element` | Required | The variable to write. Write a bare name. |
| `file_path` | Required | A `.csv` or `.json` file, or `ENV:NAME` for an environment variable. Relative paths start at the project folder. |
| `query` | Empty | Which rows and columns to keep. See below. |

The query has parts separated by `;`:

- `select=column` keeps one column. `select=a,b` keeps several.
- A filter such as `tier == 'gold'` keeps the matching rows. Several filters must all match.
- `${name}` inside the query is replaced with its value in single quotes, so write `email == ${email}`.

Given this data file:

`test_data/users.csv`:

```csv
email,password,tier
ana@birch.example,pw-ana,gold
ben@birch.example,pw-ben,basic
```

```csv
Load User,Read Data,gold_email,test_data/users.csv,tier == 'gold';select=email
Load User,Read Data,ana_tier,test_data/users.csv,email == 'ana@birch.example';select=tier
Load Token,Read Data,api_token,ENV:BIRCH_API_TOKEN
```

```yaml
- Read Data gold_email test_data/users.csv tier=='gold';select=email
```

After these steps, `${gold_email}` is `ana@birch.example` and `${ana_tier}` is `gold`.

Good to know:

- Every cell is read as text, so filters must compare text: `age == '30'`. `age > 26` fails with error E0403.
- Narrow the result to one row and one column. One row with several columns is stored joined by commas, such as `ana@birch.example,gold`. Several rows are stored in a form you can't use in a step.
- A query that matches nothing fails with "No data found". A missing column fails with error E0403. A missing file or environment variable fails with error E0501.
- **JSON files** can be a list of objects, one per row. If the top level is an object, Optics uses its first list. Nested keys become dotted column names, such as `address.city`.
- **Environment variables** are stored as they are, such as `ENV:BIRCH_API_TOKEN` giving `abc123`. A value that starts with `{` or `[` is read as JSON, and one with several lines is read as CSV.
- In CSV, wrap a query that contains commas in double quotes: `"tier == 'gold';select=email,password"`.
- In YAML, write filters without spaces.

### Evaluate

Computes an expression and saves the result in a variable.

| Parameter | Default | What it does |
|---|---|---|
| `param1` | Required | The variable to write. Write a bare name. |
| `param2` | Required | The expression to compute. |

```csv
Cart,Evaluate,total,${price} * 2
Cart,Evaluate,label,'free' if ${total} > 100 else 'paid'
Cart,Evaluate,greeting,'Hello ' + '${first_name}'
```

```yaml
- Evaluate total "${price} * 2"
```

Good to know:

- Each `${name}` is replaced with its value as written, without quotes. Numbers work as numbers. Put quotes around text values: `'${first_name}'`.
- You can use numbers, quoted text, lists, `+ - * / % **`, comparisons, `and`, `or`, `not` and `x if condition else y`.
- Function calls such as `int(...)` or `len(...)` aren't allowed. They fail with "Unsafe expression".
- The result is saved as text. A comparison saves `True` or `False`.
- In CSV, wrap an expression that contains commas in double quotes.

### Date Evaluate

Adds or subtracts days from a date and saves the result, formatted the way you choose.

| Parameter | Default | What it does |
|---|---|---|
| `param1` | Required | The variable to write. Write a bare name. |
| `param2` | Required | The start date. |
| `param3` | Required | `+N days`, `-N days`, `today` or `now`. |
| `param4` | `%d %B` | The output format, such as `%Y-%m-%d`. |

The start date can be in any of these forms. They're tried in this order:

| Format | Example |
|---|---|
| Month/day/year | `10/24/2026` |
| Day/month/year | `24/10/2026` |
| Year-month-day | `2026-10-24` |
| Day-month-year | `24-10-2026` |
| Year/month/day | `2026/10/24` |

```csv
Delivery,Date Evaluate,delivery_date,${order_date},+5 days
Delivery,Assert Presence,${delivery_date},10
```

```yaml
- Date Evaluate delivery_date ${order_date} "+5 days" "%d %B"
```

With `order_date` set to `2026-10-10` in your elements file, `${delivery_date}` is `15 October`.

Good to know:

- Only days work. `+1 week` fails with error E0403. Put a space between the number and `days`.
- `today` and `now` don't read the clock. They keep the start date as it is, which is useful to reformat a date.
- An ambiguous date such as `03/04/2026` is read as March 4.
- Use a variable name that has no value yet, and don't add it to your elements file. If the name already has a value, Date Evaluate adds the new date after it, and `${name}` keeps giving the old value. For the same reason, don't reuse the name inside a loop.
- Common format codes are `%d` day, `%m` month number, `%B` month name, `%b` short month name and `%Y` year.

### Invoke API

Calls an HTTP API that you define in YAML and saves values from the response as variables.

| Parameter | Default | What it does |
|---|---|---|
| `api_identifier` | Required | The API to call, as `collection.api`. |

Define your APIs in a YAML file anywhere in the project folder, with a top-level `api:` key. You can also put the `api:` block in your config.yaml.

`test_data/api.yaml`:

```yaml
api:
  collections:
    birch:
      name: "Birch API"
      base_url: "https://api.birch.example"
      global_headers:
        content-type: "application/json"
      apis:
        login:
          name: "Sign in"
          endpoint: "/v1/token"
          request:
            method: POST
            body:
              email: "${api_email}"
              password: "${api_password}"
          expected_result:
            jsonpath_assertions:
              - path: $.token
                condition: "len($) > 0"
            extract:
              auth_token: $.token
              customer_id: $.customer.id
        cart:
          name: "Get cart"
          endpoint: "/v1/customers/${customer_id}/cart"
          request:
            method: GET
            headers:
              Authorization: "Bearer ${auth_token}"
          expected_result:
            extract:
              cart_count: $.item_count
```

```csv
Prepare Cart,Invoke API,birch.login
Prepare Cart,Invoke API,birch.cart
```

```yaml
- Invoke API birch.login
```

After `birch.login`, `${auth_token}` and `${customer_id}` hold the extracted values.

Good to know:

- The URL is `base_url` plus `endpoint`. An absolute `endpoint` is used on its own.
- `${name}` is replaced anywhere in the endpoint, headers and body. A missing variable fails the step.
- The body is sent as JSON. Every request has a 30-second timeout.
- `extract` maps a variable name to a JSONPath. `$.a.b`, `a.b` and `[0]` indexing all work.
- Each `jsonpath_assertions` entry checks the value at `path`. In `condition`, `$` stands for that value, as in `len($) > 0` or `$ == 'ok'`. A false condition fails the step.
- `expected_status`, `json_schema` and `request.timeout` are accepted but not checked yet. Use a `jsonpath_assertions` entry to check the response instead.
- With `expected_result`, a response that isn't JSON fails the step with error E0403.
- Each call is logged to `api_details.log` and `api_details.har` in the run's output folder. See [Results](https://optics-framework.org/docs/run/results).
- The top-level key must be `api:`. A file that starts with `apis:` is ignored.

See [Call APIs from a test](https://optics-framework.org/docs/advanced/api-calls) for a full walkthrough.

## Worked example: sign in as each user

This suite signs in as two Birch users, reads each user's tier from a data file, and checks for the gold badge only for gold users.

`test_cases/test_cases.csv`:

```csv
test_case,test_step
Sign In Every User,Open Birch
Sign In Every User,Sign In Everyone
```

`modules/modules.csv`:

```csv
module_name,module_step,param_1,param_2,param_3,param_4,param_5
Open Birch,Launch App,com.birch.shop
Sign In Everyone,Run Loop,Sign In As,email,ana@birch.example|ben@birch.example,password,pw-ana|pw-ben
Sign In As,Assert Presence,${email_field},15
Sign In As,Enter Text,${email_field},${email}
Sign In As,Enter Text,${password_field},${password}
Sign In As,Press Element,${sign_in}
Sign In As,Assert Presence,Welcome,20
Sign In As,Read Data,tier,test_data/users.csv,email == ${email};select=tier
Sign In As,Condition,${tier} == 'gold',Check Gold Badge
Sign In As,Press Element,${sign_out}
Check Gold Badge,Assert Presence,Gold member,10
```

`test_data/elements.csv`:

```csv
Element_Name,Element_ID,Element_ID_text
email_field,//android.widget.EditText[@resource-id="com.birch.shop:id/email"],Email
password_field,//android.widget.EditText[@resource-id="com.birch.shop:id/password"],Password
sign_in,//android.widget.Button[@resource-id="com.birch.shop:id/sign_in"],Sign in
sign_out,//android.widget.Button[@resource-id="com.birch.shop:id/sign_out"],Sign out
```

`test_data/users.csv`:

```csv
email,password,tier
ana@birch.example,pw-ana,gold
ben@birch.example,pw-ben,basic
```

How it works:

- Run Loop runs `Sign In As` twice. It sets `email` and `password` to the next pair of values each time.
- Steps in `Sign In As` are positional, because it runs inside Run Loop. `Assert Presence,Welcome,20` is correct there. `timeout_str=20` wouldn't be.
- Read Data writes the bare name `tier`. Its query replaces `${email}` with the current email in quotes.
- Condition compares `${tier}` with the quoted literal `'gold'`. For Ben the condition is false, so nothing runs and the step passes.
- Inside the loop, `${email_field}` uses only its first value, the XPath. The `Email` fallback is used only by steps outside a loop.

## See also

- [Variables](https://optics-framework.org/docs/advanced/variables)
- [Data-driven tests](https://optics-framework.org/docs/advanced/data-driven)
- [Conditions](https://optics-framework.org/docs/advanced/conditions)
- [Call APIs from a test](https://optics-framework.org/docs/advanced/api-calls)
- [Organise tests](https://optics-framework.org/docs/create/organise)
