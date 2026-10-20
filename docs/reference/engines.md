---
title: Engines and extras
summary: Learn which drivers, element sources, OCR, image matching and LLM engines Optics supports, and which pip extra installs each one.
layout: wide
---

Optics keeps its core install small. Each driver and recognition engine is a separate pip extra that you add for your platform, either with [`optics setup`](/docs/reference/cli#optics-setup) or with pip. You then turn the engine on by name in [config.yaml](/docs/reference/config#engine-lists).

The name you write in config.yaml is the engine's name in the tables below. The extra is what you install.

## Drivers

A driver controls the device or browser. Enable one under `driver_sources`.

| Name in config | Extra | What it's for | Platforms |
|---|---|---|---|
| `appium` | `appium` | Native and hybrid apps through an Appium server. | Android, iOS, Android TV, Samsung Tizen TV, LG webOS TV |
| `selenium` | `selenium` | Websites through a Selenium server or Grid. Chrome and Firefox only. | Web |
| `playwright` | `playwright` | Websites in a local Chromium browser, with no server to run. | Web |
| `ble` | `ble` | Taps and typing through a Bluetooth mouse-and-keyboard dongle, for devices with no automation access. | Any device that accepts a Bluetooth mouse and keyboard |

The Appium server itself, and its UiAutomator2 or XCUITest driver, aren't Python packages. Install and start them separately. See [Test Android apps](/docs/platforms/android) and [Test iOS apps](/docs/platforms/ios).

## Element sources

An element source is how Optics looks at the screen for a driver. They need no extra of their own: they come with their driver. Enable them under `elements_sources`.

| Name in config | Extra | What it's for | Platforms |
|---|---|---|---|
| `appium_find_element` | `appium` | Finds elements by XPath, accessibility id or class. | Android, iOS, TV |
| `appium_page_source` | `appium` | Searches the UI tree by XPath and text. Lists interactive elements. | Android, iOS, TV |
| `appium_screenshot` | `appium` | Screenshots for OCR, image matching and AI self-heal. | Android, iOS, TV |
| `selenium_find_element` | `selenium` | Finds elements by XPath, text, id, name, CSS or link text. | Web |
| `selenium_page_source` | `selenium` | Searches the page HTML. | Web |
| `selenium_screenshot` | `selenium` | Screenshots for OCR and image matching. | Web |
| `playwright_find_element` | `playwright` | Finds elements by `xpath=`, `css=` and `text=` locators. | Web |
| `playwright_page_source` | `playwright` | Searches the page and lists interactive elements. | Web |
| `playwright_screenshot` | `playwright` | Screenshots for OCR and image matching. | Web |
| `camera_screenshot` | None | Frames from a webcam or a TCP frame server. | Any, usually with `ble` |

Only `appium_page_source` and `playwright_page_source` can list interactive elements. With Selenium, `Get Interactive Elements`, the HTTP `/elements` endpoint and the MCP elements resource fail with [E0202](/docs/reference/errors#e02-elements).

## Text recognition (OCR)

OCR finds elements by the text visible in a screenshot. Optics uses it when the UI tree doesn't have the text, or when you write `text_only:`. Enable engines under `text_detection`.

| Name in config | Extra | What it's for | Platforms |
|---|---|---|---|
| `easyocr` | `easyocr` | Local OCR. Accurate but slow on CPU. Downloads its models the first time it runs. English only. | All |
| `pytesseract` | `pytesseract` | Local OCR with Tesseract. Needs the Tesseract program installed and on your PATH. Matches whole words. | All |
| `google_vision` | `google-vision` | Google Cloud Vision. Needs Google Cloud credentials in `GOOGLE_APPLICATION_CREDENTIALS`. | All |
| `remote_ocr` | None | Your own OCR service over HTTP. Set its `url`. | All |

We recommend `easyocr` to start with. It needs nothing else installed.

## Image matching

Image matching finds an element by a template image you saved in the project. Enable engines under `image_detection`.

| Name in config | Extra | What it's for | Platforms |
|---|---|---|---|
| `templatematch` | None | Local matching. Finds templates even when they're scaled or rotated. | All |
| `remote_oir` | None | Your own image matching service over HTTP. Set its `url`. | All |

## LLM

An LLM powers [AI self-heal](/docs/elements/self-heal) and the plain-English mode of `optics live`. Enable one under `llm_models`.

| Name in config | Extra | What it's for | Platforms |
|---|---|---|---|
| `gemini` | `gemini` | Google Gemini, through the Gemini API or Vertex AI. Default model `gemini-2.5-flash`. | All |
| `openai` | `openai` | OpenAI, and any server with an OpenAI-compatible API: OpenRouter, Azure OpenAI, or a local model in Ollama, vLLM or LM Studio. | All |
| `anthropic` | `anthropic` | Claude, through the Claude API, Amazon Bedrock or Google Vertex AI. | All |

Each engine reads its credentials from the environment. See [llm_models](/docs/reference/config#llm-models) for its settings and credentials.

## Other extras

| Extra | What it's for |
|---|---|
| `mcp` | The [MCP server](/docs/reference/mcp), `optics mcp`. Install it with pip; `optics setup` can't install it, and the `all` bundle doesn't include it. |

## Bundles

A bundle installs several extras at once.

| Bundle | Installs |
|---|---|
| `mobile` | `appium` |
| `web` | `selenium`, `playwright` |
| `vision` | `easyocr`, `pytesseract`, `google-vision` |
| `llm` | `gemini`, `openai`, `anthropic` |
| `all` | `appium`, `ble`, `selenium`, `playwright`, `easyocr`, `pytesseract`, `google-vision`, `gemini`, `openai`, `anthropic`. Not `mcp`. |

## Install with optics setup

`optics setup` installs extras into the same Python environment Optics runs in.

```text
optics setup [--install NAME [NAME ...]] [--list]
```

Without flags, it opens a picker with a checkbox for each engine. In scripts and CI, name the engines:

```shell
$ optics setup --install appium easyocr
$ optics setup --install web gemini
$ optics setup --install appium==5.0.0
```

- Names are case-insensitive. Use an extra name, a display name such as `Gemini` or `Google Vision`, or a bundle.
- Pin the engine's main package with a version specifier: `appium==5.0.0`, `"easyocr>=1.7,<2.0"`. Use an operator such as `==`; `appium=5.0.0` is an error. Bundles can't take a version.
- Optics keeps itself at the version you have, so installing an engine never upgrades Optics.
- Installing `playwright` also downloads the Chromium browser.

`optics setup --list` prints every name:

```terminal
Available engines (install with `optics setup --install <name>`):

Action Drivers:
  appium          (appium-python-client)
  ble             (pyserial)
  selenium        (selenium)
  playwright      (playwright)

OCR Engines:
  easyocr         (easyocr)
  pytesseract     (pytesseract, pillow)
  google-vision   (google-cloud-vision)

LLM Engines:
  gemini          (google-genai)
  openai          (openai)
  anthropic       (anthropic)

Bundles (install several at once):
  mobile          (appium)
  web             (selenium, playwright)
  vision          (easyocr, pytesseract, google-vision)
  llm             (gemini, openai, anthropic)
  all             (appium, ble, selenium, playwright, easyocr, pytesseract, google-vision, gemini, openai, anthropic)

Pin a version by appending a specifier, e.g. `optics setup --install appium==5.0.0`.
```

On success, Optics reminds you that services such as the Appium server still need to be started separately. Run `optics doctor` to confirm each engine shows ✅.

## Install with pip

Name the extras in brackets:

```shell
$ pip install "optics-framework[appium,easyocr]"
$ pip install "optics-framework[playwright]" && playwright install chromium
$ pip install "optics-framework[mcp]"
```

If you installed Optics with the [install script](/docs/reference/cli#install-scripts), pass extras with `--extra appium,easyocr` (or `OPTICS_EXTRA` on Windows).

## Where installs are refused

`optics setup` and `optics quickstart` refuse to install into environments that another tool manages, because changing them would break that tool. `optics doctor` shows an `environment` ⚠️ row when this applies.

| Environment | What to do instead |
|---|---|
| Conda | Use a virtual environment. EasyOCR and Optics need conflicting versions of NumPy under Conda. |
| `pipx` | Reinstall with the extras: `pipx install --force "optics-framework[appium,easyocr]"`, or add packages with `pipx inject optics-framework <package>`. |
| `uv tool` or `uvx` | Reinstall with the extras: `uv tool install "optics-framework[appium,easyocr]"`. |
| A project managed by uv, Poetry, PDM or Pipenv | Add the extra with your tool, for example `uv add "optics-framework[appium]"` or `poetry add "optics-framework[appium]"`. |
| System Python marked as externally managed | Use a virtual environment. |
| Read-only site-packages | Use a virtual environment you can write to. |
| No pip and no uv | Install pip, or use a virtual environment. |

To create a virtual environment:

:::tabs{group="os"}
::tab[macOS and Linux]
```shell
$ python3 -m venv .venv && . .venv/bin/activate && pip install optics-framework
```
::tab[Windows]
```powershell
PS> python -m venv .venv; .venv\Scripts\Activate.ps1; pip install optics-framework
```
:::

In a virtual environment without pip, `optics setup` uses `uv` if it's available.
