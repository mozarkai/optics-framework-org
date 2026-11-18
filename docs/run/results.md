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
| `…_detection_result.jpg` | When Optics found an element by position, with `save_captures: true` | See exactly what Optics found, boxed in green. When Optics cannot read the position of the element, it saves the screenshot with no box, and the step result does not change. |
| `…_with_aoi.jpg` | When a step uses an [area of interest](/docs/elements/area-of-interest), with `save_captures: true` | Check the area covers the right part of the screen. It's drawn in blue. |
| `<time>-failure_<test case>.jpg` and `<time>-failure_<test case>.xml` | When a test case fails. Web pages write `.html` in place of `.xml`. | See the screen and the UI tree where the test case ended. |
| `<time>-end_of_run.jpg` | At the end of the run, before Suite Teardown | See where the app was left. |
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

`junit_output.xml` has one `<testsuite>` and one `<testcase>` for each test case. Suite Setup and Suite Teardown also have one. The suite `id` is the session id. The suite `name` and each `classname` are the `name` in config.yaml, or the name of the project folder when config.yaml has no `name`. `optics init` writes `name`, so the report keeps its name when you copy the project to a different folder:

```yaml title="config.yaml"
name: birch-tests
```

```xml
<testsuite name="birch-tests" id="b1cdc702-…" tests="3" failures="0" errors="0" skipped="0" time="0.00" …>
```

Each `<testcase>` has `kind`, `timestamp` (when it started), `time` (how long it took, in seconds) and `status`. A failed test case also has a `<failure>`.

`kind` tells you the role of the test case: `suite_setup`, `setup`, `test`, `teardown` or `suite_teardown`. Use it to filter setup and teardown out of your test counts. A `<failure>` or `<error>` has a `code` attribute with the error code, such as `E0201`, when the failure has a code.

Inside each test case, every module is a `<kw type="setup">`, and each of its keywords is a `<kw>` inside it. Each `<kw>` has `status`, `starttime`, `endtime` and `elapsed`. A failed one also has a `message` and a `code`. CI tools that show nested steps display the same tree you saw in the terminal.

```xml
<testcase name="Shopper can find a missing link" classname="birch-tests" kind="test" time="3.79" ... status="FAIL">
  <kw name="Verify Missing Link" type="setup" status="FAIL" ... code="E0201">
    <kw name="Assert Presence" status="FAIL" ... code="E0201" elapsed="3.01">
    ...
    </kw>
    <kw name="Validate Element" status="NOT_RUN"/>
  </kw>
  <failure message="Keyword 'Assert Presence' failed after fallback attempts; ..." type="Failure" code="E0201">...</failure>
</testcase>
```

A status is one of these:

| Status | Meaning |
|---|---|
| `PASS` | The test case, module or keyword passed. |
| `FAIL` | A check or an action failed. |
| `ERROR` | The run could not do its work, for example because the driver session was lost or the run stopped. |
| `NOT_RUN` | A failure or a stop kept it from running. |

After a failure, the steps that did not run are `NOT_RUN`. A test case that never started is `NOT_RUN` with a `<skipped>` element. A per-test setup or teardown has its own result, named `Setup (<test case>)` or `Teardown (<test case>)`. If a per-test setup fails, its test case does not run. The test case is `NOT_RUN`, and the `message` of its `<skipped>` starts with `Setup failed:`.

If error screens were detected, the report has an extra failing test case called `on-screen-error-detection`. See [Catch error screens](/docs/run/error-detection).

## What each outcome writes

Each outcome has an exit code and a result in `junit_output.xml`. Optics writes the report once, when the run ends, also when you stop the run with [[Ctrl]]+[[C]] or SIGTERM. A run that cannot start because of the project writes no report. Examples are a bad config and a test selection that is not valid.

| Outcome | Exit code | `junit_output.xml` |
|---|---|---|
| Every test case passed | `0` | Every test case is `PASS`. |
| A test case failed | `1` | That test case is `FAIL` with a `<failure>`. The steps after the failed step are `NOT_RUN`. |
| An error screen matched | `1` | An extra `on-screen-error-detection` test case has one `<failure>` for each match. |
| Suite Setup failed | `1` | Suite Setup is `FAIL`. Each other test case, except Suite Teardown, is `NOT_RUN` with a `<skipped>` whose `message` starts with `Suite setup failed:`. Suite Teardown runs. |
| A per-test setup failed | `1` | `Setup (<test case>)` is `FAIL`. Its test case is `NOT_RUN` with a `<skipped>` whose `message` starts with `Setup failed:`. Its teardown runs. |
| Config error, missing files or no driver enabled | `1` | Not written. |
| Test selection not valid | `3` | Not written. |
| The Appium or Selenium server cannot be reached, or no Android device is attached | `1` | Each test case is `ERROR` with an `<error>` that names the problem and has its code, such as `E0102`. Their steps are `NOT_RUN`. |
| Another error while the session starts, such as a credentials file that is not valid | `1` | `<testsuites/>` with no test cases. |
| The driver session is lost during the run | `1` | The test case in progress and each later one is `ERROR` with an `<error>` that has `E0106`. |
| You press [[Ctrl]]+[[C]] | `130` | Finished test cases keep their results. The one in progress is `ERROR` with `code="E0706"`. Its keyword in progress is `ERROR` with the same code, and its other steps are `NOT_RUN`. Later test cases and Suite Teardown do not run: each is a `<testcase status="NOT_RUN">` with a `<skipped>`. |
| Optics receives SIGTERM | `143` | The same as [[Ctrl]]+[[C]]. |
| The process is killed with SIGKILL | `137` in a shell, `-9` from Python `subprocess` | Not written: the process ends at once. |

