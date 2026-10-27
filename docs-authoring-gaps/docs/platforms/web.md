# Test websites

> Set up Playwright or Selenium, then run your tests in a browser.

Optics tests websites with one of two drivers. **Playwright** starts a browser on your machine and needs no server. **Selenium** sends commands to a WebDriver server, such as a Selenium Grid, which runs the browser.

We recommend Playwright unless you already run a Selenium Grid, or need Firefox or a real Chrome on remote machines. The examples use the [Sauce Labs demo store](https://www.saucedemo.com), which you can sign in to with `standard_user` / `secret_sauce`.

## Set up

**Playwright**

Install the engine. Optics also downloads the Chromium browser that Playwright uses:

```shell
$ optics setup --install playwright
```

Then enable the driver and its three element sources:

`config.yaml`:

```yaml
driver_sources:
  - playwright:
      enabled: true                          # no url and no server needed
      capabilities:
        browser: chromium                    # ignored on 1.10.5: always Chromium
        headless: false                      # ignored on 1.10.5: always a visible window
        # viewport: {width: 1280, height: 800}  # ignored on 1.10.5: always 1280×800
elements_sources:
  - playwright_find_element: {enabled: true}
  - playwright_page_source:  {enabled: true}
  - playwright_screenshot:   {enabled: true}
```

**Note:**
On Optics 1.10.5, Playwright ignores `browser`, `headless` and `viewport` under `capabilities`. It always opens a visible Chromium window at 1280×800. You can leave the keys in place for when they take effect.

There's no server to start, so `optics execute` skips its preflight check for Playwright.

**Enter Text and Get Text fail in browsers on Optics 1.10.5:**
On 1.10.5, Enter Text and Get Text fail in Playwright with `Object of type Locator is not JSON serializable`. Both are fixed in the next release ([pull request #600](https://github.com/mozarkai/optics-framework/pull/600)). Until you upgrade, click the field, then type into it:

`modules/modules.csv`:

```csv
module_name,module_step,param_1,param_2
Sign in,Press Element,${username_field}
Sign in,Enter Text Direct,standard_user
```

**Selenium**

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

`config.yaml`:

```yaml
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

Here is a full sign-in test for the Sauce Labs demo store. It works with both drivers on Optics 1.10.5:

`test_data/elements.csv`:

```csv
Element_Name,Element_ID
username_field,//input[@id='user-name']
password_field,//input[@id='password']
login_button,//input[@id='login-button']
backpack_add_button,//button[@id='add-to-cart-sauce-labs-backpack']
```

`modules/modules.csv`:

```csv
module_name,module_step,param_1,param_2
Open the store,Launch App,https://www.saucedemo.com
Open the store,Assert Presence,Swag Labs,15
Sign in,Press Element,${username_field}
Sign in,Enter Text Direct,standard_user
Sign in,Press Element,${password_field}
Sign in,Enter Text Direct,secret_sauce
Sign in,Press Element,${login_button}
Sign in,Assert Presence,Products,10
Add the backpack,Press Element,${backpack_add_button}
Add the backpack,Assert Presence,Remove,5
```

`test_cases/test_cases.csv`:

```csv
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
| Bare id or name | `user-name` | No | Yes. Tried as an id, name, class or link text when no text matches. |
| CSS selector | `#user-name`, `.inventory_item_name`, `css=button[data-test='login-button']` | Yes | No |
| Image | `cart_icon.png` | With image matching on | With image matching on |

We recommend XPath for web elements. It's the one kind of value that works the same way with both drivers, so you can switch drivers without editing elements.

To see an element's id or attributes, right-click it in Chrome and choose **Inspect**. [Define elements](https://optics-framework.org/docs/elements/define) explains each kind of value.

**Assertions skip CSS selectors:**
Assert Presence and Assert Visibility only check text, XPath and image values, even on Playwright. A CSS value such as `#user-name` is skipped without an error. Use visible text or an XPath in assertions.

## Press keys

| Driver | How to press Enter | Other keys |
|---|---|---|
| Playwright | `Press Keycode,Enter` | `Tab`, `Escape`, `Backspace`, `Delete`, `Space`, `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, and other [Playwright key names](https://playwright.dev/docs/api/class-keyboard#keyboard-press) |
| Selenium | `Enter Text Using Keyboard,<enter>` | `<tab>`, `<backspace>`, `<space>`, `<escape>` |

Press Keycode isn't supported on Selenium. The keys go to whichever field has focus, so press the field first.

## Run in CI without a screen

On Optics 1.10.5, Playwright always opens a visible window, even when you set `headless: true`. On a Linux CI machine with no display, run Optics under a virtual display:

```shell
$ xvfb-run optics execute my-web-tests
```

With Selenium in Docker, the browser runs inside the container, so the CI machine needs no display. To run Chrome headless on a Grid, pass Chrome's own arguments. They replace the arguments Optics adds, so keep the ones you need:

`config.yaml`:

```yaml
driver_sources:
  - selenium:
      enabled: true
      url: "http://localhost:4444/wd/hub"
      capabilities:
        browserName: chrome
        goog:chromeOptions:
          args: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage"]
```

[Run tests in CI](https://optics-framework.org/docs/run/ci) covers the rest of the CI setup.

## If it isn't working

- **"Object of type Locator is not JSON serializable".** Enter Text or Get Text ran in Playwright on 1.10.5. Use Press Element, then Enter Text Direct. See [Troubleshooting](https://optics-framework.org/docs/help/troubleshooting#locator-not-serializable).
- **The Playwright browser isn't installed.** Run `optics setup --install playwright` again. `optics doctor` shows a ✅ for `playwright browser` once Chromium is downloaded.
- **"Selenium capabilities not found in config".** Add `browserName: chrome` or `browserName: firefox` under `capabilities`.
- **"Cannot start" with "No Selenium/WebDriver server reachable".** Start the server, and check that `url` points to it.
- **Swipe fails on Selenium.** Selenium has no Swipe. Use Scroll, which moves one screen in any direction.
- **A step acts before the page loads.** Actions don't wait. Put `Assert Presence` on something from the new page before you act on it.

## See also

- [Write your first test](https://optics-framework.org/docs/get-started/first-test)
- [Define elements](https://optics-framework.org/docs/elements/define)
- [Run tests in CI](https://optics-framework.org/docs/run/ci)
- [Actions reference](https://optics-framework.org/docs/reference/keywords/actions)
- [config.yaml reference](https://optics-framework.org/docs/reference/config)
