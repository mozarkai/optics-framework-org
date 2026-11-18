# Find elements by text and image

> Use OCR and image matching to find elements the UI tree can't see, such as text inside images, canvases and video.

Some things on screen never appear in the app's UI tree: text drawn inside an image, a game or map canvas, a video player's controls, or anything on a device you can only watch through a camera. Optics can find these by looking at a screenshot, the way a person would. It reads text with **OCR** (optical character recognition) and finds icons with **image matching**.

Both are slower than the UI tree, so Optics only uses them after the faster ways fail. You turn them on in `config.yaml`.

## Turn on OCR

### Install an OCR engine

We recommend Apple Vision on a Mac and RapidOCR everywhere else. Both run on your machine, need no account and work offline.

**macOS**

```shell
$ optics setup --install apple-vision
```
**Linux and Windows**

```shell
$ optics setup --install rapidocr
```

### Enable it, and a screenshot source

OCR reads screenshots, so `elements_sources` must include a screenshot source for your driver (`appium_screenshot`, `playwright_screenshot`, `selenium_screenshot`, or `camera_screenshot`):

`config.yaml`:

```yaml
elements_sources:
  - appium_find_element:
      enabled: true
  - appium_page_source:
      enabled: true
  - appium_screenshot:
      enabled: true

text_detection:
  - rapidocr:             # apple_vision on a Mac
      enabled: true
```

### Use text values

Nothing changes in your tests. Any text value, such as `Press Element,Trail Runner 2`, is tried in the UI tree first and with OCR second. To skip the UI tree and use OCR straight away, write `text_only:Trail Runner 2`.

Without an OCR engine, a text miss ends with "OCR was not tried: no text_detection engine is configured."

### How OCR matches text

OCR looks for your text as words in the same order. It ignores letter case and the spaces between words. Every other character must be the same. All engines use this rule.

By default, your text can also be a part of a word. Set `strict_element_match: true` in `config.yaml` to find complete words only.

| Text value | On the screen | Found | Found when strict |
|---|---|---|---|
| `Sign in` | "Sign in to your account" | Yes | Yes |
| `sign IN` | "Sign in" | Yes | Yes |
| `World clock` | "World" at the end of one line, "clock" at the start of the next | Yes, and the tap goes to "World" | Yes |
| `Pay` | "Payment" | Yes | No |
| `Sign in.` | "Sign in" | No | No |

In Chinese, Japanese, Thai and other scripts with no spaces between words, each character counts as a word, so `设置` finds "打开设置页面". Arabic and Hebrew are read from right to left.

When the text shows more than once, `index` picks one: `0` is the first. Complete words come first, then parts of words. Each group is counted from the top and then from left to right.

### OCR engines

| Engine | Name in config | Install | Good to know |
|---|---|---|---|
| Apple Vision | `apple_vision` | `optics setup --install apple-vision` | macOS only. The fastest and most accurate: about 0.2 s for a phone screenshot, and good on camera pictures. |
| RapidOCR | `rapidocr` | `optics setup --install rapidocr` | Any OS, on the CPU. About 1 s for a phone screenshot, and good on camera pictures. |
| EasyOCR | `easyocr` | `optics setup --install easyocr` | Local. Needs a GPU to be quick: 15 s or more for a phone screenshot on a CPU. Reads English. |
| Tesseract | `pytesseract` | `optics setup --install pytesseract`, plus the [Tesseract program](https://tesseract-ocr.github.io/tessdoc/Installation.html) | Light and fast. |
| Google Cloud Vision | `google_vision` | `optics setup --install google-vision` | Cloud service. Set `capabilities.api_key` to a Vision API key or `capabilities.credentials_path` to a service account key file, or set `GOOGLE_APPLICATION_CREDENTIALS`. Screenshots leave your machine. |
| Your own service | `remote_ocr` | Nothing | Sends screenshots to a URL you run. See the [engines reference](https://optics-framework.org/docs/reference/engines). |

List more than one engine and Optics tries them in order.

### Pictures from a camera

The `camera_screenshot` source gives OCR and image matching a picture. The picture comes from one of three places: a webcam (`camera_index`), an HTTP(S) URL (`url`, with an optional `token`) or a TCP frame server (`url: ip:port`). With `find_screen`, Optics finds the device screen in the camera frame and makes it straight. See [BLE and camera](https://optics-framework.org/docs/reference/config#ble-and-camera).

When no element source lists the elements of the screen, as with a camera only, OCR gives the screen rows. Then `optics live`, `optics serve` and `optics mcp` show each text that OCR reads as a row.

## Turn on image matching

Image matching finds a picture of an element, such as an icon, on the screen. It needs no extra install.

`config.yaml`:

```yaml
image_detection:
  - templatematch:
      enabled: true
```

Then use the picture's file name as an element value:

`test_data/elements.csv`:

```csv
Element_Name,Element_ID
cart_icon,//*[@content-desc='Cart']
cart_icon,cart_icon.png
```

### Capture a good template

The picture is called a **template**. How you crop it decides whether matching works:

1. Take a screenshot on the same kind of device you test on. Run the test once and use a `pre_…` screenshot from `execution_output/`, or run `/screenshot` in `optics live`.
2. Crop tightly around the element. Include its distinctive shape, and as little background as possible.
3. Do not resize the crop. Playwright screenshots are at CSS pixel scale, so crop Playwright templates from a Playwright run.
4. Save it as PNG anywhere in the project folder. The templates use `test_data/input_templates/`.
5. Refer to it by file name only: `cart_icon.png`, not a path. File names must be unique across the project.

Optics also picks up images inside `execution_output/`. Give templates distinctive names, so they never clash with a screenshot's name.

### Use one template on many devices

A template that you cut on one device also matches on a screen with a different size. Optics looks for the template in three passes:

1. At the size of the template.
2. If the first pass finds nothing, at each size in `scale_range`, from 0.8 to 1.25 times by default.
3. If the second pass finds nothing, a feature search that also finds rotated templates.

When screens differ by more than that, set a wider `scale_range`. For example, use `[0.5, 1.25]` for templates that you cut from device screenshots and match on a smaller camera frame:

`config.yaml`:

```yaml
image_detection:
  - templatematch:
      enabled: true
      capabilities:
        scale_range: [0.5, 1.25]
```

`index` counts the matches at one size, from the top down and from left to right.

Before a tap, Optics changes the position of an OCR or image match from screenshot pixels to screen points, so that taps land correctly on iOS and on scaled screens.

## When to use which

| Situation | Use |
|---|---|
| The element has a stable id or text in the UI tree | XPath or text, no vision needed |
| Text drawn inside an image, canvas or video | OCR |
| An icon with no text or id | Image matching |
| A device with no UI tree, watched through a camera | OCR and image matching. See [Production devices](https://optics-framework.org/docs/platforms/production) |
| The same word appears in several places | OCR with an [area of interest](https://optics-framework.org/docs/elements/area-of-interest) or `index` |

## Speed things up

- **Keep the UI tree first.** List page source and element sources before screenshot sources, so vision only runs when it's needed. Assertions always check the UI tree first. They run OCR and image matching at most every 2 seconds, and only when the screen changed.
- **Search part of the screen.** An [area of interest](https://optics-framework.org/docs/elements/area-of-interest) crops the screenshot before OCR or matching runs.
- **Turn off what you don't use.** An enabled OCR engine is loaded at the start of every run, even by `optics dry_run`.

## See also

- [How Optics finds elements](https://optics-framework.org/docs/elements/)
- [Search part of the screen](https://optics-framework.org/docs/elements/area-of-interest)
- [Engines and extras](https://optics-framework.org/docs/reference/engines)