A session is lost when the Appium server or the Selenium server stops, or drops the session, during a run. The terminal summary shows the affected test cases as failed.

If two sessions in one process share an output folder, such as with the Python SDK or `optics serve`, the second report is `junit_output_<session_id>.xml`. `optics execute` and `optics dry_run` always write `junit_output.xml`.

### Sample reports

These are real reports from `optics execute` on a Playwright project named `checkout_suite`. Open one to see the exact XML of that outcome.

:::details[Every test case passed (exit code 0)]
```xml title="passed.xml"
<?xml version="1.0" ?>
<testsuites>
  <testsuite name="checkout_suite" id="d09e5f49-0fd8-4632-83d8-08e516f5d931" tests="4" failures="0" errors="0" skipped="0" time="1.15" timestamp="2026-11-09T18:22:45.541+05:30">
    <testcase name="Suite Setup" id="dac8114c-f399-446e-9455-e8e3969945af" classname="checkout_suite" kind="suite_setup" time="1.01" timestamp="2026-11-09T18:22:45.541+05:30" status="PASS">
      <kw name="Open Example Page" type="setup" status="PASS" starttime="20261109 18:22:45.542" endtime="20261109 18:22:46.549" elapsed="1.01">
        <kw name="Launch App" status="PASS" starttime="20261109 18:22:45.542" endtime="20261109 18:22:46.549" elapsed="1.01"/>
      </kw>
    </testcase>
    <testcase name="Setup (TC1 Notice Shown)" id="e0aceac9-7f42-4f74-b65f-a2d019d781cf" classname="checkout_suite" kind="setup" time="0.07" timestamp="2026-11-09T18:22:46.549+05:30" status="PASS">
      <kw name="Check Notice" type="setup" status="PASS" starttime="20261109 18:22:46.549" endtime="20261109 18:22:46.616" elapsed="0.07">
        <kw name="Assert Presence" status="PASS" starttime="20261109 18:22:46.550" endtime="20261109 18:22:46.616" elapsed="0.07">
          <log>Asserting (assert_elements) elements: ['text=for use in documentation examples'] with rule: any and timeout: 5s</log>
          <log>Trying TextElementStrategy on '['text=for use in documentation examples']' ... SUCCESS</log>
          <log>Trying ScreenshotStrategy on 'screenshot' ... SUCCESS</log>
        </kw>
      </kw>
    </testcase>
    <testcase name="TC1 Notice Shown" id="448c9914-08b7-4732-a30b-caa7b6d58a37" classname="checkout_suite" kind="test" time="0.04" timestamp="2026-11-09T18:22:46.617+05:30" status="PASS">
      <kw name="Check Notice" type="setup" status="PASS" starttime="20261109 18:22:46.617" endtime="20261109 18:22:46.656" elapsed="0.04">
        <kw name="Assert Presence" status="PASS" starttime="20261109 18:22:46.617" endtime="20261109 18:22:46.656" elapsed="0.04">
          <log>Asserting (assert_elements) elements: ['text=for use in documentation examples'] with rule: any and timeout: 5s</log>
          <log>Trying TextElementStrategy on '['text=for use in documentation examples']' ... SUCCESS</log>
          <log>Trying ScreenshotStrategy on 'screenshot' ... SUCCESS</log>
        </kw>
      </kw>
    </testcase>
    <testcase name="Suite Teardown" id="614769b3-6883-41d2-98c8-f755babc7905" classname="checkout_suite" kind="suite_teardown" time="0.03" timestamp="2026-11-09T18:22:47.224+05:30" status="PASS">
      <kw name="Close Browser" type="setup" status="PASS" starttime="20261109 18:22:47.225" endtime="20261109 18:22:47.258" elapsed="0.03">
        <kw name="Close And Terminate App" status="PASS" starttime="20261109 18:22:47.225" endtime="20261109 18:22:47.258" elapsed="0.03">
          <log>No events to send.</log>
        </kw>
      </kw>
    </testcase>
  </testsuite>
</testsuites>
```
:::

