---
title: Catch error screens
nav: Error detection
summary: Fail a run in CI when the app ends on a crash dialog, a "Session expired" message or any other error you define.
level: Intermediate
time: 6 min
---

Some failures do not break a step. The app shows *Session expired*, or Android shows *Birch has stopped*, and the test still passes because no step looked for that message. Error detection catches these. You list the messages that mean something went wrong, and Optics checks the final screen for them in every run.

::scene{name="errors" caption="A step fails because the app signed the shopper out. At the end of the run, Optics reads the text on the last screen, matches it against your error definitions, and adds the match to the JUnit report."}

:::steps
### List the error messages

Create a CSV anywhere in the project. Optics finds it by its header row. The template uses `test_data/error_definitions.csv`, next to the test cases and modules:

```csv title="test_data/error_definitions.csv"
error_code,match_string,description,severity
ERR_CRASH,has stopped,The app crashed with a system dialog,critical
ERR_OLD_CRASH,Unfortunately,An older Android crash dialog,critical
ERR_NOT_RESPONDING,isn't responding,Android shows an ANR dialog,critical
ERR_SESSION,Session expired,The user was signed out,high
ERR_NETWORK,No internet connection,The app lost its connection,medium
ERR_SERVER,Something went wrong,The server returned an error page,high
```

| Column | Required | What it's for |
|---|---|---|
| `error_code` | Yes | A short name for the error. It appears in the report. |
| `match_string` | Yes | Text that means this error is on screen. |
| `description` | No | What the error means, for whoever reads the report. |
| `severity` | No | Any label you like, such as `critical` or `low`. |

### Run the suite as usual

```shell
$ optics execute birch-tests
```

There's nothing to switch on. If the project has an error definitions file, Optics uses it.
:::

## What happens at the end of a run

Optics captures the screen once, reads the visible text in the app's UI tree, and looks for each `match_string`. It also looks for the `error_code` itself. It does this before Suite Teardown when the suite has one, because a teardown often closes the app. Otherwise it does this after the last test case. Matching ignores case and finds the text anywhere: `Session expired` matches *Your session expired, please log in*, and `session expired` matches *SESSION EXPIRED*.

### What Optics reads as visible text

Optics reads only the text a user can see, so internal names do not cause false matches:

- **Apps (Appium):** the values of the `text`, `content-desc`, `label`, `value`, `hint` and `name` attributes. Resource ids, class names, bounds and other attributes are ignored.
- **Web pages (Selenium, Playwright):** the text of the page, as BeautifulSoup `get_text()` gives it. Tags, attributes and CSS class names are removed. This needs the `beautifulsoup4` package, which Optics installs.

For each match, Optics:

- logs a warning, which you can read in `execution_logs.log` when `file_log: true` is set: `ON-SCREEN ERROR DETECTED — code: ERR_SESSION | matched_on: match_string | match_string: 'Session expired' | severity: high | The user was signed out`,
- adds a failing test case named `on-screen-error-detection` to `junit_output.xml`, after the other test cases, with one failure per match,
- writes the details to `execution_output/detected_errors_<session_id>.json`.

The terminal tree shows `on-screen-error-detection` as `FAIL` and counts it in the summary:

```terminal
└── on-screen-error-detection                            |      0.00s |    FAIL
╭──────────────────────────────────────────────────────────────────────────────╮
│ Total Test Cases: 4 | Passed: 3 | Failed: 1                                  │
╰──────────────────────────────────────────────────────────────────────────────╯
```

:::important[A detected error fails the run]
A detected error counts as a failed test case, so `optics execute` exits with code `1`. CI tools that read the exit code or the JUnit report show the run as failed, even when every step passed. See [Run tests in CI](/docs/run/ci#decide-pass-or-fail).
:::

## Write good match strings

- **Use a phrase only an error would show.** `has stopped` is good. `Error` matches too much, such as a help page about error messages.
- **Copy the exact words** from a screenshot of the error, and keep them short. Matching is plain text, not a regular expression or a glob pattern, so `error.*` matches only the text `error.*`.
- **Avoid text that appears in your own tests.** A match anywhere on the last screen counts.

## Limits

- The check runs once, on the last screen. If the app recovers before the run ends, the error isn't seen. Add an explicit check in your test for errors that can appear and disappear mid-flow, such as `Assert Presence` on the screen you expect next.
- It needs the app's UI tree. On [production devices](/docs/platforms/production) driven through a camera, there's no tree to read.
- Optics skips the check if the app is already closed when it reads the final screen. This happens when the last test case ran `Close And Terminate App` and the suite has no Suite Teardown. Close the app in Suite Teardown instead.
- In a project run, the definitions come only from the CSV. `optics dry_run`, `optics live`, the HTTP API and MCP don't run the check. The Python library runs it when you ask. See [Check for errors from Python](#check-for-errors-from-python).

## Check for errors from Python

With the `Optics` class, you need no CSV. Give the definitions as a dict, or as an `ErrorDefinitions` model, then check the screen when you want:

```python title="test_login.py"
from optics_framework import Optics

optics = Optics()
optics.setup(...)

optics.add_error_definitions({
    "ERR_009": {
        "match_string": "Session expired",
        "description": "User session timed out",
        "severity": "high",
    },
})

matches = optics.capture_and_detect(context_label="after_login", test_case="login_flow")
for m in matches:
    print(m["error_code"], m["matched_on"], m["match_string"])
```

- `add_error_definitions` adds to the definitions you gave before. A definition with the same code replaces the earlier one.
- Drive the app between the two calls. `capture_and_detect` checks the screen as it is when you call it.
- `capture_and_detect` returns a list of matches. It never raises: if the driver fails, it returns `[]`, so a flaky session does not stop your script. It writes no files.
- Each match has `error_code`, `matched_on` (`"match_string"` or `"code"`), `match_string`, `description`, `severity` and `detected_at`, which is the `context_label`. When you give `test_case`, the match also has `test_case`.

## See also

- [Read the results](/docs/run/results)
- [Run tests in CI](/docs/run/ci)
- [Project files reference](/docs/reference/files)
