# Catch error screens

> Fail a run in CI when the app ends on a crash dialog, a "Session expired" message or any other error you define.

Some failures don't break a step. The app shows *Session expired*, or Android shows *Birch has stopped*, and the test still passes because no step looked for that message. Error detection catches these. You list the messages that mean something went wrong, and Optics checks the screen for them at the end of every run.

### List the error messages

Create a CSV anywhere in the project. The template uses `test_data/error_definitions.csv`:

`test_data/error_definitions.csv`:

```csv
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

## What happens at the end of a run

After the last test case, Optics captures the screen one more time, reads all the text in the app's UI tree, and looks for each `match_string`. Matching ignores case and finds the text anywhere: `session expired` matches *Your session expired. Please sign in again.*

For each match, Optics:

- prints a warning: `ON-SCREEN ERROR DETECTED — code: ERR_SESSION | matched_on: match_string | match_string: 'Session expired' | severity: high | The user was signed out`,
- adds a failing test case named `on-screen-error-detection` to `junit_output.xml`, with one failure per match,
- writes the details to `execution_output/detected_errors_<id>.json`.

CI tools that read the JUnit report then show the run as failed, even though every step passed.

**The exit code doesn't change:**
A detected error appears in the JUnit report but doesn't change the exit code of `optics execute`. If your CI decides pass or fail from the exit code alone, have it read the JUnit report as well. See [Run tests in CI](https://optics-framework.org/docs/run/ci).

## Write good match strings

- **Use a phrase only an error would show.** `has stopped` is good. `Error` matches too much, such as a help page about error messages.
- **Copy the exact words** from a screenshot of the error, and keep them short. Matching is plain text, not a pattern, so `*` or `.*` are matched literally.
- **Avoid text that appears in your own tests.** A match anywhere on the last screen counts.

## Limits

- The check runs once, on the last screen. If the app recovers before the run ends, the error isn't seen. Add an explicit check in your test for errors that can appear and disappear mid-flow, such as `Assert Presence` on the screen you expect next.
- It needs the app's UI tree. On [production devices](https://optics-framework.org/docs/platforms/production) driven through a camera, there's no tree to read.
- It's skipped if the session is already closed, for example when Suite Teardown ran `Close And Terminate App`. To keep the check, don't close the app in Suite Teardown.
- Definitions are CSV only. `optics dry_run`, `optics live`, the HTTP API and MCP don't run the check.

## See also

- [Read the results](https://optics-framework.org/docs/run/results)
- [Run tests in CI](https://optics-framework.org/docs/run/ci)
- [Project files reference](https://optics-framework.org/docs/reference/files)