:::details[A test case failed (exit code 1)]
```xml title="failed.xml"
<?xml version="1.0" ?>
<testsuites>
  <testsuite name="checkout_suite" id="3c053b88-48df-4b28-ab4b-fc44890db471" tests="6" failures="1" errors="0" skipped="0" time="4.22" timestamp="2026-11-09T18:22:48.815+05:30">
    <testcase name="Suite Setup" id="a4ff9a93-0a9f-45b5-910d-6341946532b9" classname="checkout_suite" kind="suite_setup" time="1.28" timestamp="2026-11-09T18:22:48.815+05:30" status="PASS">
      <kw name="Open Example Page" type="setup" status="PASS" starttime="20261109 18:22:48.815" endtime="20261109 18:22:50.093" elapsed="1.28">
        <kw name="Launch App" status="PASS" starttime="20261109 18:22:48.815" endtime="20261109 18:22:50.092" elapsed="1.28"/>
      </kw>
    </testcase>
    <testcase name="Setup (TC1 Notice Shown)" id="017f66ac-0693-4320-8fbe-a023b0127231" classname="checkout_suite" kind="setup" time="0.08" timestamp="2026-11-09T18:22:50.094+05:30" status="PASS">
      <kw name="Check Notice" type="setup" status="PASS" starttime="20261109 18:22:50.095" endtime="20261109 18:22:50.173" elapsed="0.08">
        <kw name="Assert Presence" status="PASS" starttime="20261109 18:22:50.095" endtime="20261109 18:22:50.173" elapsed="0.08">
          <log>Asserting (assert_elements) elements: ['text=for use in documentation examples'] with rule: any and timeout: 5s</log>
          <log>Trying TextElementStrategy on '['text=for use in documentation examples']' ... SUCCESS</log>
          <log>Trying ScreenshotStrategy on 'screenshot' ... SUCCESS</log>
        </kw>
      </kw>
    </testcase>
    <testcase name="TC1 Notice Shown" id="382ccfbe-3434-4cf5-aa0e-3cad55b1bc91" classname="checkout_suite" kind="test" time="0.04" timestamp="2026-11-09T18:22:50.174+05:30" status="PASS">
      <kw name="Check Notice" type="setup" status="PASS" starttime="20261109 18:22:50.174" endtime="20261109 18:22:50.212" elapsed="0.04">
        <kw name="Assert Presence" status="PASS" starttime="20261109 18:22:50.174" endtime="20261109 18:22:50.211" elapsed="0.04">
          <log>Asserting (assert_elements) elements: ['text=for use in documentation examples'] with rule: any and timeout: 5s</log>
          <log>Trying TextElementStrategy on '['text=for use in documentation examples']' ... SUCCESS</log>
          <log>Trying ScreenshotStrategy on 'screenshot' ... SUCCESS</log>
        </kw>
      </kw>
    </testcase>
    <testcase name="Setup (TC2 Missing Text)" id="d5a26adf-8fc7-48e6-ae5f-a881ec3d0c61" classname="checkout_suite" kind="setup" time="0.10" timestamp="2026-11-09T18:22:50.212+05:30" status="PASS">
      <kw name="Check Notice" type="setup" status="PASS" starttime="20261109 18:22:50.212" endtime="20261109 18:22:50.307" elapsed="0.09">
        <kw name="Assert Presence" status="PASS" starttime="20261109 18:22:50.212" endtime="20261109 18:22:50.307" elapsed="0.09">
          <log>Asserting (assert_elements) elements: ['text=for use in documentation examples'] with rule: any and timeout: 5s</log>
          <log>Trying TextElementStrategy on '['text=for use in documentation examples']' ... SUCCESS</log>
          <log>Trying ScreenshotStrategy on 'screenshot' ... SUCCESS</log>
        </kw>
      </kw>
    </testcase>
    <testcase name="TC2 Missing Text" id="c4837f0f-b1b8-4a9d-acee-484d563ebdc7" classname="checkout_suite" kind="test" time="2.70" timestamp="2026-11-09T18:22:50.308+05:30" status="FAIL">
      <kw name="Check Missing Text" type="setup" status="FAIL" starttime="20261109 18:22:50.308" message="Keyword 'Assert Presence' failed after fallback attempts; last error: E0201: ['text=This text is not on the page'] not found based on rule 'any'. OCR was not tried: no text_detection engine is configured." code="E0201" endtime="20261109 18:22:52.957" elapsed="2.65">
        <kw name="Assert Presence" status="FAIL" starttime="20261109 18:22:50.309" message="Keyword 'Assert Presence' failed after fallback attempts; last error: E0201: ['text=This text is not on the page'] not found based on rule 'any'. OCR was not tried: no text_detection engine is configured." code="E0201" endtime="20261109 18:22:52.320" elapsed="2.01">
          <log>Asserting (assert_elements) elements: ['text=This text is not on the page'] with rule: any and timeout: 2s</log>
          <log>Trying TextElementStrategy on '['text=This text is not on the page']' ... FAIL (error: Elements not found.)</log>
          <log>Trying TextElementStrategy on '['text=This text is not on the page']' ... FAIL (error: Elements not found.)</log>
          <log>Keyword 'Assert Presence' failed after fallback attempts; last error: E0201: ['text=This text is not on the page'] not found based on rule 'any'. OCR was not tried: no text_detection engine is configured.</log>
        </kw>
        <kw name="Assert Presence" status="NOT_RUN"/>
      </kw>
      <kw name="Check Notice" type="setup" status="NOT_RUN">
        <kw name="Assert Presence" status="NOT_RUN"/>
      </kw>
      <failure message="Keyword 'Assert Presence' failed after fallback attempts; last error: E0201: ['text=This text is not on the page'] not found based on rule 'any'. OCR was not tried: no text_detection engine is configured." type="Failure" code="E0201">Keyword 'Assert Presence' failed after fallback attempts; last error: E0201: ['text=This text is not on the page'] not found based on rule 'any'. OCR was not tried: no text_detection engine is configured.</failure>
    </testcase>
    <testcase name="Suite Teardown" id="b12a2c29-1e21-48bb-a0e6-0aff9e3b507d" classname="checkout_suite" kind="suite_teardown" time="0.02" timestamp="2026-11-09T18:22:53.053+05:30" status="PASS">
      <kw name="Close Browser" type="setup" status="PASS" starttime="20261109 18:22:53.053" endtime="20261109 18:22:53.077" elapsed="0.02">
        <kw name="Close And Terminate App" status="PASS" starttime="20261109 18:22:53.054" endtime="20261109 18:22:53.076" elapsed="0.02">
          <log>No events to send.</log>
        </kw>
      </kw>
    </testcase>
  </testsuite>
</testsuites>
```
:::

