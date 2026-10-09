---
title: Define elements
summary: Name the things your tests touch, choose good values for them, and add fallbacks that survive redesigns.
level: Beginner
time: 8 min
---

An element is a name for something on screen, plus one or more values that tell Optics how to find it. Steps refer to elements by name (`${sign_in}`), so when the app changes, you update the element once and every test follows.

## Write elements

Elements live in any CSV whose header starts with `Element_Name,Element_ID`. The project template puts them in `test_data/elements.csv`.

```csv title="test_data/elements.csv"
Element_Name,Element_ID
sign_in,//*[@resource-id='com.birch.shop:id/login']
sign_in,Sign in
cart_icon,cart_icon.png
search_bar,Search Birch
email,ava@birch.shop
```

To give an element several values, repeat its name on more rows. Optics tries them top to bottom. You can also add more columns whose names start with `Element_ID`, such as `Element_ID_text` or `Element_ID_image`, and fill them in on the same row:

```csv title="test_data/elements.csv"
Element_Name,Element_ID,Element_ID_text,Element_ID_image
sign_in,//*[@resource-id='com.birch.shop:id/login'],Sign in,sign_in.png
```

Both layouts mean the same thing. Use whichever is easier to read for your team. Empty cells are ignored.

:::mistake[The header is exact]
The first column must be named exactly `Element_Name`, with that capitalization. A file headed `element_name,element_id` is recognised as an elements file but loads no elements, and every `${name}` then fails with "Element not found".
:::

## Choose the kind of value

Optics decides what a value is from how it looks:

| Write | Optics treats it as | Example |
|---|---|---|
| Starts with `/`, `//` or `(` | XPath, looked up in the UI tree | `//*[@resource-id='login']` |
| Plain words | Text: UI tree first, then OCR on a screenshot | `Sign in` |
| `text_only:` then words | Text, OCR only | `text_only:Sign in` |
| Ends in `.png`, `.jpg`, `.jpeg` or `.bmp` | An image to match on a screenshot | `cart_icon.png` |
| `css=`, `#id`, `.class` or `tag[attr]` | A CSS selector. Works with Playwright, not Selenium | `#login-button` |
| Starts with `android.` or `XCUI` | A class name | `android.widget.Switch` |

### XPath

An XPath is a path through the app's UI tree. It's the fastest and most precise kind of value, and the best first choice when the app has stable ids:

- Android: `//*[@resource-id='com.birch.shop:id/login']`
- iOS: `//XCUIElementTypeButton[@name='Sign in']`
- Web: `//button[@id='login']`

To pick the second of several matches, wrap the XPath in parentheses and add an index: `(//android.widget.Button)[2]`.

### Text

Plain text matches an element showing that text, or with that accessibility label. It's the most readable kind of value, and it survives layout changes. If the text isn't in the UI tree, for example because it's drawn inside an image or a game canvas, Optics reads the screenshot with OCR, as long as a [text detection engine](/docs/elements/text-and-images) is enabled.

Text matching in the UI tree tolerates small differences. To require exact matches, set `strict_element_match: true` in `config.yaml`.

:::mistake[Text that looks like something else]
A value is checked against the rules in the table above, top to bottom. Text that happens to start with `(` or `/`, or contains `[` and `]`, is read as an XPath or CSS selector: `(optional)`, `Price [USD]`, `.com`. On Appium and Playwright, put `text=` in front to force text: `text=(optional)`.
:::

### Images

An image value is the file name of a cropped picture of the element. Put the picture anywhere in the project folder (the templates use `test_data/input_templates/`) and refer to it by file name only. Image matching is the slowest kind and needs an image detection engine. Use it for icons with no text or id. [Find elements by text and image](/docs/elements/text-and-images) shows how to capture a good picture.

### Values to avoid

`id:` values, such as `id:login`, aren't supported by any element source and always fail. Use an XPath on the id instead.

## Find the right locator

- **In `optics live`**, try a value with `press_element` or `assert_presence` before you write it down. The history line shows whether it worked and how it was found.
- **Android and iOS**: [Appium Inspector](https://github.com/appium/appium-inspector) shows each element's id, text and XPath.
- **Web**: right-click an element in Chrome and choose **Inspect**.
- **Any platform**: the `Get Interactive Elements` keyword lists the buttons, fields and text on the current screen. In `optics live`, run `get_interactive_elements` and open the JSON file it writes to the output folder.

## Pick one of several matches

When the same text appears more than once, `index` picks a match, counting from 0:

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2
Add Second Product,Press Element,Add to cart,index=1
```

To look in one part of the screen instead, use an [area of interest](/docs/elements/area-of-interest).

## Keep data in elements too

Elements can hold any value a step needs, not only locators: an email address, a search term, a URL. Keeping them together means one file holds everything that changes between environments.

To keep a password out of log files, start its value with `@:`, for example `password,@:correct-horse`. Optics masks it as `****` in logs and types it without the prefix on Appium, Selenium and Bluetooth devices. Playwright types the prefix too, so don't use `@:` with Playwright.

To put a line break or tab inside a value, write `\n` or `\t`. Write `\\` for a literal backslash.

## See also

- [How Optics finds elements](/docs/elements/)
- [Variables](/docs/advanced/variables)
- [Project files reference](/docs/reference/files)
