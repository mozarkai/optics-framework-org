# About Optics

Optics is open-source test automation for Android, iOS, web and TV, developed in the open and free to use.

## What it is

Optics turns a user flow into a test suite that runs the same way on every build and every device. A suite is plain CSV or YAML: test cases name modules, modules are steps of one keyword each, and elements map every name to the ways to find it on screen. The same keywords are also a Python library and a Robot Framework library.

You can write a suite by hand, record it step by step in `optics live`, describe a flow in plain English and let an AI model drive the device, or hand the job to your own AI agent through `optics mcp`. Every way ends in the same plain-text files, which live in your repository and are reviewed like code.

## How it finds things on screen

Each element can carry several identities. Optics tries them cheapest first: an XPath query, then visible text, then OCR on a screenshot, then image matching, and optionally an AI self-heal step. A redesign that breaks one locator falls through to the next instead of failing the run.

## Where it runs

Android, iOS, Android TV, Samsung Tizen and LG webOS through Appium; web through Selenium or Playwright; and locked-down production devices through a Bluetooth driver paired with a camera. Results are written as JUnit XML with annotated screenshots of every step.

## Open source

The framework is released under the [Apache License 2.0](https://github.com/mozarkai/optics-framework/blob/main/LICENSE), so you can use, change and redistribute it, including commercially. Development happens in the open on [GitHub](https://github.com/mozarkai/optics-framework), and releases are published to [PyPI](https://pypi.org/project/optics-framework/) as `optics-framework`.

## Learn more

Start with the [quickstart](docs/get-started/quickstart), browse the full [documentation](docs/), or see the [contact page](contact) for how to reach the maintainers.
