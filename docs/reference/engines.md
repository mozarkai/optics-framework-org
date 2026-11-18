# Engines and extras

> Learn which drivers, element sources, OCR, image matching and LLM engines Optics supports, and which pip extra installs each one.

Optics keeps its core install small. Each driver and recognition engine is a separate pip extra that you add for your platform, either with [`optics setup`](https://optics-framework.org/docs/reference/cli#optics-setup) or with pip. You then turn the engine on by name in [config.yaml](https://optics-framework.org/docs/reference/config#engine-lists).

The name you write in config.yaml is the engine's name in the tables below. The extra is what you install.

## Drivers

A driver controls the device or browser. Enable one under `driver_sources`.

| Name in config | Extra | What it's for | Platforms |
|---|---|---|---|
| `appium` | `appium` | Native and hybrid apps through an Appium server. | Android, iOS, Android TV, Samsung Tizen TV, LG webOS TV, macOS, Linux and Windows desktop apps |
| `selenium` | `selenium` | Websites through a Selenium server or Grid. Chrome and Firefox only. | Web |
| `playwright` | `playwright` | Websites in Chromium, Firefox or WebKit, with no server to run. It can also connect to a remote browser, emulate a phone, and start signed in with a Chrome or Edge profile. | Web |
| `ble` | `ble` | Taps, keys and typing through an airhand dongle that the device sees as a Bluetooth keyboard, mouse and media remote. For devices with no automation access. Add `camera_screenshot` to read the screen. See [Test production devices](https://optics-framework.org/docs/platforms/production). | iOS, iPadOS, Android, macOS, Windows, Linux |

The Appium server itself, and its UiAutomator2, XCUITest or Xa11y driver, aren't Python packages. Install and start them separately. See [Test Android apps](https://optics-framework.org/docs/platforms/android), [Test iOS apps](https://optics-framework.org/docs/platforms/ios) and [Test desktop apps](https://optics-framework.org/docs/platforms/desktop#set-up-the-host).

## Element sources

An element source is how Optics looks at the screen for a driver. They need no extra of their own: they come with their driver. Enable them under `elements_sources`.

| Name in config | Extra | What it's for | Platforms |
|---|---|---|---|
| `appium_find_element` | `appium` | Finds elements by XPath, accessibility id or class. | Android, iOS, TV, desktop |
| `appium_page_source` | `appium` | Searches the UI tree by XPath and text. Lists interactive elements. | Android, iOS, TV, desktop |
| `appium_screenshot` | `appium` | Screenshots for OCR, image matching and AI self-heal. | Android, iOS, TV, desktop |
| `appium_web` | `appium` | Finds `css=` and DOM XPath locators in web pages in the phone's browser and in WebViews. Lists interactive elements. | Android, iOS |
| `selenium_find_element` | `selenium` | Finds elements by XPath, text, id, name, CSS or link text. | Web |
| `selenium_page_source` | `selenium` | Searches the page HTML. | Web |
| `selenium_screenshot` | `selenium` | Screenshots for OCR and image matching. | Web |
| `playwright_find_element` | `playwright` | Finds elements by `xpath=`, `css=`, `text=`, `label=`, `alt=`, `title=`, `role=`, `id=`, `testid=` and other locators. | Web |
| `playwright_page_source` | `playwright` | Searches the page and lists interactive elements. | Web |
| `playwright_screenshot` | `playwright` | Screenshots for OCR and image matching. | Web |
| `camera_screenshot` | None | Frames from a webcam, an HTTP(S) screenshot URL (with an optional bearer token) or a TCP frame server. It can find the device screen in the frame (`find_screen`). With no other element source, OCR gives the screen rows. | Any, usually with `ble` |

Only `appium_page_source`, `appium_web` and `playwright_page_source` can list interactive elements. With Selenium, `Get Interactive Elements`, the HTTP `/elements` endpoint and the MCP elements resource fail with [E0202](https://optics-framework.org/docs/reference/errors#e02-elements).

## Text recognition (OCR)

OCR finds elements by the text visible in a screenshot. Optics uses it when the UI tree doesn't have the text, or when you write `text_only:`. Every engine matches text the same way: [complete words, in order](https://optics-framework.org/docs/elements/text-and-images#how-ocr-matches-text). Enable engines under `text_detection`.

| Name in config | Extra | What it's for | Platforms |
|---|---|---|---|
| `apple_vision` | `apple-vision` | Local OCR with the macOS Vision framework. The fastest and most accurate engine: about 0.2 s for a phone screenshot, and it reads blurred camera pictures well. `recognition_level` is `accurate` (default) or `fast`; `languages` defaults to `["en-US"]`. | macOS |
| `rapidocr` | `rapidocr` | Local OCR on the CPU, no GPU needed. About 1 s for a phone screenshot and good on camera pictures. Its models come with the package, so it works offline. | All |
| `easyocr` | `easyocr` | Local OCR. Slow on CPU (15 s or more for a phone screenshot). Downloads its models the first time it runs. English only. | All |
| `pytesseract` | `pytesseract` | Local OCR with Tesseract. Needs the Tesseract program installed and on your PATH. | All |
| `google_vision` | `google-vision` | Google Cloud Vision. Needs a Vision API key in `api_key`, a service account key file in `credentials_path`, or Application Default Credentials (`GOOGLE_APPLICATION_CREDENTIALS` or `gcloud auth application-default login`). Set only one of `api_key` and `credentials_path`. | All |
| `remote_ocr` | None | Your own OCR service over HTTP. Set its `url`. | All |

We recommend `apple_vision` on a Mac and `rapidocr` everywhere else. Neither needs anything else installed.

## Image matching

Image matching finds an element by a template image you saved in the project. Enable engines under `image_detection`.

| Name in config | Extra | What it's for | Platforms |
|---|---|---|---|
| `templatematch` | None | Local matching. A template cut on one device also matches on screens 0.8 to 1.25 times its size (`capabilities.scale_range`). A last pass finds rotated templates. | All |
| `remote_oir` | None | Your own image matching service over HTTP. Set its `url`. | All |

## LLM

An LLM powers [AI self-heal](https://optics-framework.org/docs/elements/self-heal) and the plain-English mode of `optics live`. Enable one under `llm_models`.

| Name in config | Extra | What it's for | Platforms |
|---|---|---|---|
| `gemini` | `gemini` | Google Gemini, through the Gemini API or Vertex AI. Set `credentials_path` to a service account key file to use Vertex AI. Default model `gemini-2.5-flash`. | All |
| `openai` | `openai` | OpenAI, and any server with an OpenAI-compatible API: OpenRouter, Azure OpenAI, or a local model in Ollama, vLLM or LM Studio. | All |
| `anthropic` | `anthropic` | Claude, through the Claude API, Amazon Bedrock or Google Vertex AI. | All |

Each engine reads its API key from `capabilities.api_key` in config.yaml, else from the environment. See [llm_models](https://optics-framework.org/docs/reference/config#llm-models) for its settings and credentials.

## Other extras

| Extra | What it's for |
|---|---|
| `mcp` | The [MCP server](https://optics-framework.org/docs/reference/mcp), `optics mcp`. It installs `fastmcp`. Install it with pip; `optics setup` can't install it, and the `all` bundle doesn't include it. |

## Bundles

A bundle installs several extras at once.

| Bundle | Installs |
|---|---|
| `mobile` | `appium` |
| `web` | `selenium`, `playwright` |
| `vision` | `apple-vision` (macOS only), `rapidocr`, `easyocr`, `pytesseract`, `google-vision` |
| `llm` | `gemini`, `openai`, `anthropic` |
| `all` | `appium`, `ble`, `selenium`, `playwright`, `apple-vision` (macOS only), `rapidocr`, `easyocr`, `pytesseract`, `google-vision`, `gemini`, `openai`, `anthropic`. Not `mcp`. |

## Install with optics setup

`optics setup` installs extras into the same Python environment Optics runs in.

```text
optics setup [--install NAME [NAME ...]] [--list]
```

Without flags, it opens a picker with a checkbox for each engine. In scripts and CI, name the engines:

```shell
$ optics setup --install appium rapidocr
$ optics setup --install web gemini
$ optics setup --install appium==6.1.2
```

- Names are case-insensitive. Use an extra name, a display name such as `Gemini` or `Google Vision`, or a bundle.
- Pin the engine's main package with a version specifier: `appium==6.1.2`, `"easyocr>=1.7,<2.0"`. The version must be in the range that your Optics release supports. Use an operator such as `==`; `appium=6.1.2` is an error. Bundles can't take a version.
- Optics keeps itself at the version you have, so installing an engine never upgrades Optics.
- Installing `playwright` also downloads the Chromium browser. A [remote browser](https://optics-framework.org/docs/platforms/web#use-a-remote-browser) needs no download.

`optics setup --list` prints every name:

```terminal
Available engines (install with `optics setup --install <name>`):

Action Drivers:
  appium          (appium-python-client)
  ble             (airhand)
  selenium        (selenium)
  playwright      (playwright)

OCR Engines:
  apple-vision    (pyobjc-framework-vision)
  rapidocr        (rapidocr, onnxruntime)
  easyocr         (easyocr)
  pytesseract     (pytesseract, pillow)
  google-vision   (google-cloud-vision, google-auth)

LLM Engines:
  gemini          (google-genai)
  openai          (openai)
  anthropic       (anthropic)

Bundles (install several at once):
  mobile          (appium)
  web             (selenium, playwright)
  vision          (apple-vision, rapidocr, easyocr, pytesseract, google-vision)
  llm             (gemini, openai, anthropic)
  all             (appium, ble, selenium, playwright, apple-vision, rapidocr, easyocr, pytesseract, google-vision, gemini, openai, anthropic)
```

On success, Optics reminds you that services such as the Appium server still need to be started separately. Run `optics doctor` to confirm each engine shows ✅.

## Install with pip

Name the extras in brackets:

```shell
$ pip install "optics-framework[appium,rapidocr]"
$ pip install "optics-framework[playwright]" && playwright install chromium
$ pip install "optics-framework[mcp]"
```

If you installed Optics with the [install script](https://optics-framework.org/docs/reference/cli#install-scripts), pass extras with `--extra appium,rapidocr` (or `OPTICS_EXTRA` on Windows).

## Where installs are refused

In a virtual environment made with `python -m venv` or `virtualenv`, `optics setup` installs with pip. In one made with `uv venv`, which has no pip, it installs with uv.

`optics setup` and `optics quickstart` refuse to install into environments that another tool manages, because changing them would break that tool. Tool installers rebuild their environment on every upgrade, and project managers remove each package that their lockfile does not list. An install that seemed to work would be gone after the next `uv tool upgrade` or `uv sync`. `optics doctor` shows an `environment` ⚠️ row when this applies.

| Environment | What to do instead |
|---|---|
| Conda | Use a virtual environment. EasyOCR and Optics need conflicting versions of NumPy under Conda. |
| `pipx` | Reinstall with the extras: `pipx install --force "optics-framework[appium,rapidocr]"`, or add packages with `pipx inject optics-framework <package>`. |
| `uv tool` or `uvx` | Reinstall with the extras: `uv tool install "optics-framework[appium,rapidocr]"`. |
| A project managed by uv, Poetry, PDM or Pipenv | Add the extra with your tool, for example `uv add "optics-framework[appium]"` or `poetry add "optics-framework[appium]"`. With PDM or Pipenv, use `pdm add` or `pipenv install`. |
| System Python marked as externally managed ([PEP 668](https://peps.python.org/pep-0668/)), as on Debian 12+, Ubuntu 23.04+, Fedora, Arch and Homebrew | Use a virtual environment. |
| Read-only site-packages | Use a virtual environment you can write to. |
| No pip and no uv | Install pip, or use a virtual environment. |

To create a virtual environment:

**macOS and Linux**

```shell
$ python3 -m venv .venv && . .venv/bin/activate && pip install optics-framework
```
**Windows**

```powershell
PS> python -m venv .venv; .venv\Scripts\Activate.ps1; pip install optics-framework
```

In a virtual environment without pip, `optics setup` uses `uv` if it's available.

**Tool installs give you the command, not the library:**
`pipx install optics-framework` and `uv tool install optics-framework` put `optics` on your PATH in an environment of its own. That is enough for `optics execute`, `optics live`, `optics serve` and `optics mcp`. Your own Python code cannot import `optics_framework` from that environment, so the [Python SDK](https://optics-framework.org/docs/create/python) and the [Robot Framework](https://optics-framework.org/docs/create/robot) library (`Library    optics_framework.optics.Optics`) do not find it. For those, install Optics into the virtual environment that runs your tests.
