# Install Optics

> Install the optics command, then add only the drivers and engines your platform needs.

Optics has two parts. The **core** is the `optics` command, which reads your tests and runs them. **Engines** are optional add-ons: a driver for each kind of target (browser, phone, TV) and extra ways to find things on screen. You install the core once and add engines as you need them.

## Before you begin

You need **Python 3.12 or newer**. Check with:

```shell
$ python3 --version
Python 3.12.13
```

If you have an older version, install a current one from [python.org](https://www.python.org/downloads/) or your system's package manager.

## Install the core

We recommend the installer. It creates a private Python environment under `~/.optics`, adds `optics` to your PATH, and leaves your system Python alone.

**macOS and Linux**

```shell
$ curl -fsSL https://optics-framework.org/install | sh
```
**Windows**

```powershell
PS> irm https://optics-framework.org/install.ps1 | iex
```
**pip**

Use pip when you manage your own virtual environment, for example inside a CI job or an existing test repository.

```shell
$ python3 -m venv .venv
$ source .venv/bin/activate
$ pip install optics-framework
```

Open a new terminal so it picks up the updated PATH, then check the install:

```shell
$ optics --version
Optics Framework 1.10.5
```

**Installer options**
Pass options after `sh -s --`. On Windows, set the matching environment variable before running the installer.

| Option | Windows variable | What it does |
|---|---|---|
| `--version 1.10.5` | `OPTICS_VERSION` | Install a specific release. |
| `--extra appium,easyocr` | `OPTICS_EXTRA` | Install engines at the same time. |
| `--dir PATH` | `OPTICS_INSTALL_DIR` | Install somewhere other than `~/.optics`. |
| `--no-modify-path` | `OPTICS_NO_MODIFY_PATH` | Don't edit your shell profile. |
| `--dry-run` | | Print what would happen and change nothing. |
| `--uninstall` | | Remove Optics and the PATH entry it added. |

```shell
$ curl -fsSL https://optics-framework.org/install | sh -s -- --extra playwright,easyocr
```

## Add engines for your platform

The core install ships without drivers, so it stays small. Add the ones for what you test. `optics setup` installs engines that match your Optics version:

**Web**

```shell
$ optics setup --install playwright
```
Playwright needs no server. Optics downloads its Chromium browser for you. To use Selenium instead, see [Web](https://optics-framework.org/docs/platforms/web).
**Android**

```shell
$ optics setup --install appium
```
You also need the Appium server, the Android SDK (for `adb`) and a device or emulator. [Set up Android testing](https://optics-framework.org/docs/platforms/android) covers each one.
**iOS**

```shell
$ optics setup --install appium
```
You also need the Appium server with the XCUITest driver, Xcode, and a simulator or device. See [iOS](https://optics-framework.org/docs/platforms/ios).

Run `optics setup` with no options to pick engines from a list instead, or `optics setup --list` to see every name.

### Optional engines

Add these when a page tells you to. You don't need them for your first test.

| Engine | Install name | Adds |
|---|---|---|
| EasyOCR | `easyocr` | Finds elements by reading text on a screenshot. Runs locally. |
| Tesseract | `pytesseract` | A lighter OCR engine. Needs the Tesseract program installed too. |
| Google Vision | `google-vision` | Cloud OCR. Needs Google Cloud credentials. |
| AI model | `gemini`, `openai` or `anthropic` | Plain-English test creation and AI self-heal. Pick the one for your account; see [Describe it](https://optics-framework.org/docs/create/describe#before-you-begin). |
| MCP server | `mcp` | Lets AI agents drive Optics. The installer always includes it; with pip: `pip install "optics-framework[mcp]"`. |

Bundles install several at once: `mobile` (Appium), `web` (Playwright and Selenium), `vision` (all OCR engines), `llm` (all three AI engines) and `all` (everything except the MCP server). The [engines reference](https://optics-framework.org/docs/reference/engines) lists every engine.

## Check your setup

`optics doctor` checks Python, each engine, and the tools around them:

```shell
$ optics doctor
```

```terminal
🩺 optics doctor

Core
  ✅ python                            3.12.13
  ✅ optics-framework                  installed, version 1.10.5

Engines
  ⚠️ Appium                            appium-python-client not installed
      → optics setup --install appium
  ✅ Playwright                        playwright 1.63.0

Web
  ✅ playwright browser                Chromium download found
```

✅ rows are ready. ⚠️ rows are optional or not needed for your platform. Pass a project folder (`optics doctor my_project`) to also check its `config.yaml`.

## If the install doesn't work

- **`optics: command not found`.** Open a new terminal. If it still fails, add `~/.optics/bin` to your PATH, as the installer printed.
- **`optics setup` refuses to install.** Conda, pipx and tool-managed environments (uv tool, Poetry, PDM) manage their own packages, so `optics setup` prints the right command for that tool instead. Run that command, or use a plain virtual environment.
- **EasyOCR fails under Conda.** EasyOCR and Optics need different NumPy versions under Conda. Use the installer or a standard `venv`.

[Troubleshooting](https://optics-framework.org/docs/help/troubleshooting) covers more cases.

## Next steps

- [Quickstart](https://optics-framework.org/docs/get-started/quickstart): Run a working sample in a browser.
- [Write your first test](https://optics-framework.org/docs/get-started/first-test): Build a test of your own, step by step.
