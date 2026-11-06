---
title: Test websites
nav: Web
summary: Set up Playwright or Selenium, then run your tests in a browser.
level: Beginner
time: 10 min
---

Optics tests websites with one of two drivers. **Playwright** starts a browser on your machine and needs no server. **Selenium** sends commands to a WebDriver server, such as a Selenium Grid, which runs the browser.

We recommend Playwright unless you already run a Selenium Grid, or need Firefox or a real Chrome on remote machines. The examples use the [Sauce Labs demo store](https://www.saucedemo.com), which you can sign in to with `standard_user` / `secret_sauce`.

## Set up

:::tabs{group="web"}
::tab[Playwright]
Install the engine. Optics also downloads the Chromium browser that Playwright uses:

```shell
$ optics setup --install playwright
```

Then enable the driver and its three element sources:

```yaml title="config.yaml"
driver_sources:
  - playwright:
      enabled: true                          # no url and no server needed
      capabilities:
        browser: chromium                    # or firefox, webkit
        headless: false                      # true: no window
        # viewport: {width: 1280, height: 800}
elements_sources:
  - playwright_find_element: {enabled: true}
  - playwright_page_source:  {enabled: true}
  - playwright_screenshot:   {enabled: true}
```

`optics setup` downloads only Chromium. For Firefox or WebKit, run `python -m playwright install firefox` or `webkit` in the Optics environment.

There's no server to start, so `optics execute` skips its preflight check for Playwright.

Chromium starts without the automation flags, so `navigator.webdriver` is `false`, as in a browser that a person opens. Selenium Chrome starts in the same way.

::tab[Selenium]
Install the engine:

```shell
$ optics setup --install selenium
```

Selenium needs a WebDriver server. The quickest is Selenium's Docker image, which runs Chrome inside a container:

```shell
$ docker run -d -p 4444:4444 selenium/standalone-chrome
```

For Firefox, use `selenium/standalone-firefox`. If you already run a Selenium Grid, point `url` at it instead.

Then enable the driver and its element sources:

```yaml title="config.yaml"
driver_sources:
  - selenium:
      enabled: true
      url: "http://localhost:4444/wd/hub"   # your Grid or standalone server
      capabilities:                          # must not be empty
        browserName: chrome                  # required: chrome or firefox
        browserURL: "https://www.saucedemo.com"  # page opened when the browser starts
elements_sources:
  - selenium_find_element: {enabled: true}
  - selenium_page_source:  {enabled: true}
  - selenium_screenshot:   {enabled: true}
```

`capabilities` must include `browserName`, and only `chrome` and `firefox` work. `optics configure` writes `capabilities: {}` for Selenium, which can't start, so add these keys by hand. Other keys under `capabilities` are passed to the browser as WebDriver capabilities.

Before each run, `optics execute` checks that the server answers at `url`. If it doesn't, Optics stops with a "Cannot start" panel. Set `OPTICS_SKIP_PREFLIGHT=1` to skip the check.
:::

Then check the setup and run your tests:

```shell
$ optics doctor my-web-tests
$ optics execute my-web-tests
```

## Open the site

Launch App starts the browser. How it picks the page depends on the driver:

| Step | Playwright | Selenium |
|---|---|---|
| `Launch App,https://www.saucedemo.com` | Opens the browser at that URL. | Opens the browser at that URL the first time. |
| `Launch App` with no URL | Opens a blank page. | Opens `browserURL`, or a blank page if it isn't set. |
| `Launch Other App,https://www.saucedemo.com/cart.html` | Opens the URL in a new tab. | Goes to the URL in the current tab. |

We recommend putting the URL in the Launch App step. Then the same module works with both drivers.

## Write steps for the web

Here is a full sign-in test for the Sauce Labs demo store. It works with both drivers:

```csv title="test_data/elements.csv"
Element_Name,Element_ID
username_field,//input[@id='user-name']
password_field,//input[@id='password']
login_button,//input[@id='login-button']
backpack_add_button,//button[@id='add-to-cart-sauce-labs-backpack']
```

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2
Open the store,Launch App,https://www.saucedemo.com
Open the store,Assert Presence,Swag Labs,15
Sign in,Enter Text,${username_field},standard_user
Sign in,Enter Text,${password_field},secret_sauce
Sign in,Press Element,${login_button}
Sign in,Assert Presence,Products,10
Add the backpack,Press Element,${backpack_add_button}
Add the backpack,Assert Presence,Remove,5
```

```csv title="test_cases/test_cases.csv"
test_case,test_step
Shopper can add a backpack,Open the store
Shopper can add a backpack,Sign in
Shopper can add a backpack,Add the backpack
```

### Locators for web pages

| Kind | Example | Playwright | Selenium |
|---|---|---|---|
| XPath | `//input[@id='user-name']` | Yes, also with `xpath=` | Yes. Leave out `xpath=`. |
| Visible text | `Products`, `text=Add to cart` | Yes | Yes |
| Bare id or name | `user-name` | No. Write `id=user-name`. | Yes. Tried as an id, name, class or link text when no text matches. |
| CSS selector | `#user-name`, `.inventory_item_name`, `css=button[data-test='login-button']` | Yes | No |
| Attribute prefix | `id=user-name`, `data-test=login-button`, `label=Username`, `placeholder=Username`, `role=button` | Yes | No |
| Alt text and title | `alt=Birch logo`, `title=Open the cart` | Yes | No |
| Test id | `testid=save-btn`, `data-testid=save-btn` | Yes | No |
| Exact text | `text="Save"` | Yes. It does not match `Save changes`. | No |
| Locators from other agent browsers | `loc=css:button.save`, `loc=role:button[name="Save changes"]`, `loc=href:/next` | Yes | No |
| Image | `cart_icon.png` | With image matching on | With image matching on |

We recommend XPath for web elements. It's the one kind of value that works the same way with both drivers, so you can switch drivers without editing elements.

A prefix can be in any case. `Get Interactive Elements` lists an element with a pointer cursor as tappable, even when it has no role, link or click attribute.

On Playwright, actions wait up to 10 seconds for the element to show. When a locator matches several elements, the log names the count and the one Optics used. Add `index=` or a more specific locator to pick another.

To see an element's id or attributes, right-click it in Chrome and choose **Inspect**. [Define elements](/docs/elements/define) explains each kind of value.

## Press keys

| Driver | How to press Enter | Other keys |
|---|---|---|
| Playwright | `Press Keycode,Enter` or `Enter Text Using Keyboard,<enter>` | `Tab`, `Escape`, `Backspace`, `Delete`, `Space`, `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, and other [Playwright key names](https://playwright.dev/docs/api/class-keyboard#keyboard-press) |
| Selenium | `Enter Text Using Keyboard,<enter>` | `<tab>`, `<backspace>`, `<space>`, `<escape>` |

Press Keycode isn't supported on Selenium. The keys go to whichever field has focus, so press the field first.

On Playwright, Press Keycode accepts a key name in any case. `ESC`, `arrowdown` and `KEYCODE_ENTER` work in the same way as `Escape`, `ArrowDown` and `Enter`. A name that Optics does not know fails with [E0403](/docs/reference/errors#e04-keywords-and-parameters) and lists the valid names.

## Emulate a phone

Set `device` to a [Playwright device name](https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/deviceDescriptorsSource.json). The page gets that phone's screen size, user agent and touch input:

```yaml title="config.yaml"
driver_sources:
  - playwright:
      enabled: true
      capabilities:
        browser: chromium     # webkit for an iPhone, to get Safari's engine
        device: "iPhone 15"
```

An emulated phone is still a desktop browser. To test the real Chrome or Safari on a phone, see [Test mobile websites](/docs/platforms/mobile-web).

## Start signed in from a saved file

Sign in once, save the browser state to a file, and every run starts signed in. Sign in by hand in the window that opens, then close it:

```shell
$ python -m playwright open --save-storage=auth.json https://www.saucedemo.com
```

Then point `storage_state` at the file. The path is relative to the project folder:

```yaml title="config.yaml"
driver_sources:
  - playwright:
      enabled: true
      capabilities:
        storage_state: auth.json
```

:::warning
The file holds live session cookies. Do not commit it to version control.
:::

## Start signed in with a browser profile

Use a browser profile when you are signed in to the site in Chrome or Edge on the same computer. Optics copies the sign-ins of that profile, so you do not sign in again. Each of the three options keeps sign-ins in a different place:

| Option | Use it when | Sign-ins come from |
|---|---|---|
| `storage_state` | The run must work on any computer, in CI, with `device` or in a remote browser. | A file that Playwright saved. See [Start signed in from a saved file](#start-signed-in-from-a-saved-file). |
| `profile` | You are signed in to Chrome or Edge on this computer. | A temporary copy of that profile. Optics deletes the copy at the end of the session. |
| `user_data_dir` | You want to sign in once in the Optics browser and keep the sign-in for later runs. | A folder that stays between runs. |

Set `profile` to the directory of the profile (`Default`, `Profile 1`), its name or its account email:

```yaml title="config.yaml"
driver_sources:
  - playwright:
      enabled: true
      capabilities:
        profile: me@example.com
        channel: chrome
```

Optics copies the cookies, local storage and preferences of the profile into a temporary folder. It starts the browser with the copy. The real profile does not change. `channel` is `chrome`, `chrome-beta` or `msedge`. Without it, Optics uses the browser that owns the profile.

Most site sign-ins carry over. Google accounts are signed out in a copy. If the value matches no profile, or more than one, the run stops with [E0501](/docs/reference/errors#e05-files-and-config) and lists the profiles that Optics found:

```terminal
No browser profile 'nobody@example.com'. Profiles: chrome 'Default' (Person 1, not signed in); chrome 'Profile 1' (Birch tester, tester@birch.example)
```

To keep the sign-in between runs, set `user_data_dir` to a folder, for example `~/optics-browser`. Sign in once in the window that opens. A path that starts with `./` is relative to the project folder and must exist.

`profile` and `user_data_dir` apply to a browser that Optics starts. Each of these stops the run with E0501:

- `profile` or `user_data_dir` with a remote `url`.
- `profile` with `user_data_dir`.
- `profile` or `user_data_dir` with `storage_state`.

`optics serve` refuses `profile`. `optics mcp --transport http` refuses it too, and no session API accepts `user_data_dir`. A local `optics mcp` on stdio lists the profiles in the `optics://browser-profiles` resource. See [MCP server reference](/docs/reference/mcp).

## Use a remote browser

Set `url` to a browser's endpoint, and Optics connects to that browser instead of starting one. You do not need to download a browser.

```yaml title="config.yaml"
driver_sources:
  - playwright:
      enabled: true
      url: "wss://grid.example.com/session"
      capabilities:
        protocol: cdp                 # or playwright
        headers:
          Authorization: Bearer ${GRID_TOKEN}
```

| `protocol` | Connects to |
|---|---|
| `cdp` (default) | A Chrome DevTools Protocol endpoint, such as Browserless or Chrome started with `--remote-debugging-port=9222` (`url: "http://127.0.0.1:9222"`). Chromium only. |
| `playwright` | A Playwright server, such as `npx playwright run-server`, BrowserStack or LambdaTest. The server's Playwright version must match. |

`${NAME}` in `url` or in a header is read from that environment variable when the browser starts, so your credentials stay out of the suite. If the variable is not set, the run stops and names it.

Optics opens a new context in the remote browser. To use the browser's own context and open tab instead, for example to use a profile that is signed in, set `context: existing`.

## Timeouts

All values are in milliseconds, under `capabilities`:

| Capability | Default | Limits |
|---|---|---|
| `element_timeout_ms` | `10000` | The wait for an element before an action |
| `navigation_timeout_ms` | `60000` | Page loads from Launch App and Go Back |
| `settle_timeout_ms` | `3000` | The wait for the page to stop changes before Optics reads it. `0` turns it off. |
| `connect_timeout_ms` | `90000` | The connection to a remote browser |
| `action_timeout_ms` | `15000` | Each other browser call, such as a key press or a screenshot |

`navigation_wait_until` sets the load event that a page load waits for: `domcontentloaded` (default), `load`, `networkidle` or `commit`.

## Run in CI without a screen

With Playwright, set `headless: true`. With Selenium in Docker, the browser runs inside the container, so the CI machine needs no display. To run Chrome headless on a Grid, pass Chrome's own arguments in `goog:chromeOptions`. Optics adds them to its own. In a Linux container or in CI, add `--no-sandbox` and `--disable-dev-shm-usage`:

```yaml title="config.yaml"
driver_sources:
  - selenium:
      enabled: true
      url: "http://localhost:4444/wd/hub"
      capabilities:
        browserName: chrome
        goog:chromeOptions:
          args: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage"]
```

[Run tests in CI](/docs/run/ci) covers the rest of the CI setup.

## If it isn't working

- **The Playwright browser isn't installed.** Run `optics setup --install playwright` again. `optics doctor` shows a ✅ for `playwright browser` once Chromium is downloaded.
- **"Selenium capabilities not found in config".** Add `browserName: chrome` or `browserName: firefox` under `capabilities`.
- **"Cannot start" with "No Selenium/WebDriver server reachable".** Start the server, and check that `url` points to it.
- **Swipe fails on Selenium.** Selenium has no Swipe. Use Scroll, which moves one screen in any direction.
- **A step acts before the page loads.** Selenium actions do not wait. Put `Assert Presence` on something from the new page before you act on it.
- **"Unknown device".** The `device` name is not a Playwright device. Copy the name exactly, with its capitals and spaces.
- **A connect timeout with a remote browser.** The `protocol` does not match the provider. Try the other value.

## See also

- [Test mobile websites](/docs/platforms/mobile-web)
- [Write your first test](/docs/get-started/first-test)
- [Define elements](/docs/elements/define)
- [Run tests in CI](/docs/run/ci)
- [Actions reference](/docs/reference/keywords/actions)
- [config.yaml reference](/docs/reference/config)
