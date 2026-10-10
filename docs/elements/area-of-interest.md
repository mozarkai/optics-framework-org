---
title: Search part of the screen
nav: Area of interest
summary: Limit where Optics looks for an element, so repeated text can't be matched in the wrong place and vision runs faster.
level: Intermediate
time: 5 min
---

An **area of interest** (AOI) is a rectangle on the screen. Give one to a step and Optics only accepts an element inside it. Use it when the same text appears in several places, such as an *Add to cart* button that also appears in a product description, or to make OCR faster by reading less of the screen.

::scene{name="aoi" caption="With an area of interest covering the bottom quarter, Optics only searches that part of the screen, so it presses the button rather than the same words in the banner at the top."}

## Set an area

Four values describe the rectangle, each as a **percentage** of the screen, from 0 to 100:

| Parameter | Meaning | Default |
|---|---|---|
| `aoi_x` | Left edge, from the left of the screen | `0` |
| `aoi_y` | Top edge, from the top of the screen | `0` |
| `aoi_width` | Width of the area | `100` |
| `aoi_height` | Height of the area | `100` |

The defaults cover the whole screen, which means "no area". Pass the values by name:

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2,param_3
Add To Cart,Press Element,Add to cart,aoi_y=75,aoi_height=25
```

This looks for *Add to cart* only in the bottom quarter: it starts 75% of the way down and covers the remaining 25%.

Some common areas:

| Area | Values |
|---|---|
| Top half | `aoi_height=50` |
| Bottom half | `aoi_y=50,aoi_height=50` |
| Right third | `aoi_x=67,aoi_width=33` |
| Centre | `aoi_x=25,aoi_y=25,aoi_width=50,aoi_height=50` |

The edges must stay on the screen: `aoi_x` plus `aoi_width`, and `aoi_y` plus `aoi_height`, can be at most 100.

## How it works

- **OCR and image matching** crop the screenshot to the area before they search. They read less, so they're faster too.
- **The UI tree** can't be cropped. Optics finds the element as usual, then keeps it only if its centre is inside the area.

Each step that uses an area saves a screenshot with the rectangle drawn on it (`…_with_aoi.jpg` in `execution_output/`), so you can check you chose the right part of the screen.

## Keywords that accept an area

`Press Element`, `Enter Text`, `Enter Number`, `Clear Element Text`, `Get Text`, `Swipe From Element` and `Scroll From Element`. Checks such as `Assert Presence` don't take an area.

In the Python library, only `press_element` accepts area parameters.

## Area or index?

Both pick one match out of several. Use `index` when you know which match you want by order (the second *Add to cart* button). Use an area when you know *where* it is, which keeps working when items are added or reordered. You can combine them.

## See also

- [Find elements by text and image](/docs/elements/text-and-images)
- [Define elements](/docs/elements/define#pick-one-of-several-matches)
- [Action keywords](/docs/reference/keywords/actions)
