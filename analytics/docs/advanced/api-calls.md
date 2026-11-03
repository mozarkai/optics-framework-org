# Call APIs in a test

> Call an HTTP API in the middle of a test, check the response, and use values from it in later steps.

Some steps are faster or more reliable through an API than through the screen: creating a test account, fetching today's offer code, or checking that an order reached the backend. `Invoke API` calls an endpoint you describe in a YAML file, checks the response, and saves values from it as variables for later steps.

The example on this page runs as written. It uses [DummyJSON](https://dummyjson.com), a free public API for testing.

### Describe the API

Create a YAML file anywhere in the project, with a top-level `api:` key. Group endpoints into **collections**, each with a base URL:

`test_data/api.yaml`:

```yaml
api:
  collections:
    dummyjson:
      name: "DummyJSON"
      base_url: "https://dummyjson.com"
      global_headers:
        content-type: "application/json"
      apis:
        login:
          name: "Sign in"
          endpoint: "/auth/login"
          request:
            method: POST
            body:
              username: "${api_username}"
              password: "${api_password}"
          expected_result:
            jsonpath_assertions:
              - path: $.accessToken
                condition: "len($) > 0"
            extract:
              access_token: $.accessToken
        me:
          name: "Who am I"
          endpoint: "/auth/me"
          request:
            method: GET
            headers:
              Authorization: "Bearer ${access_token}"
          expected_result:
            extract:
              email: $.email
```

- **`request`** sets the method, headers and a JSON body. `${name}` is replaced anywhere in the endpoint, headers and body.
- **`jsonpath_assertions`** checks the response. `path` picks a value, and `condition` is a small expression where `$` stands for that value. A false condition fails the step.
- **`extract`** saves values from the response as variables, using JSONPath: `$.accessToken`, `$.customer.id`, `$.items[0].name`.

### Add the inputs to your elements file

`test_data/elements.csv`:

```csv
Element_Name,Element_ID
api_username,emilys
api_password,emilyspass
access_token,placeholder
email,placeholder
```

The `placeholder` rows let `optics dry_run` accept variables that only get their value during the run.

### Call the endpoints in a module

Refer to an endpoint as `collection.name`:

`modules/modules.csv`:

```csv
module_name,module_step,param_1
Sign In Over The API,Invoke API,dummyjson.login
Sign In Over The API,Invoke API,dummyjson.me
```

Add a test case that runs the module:

`test_cases/test_cases.csv`:

```csv
test_case,test_step
API sign in works,Sign In Over The API
```

The first call signs in and saves `access_token`. The second sends the token and saves the account's `email`. From here, any step can use `${email}`: type it into a field, check it on screen, or compare it in a [condition](https://optics-framework.org/docs/advanced/conditions).

A project with only API steps still needs a `config.yaml` with a driver enabled, but the driver doesn't open anything unless a step asks it to.

### Run it

```shell
$ optics execute api-demo
```

```terminal
└── API sign in works                                       |  1.31s |    PASS
    └── Sign In Over The API                                |  1.31s |    PASS
        ├── Invoke API (dummyjson.login)                    |  0.66s |    PASS
        └── Invoke API (dummyjson.me)                       |  0.64s |    PASS
```

Every request and response is logged to `execution_output/api_details.log`, and to `api_details.har`, which you can open in a browser's developer tools.

## Combine API and UI steps

A common pattern is to set up data through the API, then check it in the app:

`modules/modules.csv`:

```csv
module_name,module_step,param_1,param_2
Order Shows In App,Invoke API,birch.create_order
Order Shows In App,Press Element,Orders
Order Shows In App,Assert Presence,${order_number}
```

Creating the order through the API takes a second. Going through the checkout screens takes a minute and tests something you probably cover elsewhere.

## Good to know

- **Responses must be JSON** when an endpoint has `expected_result`. Other responses fail the step.
- **Check status codes with an assertion.** `expected_status` and `json_schema` are accepted in the file but not checked yet. Check a field in the body instead.
- **Every request times out after 30 seconds.** `request.timeout` isn't used yet.
- **Keep credentials out of the file.** Put them in variables and read them from the environment with `Read Data,api_password,ENV:BIRCH_API_PASSWORD`. See [Variables](https://optics-framework.org/docs/advanced/variables#hide-sensitive-values).
- **The top-level key must be `api:`.** A file starting with `apis:` is recognised but loads nothing.

## See also

- [Invoke API reference](https://optics-framework.org/docs/reference/keywords/flow#invoke-api)
- [Variables](https://optics-framework.org/docs/advanced/variables)
- [Conditions and loops](https://optics-framework.org/docs/advanced/conditions)
