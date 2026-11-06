---
title: Action keywords
nav: Actions
summary: Learn how to tap, type, swipe, scroll and send keys in a step.
layout: wide
---

Action keywords do something to the app: tap, type, swipe, scroll or press a key. On Playwright, each one waits up to 10 seconds for its element. On Appium and Selenium, each one looks at the current screen once and fails if the element is not there.

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2
Sign In,Assert Presence,${email_field},15
Sign In,Enter Text,${email_field},ana@birch.example
Sign In,Enter Text,${password_field},@:pw-ana
Sign In,Press Element,${sign_in}
```

On Appium and Selenium, put an [Assert Presence](/docs/reference/keywords/verification#assert-presence) before an action when the next screen can be slow to load. For how `element`, `index`, `${name}` and the `aoi_*` parameters work, see [Keywords](/docs/reference/keywords/).

:::note[TV platforms]
On Samsung Tizen and LG webOS TVs, Press Element, Enter Text and Clear Element Text press remote keys to move the focus. Keywords that tap a point, swipe or scroll fail with error E0105. Use [Press Keycode](#press-keycode) to press a single key. Android TV works like Android. See [TV](/docs/platforms/tv).
:::

When `save_captures` is `true`, Optics saves a screenshot before each action to the run's output folder. See [Results](/docs/run/results).

## Tap

### Press Element

Taps or clicks an element found by XPath, text, OCR or image.

| Parameter | Default | What it does |
|---|---|---|
| `element` | Required | The element to tap. See [Element arguments](/docs/reference/keywords/#element-arguments). |
| `repeat` | `1` | How many times to tap. |
| `offset_x` | `0` | Screen points to add to the tap point horizontally. |
| `offset_y` | `0` | Screen points to add to the tap point vertically. |
| `index` | `0` | Which match to tap when several match. `0` is the first. |
| `aoi_x`, `aoi_y`, `aoi_width`, `aoi_height` | `0`, `0`, `100`, `100` | Area of the screen to search, in percent. See [Area of interest](/docs/elements/area-of-interest). |
| `event_name` | Empty | Label for a timed event. See [Event names](/docs/reference/keywords/#event-names). |

```csv
Sign In,Press Element,${sign_in}
Browse,Press Element,Trail Runner 2,index=1
Checkout,Press Element,pay_button.png,aoi_y=50,aoi_height=50
Add To Cart,Press Element,${add_to_cart},event_name=tap_add_to_cart
```

```yaml
- Press Element ${sign_in} event_name=tap_sign_in
```

Good to know:

- On Appium and Selenium, Press Element does not wait. If the element is not on screen yet, the step fails. On Playwright, it waits up to 10 seconds.
- `repeat` taps several times only when the element was found in the app's UI tree, by XPath or native text. An element found by OCR or image is tapped once.
- `offset_x` and `offset_y` apply only when the element was found by OCR or image. They're ignored for elements found in the UI tree.
- When `element` is `${name}` with several values, Optics tries each one until it finds the element.
- If [self-healing](/docs/elements/self-heal) is turned on, it gets one try to recover before the step fails.
- On Samsung Tizen and LG webOS TVs, Press Element presses the arrow keys until the element has focus. Then it presses `ENTER`. `repeat` presses `ENTER` that many times.

### Press By Percentage

Taps a point given as a percentage of the screen width and height.

| Parameter | Default | What it does |
|---|---|---|
| `percent_x` | Required | Horizontal position, from 0 (left) to 100 (right). |
| `percent_y` | Required | Vertical position, from 0 (top) to 100 (bottom). |
| `repeat` | `1` | How many times to tap. |
| `event_name` | Empty | Label for a timed event. |

```csv
Promo,Press By Percentage,50,90
Promo,Press By Percentage,50,90,event_name=tap_banner
```

```yaml
- Press By Percentage 50 90
```

Good to know:

- Values are 0–100, not 0–1. `0.5` means half a percent, which taps the edge of the screen.
- On Appium, decimals are cut off: `50.7` taps at 50 %.
- We recommend Press Element instead. A fixed point breaks when the layout changes.
- On Samsung Tizen and LG webOS TVs, the step fails with error E0105.

### Press By Coordinates

Taps an absolute pixel coordinate on the screen.

| Parameter | Default | What it does |
|---|---|---|
| `coor_x` | Required | Horizontal position in pixels. |
| `coor_y` | Required | Vertical position in pixels. |
| `repeat` | `1` | Ignored. The point is always tapped once. |
| `event_name` | Empty | Label for a timed event. |

```csv
Promo,Press By Coordinates,540,1600
```

```yaml
- Press By Coordinates 540 1600
```

Good to know:

- On Appium, a failed tap fails the step with error E0401.
- On Selenium, Optics clicks whatever element is at that point of the page.
- To set `event_name`, write it by name: `Press By Coordinates,540,1600,event_name=tap_promo`.
- On Samsung Tizen and LG webOS TVs, the step fails with error E0105.

### Detect And Press

Taps an element if it appears within the timeout. If it doesn't appear, the step passes without tapping.

| Parameter | Default | What it does |
|---|---|---|
| `element` | Required | The element to tap. |
| `timeout` | `30` | Seconds to wait for the element. |
| `event_name` | Empty | Label for a timed event. |

```csv
Open Birch,Detect And Press,Allow,5
Open Birch,Detect And Press,${newsletter_close},5
```

```yaml
- Detect And Press Allow 5
```

Good to know:

- Use it for pop-ups that appear only sometimes, such as permission prompts or a newsletter sign-up.
- Keep the timeout short. When the element never appears, the step waits the full timeout.
- In Python the default timeout is 10 seconds.
- On Samsung Tizen and LG webOS TVs, it moves the focus to the element and presses `ENTER`, as Press Element does.

### Select Dropdown Option

Opens a dropdown and picks an option, scrolling inside the list if the option isn't visible.

| Parameter | Default | What it does |
|---|---|---|
| `element` | Required | The dropdown to open. |
| `option` | Required | The option to pick: text, an XPath or an image file name. |
| `timeout` | `30` | Seconds to keep scrolling the list before failing. Decimals are allowed. |
| `event_name` | Empty | Label for a timed event. |

```csv
Product,Select Dropdown Option,${size_dropdown},US 9,20
```

```yaml
- Select Dropdown Option ${size_dropdown} "US 9" 20
```

Good to know:

- Optics taps the dropdown and picks the option if it's visible. Otherwise it finds the list that opened and scrolls it down half a list at a time, until the option appears or the list stops moving.
- It assumes the list opens with its first option visible.
- If the option isn't found, the error lists the options Optics did see.
- On Samsung Tizen and LG webOS TVs, the step fails with error E0105.

## Type

### Enter Text

Types text into a field.

| Parameter | Default | What it does |
|---|---|---|
| `element` | Required | The field to type into. |
| `text` | Required | The text to type, or one special key such as `<enter>`. |
| `aoi_x`, `aoi_y`, `aoi_width`, `aoi_height` | `0`, `0`, `100`, `100` | Area of the screen to search, in percent. |
| `event_name` | Empty | Label for a timed event. |
| `index` | `0` | Which match to use when several match. |

```csv
Search,Enter Text,${search_bar},Trail Runner 2
Search,Enter Text,${search_bar},<enter>
Sign In,Enter Text,${password_field},@:pw-ana
```

```yaml
- Enter Text ${search_bar} "Trail Runner 2"
```

Good to know:

- On Appium, Enter Text does not clear the field first. Use [Clear Element Text](#clear-element-text) before it if the field can have text. Playwright and Selenium replace the text in the field.
- When the element is a caption or label, such as `Email`, Optics types into the field that it names.
- `event_name` comes before `index` here, unlike Press Element. Set `index` by name: `index=1`.
- When the field was found by OCR or image, Optics taps it, then types.
- A value that is exactly one special key in angle brackets presses that key. Appium supports `<enter>`, `<tab>`, `<backspace>`, `<space>`, `<escape>`, `<back>`, `<home>`, `<menu>`, `<volumeup>`, `<volumedown>`, `<power>`, `<camera>` and `<search>`. Playwright supports `<enter>`, `<tab>`, `<backspace>`, `<space>`, `<escape>`, the arrow keys `<up>`, `<down>`, `<left>` and `<right>`, `<insert>`, `<delete>`, `<home>`, `<end>`, `<pageup>`, `<pagedown>` and `<f1>` to `<f12>`. On Playwright, another key such as `<back>` fails with error E0105. An unknown name is typed literally.
- Start a value with `@:` to mark it as sensitive. Optics masks it as `****` in log files and removes the `@:` before typing. `@:${password}` also works.
- In YAML, quote text that contains spaces.
- On Samsung Tizen and LG webOS TVs, Optics types into a real `<input>` directly. For a field that the app draws, it presses the keys of the on-screen keyboard one by one. If the field does not show the text afterward, the step fails with error E0405 and no fallback value types the text again. `<space>`, `<backspace>` and `<enter>` press that key of the on-screen keyboard. `<escape>` and the arrow keys press remote keys. Other special keys fail with error E0105. See [Type on a TV](/docs/platforms/tv#type-on-a-tv).

### Enter Number

Types a number into a field. It works like Enter Text without special keys.

| Parameter | Default | What it does |
|---|---|---|
| `element` | Required | The field to type into. |
| `number` | Required | The number to type. |
| `aoi_x`, `aoi_y`, `aoi_width`, `aoi_height` | `0`, `0`, `100`, `100` | Area of the screen to search, in percent. |
| `event_name` | Empty | Label for a timed event. |
| `index` | `0` | Which match to use when several match. |

```csv
Cart,Enter Number,${quantity_field},2
```

```yaml
- Enter Number ${quantity_field} 2
```

### Enter Text Direct

Types text into whichever field has focus, without looking for an element.

| Parameter | Default | What it does |
|---|---|---|
| `text` | Required | The text to type. |
| `event_name` | Empty | Label for a timed event. |

```csv
Search,Press Element,${search_bar}
Search,Enter Text Direct,pace knit
```

```yaml
- Enter Text Direct "pace knit"
```

Good to know:

- Special keys such as `<enter>` aren't recognized here. They're typed as text. Use Enter Text Using Keyboard for keys.
- On iOS, the step fails with error E0401 when no field has keyboard focus. Tap the field first.
- On Samsung Tizen and LG webOS TVs, the step fails with error E0105. Use Enter Text with an element.

### Enter Text Using Keyboard

Types text one key at a time, or presses one special key.

| Parameter | Default | What it does |
|---|---|---|
| `text_input` | Required | The text to type, or one special key such as `<enter>`. |
| `event_name` | Empty | Label for a timed event. |

```csv
Search,Enter Text Using Keyboard,<enter>
Search,Enter Text Using Keyboard,trail runner
```

```yaml
- Enter Text Using Keyboard <enter>
```

Good to know:

- Write special keys in angle brackets. `enter` without brackets types the word "enter".
- Use it for apps that ignore text sent all at once, such as search fields that react to each key press.
- On Samsung Tizen and LG webOS TVs, the step fails with error E0105. Use Enter Text with an element.

### Clear Element Text

Empties a text field.

| Parameter | Default | What it does |
|---|---|---|
| `element` | Required | The field to clear. |
| `aoi_x`, `aoi_y`, `aoi_width`, `aoi_height` | `0`, `0`, `100`, `100` | Area of the screen to search, in percent. |
| `event_name` | Empty | Label for a timed event. |
| `index` | `0` | Which match to use when several match. |

```csv
Search,Clear Element Text,${search_bar}
```

```yaml
- Clear Element Text ${search_bar}
```

Good to know:

- When the field was found by OCR or image, Optics taps it and clears it. On Playwright it selects all and deletes.
- When the element is a caption or label, Optics clears the field that it names.
- On Samsung Tizen and LG webOS TVs, Optics presses the backspace key of the on-screen keyboard until the field stops changing. If text stays in the field, the step fails with error E0405.

## Swipe and scroll

Directions don't all mean the same thing. For the swipe keywords and Scroll From Element on Appium, the direction is the way your finger moves: `up` reveals content further down. Scroll, Scroll Until Element Appears and every Playwright gesture use the page's direction instead: `down` reveals content further down.

Samsung Tizen and LG webOS TVs have no touch screen. Every keyword in this section fails there with error E0105. Press an arrow key with [Press Keycode](#press-keycode), or use Press Element to move the focus.

### Swipe

Swipes from a pixel point in a direction.

| Parameter | Default | What it does |
|---|---|---|
| `coor_x` | Required | Start point, horizontal pixels. |
| `coor_y` | Required | Start point, vertical pixels. |
| `direction` | `right` | `up`, `down`, `left` or `right`. |
| `swipe_length` | `50` | Distance to move, in pixels. |
| `event_name` | Empty | Label for a timed event. |

```csv
Browse,Swipe,540,1500,up,800
```

```yaml
- Swipe 540 1500 up 800
```

Good to know:

- On Appium, an unknown direction or a driver error is logged and the step passes.
- Selenium doesn't support Swipe. The step fails.
- On Playwright, Swipe scrolls the page with the mouse wheel by `swipe_length` pixels. `down` scrolls down, and every other direction scrolls up.

### Swipe By Percentage

Swipes from a point given in percent, for a distance given in percent of the screen.

| Parameter | Default | What it does |
|---|---|---|
| `percent_x` | Required | Start point, 0–100 of the screen width. Whole numbers only. |
| `percent_y` | Required | Start point, 0–100 of the screen height. Whole numbers only. |
| `direction` | `right` | `up`, `down`, `left` or `right`. |
| `swipe_length` | `50` | Distance, in percent of the screen height for `up` and `down`, or width for `left` and `right`. |
| `event_name` | Empty | Label for a timed event. |

```csv
Browse,Swipe By Percentage,50,80,up,40
Banner,Swipe By Percentage,90,30,left,60
```

```yaml
- Swipe By Percentage 50 80 up 40
```

Good to know:

- Decimals such as `50.5` fail the step.
- Selenium doesn't support it. On Playwright it scrolls the page vertically by `swipe_length` percent of the window height.

### Swipe From Element

Swipes starting on an element, such as a carousel or slider.

| Parameter | Default | What it does |
|---|---|---|
| `element` | Required | The element to start on. |
| `direction` | Required | `up`, `down`, `left` or `right`. |
| `swipe_length` | Required | Distance to move, in pixels. |
| `aoi_x`, `aoi_y`, `aoi_width`, `aoi_height` | `0`, `0`, `100`, `100` | Area of the screen to search, in percent. |
| `event_name` | Empty | Label for a timed event. |
| `index` | `0` | Which match to use when several match. |

```csv
Product,Swipe From Element,${product_carousel},left,300
```

```yaml
- Swipe From Element ${product_carousel} left 300
```

Good to know:

- On Appium, driver errors during the gesture are logged and the step passes.
- Selenium doesn't support it. On Playwright, it scrolls the element's nearest scrollable area.
- In Python, `direction` defaults to `right` and `swipe_length` to `50`.

### Swipe Until Element Appears

Swipes again and again until an element is on screen.

| Parameter | Default | What it does |
|---|---|---|
| `element` | Required | The element to look for. |
| `direction` | Required | `up`, `down`, `left` or `right`. |
| `timeout` | Required | Seconds to keep trying. |
| `event_name` | Empty | Label for a timed event. |

```csv
Browse,Swipe Until Element Appears,Pace Knit,up,30
```

```yaml
- Swipe Until Element Appears "Pace Knit" up 30
```

Good to know:

- Each round checks for the element for up to 3 seconds, swipes a quarter of the screen starting near the left edge at mid-height, then waits 3 seconds.
- Selenium doesn't support it. On Playwright, use `down` to move down the page.
- In Python, `direction` defaults to `down` and `timeout` to `30`.

### Scroll

Scrolls the screen once.

| Parameter | Default | What it does |
|---|---|---|
| `direction` | Required | `down` to reveal content below, `up` to reveal content above. `right` and `left` reveal content at the side. |
| `event_name` | Empty | Label for a timed event. |

```csv
Browse,Scroll,down
```

```yaml
- Scroll down
```

Good to know:

- On Appium, one scroll drags from 80 % to 20 % of the screen height, or of the width for `left` and `right`.
- On Selenium, one scroll moves one window's height or width.
- On Playwright, one scroll moves about 2000 pixels.
- The BLE driver ignores `left` and `right`.
- In Python, `direction` defaults to `down`.

### Scroll From Element

Scrolls starting on an element, such as a list inside a page. It behaves the same as Swipe From Element.

| Parameter | Default | What it does |
|---|---|---|
| `element` | Required | The element to start on. |
| `direction` | Required | `up`, `down`, `left` or `right`. |
| `scroll_length` | Required | Distance to move, in pixels. |
| `aoi_x`, `aoi_y`, `aoi_width`, `aoi_height` | `0`, `0`, `100`, `100` | Area of the screen to search, in percent. |
| `event_name` | Empty | Label for a timed event. |
| `index` | `0` | Which match to use when several match. |

```csv
Browse,Scroll From Element,${product_list},up,600
```

```yaml
- Scroll From Element ${product_list} up 600
```

Good to know:

- On Appium the direction is the way your finger moves, as with Swipe From Element.
- In Python, `direction` defaults to `down` and `scroll_length` to `100`.

### Scroll Until Element Appears

Scrolls again and again until an element is on screen.

| Parameter | Default | What it does |
|---|---|---|
| `element` | Required | The element to look for. |
| `direction` | Required | `down`, `up`, `left` or `right`. |
| `timeout` | Required | Seconds to keep trying. |
| `event_name` | Empty | Label for a timed event. |

```csv
Browse,Scroll Until Element Appears,Pace Knit,down,40
```

```yaml
- Scroll Until Element Appears "Pace Knit" down 40
```

Good to know:

- Each round checks for the element for up to 3 seconds, scrolls once, then waits 3 seconds.
- If the element never appears, the step fails with error E0201.
- In Python, `direction` defaults to `down` and `timeout` to `30`.

## Keys and scripts

### Go Back

Goes back one screen, or one page in a browser.

| Parameter | Default | What it does |
|---|---|---|
| `event_name` | Empty | Label for a timed event. |

```csv
Product,Go Back
```

```yaml
- Go Back
```

Good to know:

- On Playwright and Selenium, Go Back goes back one page in the browser history. Playwright waits for the page to load, up to `navigation_timeout_ms`. See [Timeouts](/docs/platforms/web#timeouts).
- On Android, it presses the system Back button.
- On iOS, it taps the back button in the navigation bar. If the screen has no such button, the step fails with error E0401.
- Samsung Tizen and LG webOS TVs and the BLE driver do not support it. The step fails with error E0105. Use [Press Keycode](#press-keycode) with `BACK` on a TV.

### Press Keycode

Sends a hardware, system or remote-control key.

| Parameter | Default | What it does |
|---|---|---|
| `keycode` | Required | The key to send. Its form depends on the platform. |
| `event_name` | Empty | Label for a timed event. |

| Platform | What to pass | Examples |
|---|---|---|
| Android | An Android keycode number | `4` Back, `3` Home, `66` Enter |
| Samsung Tizen and LG webOS TV | A remote key name | `UP`, `DOWN`, `LEFT`, `RIGHT`, `ENTER`, `BACK`, `HOME`, `PLAY`, `PAUSE` |
| Playwright | A key name | `Enter`, `Tab`, `Escape`, `ArrowUp` |

```csv
Product,Press Keycode,4
TV Browse,Press Keycode,RIGHT
TV Browse,Press Keycode,ENTER
```

```yaml
- Press Keycode 4
```

Good to know:

- Selenium doesn't support it. Use Enter Text with `<enter>` or `<tab>` instead.
- On Playwright, case and a `KEYCODE_` prefix do not matter: `esc`, `ARROWDOWN` and `KEYCODE_ENTER` work. An unknown name fails with error E0403 and lists the names that Optics knows.
- On Tizen and webOS, an unknown remote key name fails with error E0104. The message lists the names that Optics knows. See [TV](/docs/platforms/tv#move-around-with-remote-keys) for the names.
- On TVs, this is how you press one remote key. To move the focus to an element, use Press Element.

### Execute Script

Runs a driver command, such as an Appium `mobile:` command, or JavaScript in the browser.

| Parameter | Default | What it does |
|---|---|---|
| `script_or_json` | Required | The script, or JSON with `script` and `args` keys. |
| `event_name` | Empty | Label for a timed event. |

```csv
Device,Execute Script,"{""script"": ""mobile: pressKey"", ""args"": {""keycode"": 3}}"
Web,Execute Script,"window.scrollTo(0, 0)"
Web,Execute Script,return document.title.length,store_as=title_length
```

```yaml
- Execute Script '{"script":"mobile: pressKey","args":{"keycode":3}}'
```

Good to know:

- In CSV, wrap a value that contains commas in double quotes, and double every quote inside it.
- When the value is JSON with a `script` key, `args` is passed this way: an object becomes one argument, and a list becomes one argument per item.
- To keep the result, add [`store_as=name`](/docs/reference/keywords/#store-as).
- On Playwright, give an expression such as `document.title`, or a script with `return` and `arguments[0]`, as on Selenium and Appium.
- The BLE driver doesn't support it.

## Read and wait

### Get Text

Reads the text of an element. On the web, it reads the value of a field.

| Parameter | Default | What it does |
|---|---|---|
| `element` | Required | The element to read. |
| `index` | `0` | Which match to read when several match. |
| `aoi_x`, `aoi_y`, `aoi_width`, `aoi_height` | `0`, `0`, `100`, `100` | Area of the screen to search, in percent. |

```csv
Product,Get Text,//android.widget.TextView[@resource-id="com.birch.shop:id/price"],store_as=price
```

```yaml
- Get Text //android.widget.TextView[@resource-id="com.birch.shop:id/price"] store_as=price
```

Good to know:

- Add [`store_as=name`](/docs/reference/keywords/#store-as) to keep the text in a variable. To check text, use [Assert Text](/docs/reference/keywords/verification#assert-text).
- When the element is found only by OCR or image, Get Text returns nothing and the step still passes. With `store_as`, the step fails.
- On a web page that Appium drives in a mobile browser, Get Text reads the text of the web element.
- On Samsung Tizen and LG webOS TVs, Get Text reads the text of the element, or the value of a field.
- In Python, Get Text takes `element` only and returns the text.

### Sleep

Waits a number of seconds.

| Parameter | Default | What it does |
|---|---|---|
| `duration` | Required | Seconds to wait. Whole numbers only. |

```csv
Checkout,Sleep,3
```

```yaml
- Sleep 3
```

Good to know:

- `1.5` fails the step. Use `1` or `2`.
- We recommend an assertion with a timeout instead. It continues as soon as the element appears.

## Deprecated

These keywords still run but will be removed. Use the replacement shown.

### Press Checkbox

Taps an element and logs a deprecation warning. Use [Press Element](#press-element) instead.

| Parameter | Default | What it does |
|---|---|---|
| `element` | Required | The checkbox to tap. |
| `aoi_x`, `aoi_y`, `aoi_width`, `aoi_height` | `0`, `0`, `100`, `100` | Area of the screen to search, in percent. |
| `event_name` | Empty | Label for a timed event. |
| `index` | `0` | Which match to tap when several match. |

```csv
Checkout,Press Checkbox,${terms_checkbox}
```

### Press Radio Button

Taps an element and logs a deprecation warning. Use [Press Element](#press-element) instead. It takes the same parameters as Press Checkbox.

```csv
Checkout,Press Radio Button,${express_shipping}
```

### Swipe Seekbar To Right Android

Meant to drag a slider to the right. It fails on Appium. Use [Swipe From Element](#swipe-from-element) instead.

| Parameter | Default | What it does |
|---|---|---|
| `element` | Required | The slider. |
| `event_name` | Empty | Label for a timed event. |

```csv
Filters,Swipe From Element,${price_slider},right,300
```
