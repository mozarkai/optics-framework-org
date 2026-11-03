# Find elements by text and image

> Use OCR and image matching to find elements the UI tree can't see, such as text inside images, canvases and video.

Some things on screen never appear in the app's UI tree: text drawn inside an image, a game or map canvas, a video player's controls, or anything on a device you can only watch through a camera. Optics can find these by looking at a screenshot, the way a person would. It reads text with **OCR** (optical character recognition) and finds icons with **image matching**.

Both are slower than the UI tree, so Optics only uses them after the faster ways fail. You turn them on in `config.yaml`.

## Turn on OCR

### Install an OCR engine

We recommend EasyOCR. It runs on your machine and needs no account.

```shell
$ optics setup --install easyocr
```

The first run downloads EasyOCR's models, which takes a minute.

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
  - easyocr:
      enabled: true
```

### Use text values

Nothing changes in your tests. Any text value, such as `Press Element,Trail Runner 2`, is tried in the UI tree first and with OCR second. To skip the UI tree and use OCR straight away, write `text_only:Trail Runner 2`.

### OCR engines

| Engine | Name in config | Install | Good to know |
|---|---|---|---|
| EasyOCR | `easyocr` | `optics setup --install easyocr` | Local and accurate. Slower on the first call while models load. Reads English. |
| Tesseract | `pytesseract` | `optics setup --install pytesseract`, plus the [Tesseract program](https://tesseract-ocr.github.io/tessdoc/Installation.html) | Light and fast. Matches whole words exactly. |
| Google Cloud Vision | `google_vision` | `optics setup --install google-vision` | Cloud service. Set `GOOGLE_APPLICATION_CREDENTIALS` to a service account key. Screenshots leave your machine. |
| Your own service | `remote_ocr` | Nothing | Sends screenshots to a URL you run. See the [engines reference](https://optics-framework.org/docs/reference/engines). |

List more than one engine and Optics tries them in order.

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
3. Don't resize the crop. Matching works best at the screen's own resolution, though it tolerates some scaling and rotation.
4. Save it as PNG anywhere in the project folder. The templates use `test_data/input_templates/`.
5. Refer to it by file name only: `cart_icon.png`, not a path. File names must be unique across the project.

Optics also picks up images inside `execution_output/`. Give templates distinctive names, so they never clash with a screenshot's name.

## When to use which

| Situation | Use |
|---|---|
| The element has a stable id or text in the UI tree | XPath or text, no vision needed |
| Text drawn inside an image, canvas or video | OCR |
| An icon with no text or id | Image matching |
| A device with no UI tree, watched through a camera | OCR and image matching. See [Production devices](https://optics-framework.org/docs/platforms/production) |
| The same word appears in several places | OCR with an [area of interest](https://optics-framework.org/docs/elements/area-of-interest) or `index` |

## Speed things up

- **Keep the UI tree first.** List page source and element sources before screenshot sources, so vision only runs when it's needed.
- **Search part of the screen.** An [area of interest](https://optics-framework.org/docs/elements/area-of-interest) crops the screenshot before OCR or matching runs.
- **Turn off what you don't use.** An enabled OCR engine is loaded at the start of every run, even by `optics dry_run`.

## See also

- [How Optics finds elements](https://optics-framework.org/docs/elements/)
- [Search part of the screen](https://optics-framework.org/docs/elements/area-of-interest)
- [Engines and extras](https://optics-framework.org/docs/reference/engines)
