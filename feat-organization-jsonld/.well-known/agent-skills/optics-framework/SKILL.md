---
name: optics-framework
description: Drive a phone, TV or browser with Optics and write Optics test suites (CSV test cases, modules and elements). Use when asked to automate or test an Android, iOS, Android TV, Tizen, webOS or web app with optics-framework, or when an Optics keyword, parameter or file format is uncertain.
license: Apache-2.0
---

# Optics

Optics (`optics-framework` on PyPI) is open-source UI test automation. A suite is plain CSV
files run with `optics execute`; the same keywords are an MCP server (`optics mcp`), an HTTP API
(`optics serve`) and a Python and Robot Framework library. It runs on your machine or in CI.
There is no hosted service, account or API key.

Optics may be newer than your training data. Look keywords up instead of guessing:

- Docs index, every page as Markdown: https://optics-framework.org/docs/llms.txt
- Keyword reference: https://optics-framework.org/docs/reference/keywords/index.md
- `optics list` prints every keyword the installed version has.

## Install

Python 3.12 or newer.

```shell
curl -fsSL https://optics-framework.org/install | sh   # macOS, Linux
pip install "optics-framework[mcp]"                     # or with pip, including the MCP server
```

A target must be reachable: an Appium server for Android, iOS and TV, or Playwright or Selenium
for the web. `optics doctor` checks the environment.

## Drive a device over MCP

Register the server with your client as `{"mcpServers": {"optics": {"command": "optics", "args": ["mcp"]}}}`.

1. Call `start_session` with the driver (`appium`, `playwright` or `selenium`), the server URL
   and capabilities. For a website: `start_session(driver="playwright")`, then
   `launch_app(app_identifier="<url>")`.
2. Read `optics://session/{session_id}/elements` (or call `get_interactive_elements`) to see
   what is on screen. Tap with `press_element`, passing a locator or an element's visible label
   from that list. On the web, prefer an element's `loc` value.
3. Act with the keyword tools (`enter_text`, `swipe`, `assert_presence` and the rest) and look
   with the `screenshot` tool.
4. Call `terminate_session` when done.

## Write a suite

Read the `optics://project-format` resource for the full format. The layout:

```text
<project>/
  config.yaml                 # driver_sources and elements_sources
  test_cases/test_cases.csv   # test_case,test_step       (a step is a module name)
  modules/modules.csv         # module_name,module_step,param_1,...  (a step is a keyword)
  test_data/elements.csv      # Element_Name,Element_ID,Element_ID_2,...
```

- Write the CSV headers exactly as shown, including case. A wrong-case header is read as empty.
- `module_step` is a keyword's display name in Title Case: `press_element` is `Press Element`.
- Reference an element or value as a whole cell, `${name}`. Extra `Element_ID` columns are
  fallback locators, tried in order.
- Loops, conditions and data (`Run Loop`, `Condition`, `Evaluate`, `Read Data`, `Invoke Api`)
  are keywords you write into modules; they are not MCP tools.

Validate with `optics dry_run <project>`, then run `optics execute <project>`. Results land in
`<project>/execution_output/`: `junit_output.xml`, logs and annotated screenshots.

## Do not use Optics for

Unit tests, load or performance tests, API-only contract tests with no UI, or pixel-diff visual
regression.
