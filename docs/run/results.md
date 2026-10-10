---
title: Read the results
nav: Results
summary: Find out what happened in a run from the JUnit report, the screenshots and the logs.
level: Beginner
time: 6 min
---

Every run writes its results to `execution_output/` inside the project folder. The terminal tree tells you *what* failed. The files tell you *why*.

## What a run writes

```tree
birch-tests/execution_output/
├── junit_output.xml                              # pass/fail for every test, for CI
├── 2026-10-09T14-02-11-…-pre_press_element.jpg  # the screen before each step
├── 2026-10-09T14-02-11-…-press_element_element_detection_result.jpg
├── 2026-10-09T14-02-15-…-end_of_run.jpg         # the last screen
├── page_sources_log.xml                          # the UI tree, captured during the run
├── internal_logs.log                             # with file_log: true
├── execution_logs.log                            # with file_log: true
└── logs.json                                     # with json_log: true
```

| File | When it's written | Use it to |
|---|---|---|
| `junit_output.xml` | Every run | Show results in CI. Standard JUnit XML that GitHub Actions, GitLab, Jenkins and others read. |
| `…pre_<keyword>.jpg` | Before each step that finds an element | See what was on screen when the step started. |
| `…_detection_result.jpg` | When Optics found an element by position | See exactly what Optics found, boxed in green. |
| `…_with_aoi.jpg` | When a step uses an [area of interest](/docs/elements/area-of-interest) | Check the area covers the right part of the screen. It's drawn in blue. |
| `…end_of_run.jpg` | At the end of the run | See where the app was left. |
| `page_sources_log.xml` or `.html` | When the UI tree is read | Find the right XPath or text for an element. |
| `internal_logs.log`, `execution_logs.log` | With `file_log: true` | Read every attempt Optics made, including which ways of finding an element failed. |
| `logs.json` | With `json_log: true` | Feed results into your own dashboards. |
| `detected_errors_<id>.json` | When an [error screen](/docs/run/error-detection) was found | See which error definition matched. |

::scene{name="results" caption="On the left, the screenshot saved before the step. On the right, the same screen with a green box around the element Optics found. The log says which way found it."}

## Investigate a failure

1. **Read the Failure details box** in the terminal. It names the test case, the step and the reason.
2. **Open the last `pre_…` screenshot** before the failure. Is the screen what you expected? If it shows a loading spinner, the step ran too early: add an `Assert Presence` before it. If it shows a different screen, an earlier step went somewhere unexpected.
3. **Search the logs** for the element's value. With `file_log: true`, `execution_logs.log` has a line for every attempt, such as `Trying … on 'Sign in' ... FAIL`.
4. **Reproduce it in `optics live`.** Run the steps before the failure, then try the failing step with different values until one works. See [Record a test](/docs/create/record).

## Turn on more logging

Add these to `config.yaml`:

```yaml title="config.yaml"
file_log: true      # write internal_logs.log and execution_logs.log
json_log: true      # write logs.json, a list of every run event
log_level: DEBUG    # more detail in the terminal and log files
```

`log_level` takes `DEBUG`, `INFO` (the default), `WARNING` or `ERROR`. Use `WARNING` to keep the terminal quiet so the tree stands out.

## Read the JUnit report

`junit_output.xml` has one `<testcase>` per test case, with a `<failure>` when it failed. Inside each, Optics records every module and keyword with its status and timing, so CI tools that show nested steps display the same tree you saw in the terminal.

If error screens were detected, the report has an extra failing test case called `on-screen-error-detection`. See [Catch error screens](/docs/run/error-detection).

## Keep the folder tidy

Screenshots from every run accumulate in `execution_output/`. Clear the folder before runs where you need clean results, such as in CI:

```shell
$ rm -rf birch-tests/execution_output
$ optics execute birch-tests
```

To write results somewhere else, set `execution_output_path` in `config.yaml`. A relative path is relative to the folder you run `optics` from, and the folder must exist.

## See also

- [Catch error screens](/docs/run/error-detection)
- [Run tests in CI](/docs/run/ci)
- [Troubleshooting](/docs/help/troubleshooting)