:::details[An error screen matched (exit code 1)]
```xml title="on_screen_error.xml"
<?xml version="1.0" ?>
<testsuites>
  <testsuite name="checkout_suite" id="3918a7e9-9d91-4ca7-88f7-f3d728b87e12" tests="5" failures="1" errors="0" skipped="0" time="0.89" timestamp="2026-11-09T18:23:04.296+05:30">
    <testcase name="Suite Setup" id="1ad8f44e-d3f8-425d-a72d-1f6657f2d90f" classname="checkout_suite" kind="suite_setup" time="0.74" timestamp="2026-11-09T18:23:04.296+05:30" status="PASS">
      <kw name="Open Example Page" type="setup" status="PASS" starttime="20261109 18:23:04.296" endtime="20261109 18:23:05.040" elapsed="0.74">
        <kw name="Launch App" status="PASS" starttime="20261109 18:23:04.296" endtime="20261109 18:23:05.039" elapsed="0.74"/>
      </kw>
    </testcase>
    <testcase name="Setup (TC1 Notice Shown)" id="7b71862a-84be-4785-b584-eb8253d27027" classname="checkout_suite" kind="setup" time="0.08" timestamp="2026-11-09T18:23:05.041+05:30" status="PASS">
      <kw name="Check Notice" type="setup" status="PASS" starttime="20261109 18:23:05.041" endtime="20261109 18:23:05.122" elapsed="0.08">
        <kw name="Assert Presence" status="PASS" starttime="20261109 18:23:05.041" endtime="20261109 18:23:05.122" elapsed="0.08">
          <log>Asserting (assert_elements) elements: ['text=for use in documentation examples'] with rule: any and timeout: 5s</log>
          <log>Trying TextElementStrategy on '['text=for use in documentation examples']' ... SUCCESS</log>
          <log>Trying ScreenshotStrategy on 'screenshot' ... SUCCESS</log>
        </kw>
      </kw>
    </testcase>
    <testcase name="TC1 Notice Shown" id="6419e2fc-bff3-4fde-a9cd-bb21412168b3" classname="checkout_suite" kind="test" time="0.04" timestamp="2026-11-09T18:23:05.122+05:30" status="PASS">
      <kw name="Check Notice" type="setup" status="PASS" starttime="20261109 18:23:05.122" endtime="20261109 18:23:05.160" elapsed="0.04">
        <kw name="Assert Presence" status="PASS" starttime="20261109 18:23:05.122" endtime="20261109 18:23:05.160" elapsed="0.04">
          <log>Asserting (assert_elements) elements: ['text=for use in documentation examples'] with rule: any and timeout: 5s</log>
          <log>Trying TextElementStrategy on '['text=for use in documentation examples']' ... SUCCESS</log>
          <log>Trying ScreenshotStrategy on 'screenshot' ... SUCCESS</log>
        </kw>
      </kw>
    </testcase>
    <testcase name="Suite Teardown" id="e7529eef-0ef5-4897-83c9-e17ed61bc4c0" classname="checkout_suite" kind="suite_teardown" time="0.03" timestamp="2026-11-09T18:23:05.727+05:30" status="PASS">
      <kw name="Close Browser" type="setup" status="PASS" starttime="20261109 18:23:05.727" endtime="20261109 18:23:05.757" elapsed="0.03">
        <kw name="Close And Terminate App" status="PASS" starttime="20261109 18:23:05.728" endtime="20261109 18:23:05.757" elapsed="0.03">
          <log>No events to send.</log>
        </kw>
      </kw>
    </testcase>
    <testcase name="on-screen-error-detection" classname="checkout_suite" kind="test" time="0" status="FAIL">
      <failure message="ERR_DEMO | high | documentation examples | Demo text on the final page" type="OnScreenError" code="ERR_DEMO">ERR_DEMO | high | documentation examples | Demo text on the final page</failure>
    </testcase>
  </testsuite>
</testsuites>
```
:::

