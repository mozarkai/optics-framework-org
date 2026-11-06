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

Create a CSV anywhere in the project. The template uses `test_data/error_definitions.csv`:

```csv title="test_data/error_definitions.csv"
error_code,match_string,description,severity
ERR_CRASH,has stopped,The app crashed with a system dialog,critical
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

Optics captures the screen once, reads all the text in the app's UI tree, and looks for each `match_string`. It does this before Suite Teardown when the suite has one, because a teardown often closes the app. Otherwise it does this after the last test case. Matching ignores case and finds the text anywhere: `session expired` matches *Your session expired. Please sign in again.*

For each match, Optics:

- logs a warning, which you can read in `execution_logs.log` when `file_log: true` is set: `ON-SCREEN ERROR DETECTED — code: ERR_SESSION | matched_on: match_string | match_string: 'Session expired' | severity: high | The user was signed out`,
- adds a failing test case named `on-screen-error-detection` to `junit_output.xml`, after the other test cases, with one failure per match,
- writes the details to `execution_output/detected_errors_<id>.json`.

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
- **Copy the exact words** from a screenshot of the error, and keep them short. Matching is plain text, not a pattern, so `*` or `.*` are matched literally.
- **Avoid text that appears in your own tests.** A match anywhere on the last screen counts.

## Limits

- The check runs once, on the last screen. If the app recovers before the run ends, the error isn't seen. Add an explicit check in your test for errors that can appear and disappear mid-flow, such as `Assert Presence` on the screen you expect next.
- It needs the app's UI tree. On [production devices](/docs/platforms/production) driven through a camera, there's no tree to read.
- Optics skips the check if the app is already closed when it reads the final screen. This happens when the last test case ran `Close And Terminate App` and the suite has no Suite Teardown. Close the app in Suite Teardown instead.
- Definitions are CSV only. `optics dry_run`, `optics live`, the HTTP API and MCP don't run the check.

## See also

- [Read the results](/docs/run/results)
- [Run tests in CI](/docs/run/ci)
- [Project files reference](/docs/reference/files)
