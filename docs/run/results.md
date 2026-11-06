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
├── 2026-10-09T14-02-14-…-failure_Shopper can sign in.jpg   # the screen of a failed test case
├── 2026-10-09T14-02-14-…-failure_Shopper can sign in.xml   # its UI tree
├── 2026-10-09T14-02-15-…-end_of_run.jpg         # the last screen
├── page_sources_log.xml                          # the UI tree, captured during the run
├── failed_steps_elements.json                    # the elements on screen when a step failed
├── internal_logs.log                             # with file_log: true
├── execution_logs.log                            # with file_log: true
└── logs.json                                     # with json_log: true
```

| File | When it's written | Use it to |
|---|---|---|
| `junit_output.xml` | Every run | Show results in CI. Standard JUnit XML that GitHub Actions, GitLab, Jenkins and others read. |
| `…pre_<keyword>.jpg` | Before each step that finds an element, with `save_captures: true` | See what was on screen when the step started. |
| `…_detection_result.jpg` | When Optics found an element by position, with `save_captures: true` | See exactly what Optics found, boxed in green. |
| `…_with_aoi.jpg` | When a step uses an [area of interest](/docs/elements/area-of-interest), with `save_captures: true` | Check the area covers the right part of the screen. It's drawn in blue. |
| `…failure_<test case>.jpg` and `.xml` | When a test case fails. Web pages write `.html`. | See the screen and the UI tree where the test case ended. |
| `…end_of_run.jpg` | At the end of the run, before Suite Teardown | See where the app was left. |
| `page_sources_log.xml` or `.html` | When the UI tree is read. Web pages go to `.html`. | Find the right XPath or text for an element. |
| `failed_steps_elements.json` | When a step fails, with `save_captures: true` | See each element on the screen of the failed step, with its label and bounds. |
| `internal_logs.log`, `execution_logs.log` | With `file_log: true` | Read every attempt Optics made, including which ways of finding an element failed. |
| `logs.json` | With `json_log: true` | Feed results into your own dashboards. |
| `detected_errors_<id>.json` | When an [error screen](/docs/run/error-detection) was found | See which error definition matched. |

::scene{name="results" caption="On the left, the screenshot saved before the step. On the right, the same screen with a green box around the element Optics found. The log says which way found it."}

## Investigate a failure

1. **Read the Failure details box** in the terminal. It names the test case, the step and the reason. `last error:` gives the error of the last fallback value, and `(cause: …)` gives the root cause.
2. **Open `failed_steps_elements.json`** to see the elements on the screen when the step failed. On a web page, each element has a `loc` locator that you can copy into your elements file.
3. **Open the `failure_<test case>` screenshot.** It shows where the test case ended. Then open the last `pre_…` screenshot before the failure. Is the screen what you expected? If it shows a loading spinner, the step ran too early: add an `Assert Presence` before it. If it shows a different screen, an earlier step went somewhere unexpected.
4. **Search the logs** for the element's value. With `file_log: true`, `execution_logs.log` has a line for every attempt, such as `Trying … on 'Sign in' ... FAIL`.
5. **Reproduce it in `optics live`.** Run the steps before the failure, then try the failing step with different values until one works. See [Record a test](/docs/create/record).

## Turn on more logging

Add these to `config.yaml`:

```yaml title="config.yaml"
file_log: true      # write internal_logs.log and execution_logs.log
json_log: true      # write logs.json, a list of every run event
log_level: DEBUG    # more detail in the terminal and log files
```

`log_level` takes `DEBUG`, `INFO` (the default), `WARNING` or `ERROR`. Use `WARNING` to keep the terminal quiet so the tree stands out.

## Read the JUnit report

`junit_output.xml` has one `<testsuite>` and one `<testcase>` for each test case. Suite Setup and Suite Teardown also have one. The suite `name` and each `classname` are the name of the project folder, so name the folder after the suite. Each `<testcase>` has `timestamp`, `time` and `status`. A failed test case also has a `<failure>`.

Inside each test case, every module and keyword is a `<kw>` with `status`, `starttime`, `endtime` and `elapsed`. CI tools that show nested steps display the same tree you saw in the terminal.

```xml
<testcase name="Shopper can find a missing link" classname="birch-tests" time="3.79" ... status="FAIL">
  <kw name="Verify Missing Link" type="setup" status="FAIL" ...>
    <kw name="Assert Presence" status="FAIL" ... elapsed="3.01">
    ...
    </kw>
    <kw name="Validate Element" status="NOT_RUN"/>
  </kw>
  <failure message="Keyword 'Assert Presence' failed after fallback attempts; ..." type="Failure">...</failure>
</testcase>
```

A status is one of these:

| Status | Meaning |
|---|---|
| `PASS` | The test case, module or keyword passed. |
| `FAIL` | A check or an action failed. |
| `ERROR` | The run could not do its work, for example because the driver session was lost or the run stopped. |
| `NOT_RUN` | A failure or a stop kept it from running. |

After a failure, the steps that did not run are `NOT_RUN`. A test case that never started is `NOT_RUN` with a `<skipped>` element. A per-test setup or teardown has its own result, named `Setup (<test case>)` or `Teardown (<test case>)`. If a per-test setup fails, the test case still runs.

If error screens were detected, the report has an extra failing test case called `on-screen-error-detection`. See [Catch error screens](/docs/run/error-detection).

## What each outcome writes

Each outcome has an exit code and a result in `junit_output.xml`. A run that cannot start because of the project writes no report. Examples are a bad config and a test selection that is not valid.

| Outcome | Exit code | `junit_output.xml` |
|---|---|---|
| Every test case passed | `0` | Every test case is `PASS`. |
| A test case failed | `1` | That test case is `FAIL` with a `<failure>`. The steps after the failed step are `NOT_RUN`. |
| An error screen matched | `1` | An extra `on-screen-error-detection` test case has one `<failure>` for each match. |
| Config error, missing files or no driver enabled | `1` | Not written. |
| Test selection not valid | `3` | Not written. |
| The Appium or Selenium server cannot be reached, or no Android device is attached | `1` | Each test case is `ERROR` with an `<error>` that names the problem. Their steps are `NOT_RUN`. |
| The driver session is lost during the run | `1` | The test case in progress and each later one is `ERROR` with an `<error>` that has `E0106`. |
| You press [[Ctrl]]+[[C]] | `130` | Finished test cases keep their results. The one in progress is `ERROR`. Later ones and Suite Teardown are `NOT_RUN` with `<skipped>`. |
| Optics receives SIGTERM | `143` | The same as [[Ctrl]]+[[C]]. |

A session is lost when the Appium server or the Selenium server stops, or drops the session, during a run. The terminal summary shows the affected test cases as failed.

If two sessions in one process share an output folder, such as with the Python SDK or `optics serve`, the second report is `junit_output_<session_id>.xml`. `optics execute` and `optics dry_run` always write `junit_output.xml`.

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