:::details[Suite Setup failed (exit code 1)]
```xml title="suite_setup_failed.xml"
<?xml version="1.0" ?>
<testsuites>
  <testsuite name="checkout_suite" id="e5b0d587-646c-4a96-8cd7-07cd80af727f" tests="4" failures="1" errors="0" skipped="2" time="3.75" timestamp="2026-11-09T18:24:10.036+05:30">
    <testcase name="Suite Setup" id="9377898b-02c8-4c45-99b2-3ac47f0ac0e7" classname="checkout_suite" kind="suite_setup" time="3.71" timestamp="2026-11-09T18:24:10.036+05:30" status="FAIL">
      <kw name="Open Example Page" type="setup" status="PASS" starttime="20261109 18:24:10.036" endtime="20261109 18:24:11.046" elapsed="1.01">
        <kw name="Launch App" status="PASS" starttime="20261109 18:24:10.036" endtime="20261109 18:24:11.045" elapsed="1.01"/>
      </kw>
      <kw name="Check Missing Text" type="setup" status="FAIL" starttime="20261109 18:24:11.046" message="Keyword 'Assert Presence' failed after fallback attempts; last error: E0201: ['text=This text is not on the page'] not found based on rule 'any'. OCR was not tried: no text_detection engine is configured." code="E0201" endtime="20261109 18:24:13.686" elapsed="2.64">
        <kw name="Assert Presence" status="FAIL" starttime="20261109 18:24:11.046" message="Keyword 'Assert Presence' failed after fallback attempts; last error: E0201: ['text=This text is not on the page'] not found based on rule 'any'. OCR was not tried: no text_detection engine is configured." code="E0201" endtime="20261109 18:24:13.055" elapsed="2.01">
          <log>Asserting (assert_elements) elements: ['text=This text is not on the page'] with rule: any and timeout: 2s</log>
          <log>Trying TextElementStrategy on '['text=This text is not on the page']' ... FAIL (error: Elements not found.)</log>
          <log>Trying TextElementStrategy on '['text=This text is not on the page']' ... FAIL (error: Elements not found.)</log>
          <log>Keyword 'Assert Presence' failed after fallback attempts; last error: E0201: ['text=This text is not on the page'] not found based on rule 'any'. OCR was not tried: no text_detection engine is configured.</log>
        </kw>
        <kw name="Assert Presence" status="NOT_RUN"/>
      </kw>
      <failure message="Keyword 'Assert Presence' failed after fallback attempts; last error: E0201: ['text=This text is not on the page'] not found based on rule 'any'. OCR was not tried: no text_detection engine is configured." type="Failure" code="E0201">Keyword 'Assert Presence' failed after fallback attempts; last error: E0201: ['text=This text is not on the page'] not found based on rule 'any'. OCR was not tried: no text_detection engine is configured.</failure>
    </testcase>
    <testcase name="Setup (TC1 Notice Shown)" classname="checkout_suite" kind="setup" time="0" status="NOT_RUN">
      <kw name="Check Notice" type="setup" status="NOT_RUN">
        <kw name="Assert Presence" status="NOT_RUN"/>
      </kw>
      <skipped message="Suite setup failed: Keyword 'Assert Presence' failed after fallback attempts; last error: E0201: ['text=This text is not on the page'] not found based on rule 'any'. OCR was not tried: no text_detection engine is configured."/>
    </testcase>
    <testcase name="TC1 Notice Shown" classname="checkout_suite" kind="test" time="0" status="NOT_RUN">
      <kw name="Check Notice" type="setup" status="NOT_RUN">
        <kw name="Assert Presence" status="NOT_RUN"/>
      </kw>
      <skipped message="Suite setup failed: Keyword 'Assert Presence' failed after fallback attempts; last error: E0201: ['text=This text is not on the page'] not found based on rule 'any'. OCR was not tried: no text_detection engine is configured."/>
    </testcase>
    <testcase name="Suite Teardown" id="41c54b4d-5049-47f8-b9b5-9091e0c654d3" classname="checkout_suite" kind="suite_teardown" time="0.04" timestamp="2026-11-09T18:24:14.317+05:30" status="PASS">
      <kw name="Close Browser" type="setup" status="PASS" starttime="20261109 18:24:14.318" endtime="20261109 18:24:14.353" elapsed="0.03">
        <kw name="Close And Terminate App" status="PASS" starttime="20261109 18:24:14.319" endtime="20261109 18:24:14.352" elapsed="0.03">
          <log>No events to send.</log>
        </kw>
      </kw>
    </testcase>
  </testsuite>
</testsuites>
```
:::

