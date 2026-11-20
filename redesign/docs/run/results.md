# Read the results

> Find out what happened in a run from the JUnit report, the screenshots and the logs.

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
| `…_with_aoi.jpg` | When a step uses an [area of interest](https://optics-framework.org/docs/elements/area-of-interest), with `save_captures: true` | Check the area covers the right part of the screen. It's drawn in blue. |
| `<time>-failure_<test case>.jpg` and `<time>-failure_<test case>.xml` | When a test case fails. Web pages write `.html` in place of `.xml`. | See the screen and the UI tree where the test case ended. |
| `<time>-end_of_run.jpg` | At the end of the run, before Suite Teardown | See where the app was left. |
| `page_sources_log.xml` or `.html` | When the UI tree is read. Web pages go to `.html`. | Find the right XPath or text for an element. |
| `failed_steps_elements.json` | When a step fails, with `save_captures: true` | See each element on the screen of the failed step, with its label and bounds. |
| `internal_logs.log`, `execution_logs.log` | With `file_log: true` | Read every attempt Optics made, including which ways of finding an element failed. |
| `logs.json` | With `json_log: true` | Feed results into your own dashboards. |
| `detected_errors_<id>.json` | When an [error screen](https://optics-framework.org/docs/run/error-detection) was found | See which error definition matched. |

## Investigate a failure

1. **Read the Failures box** in the terminal. For each failed step, it names the test case, the module and the step, says why the step failed, and gives a hint. For an element, the reason names each value that Optics looked for.
2. **Open `failed_steps_elements.json`** to see the elements on the screen when the step failed. On a web page, each element has a `loc` locator that you can copy into your elements file.
3. **Open the `failure_<test case>` screenshot.** It shows where the test case ended. Then open the last `pre_…` screenshot before the failure. Is the screen what you expected? If it shows a loading spinner, the step ran too early: add an `Assert Presence` before it. If it shows a different screen, an earlier step went somewhere unexpected.
4. **Search the logs** for the element's value. With `file_log: true`, `execution_logs.log` has a line for every attempt, such as `Trying … on 'Sign in' ... FAIL`.
5. **Reproduce it in `optics live`.** Run the steps before the failure, then try the failing step with different values until one works. See [Record a test](https://optics-framework.org/docs/create/record).

## Turn on more logging

Add these to `config.yaml`:

`config.yaml`:

```yaml
file_log: true      # write internal_logs.log and execution_logs.log
json_log: true      # write logs.json, a list of every run event
log_level: DEBUG    # more detail in the terminal and log files
```

`log_level` takes `DEBUG`, `INFO` (the default), `WARNING` or `ERROR`. Use `WARNING` to keep the terminal quiet so the tree stands out.

## Read the JUnit report

`junit_output.xml` has one `<testsuite>` and one `<testcase>` for each test case. Suite Setup and Suite Teardown also have one. The suite `id` is the session id. The suite `name` and each `classname` are the `name` in config.yaml, or the name of the project folder when config.yaml has no `name`. `optics init` writes `name`, so the report keeps its name when you copy the project to a different folder:

`config.yaml`:

```yaml
name: birch-tests
```

```xml
<testsuite name="birch-tests" id="b1cdc702-…" tests="3" failures="0" errors="0" skipped="0" time="0.00" …>
```

Each `<testcase>` has `kind`, `timestamp` (when it started), `time` (how long it took, in seconds) and `status`. A failed test case also has a `<failure>`.

`kind` tells you the role of the test case: `suite_setup`, `setup`, `test`, `teardown` or `suite_teardown`. Use it to filter setup and teardown out of your test counts. A `<failure>` or `<error>` has a `code` attribute with the error code, such as `E0201`, when the failure has a code. The `message` of a `<failure>` says why the step failed. Its text adds the hint on the next line.

Inside each test case, every module is a `<kw type="setup">`, and each of its keywords is a `<kw>` inside it. Each `<kw>` has `status`, `starttime`, `endtime` and `elapsed`. A failed one also has a `message` and a `code`. A keyword that [AI self-heal](https://optics-framework.org/docs/elements/self-heal#find-out-what-healed) completed has `healed="true"` and a `<heal>` element with the steps that the model did. CI tools that show nested steps display the same tree you saw in the terminal.

```xml
<testcase name="Shopper can find a missing link" classname="birch-tests" kind="test" time="3.79" ... status="FAIL">
  <kw name="Verify Missing Link" type="setup" status="FAIL" ... code="E0201">
    <kw name="Assert Presence" status="FAIL" ... code="E0201" elapsed="3.01">
    ...
    </kw>
    <kw name="Validate Element" status="NOT_RUN"/>
  </kw>
  <failure message="'Missing link' is not on the screen." type="Failure" code="E0201">'Missing link' is not on the screen.
OCR is off, so text that shows only in images was not searched. Add a text_detection engine to config.yaml to search it.</failure>
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

If error screens were detected, the report has an extra failing test case called `on-screen-error-detection`. See [Catch error screens](https://optics-framework.org/docs/run/error-detection).

## What each outcome writes

Each outcome has an exit code and a result in `junit_output.xml`. Optics writes the report once, when the run ends, also when you stop the run with Ctrl+C or SIGTERM. A run that cannot start because of the project writes no report. Examples are a bad config and a test selection that is not valid.

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
| You press Ctrl+C | `130` | Finished test cases keep their results. The one in progress is `ERROR` with `code="E0706"`. Its keyword in progress is `ERROR` with the same code, and its other steps are `NOT_RUN`. Later test cases and Suite Teardown do not run: each is a `<testcase status="NOT_RUN">` with a `<skipped>`. |
| Optics receives SIGTERM | `143` | The same as Ctrl+C. |
| The process is killed with SIGKILL | `137` in a shell, `-9` from Python `subprocess` | Not written: the process ends at once. |

A session is lost when the Appium server or the Selenium server stops, or drops the session, during a run. The terminal summary shows the affected test cases as failed.

If two sessions in one process share an output folder, such as with the Python SDK or `optics serve`, the second report is `junit_output_<session_id>.xml`. `optics execute` and `optics dry_run` always write `junit_output.xml`.

### Sample reports

These are real reports from `optics execute` on a Playwright project named `checkout_suite`. Open one to see the exact XML of that outcome.

**Every test case passed (exit code 0)**
`passed.xml`:

```xml
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

**A test case failed (exit code 1)**
`failed.xml`:

```xml
<?xml version="1.0" ?>
<testsuites>
  <testsuite name="checkout_suite" id="04f2f909-2741-435e-bbed-b76cec621740" tests="6" failures="1" errors="0" skipped="0" time="3.32" timestamp="2026-11-20T16:54:31.081+05:30">
    <testcase name="Suite Setup" id="9a4c3b23-cf8d-4cb0-915b-1b724ab7e71f" classname="checkout_suite" kind="suite_setup" time="0.43" timestamp="2026-11-20T16:54:31.081+05:30" status="PASS">
      <kw name="Open Example Page" type="setup" status="PASS" starttime="20261120 16:54:31.081" endtime="20261120 16:54:31.514" elapsed="0.43">
        <kw name="Launch App" status="PASS" starttime="20261120 16:54:31.082" endtime="20261120 16:54:31.513" elapsed="0.43"/>
      </kw>
    </testcase>
    <testcase name="Setup (TC1 Notice Shown)" id="4fd54886-f661-4cd0-947d-de74066e70ef" classname="checkout_suite" kind="setup" time="0.07" timestamp="2026-11-20T16:54:31.514+05:30" status="PASS">
      <kw name="Check Notice" type="setup" status="PASS" starttime="20261120 16:54:31.514" endtime="20261120 16:54:31.585" elapsed="0.07">
        <kw name="Assert Presence" status="PASS" starttime="20261120 16:54:31.514" endtime="20261120 16:54:31.585" elapsed="0.07">
          <log>Asserting (assert_elements) elements: ['text=for use in documentation examples'] with rule: any and timeout: 5s</log>
          <log>Trying TextElementStrategy on '['text=for use in documentation examples']' ... SUCCESS</log>
          <log>Trying ScreenshotStrategy on 'screenshot' ... SUCCESS</log>
        </kw>
      </kw>
    </testcase>
    <testcase name="TC1 Notice Shown" id="de2954d7-93ee-44ad-bc01-1683569d8976" classname="checkout_suite" kind="test" time="0.04" timestamp="2026-11-20T16:54:31.585+05:30" status="PASS">
      <kw name="Check Notice" type="setup" status="PASS" starttime="20261120 16:54:31.585" endtime="20261120 16:54:31.622" elapsed="0.04">
        <kw name="Assert Presence" status="PASS" starttime="20261120 16:54:31.585" endtime="20261120 16:54:31.622" elapsed="0.04">
          <log>Asserting (assert_elements) elements: ['text=for use in documentation examples'] with rule: any and timeout: 5s</log>
          <log>Trying TextElementStrategy on '['text=for use in documentation examples']' ... SUCCESS</log>
          <log>Trying ScreenshotStrategy on 'screenshot' ... SUCCESS</log>
        </kw>
      </kw>
    </testcase>
    <testcase name="Setup (TC2 Missing Text)" id="47392934-823a-480c-b3cc-52fd0220b4d9" classname="checkout_suite" kind="setup" time="0.05" timestamp="2026-11-20T16:54:31.622+05:30" status="PASS">
      <kw name="Check Notice" type="setup" status="PASS" starttime="20261120 16:54:31.622" endtime="20261120 16:54:31.669" elapsed="0.05">
        <kw name="Assert Presence" status="PASS" starttime="20261120 16:54:31.622" endtime="20261120 16:54:31.669" elapsed="0.05">
          <log>Asserting (assert_elements) elements: ['text=for use in documentation examples'] with rule: any and timeout: 5s</log>
          <log>Trying TextElementStrategy on '['text=for use in documentation examples']' ... SUCCESS</log>
          <log>Trying ScreenshotStrategy on 'screenshot' ... SUCCESS</log>
        </kw>
      </kw>
    </testcase>
    <testcase name="TC2 Missing Text" id="83fc7681-5b4b-40b6-855e-ef52c047e2aa" classname="checkout_suite" kind="test" time="2.71" timestamp="2026-11-20T16:54:31.669+05:30" status="FAIL">
      <kw name="Check Missing Text" type="setup" status="FAIL" starttime="20261120 16:54:31.669" message="'text=This text is not on the page' is not on the screen." code="E0201" endtime="20261120 16:54:34.319" elapsed="2.65">
        <kw name="Assert Presence" status="FAIL" starttime="20261120 16:54:31.669" message="'text=This text is not on the page' is not on the screen." code="E0201" endtime="20261120 16:54:33.678" elapsed="2.01">
          <log>Asserting (assert_elements) elements: ['text=This text is not on the page'] with rule: any and timeout: 2s</log>
          <log>Trying TextElementStrategy on '['text=This text is not on the page']' ... FAIL (error: Elements not found.)</log>
          <log>Trying TextElementStrategy on '['text=This text is not on the page']' ... FAIL (error: Elements not found.)</log>
          <log>'text=This text is not on the page' is not on the screen.</log>
        </kw>
        <kw name="Assert Presence" status="NOT_RUN"/>
      </kw>
      <kw name="Check Notice" type="setup" status="NOT_RUN">
        <kw name="Assert Presence" status="NOT_RUN"/>
      </kw>
      <failure message="'text=This text is not on the page' is not on the screen." type="Failure" code="E0201">'text=This text is not on the page' is not on the screen.
OCR is off, so text that shows only in images was not searched. Add a text_detection engine to config.yaml to search it.</failure>
    </testcase>
    <testcase name="Suite Teardown" id="04d3789c-1899-4254-afa5-af288e61964e" classname="checkout_suite" kind="suite_teardown" time="0.02" timestamp="2026-11-20T16:54:34.419+05:30" status="PASS">
      <kw name="Close Browser" type="setup" status="PASS" starttime="20261120 16:54:34.419" endtime="20261120 16:54:34.442" elapsed="0.02">
        <kw name="Close And Terminate App" status="PASS" starttime="20261120 16:54:34.419" endtime="20261120 16:54:34.442" elapsed="0.02">
          <log>No events to send.</log>
        </kw>
      </kw>
    </testcase>
  </testsuite>
</testsuites>
```

**An error screen matched (exit code 1)**
`on_screen_error.xml`:

```xml
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

**Suite Setup failed (exit code 1)**
`suite_setup_failed.xml`:

```xml
<?xml version="1.0" ?>
<testsuites>
  <testsuite name="checkout_suite" id="232fddda-e551-4724-a6d9-efae1d0e1bca" tests="4" failures="1" errors="0" skipped="2" time="3.72" timestamp="2026-11-20T16:54:35.565+05:30">
    <testcase name="Suite Setup" id="45110bcc-1192-49ae-89e8-4e4ce87767fc" classname="checkout_suite" kind="suite_setup" time="3.70" timestamp="2026-11-20T16:54:35.565+05:30" status="FAIL">
      <kw name="Open Example Page" type="setup" status="PASS" starttime="20261120 16:54:35.565" endtime="20261120 16:54:36.034" elapsed="0.47">
        <kw name="Launch App" status="PASS" starttime="20261120 16:54:35.565" endtime="20261120 16:54:36.034" elapsed="0.47"/>
      </kw>
      <kw name="Check Missing Text" type="setup" status="FAIL" starttime="20261120 16:54:36.034" message="'text=This text is not on the page' is not on the screen." code="E0201" endtime="20261120 16:54:38.697" elapsed="2.66">
        <kw name="Assert Presence" status="FAIL" starttime="20261120 16:54:36.034" message="'text=This text is not on the page' is not on the screen." code="E0201" endtime="20261120 16:54:38.048" elapsed="2.01">
          <log>Asserting (assert_elements) elements: ['text=This text is not on the page'] with rule: any and timeout: 2s</log>
          <log>Trying TextElementStrategy on '['text=This text is not on the page']' ... FAIL (error: Elements not found.)</log>
          <log>Trying TextElementStrategy on '['text=This text is not on the page']' ... FAIL (error: Elements not found.)</log>
          <log>'text=This text is not on the page' is not on the screen.</log>
        </kw>
        <kw name="Assert Presence" status="NOT_RUN"/>
      </kw>
      <failure message="'text=This text is not on the page' is not on the screen." type="Failure" code="E0201">'text=This text is not on the page' is not on the screen.
OCR is off, so text that shows only in images was not searched. Add a text_detection engine to config.yaml to search it.</failure>
    </testcase>
    <testcase name="Setup (TC1 Notice Shown)" classname="checkout_suite" kind="setup" time="0" status="NOT_RUN">
      <kw name="Check Notice" type="setup" status="NOT_RUN">
        <kw name="Assert Presence" status="NOT_RUN"/>
      </kw>
      <skipped message="Suite setup failed: 'text=This text is not on the page' is not on the screen."/>
    </testcase>
    <testcase name="TC1 Notice Shown" classname="checkout_suite" kind="test" time="0" status="NOT_RUN">
      <kw name="Check Notice" type="setup" status="NOT_RUN">
        <kw name="Assert Presence" status="NOT_RUN"/>
      </kw>
      <skipped message="Suite setup failed: 'text=This text is not on the page' is not on the screen."/>
    </testcase>
    <testcase name="Suite Teardown" id="0f2b518e-b281-466a-adcd-88a1b46e6abb" classname="checkout_suite" kind="suite_teardown" time="0.02" timestamp="2026-11-20T16:54:39.303+05:30" status="PASS">
      <kw name="Close Browser" type="setup" status="PASS" starttime="20261120 16:54:39.303" endtime="20261120 16:54:39.325" elapsed="0.02">
        <kw name="Close And Terminate App" status="PASS" starttime="20261120 16:54:39.303" endtime="20261120 16:54:39.325" elapsed="0.02">
          <log>No events to send.</log>
        </kw>
      </kw>
    </testcase>
  </testsuite>
</testsuites>
```

**A per-test setup failed (exit code 1)**
`setup_failed.xml`:

```xml
<?xml version="1.0" ?>
<testsuites>
  <testsuite name="checkout_suite" id="e5f2fe5f-d365-405a-9978-2feeab57af74" tests="6" failures="2" errors="0" skipped="2" time="6.45" timestamp="2026-11-20T16:54:40.478+05:30">
    <testcase name="Suite Setup" id="4f67bb3f-f2eb-4822-ac42-14cac963991f" classname="checkout_suite" kind="suite_setup" time="0.44" timestamp="2026-11-20T16:54:40.478+05:30" status="PASS">
      <kw name="Open Example Page" type="setup" status="PASS" starttime="20261120 16:54:40.478" endtime="20261120 16:54:40.916" elapsed="0.44">
        <kw name="Launch App" status="PASS" starttime="20261120 16:54:40.479" endtime="20261120 16:54:40.915" elapsed="0.44"/>
      </kw>
    </testcase>
    <testcase name="Setup (TC1 Notice Shown)" id="ebf32e8f-ca85-4980-8646-0a8a56e33f24" classname="checkout_suite" kind="setup" time="2.73" timestamp="2026-11-20T16:54:40.916+05:30" status="FAIL">
      <kw name="Check Missing Text" type="setup" status="FAIL" starttime="20261120 16:54:40.916" message="'text=This text is not on the page' is not on the screen." code="E0201" endtime="20261120 16:54:43.576" elapsed="2.66">
        <kw name="Assert Presence" status="FAIL" starttime="20261120 16:54:40.916" message="'text=This text is not on the page' is not on the screen." code="E0201" endtime="20261120 16:54:42.927" elapsed="2.01">
          <log>Asserting (assert_elements) elements: ['text=This text is not on the page'] with rule: any and timeout: 2s</log>
          <log>Trying TextElementStrategy on '['text=This text is not on the page']' ... FAIL (error: Elements not found.)</log>
          <log>Trying TextElementStrategy on '['text=This text is not on the page']' ... FAIL (error: Elements not found.)</log>
          <log>'text=This text is not on the page' is not on the screen.</log>
        </kw>
        <kw name="Assert Presence" status="NOT_RUN"/>
      </kw>
      <failure message="'text=This text is not on the page' is not on the screen." type="Failure" code="E0201">'text=This text is not on the page' is not on the screen.
OCR is off, so text that shows only in images was not searched. Add a text_detection engine to config.yaml to search it.</failure>
    </testcase>
    <testcase name="TC1 Notice Shown" classname="checkout_suite" kind="test" time="0" status="NOT_RUN">
      <kw name="Check Notice" type="setup" status="NOT_RUN">
        <kw name="Assert Presence" status="NOT_RUN"/>
      </kw>
      <skipped message="Setup failed: 'text=This text is not on the page' is not on the screen."/>
    </testcase>
    <testcase name="Setup (TC2 Notice Again)" id="89cf52fa-f641-4579-a73f-afdbeceb2e8b" classname="checkout_suite" kind="setup" time="3.24" timestamp="2026-11-20T16:54:43.647+05:30" status="FAIL">
      <kw name="Check Missing Text" type="setup" status="FAIL" starttime="20261120 16:54:43.647" message="'text=This text is not on the page' is not on the screen." code="E0201" endtime="20261120 16:54:46.315" elapsed="2.67">
        <kw name="Assert Presence" status="FAIL" starttime="20261120 16:54:43.647" message="'text=This text is not on the page' is not on the screen." code="E0201" endtime="20261120 16:54:45.666" elapsed="2.02">
          <log>Asserting (assert_elements) elements: ['text=This text is not on the page'] with rule: any and timeout: 2s</log>
          <log>Trying TextElementStrategy on '['text=This text is not on the page']' ... FAIL (error: Elements not found.)</log>
          <log>Trying TextElementStrategy on '['text=This text is not on the page']' ... FAIL (error: Elements not found.)</log>
          <log>'text=This text is not on the page' is not on the screen.</log>
        </kw>
        <kw name="Assert Presence" status="NOT_RUN"/>
      </kw>
      <failure message="'text=This text is not on the page' is not on the screen." type="Failure" code="E0201">'text=This text is not on the page' is not on the screen.
OCR is off, so text that shows only in images was not searched. Add a text_detection engine to config.yaml to search it.</failure>
    </testcase>
    <testcase name="TC2 Notice Again" classname="checkout_suite" kind="test" time="0" status="NOT_RUN">
      <kw name="Check Notice" type="setup" status="NOT_RUN">
        <kw name="Assert Presence" status="NOT_RUN"/>
      </kw>
      <skipped message="Setup failed: 'text=This text is not on the page' is not on the screen."/>
    </testcase>
    <testcase name="Suite Teardown" id="598f26b6-1483-4c2b-81d9-1ff0e807bd27" classname="checkout_suite" kind="suite_teardown" time="0.04" timestamp="2026-11-20T16:54:47.455+05:30" status="PASS">
      <kw name="Close Browser" type="setup" status="PASS" starttime="20261120 16:54:47.456" endtime="20261120 16:54:47.497" elapsed="0.04">
        <kw name="Close And Terminate App" status="PASS" starttime="20261120 16:54:47.456" endtime="20261120 16:54:47.497" elapsed="0.04">
          <log>No events to send.</log>
        </kw>
      </kw>
    </testcase>
  </testsuite>
</testsuites>
```

**You press Ctrl+C (exit code 130)**
`interrupted.xml`:

```xml
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

**Optics receives SIGTERM (exit code 143)**
`stopped.xml`:

```xml
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

## Keep the folder tidy

Screenshots from every run accumulate in `execution_output/`. Clear the folder before runs where you need clean results, such as in CI:

```shell
$ rm -rf birch-tests/execution_output
$ optics execute birch-tests
```

To write results somewhere else, set `execution_output_path` in `config.yaml`. A relative path is relative to the folder you run `optics` from, and the folder must exist.

## See also

- [Catch error screens](https://optics-framework.org/docs/run/error-detection)
- [Run tests in CI](https://optics-framework.org/docs/run/ci)
- [Troubleshooting](https://optics-framework.org/docs/help/troubleshooting)
