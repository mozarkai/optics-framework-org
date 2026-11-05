# Verification keywords

> Learn which keyword to use for each check, and how long each one waits.

Verification keywords check what's on screen. Assertions wait up to a timeout for an element, so they're also how you wait for a screen to load before an action.

`modules/modules.csv`:

```csv
module_name,module_step,param_1,param_2,param_3
Sign In,Press Element,${sign_in}
Sign In,Assert Presence,Welcome|Trail Runner 2,20,any
```

We recommend Assert Presence for most checks. Use Assert Visibility when the element must be on screen right now, not only in the page. For how `element` values are read, see [Element arguments](https://optics-framework.org/docs/reference/keywords/#element-arguments).

## Check several elements at once

Assert Presence, Assert Visibility, Validate Element and Validate Screen accept several elements separated by `|` (a pipe). `rule` decides whether `any` or `all` of them must be found.

```csv
Home,Assert Presence,Welcome|Trail Runner 2|Pace Knit,20,all
```

**Note:**
Separate elements with `|`, never commas. Do not put spaces around the pipe. In a pipe list such as `${a}|${b}`, each variable gives its first value. To reuse a list, store the whole `Welcome|Trail Runner 2` as the value of one element and pass `${home_markers}`.

## Assertions

### Assert Presence

Fails unless the elements exist in the app within the timeout.

| Parameter | Default | What it does |
|---|---|---|
| `elements` | Required | One element, or several separated by `\|`. |
| `timeout_str` | `30` | Seconds to wait. |
| `rule` | `any` | `any` passes when one element is found. `all` needs every element. |
| `event_name` | Empty | Label for a timed event. See [Event names](https://optics-framework.org/docs/reference/keywords/#event-names). |
| `fail` | `true` | Has almost no effect. A missing element fails the step even when it's `false`. |

```csv
Sign In,Assert Presence,Welcome
Sign In,Assert Presence,Welcome,20
Sign In,Assert Presence,${account_badge},timeout_str=20
Home,Assert Presence,Trail Runner 2|Pace Knit,20,all
```

```yaml
- Assert Presence Welcome 20
- Assert Presence Welcome timeout_str=20
```

Good to know:

- The timeout parameter is called `timeout_str`, not `timeout`. `timeout=20` is passed as the text "timeout=20" and fails the step. Write `20` positionally or `timeout_str=20`.
- "Present" means the element is in the app's UI tree, even if it's scrolled off screen. On Android, the UI tree usually leaves out off-screen items. To include them, set `appium:settings: {allowInvisibleElements: true}` in your [config](https://optics-framework.org/docs/reference/config).
- Elements are checked in groups: text and CSS first, then XPaths, then images. Each group gets the full timeout. With `rule=any`, a text group that isn't found fails the step before the XPaths are tried. Keep one kind of locator per assertion when you use `any`.
- In a group, every element source checks every element in each round, about every half second. A match from any source counts. OCR and image matching run last, at most every 2 seconds, and only when the screen changed.
- When no text detection engine is configured, a miss ends with "OCR was not tried: no text_detection engine is configured."
- `id:` locators and class names are skipped. If every element is one of those, the step passes without checking anything. Use text, CSS or an XPath.
- In Python the parameter is `timeout`, its default is 60 seconds, and there's no `fail` parameter.

### Assert Visibility

Fails unless the elements are on screen within the timeout. It takes the same parameters as Assert Presence.

| Parameter | Default | What it does |
|---|---|---|
| `elements` | Required | One element, or several separated by `\|`. |
| `timeout_str` | `30` | Seconds to wait. |
| `rule` | `any` | `any` or `all`. |
| `event_name` | Empty | Label for a timed event. |
| `fail` | `true` | Has almost no effect, as with Assert Presence. |

```csv
Home,Assert Visibility,${promo_banner},10
```

```yaml
- Assert Visibility ${promo_banner} 10
```

Good to know:

- On Appium and Playwright, Optics checks that the element is on screen. On Selenium, only OCR and image matching can check visibility, so you need [text or image detection](https://optics-framework.org/docs/elements/text-and-images) configured. Without it, the step fails with "No strategies found".
- OCR and image matches always count as visible, because they come from a screenshot.
- The same grouping caveats as Assert Presence apply.

### Validate Element

Fails unless an element exists within the timeout. It's Assert Presence with a shorter default timeout and `all` as the default rule.

| Parameter | Default | What it does |
|---|---|---|
| `element` | Required | One element, or several separated by `\|`. |
| `timeout` | `10` | Seconds to wait. |
| `rule` | `all` | `any` or `all`. |
| `event_name` | Empty | Label for a timed event. |

```csv
Home,Validate Element,${search_bar},15
```

```yaml
- Validate Element ${search_bar} 15
```

Good to know:

- When `element` is `${name}` with several values, Optics tries each one until it finds the element.

### Validate Screen

Checks whether elements are present, without failing the step.

| Parameter | Default | What it does |
|---|---|---|
| `elements` | Required | One element, or several separated by `\|`. |
| `timeout` | `30` | Seconds to wait. |
| `rule` | `any` | `any` or `all`. |
| `event_name` | Empty | Label for a timed event. |

```csv
Home,Validate Screen,Welcome|Trail Runner 2,10
```

```yaml
- Validate Screen Welcome|Trail Runner 2 10
```

Good to know:

- Validate Screen never fails a step. In a CSV or YAML suite it only waits and logs the result. Use Assert Presence when the check must fail the test.
- From Python, `optics serve` and MCP it returns true or false.

### Assert Text

Fails unless the text of an element, or the value of a web field, is the expected text within the timeout.

| Parameter | Default | What it does |
|---|---|---|
| `element` | Required | The element to read: text, an XPath or a CSS selector. |
| `expected` | Required | The text to expect. |
| `timeout` | `10` | Seconds to wait. Decimals are allowed. |
| `event_name` | Empty | Label for a timed event, recorded only when the step passes. |

```csv
Cart,Assert Text,${cart_count},2
Cart,Assert Text,${cart_total},${price},5
```

```yaml
- Assert Text ${cart_count} 2
```

Good to know:

- Optics reads the element about every half second until the text is the same as `expected`. The comparison is exact and case-sensitive. Spaces at the start and end are ignored.
- Wrong text at the timeout fails with error E0401, such as `Element 'css=h3' shows 'Checkboxes' but expected 'Radio Buttons'.` The next value of `${name}` is not tried.
- An element that is never found fails with error E0201, so Optics tries the next value of `${name}`.
- An element found only by OCR or image fails at once with error E0401.
- With an `@:` prefix on `expected`, both texts show as `****` in the error.
- AI self-heal does not cover Assert Text.

### Is Element

Checks that an element is visible, invisible, enabled, disabled, checked or unchecked.

| Parameter | Default | What it does |
|---|---|---|
| `element` | Required | The element to check. |
| `element_state` | Required | `visible`, `invisible`, `enabled`, `disabled`, `checked` or `unchecked`. |
| `timeout` | Required | Seconds to wait. Used for `visible` and `invisible` only. |
| `event_name` | Empty | Label for a timed event. |

```csv
Checkout,Is Element,${place_order},enabled,5
Checkout,Is Element,${loading_spinner},invisible,15
Checkout,Is Element,${terms_checkbox},checked,5
```

```yaml
- Is Element ${place_order} enabled 5
```

Good to know:

- `visible` checks presence in the UI tree, the same way Assert Presence does.
- `invisible` doesn't wait for an element to go away. If the element is there, the step fails at once. If it isn't, the step waits the full timeout, then passes.
- `enabled`, `disabled`, `checked` and `unchecked` need an element found in the UI tree or in a web page. An element found only by OCR or image fails the step.
- On the web, `aria-disabled="true"` counts as disabled, and `aria-checked` counts for checked.
- Another state fails with error E0403.
- You must give a timeout, even for `enabled`, `disabled`, `checked` and `unchecked`.

### Assert Equality

Compares two values as text, without spaces at the start and end. The step fails when the values are different.

| Parameter | Default | What it does |
|---|---|---|
| `output` | Required | The first value. Can be `${name}`. |
| `expression` | Required | The second value. Can be `${name}`. |
| `event_name` | Empty | Label for a timed event, recorded only when the values match. |

```csv
Cart,Evaluate,${total},${price} * 2
Cart,Assert Equality,${total},240
```

```yaml
- Assert Equality ${total} 240
```

Good to know:

- A mismatch fails with error E0401, such as `'480' does not equal '240'.` To check the text that an element shows, use [Assert Text](#assert-text).
- Nothing is evaluated. `2+2` and `4` don't match, and quotes are compared as characters.
- When `${name}` has several values, only the first is used.

## Capture and inspect

These keywords save what's on screen to the run's output folder. See [Results](https://optics-framework.org/docs/run/results). To keep what they return in a variable, add [`store_as=name`](https://optics-framework.org/docs/reference/keywords/#store-as). Capture Screenshot returns the image as base64 text, and Capture Pagesource returns JSON.

### Capture Screenshot

Takes a screenshot.

| Parameter | Default | What it does |
|---|---|---|
| `event_name` | Empty | Label for a timed event. |

```csv
Checkout,Capture Screenshot
```

```yaml
- Capture Screenshot
```

Good to know:

- The image is saved only when `save_captures` is `true` in your [config](https://optics-framework.org/docs/reference/config). It's on by default.
- The step fails with error E0303 if the screenshot fails or is completely black.

### Capture Pagesource

Saves the current UI tree as XML (apps) or HTML (web).

| Parameter | Default | What it does |
|---|---|---|
| `event_name` | Empty | Label for a timed event. |

```csv
Checkout,Capture Pagesource
```

```yaml
- Capture Pagesource
```

Good to know:

- Use it to find XPaths for your elements file. See [Define elements](https://optics-framework.org/docs/elements/define).
- The step fails if no page source is available.

### Get Interactive Elements

Lists the elements on screen that you can tap or type into, and saves the list as a JSON file.

| Parameter | Default | What it does |
|---|---|---|
| `filter_config` | Empty | Which elements to list: `all`, `interactive`, `buttons`, `inputs`, `images` or `text`. Empty lists all. |
| `compact` | `false` | `true` returns a short form of each element: label, class, bounds and actions. On the web, `loc` is a locator that matches only that element, and `offscreen` marks an element that is scrolled out of view. |

```csv
Debug,Get Interactive Elements,buttons
```

```yaml
- Get Interactive Elements buttons compact=true
```

### Get Screen Elements

Takes a screenshot and lists every element on screen in one step.

This keyword takes no parameters.

```csv
Debug,Get Screen Elements
```

```yaml
- Get Screen Elements
```

Good to know:

- Element positions are given in screenshot pixels, so they line up with the image.