:::details[A per-test setup failed (exit code 1)]
```xml title="setup_failed.xml"
<?xml version="1.0" ?>
<testsuites>
  <testsuite name="checkout_suite" id="f7f3b305-9230-4bc8-99c3-101f9d4eda09" tests="6" failures="2" errors="0" skipped="2" time="7.40" timestamp="2026-11-09T18:22:54.592+05:30">
    <testcase name="Suite Setup" id="a043b9e2-72ef-47f9-97a4-0226c8da1206" classname="checkout_suite" kind="suite_setup" time="1.37" timestamp="2026-11-09T18:22:54.592+05:30" status="PASS">
      <kw name="Open Example Page" type="setup" status="PASS" starttime="20261109 18:22:54.592" endtime="20261109 18:22:55.961" elapsed="1.37">
        <kw name="Launch App" status="PASS" starttime="20261109 18:22:54.592" endtime="20261109 18:22:55.960" elapsed="1.37"/>
      </kw>
    </testcase>
    <testcase name="Setup (TC1 Notice Shown)" id="10f860b3-6f6e-403d-94ea-c9ed9bac5fae" classname="checkout_suite" kind="setup" time="2.72" timestamp="2026-11-09T18:22:55.962+05:30" status="FAIL">
      <kw name="Check Missing Text" type="setup" status="FAIL" starttime="20261109 18:22:55.962" message="Keyword 'Assert Presence' failed after fallback attempts; last error: E0201: ['text=This text is not on the page'] not found based on rule 'any'. OCR was not tried: no text_detection engine is configured." code="E0201" endtime="20261109 18:22:58.624" elapsed="2.66">
        <kw name="Assert Presence" status="FAIL" starttime="20261109 18:22:55.962" message="Keyword 'Assert Presence' failed after fallback attempts; last error: E0201: ['text=This text is not on the page'] not found based on rule 'any'. OCR was not tried: no text_detection engine is configured." code="E0201" endtime="20261109 18:22:57.982" elapsed="2.02">
          <log>Asserting (assert_elements) elements: ['text=This text is not on the page'] with rule: any and timeout: 2s</log>
          <log>Trying TextElementStrategy on '['text=This text is not on the page']' ... FAIL (error: Elements not found.)</log>
          <log>Trying TextElementStrategy on '['text=This text is not on the page']' ... FAIL (error: Elements not found.)</log>
          <log>Keyword 'Assert Presence' failed after fallback attempts; last error: E0201: ['text=This text is not on the page'] not found based on rule 'any'. OCR was not tried: no text_detection engine is configured.</log>
        </kw>
        <kw name="Assert Presence" status="NOT_RUN"/>
      </kw>
      <failure message="Keyword 'Assert Presence' failed after fallback attempts; last error: E0201: ['text=This text is not on the page'] not found based on rule 'any'. OCR was not tried: no text_detection engine is configured." type="Failure" code="E0201">Keyword 'Assert Presence' failed after fallback attempts; last error: E0201: ['text=This text is not on the page'] not found based on rule 'any'. OCR was not tried: no text_detection engine is configured.</failure>
    </testcase>
    <testcase name="TC1 Notice Shown" classname="checkout_suite" kind="test" time="0" status="NOT_RUN">
      <kw name="Check Notice" type="setup" status="NOT_RUN">
        <kw name="Assert Presence" status="NOT_RUN"/>
      </kw>
      <skipped message="Setup failed: Keyword 'Assert Presence' failed after fallback attempts; last error: E0201: ['text=This text is not on the page'] not found based on rule 'any'. OCR was not tried: no text_detection engine is configured."/>
    </testcase>
    <testcase name="Setup (TC2 Notice Again)" id="c4f41132-b9c1-4db6-95bf-47d3bead660e" classname="checkout_suite" kind="setup" time="3.27" timestamp="2026-11-09T18:22:58.684+05:30" status="FAIL">
      <kw name="Check Missing Text" type="setup" status="FAIL" starttime="20261109 18:22:58.684" message="Keyword 'Assert Presence' failed after fallback attempts; last error: E0201: ['text=This text is not on the page'] not found based on rule 'any'. OCR was not tried: no text_detection engine is configured." code="E0201" endtime="20261109 18:23:01.338" elapsed="2.65">
        <kw name="Assert Presence" status="FAIL" starttime="20261109 18:22:58.685" message="Keyword 'Assert Presence' failed after fallback attempts; last error: E0201: ['text=This text is not on the page'] not found based on rule 'any'. OCR was not tried: no text_detection engine is configured." code="E0201" endtime="20261109 18:23:00.696" elapsed="2.01">
          <log>Asserting (assert_elements) elements: ['text=This text is not on the page'] with rule: any and timeout: 2s</log>
          <log>Trying TextElementStrategy on '['text=This text is not on the page']' ... FAIL (error: Elements not found.)</log>
          <log>Trying TextElementStrategy on '['text=This text is not on the page']' ... FAIL (error: Elements not found.)</log>
          <log>Keyword 'Assert Presence' failed after fallback attempts; last error: E0201: ['text=This text is not on the page'] not found based on rule 'any'. OCR was not tried: no text_detection engine is configured.</log>
        </kw>
        <kw name="Assert Presence" status="NOT_RUN"/>
      </kw>
      <failure message="Keyword 'Assert Presence' failed after fallback attempts; last error: E0201: ['text=This text is not on the page'] not found based on rule 'any'. OCR was not tried: no text_detection engine is configured." type="Failure" code="E0201">Keyword 'Assert Presence' failed after fallback attempts; last error: E0201: ['text=This text is not on the page'] not found based on rule 'any'. OCR was not tried: no text_detection engine is configured.</failure>
    </testcase>
    <testcase name="TC2 Notice Again" classname="checkout_suite" kind="test" time="0" status="NOT_RUN">
      <kw name="Check Notice" type="setup" status="NOT_RUN">
        <kw name="Assert Presence" status="NOT_RUN"/>
      </kw>
      <skipped message="Setup failed: Keyword 'Assert Presence' failed after fallback attempts; last error: E0201: ['text=This text is not on the page'] not found based on rule 'any'. OCR was not tried: no text_detection engine is configured."/>
    </testcase>
    <testcase name="Suite Teardown" id="4f218417-1ff0-4c4a-b50a-5e609c051584" classname="checkout_suite" kind="suite_teardown" time="0.04" timestamp="2026-11-09T18:23:02.537+05:30" status="PASS">
      <kw name="Close Browser" type="setup" status="PASS" starttime="20261109 18:23:02.538" endtime="20261109 18:23:02.579" elapsed="0.04">
        <kw name="Close And Terminate App" status="PASS" starttime="20261109 18:23:02.540" endtime="20261109 18:23:02.579" elapsed="0.04">
          <log>No events to send.</log>
        </kw>
      </kw>
    </testcase>
  </testsuite>
</testsuites>
```
:::

