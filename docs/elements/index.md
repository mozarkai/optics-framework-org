---
title: How Optics finds elements
nav: Overview
summary: Learn how Optics tries several ways to find each element, so one changed locator doesn't fail a test.
---

Most test tools give an element one locator, and the test fails the moment that locator changes. Optics assumes an element has several identities (its place in the UI tree, its text, what it looks like) and tries them in order before giving up. A redesign that breaks one identity falls through to the next.

::scene{name="ladder" caption="A redesign changed the button's id, so its XPath misses and its text finds it. A product name drawn inside an image isn't in the UI tree at all, so OCR reads it from a screenshot."}

## The order Optics tries things

When a step needs an element, Optics works through three layers of fallback.

### 1. Each value of the element, in order

An element can have several values in `elements.csv`. Optics tries them top to bottom and stops at the first that works:

```csv title="test_data/elements.csv"
Element_Name,Element_ID
sign_in,//*[@resource-id='com.birch.shop:id/login']
sign_in,Sign in
sign_in,sign_in.png
```

### 2. Each way to find that kind of value

Optics looks at a value and decides what kind it is, then tries the ways that fit, cheapest first:

| Value looks like | Optics tries | Needs |
|---|---|---|
| An XPath, such as `//*[@resource-id='login']` | The UI tree | A driver that exposes a UI tree |
| Text, such as `Sign in` | 1. The UI tree<br>2. OCR on a screenshot | OCR needs a [text detection engine](/docs/elements/text-and-images) |
| An image file, such as `sign_in.png` | Image matching on a screenshot | An [image detection engine](/docs/elements/text-and-images) |
| `text_only:Sign in` | OCR only, skipping the UI tree | A text detection engine |

Looking something up in the UI tree takes milliseconds. OCR and image matching read a screenshot, which takes longer, so Optics only uses them when the tree can't help. [Define elements](/docs/elements/define) shows every kind of value.

### 3. Each element source, in config order

`config.yaml` lists **element sources**: the ways Optics may look at the screen, such as asking the app directly, reading its UI tree, or taking a screenshot. Optics tries them in the order they're listed. If you enable more than one driver, each is tried in turn as well.

### Last resort: AI self-heal

If everything above fails and you've switched it on, an AI model looks at the screen and tries to finish the step, for example by spotting that *Sign in* is now *Log in*. It's off by default. See [AI self-heal](/docs/elements/self-heal).

## See which way worked

Optics records how it found each element, so you can tell when a test is passing on a fallback:

- `optics live` shows it after each step: `0.31s  [Text]`.
- Screenshots in `execution_output/` show a box around the element Optics found, for drivers that report element positions. See [Read the results](/docs/run/results).

If a test keeps passing on its second or third value, the first one is probably out of date. Update it while you still know why.

## Make elements last

- **Put the most stable value first.** An id that developers don't change is better than text that marketing rewrites.
- **Add a text fallback** to important buttons. Text survives most layout changes.
- **Use images last.** Image matching is the slowest, and a restyled button stops matching. It's still the only option for icons with no text or id.
- **Narrow the search** when the same text appears twice on a screen. Use `index` to pick a match, or an [area of interest](/docs/elements/area-of-interest) to look in one part of the screen.

## See also

- [Define elements](/docs/elements/define)
- [Find elements by text and image](/docs/elements/text-and-images)
- [Search part of the screen](/docs/elements/area-of-interest)
- [AI self-heal](/docs/elements/self-heal)
