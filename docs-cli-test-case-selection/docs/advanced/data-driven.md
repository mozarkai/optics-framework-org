# Run a flow with different data

> Repeat one module for every value in a list, such as each user, search term or product.

A data-driven test runs the same flow several times with different inputs. In Optics, you write the flow once as a module, keep the inputs in a list, and use `Run Loop` to run the module once per item.

## Loop over a list of values

This example signs in to the Sauce Labs demo store as three different users, signing out after each one. It runs as written with the Playwright setup from [Write your first test](https://optics-framework.org/docs/get-started/first-test).

`test_data/elements.csv`:

```csv
Element_Name,Element_ID
username_field,//input[@id='user-name']
password_field,//input[@id='password']
login_button,//input[@id='login-button']
menu_button,//button[@id='react-burger-menu-btn']
logout_link,//a[@id='logout_sidebar_link']
shoppers,standard_user|visual_user|problem_user
username,placeholder
```

`modules/modules.csv`:

```csv
module_name,module_step,param_1,param_2,param_3
Open the store,Launch App,https://www.saucedemo.com
Sign In Each Shopper,Run Loop,Sign In And Out,username,${shoppers}
Sign In And Out,Enter Text,${username_field},${username}
Sign In And Out,Enter Text,${password_field},secret_sauce
Sign In And Out,Press Element,${login_button}
Sign In And Out,Assert Presence,Products
Sign In And Out,Press Element,${menu_button}
Sign In And Out,Sleep,1
Sign In And Out,Press Element,${logout_link}
Sign In And Out,Assert Presence,${login_button}
```

`test_cases/test_cases.csv`:

```csv
test_case,test_step
Suite Setup,Open the store
Every shopper can sign in,Sign In Each Shopper
```

`Run Loop,Sign In And Out,username,${shoppers}` reads: *run the module **Sign In And Out** once for each value in `shoppers`, and set `username` to that value each time.* Inside the module, `${username}` is the current shopper.

A few details make this work:

- **`username` is written without `${}`** in the Run Loop step, because the loop writes it. See [Variables](https://optics-framework.org/docs/advanced/variables).
- **`username,placeholder`** in the elements file lets `optics dry_run` accept `${username}`. The loop replaces it.
- **The values are separated by `|`.** You can also write them straight into the step: `Run Loop,Sign In And Out,username,standard_user|visual_user`.
- **`Sleep,1`** waits for the menu to slide open. Prefer a check such as `Assert Presence` to wait for a new screen, but use a short sleep for an animation on an element that's already on the page.

The run shows the loop as one step. If any pass fails, the loop stops and the step fails with the reason:

```terminal
└── Every shopper can sign in                                     |  5.86s |    PASS
    └── Sign In Each Shopper                                      |  5.86s |    PASS
        └── Run Loop (Sign In And Out, username, standard_user… |  5.86s |    PASS
```

## Loop over several lists at once

Give more name and list pairs to set several variables per pass. The lists are read side by side, and the loop stops at the end of the shortest:

`modules/modules.csv`:

```csv
module_name,module_step,param_1,param_2,param_3,param_4,param_5
Every Search,Run Loop,Search And Check,term,trail|pace|ridge,expected,Trail Runner 2|Pace Knit|Ridge GTX
Search And Check,Press Element,${search_bar}
Search And Check,Enter Text Direct,${term}
Search And Check,Assert Presence,${expected}
```

Each pass sets `term` and `expected` from the same position in their lists: first `trail` and `Trail Runner 2`, then `pace` and `Pace Knit`, and so on. Add `term,placeholder` and `expected,placeholder` to your elements file for dry runs.

## Repeat a module a number of times

Give a count instead of lists:

`modules/modules.csv`:

```csv
module_name,module_step,param_1,param_2
Fill Cart,Run Loop,Add One Item,3
```

## Keep the data in a file

Lists can live in an elements file, as `shoppers` does above, or as a JSON list: `sizes,"[""8"",""9"",""10""]"`. For a single value from a larger data file, such as the email address of the admin user, use `Read Data`:

`test_data/users.csv`:

```csv
username,email,role
ava,ava@birch.shop,admin
ben,ben@birch.shop,shopper
```

`modules/modules.csv`:

```csv
module_name,module_step,param_1,param_2,param_3
Sign In As Admin,Read Data,admin_email,test_data/users.csv,role == 'admin';select=email
Sign In As Admin,Enter Text,${email_field},${admin_email}
```

The query picks rows with a filter (`role == 'admin'`) and columns with `select=`. Compare values as quoted text, because every value in the file is read as text. `Read Data` is designed to fetch one row; with several matching rows, the variable gets a combined value that's hard to use.

## Rules inside a loop

Steps inside a looped module run a little differently from top-level steps:

- **Only the first value of each element is used.** Fallbacks don't apply, so give looped elements a reliable first value.
- **`name=value` parameters aren't available.** Pass values in order instead.
- **The module's steps don't appear separately** in the run tree or the JUnit report. A failure names the step that failed in its message.
- **After the loop, the variable keeps its last value.**

## See also

- [Variables](https://optics-framework.org/docs/advanced/variables)
- [Conditions and loops](https://optics-framework.org/docs/advanced/conditions)
- [Flow control keywords](https://optics-framework.org/docs/reference/keywords/flow)