:::details[You press Ctrl+C (exit code 130)]
```xml title="interrupted.xml"
<?xml version="1.0" ?>
<testsuites>
  <testsuite name="checkout_suite" id="de88afd8-29b2-4865-a240-3b4c89d3cb34" tests="8" failures="0" errors="1" skipped="3" time="14.16" timestamp="2026-11-09T18:54:33.824+05:30">
    <testcase name="Suite Setup" id="289bb7a1-3692-4819-a4d9-9c5f886eb277" classname="checkout_suite" kind="suite_setup" time="2.06" timestamp="2026-11-09T18:54:33.824+05:30" status="PASS">
      <kw name="Open Example Page" type="setup" status="PASS" starttime="20261109 18:54:33.824" endtime="20261109 18:54:35.878" elapsed="2.05">
        <kw name="Launch App" status="PASS" starttime="20261109 18:54:33.824" endtime="20261109 18:54:35.878" elapsed="2.05"/>
      </kw>
    </testcase>
    <testcase name="Setup (TC1 Notice Shown)" id="e30b3d6e-4029-4488-aa77-058122426cf9" classname="checkout_suite" kind="setup" time="0.11" timestamp="2026-11-09T18:54:35.880+05:30" status="PASS">
      <kw name="Check Notice" type="setup" status="PASS" starttime="20261109 18:54:35.880" endtime="20261109 18:54:35.989" elapsed="0.11">
        <kw name="Assert Presence" status="PASS" starttime="20261109 18:54:35.880" endtime="20261109 18:54:35.989" elapsed="0.11">
          <log>Asserting (assert_elements) elements: ['text=for use in documentation examples'] with rule: any and timeout: 5s</log>
          <log>Trying TextElementStrategy on '['text=for use in documentation examples']' ... SUCCESS</log>
          <log>Trying ScreenshotStrategy on 'screenshot' ... SUCCESS</log>
        </kw>
      </kw>
    </testcase>
    <testcase name="TC1 Notice Shown" id="7670c575-12a6-423c-b308-dd8686fc5806" classname="checkout_suite" kind="test" time="0.05" timestamp="2026-11-09T18:54:35.989+05:30" status="PASS">
      <kw name="Check Notice" type="setup" status="PASS" starttime="20261109 18:54:35.990" endtime="20261109 18:54:36.043" elapsed="0.05">
        <kw name="Assert Presence" status="PASS" starttime="20261109 18:54:35.990" endtime="20261109 18:54:36.043" elapsed="0.05">
          <log>Asserting (assert_elements) elements: ['text=for use in documentation examples'] with rule: any and timeout: 5s</log>
          <log>Trying TextElementStrategy on '['text=for use in documentation examples']' ... SUCCESS</log>
          <log>Trying ScreenshotStrategy on 'screenshot' ... SUCCESS</log>
        </kw>
      </kw>
    </testcase>
    <testcase name="Setup (TC2 Slow)" id="7a867031-579b-4f6e-b3d7-4fac6854988f" classname="checkout_suite" kind="setup" time="0.06" timestamp="2026-11-09T18:54:36.044+05:30" status="PASS">
      <kw name="Check Notice" type="setup" status="PASS" starttime="20261109 18:54:36.044" endtime="20261109 18:54:36.099" elapsed="0.05">
        <kw name="Assert Presence" status="PASS" starttime="20261109 18:54:36.045" endtime="20261109 18:54:36.099" elapsed="0.05">
          <log>Asserting (assert_elements) elements: ['text=for use in documentation examples'] with rule: any and timeout: 5s</log>
          <log>Trying TextElementStrategy on '['text=for use in documentation examples']' ... SUCCESS</log>
          <log>Trying ScreenshotStrategy on 'screenshot' ... SUCCESS</log>
        </kw>
      </kw>
    </testcase>
    <testcase name="TC2 Slow" id="7eb5beb2-9c9f-4911-ae6a-9343440753a3" classname="checkout_suite" kind="test" time="11.88" timestamp="2026-11-09T18:54:36.100+05:30" status="ERROR">
      <kw name="Wait Long" type="setup" status="ERROR" starttime="20261109 18:54:36.100" code="E0706">
        <kw name="Sleep" status="ERROR" starttime="20261109 18:54:36.100" code="E0706"/>
        <kw name="Assert Presence" status="NOT_RUN"/>
      </kw>
      <kw name="Check Notice" type="setup" status="NOT_RUN">
        <kw name="Assert Presence" status="NOT_RUN"/>
      </kw>
      <error message="The run ended before this test case reported a result." type="Error" code="E0706">The run ended before this test case reported a result.</error>
    </testcase>
    <testcase name="Setup (TC3 Never Started)" classname="checkout_suite" kind="setup" time="0" status="NOT_RUN">
      <kw name="Check Notice" type="setup" status="NOT_RUN">
        <kw name="Assert Presence" status="NOT_RUN"/>
      </kw>
      <skipped message="The run ended before this test case started."/>
    </testcase>
    <testcase name="TC3 Never Started" classname="checkout_suite" kind="test" time="0" status="NOT_RUN">
      <kw name="Check Notice" type="setup" status="NOT_RUN">
        <kw name="Assert Presence" status="NOT_RUN"/>
      </kw>
      <skipped message="The run ended before this test case started."/>
    </testcase>
    <testcase name="Suite Teardown" classname="checkout_suite" kind="suite_teardown" time="0" status="NOT_RUN">
      <kw name="Close Browser" type="setup" status="NOT_RUN">
        <kw name="Close And Terminate App" status="NOT_RUN"/>
      </kw>
      <skipped message="The run ended before this test case started."/>
    </testcase>
  </testsuite>
</testsuites>
```
:::

:::details[Optics receives SIGTERM (exit code 143)]
```xml title="stopped.xml"
<?xml version="1.0" ?>
<testsuites>
  <testsuite name="checkout_suite" id="8808e426-b724-4fed-b564-48d51c8a4f46" tests="8" failures="0" errors="1" skipped="3" time="14.17" timestamp="2026-11-09T18:54:49.670+05:30">
    <testcase name="Suite Setup" id="b254c845-e903-44d6-8f4c-8d4531b62607" classname="checkout_suite" kind="suite_setup" time="1.19" timestamp="2026-11-09T18:54:49.670+05:30" status="PASS">
      <kw name="Open Example Page" type="setup" status="PASS" starttime="20261109 18:54:49.670" endtime="20261109 18:54:50.856" elapsed="1.19">
        <kw name="Launch App" status="PASS" starttime="20261109 18:54:49.671" endtime="20261109 18:54:50.856" elapsed="1.19"/>
      </kw>
    </testcase>
    <testcase name="Setup (TC1 Notice Shown)" id="bd55f2d7-53d1-43fb-b98d-fa818b5e430b" classname="checkout_suite" kind="setup" time="0.06" timestamp="2026-11-09T18:54:50.858+05:30" status="PASS">
      <kw name="Check Notice" type="setup" status="PASS" starttime="20261109 18:54:50.858" endtime="20261109 18:54:50.921" elapsed="0.06">
        <kw name="Assert Presence" status="PASS" starttime="20261109 18:54:50.858" endtime="20261109 18:54:50.920" elapsed="0.06">
          <log>Asserting (assert_elements) elements: ['text=for use in documentation examples'] with rule: any and timeout: 5s</log>
          <log>Trying TextElementStrategy on '['text=for use in documentation examples']' ... SUCCESS</log>
          <log>Trying ScreenshotStrategy on 'screenshot' ... SUCCESS</log>
        </kw>
      </kw>
    </testcase>
    <testcase name="TC1 Notice Shown" id="f1d76e49-eff3-47ca-b93d-7231c91badba" classname="checkout_suite" kind="test" time="0.04" timestamp="2026-11-09T18:54:50.921+05:30" status="PASS">
      <kw name="Check Notice" type="setup" status="PASS" starttime="20261109 18:54:50.921" endtime="20261109 18:54:50.959" elapsed="0.04">
        <kw name="Assert Presence" status="PASS" starttime="20261109 18:54:50.922" endtime="20261109 18:54:50.958" elapsed="0.04">
          <log>Asserting (assert_elements) elements: ['text=for use in documentation examples'] with rule: any and timeout: 5s</log>
          <log>Trying TextElementStrategy on '['text=for use in documentation examples']' ... SUCCESS</log>
          <log>Trying ScreenshotStrategy on 'screenshot' ... SUCCESS</log>
        </kw>
      </kw>
    </testcase>
    <testcase name="Setup (TC2 Slow)" id="599d68be-13cb-40e5-9326-59c600e66b11" classname="checkout_suite" kind="setup" time="0.05" timestamp="2026-11-09T18:54:50.959+05:30" status="PASS">
      <kw name="Check Notice" type="setup" status="PASS" starttime="20261109 18:54:50.960" endtime="20261109 18:54:51.012" elapsed="0.05">
        <kw name="Assert Presence" status="PASS" starttime="20261109 18:54:50.960" endtime="20261109 18:54:51.012" elapsed="0.05">
          <log>Asserting (assert_elements) elements: ['text=for use in documentation examples'] with rule: any and timeout: 5s</log>
          <log>Trying TextElementStrategy on '['text=for use in documentation examples']' ... SUCCESS</log>
          <log>Trying ScreenshotStrategy on 'screenshot' ... SUCCESS</log>
        </kw>
      </kw>
    </testcase>
    <testcase name="TC2 Slow" id="51e88ca5-4601-4778-869c-53739eb3299c" classname="checkout_suite" kind="test" time="12.83" timestamp="2026-11-09T18:54:51.013+05:30" status="ERROR">
      <kw name="Wait Long" type="setup" status="ERROR" starttime="20261109 18:54:51.013" code="E0706">
        <kw name="Sleep" status="ERROR" starttime="20261109 18:54:51.013" code="E0706"/>
        <kw name="Assert Presence" status="NOT_RUN"/>
      </kw>
      <kw name="Check Notice" type="setup" status="NOT_RUN">
        <kw name="Assert Presence" status="NOT_RUN"/>
      </kw>
      <error message="The run ended before this test case reported a result." type="Error" code="E0706">The run ended before this test case reported a result.</error>
    </testcase>
    <testcase name="Setup (TC3 Never Started)" classname="checkout_suite" kind="setup" time="0" status="NOT_RUN">
      <kw name="Check Notice" type="setup" status="NOT_RUN">
        <kw name="Assert Presence" status="NOT_RUN"/>
      </kw>
      <skipped message="The run ended before this test case started."/>
    </testcase>
    <testcase name="TC3 Never Started" classname="checkout_suite" kind="test" time="0" status="NOT_RUN">
      <kw name="Check Notice" type="setup" status="NOT_RUN">
        <kw name="Assert Presence" status="NOT_RUN"/>
      </kw>
      <skipped message="The run ended before this test case started."/>
    </testcase>
    <testcase name="Suite Teardown" classname="checkout_suite" kind="suite_teardown" time="0" status="NOT_RUN">
      <kw name="Close Browser" type="setup" status="NOT_RUN">
        <kw name="Close And Terminate App" status="NOT_RUN"/>
      </kw>
      <skipped message="The run ended before this test case started."/>
    </testcase>
  </testsuite>
</testsuites>
```
:::

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
