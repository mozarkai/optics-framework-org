# Run a suite

> Check a suite without a device, run it for real, and choose which test cases run.

Two commands cover almost every run. `optics dry_run` checks your files without touching a device. `optics execute` runs the suite on the device or browser in your `config.yaml` and writes the results to `execution_output/`.

## Check the suite first

```shell
$ optics dry_run birch-tests
```

A dry run reads every file and checks that:

- every test step names a module or keyword that exists,
- every keyword in every module exists, with a suggestion when you mistype one,
- every `${name}` is defined in an elements file or by an earlier step, such as `Evaluate`, `Read Data` or `store_as`. This includes a `${name}` inside a longer value.

It does not tap, type or open anything, so it is quick and safe to run before every commit. It still starts the engines in your `config.yaml`, so they must be installed and a driver must be enabled. `optics dry-run` is the same command.

A suite that uses only [flow control keywords](https://optics-framework.org/docs/reference/keywords/flow), such as `Evaluate` and `Condition`, needs no driver. `optics execute` follows the same rule.

## Run it

```shell
$ optics execute birch-tests
```

Before the run, Optics checks that the target is reachable: for Appium, that the server answers and, for a local server on Android, that a device is connected; for Selenium, that the server answers. If not, it stops with a message saying what to start. Playwright needs no check.

Then it runs **Suite Setup**, each test case in order, and **Suite Teardown**, and prints a live tree:

```terminal
Test Suite
├── Suite Setup                                       |  1.21s |    PASS
│   └── Launch Birch                                  |  1.21s |    PASS
├── Shopper can sign in                               |  1.38s |    PASS
│   └── Sign In                                       |  1.38s |    PASS
└── Shopper can add trail runners                     |  4.02s |    FAIL
    ├── Sign In                                       |  1.31s |    PASS
    └── Add To Cart                                   |  2.71s |    FAIL
╭──────────────────────────────────────────────────────╮
│ Total Test Cases: 3 | Passed: 2 | Failed: 1          │
╰──────────────────────────────────────────────────────╯
```

### What happens when a step fails

- The rest of that test case is skipped, and its unrun steps show as `NOT_RUN`.
- The next test case runs as normal. One broken flow doesn't hide problems elsewhere.
- A **Failure details** box after the tree names each failed step and why it failed.

### Exit codes

| Code | Meaning |
|---|---|
| `0` | Every test case passed. |
| `1` | At least one test case failed, error detection found an on-screen error, or the run couldn't start (no driver enabled, server unreachable, missing files). |
| `2` | The command line is not valid, for example an unknown flag. |
| `3` | The test case selection is not valid. |
| `130` | You pressed Ctrl+C. |
| `143` | Optics received SIGTERM. |

CI systems use this to mark a build as passed or failed. Optics also writes the JUnit report when you stop a run with Ctrl+C or SIGTERM. See [Read the results](https://optics-framework.org/docs/run/results#what-each-outcome-writes).

## Choose which test cases run

Name the test cases to run with `--include`, or the ones to skip with `--exclude`:

```shell
$ optics execute birch-tests --include "shopper can*" --exclude "Shopper can check out"
```

- Matching ignores case. `*` and `?` are wildcards.
- You can use both flags. Optics applies `--include` first.
- Suite Setup and Suite Teardown always run.
- A name that matches no test case stops the run before it starts, with exit code `3`. The message suggests the correct name.

`optics dry_run` takes the same flags. To keep a selection for every run, put `include` and `exclude` in [config.yaml](https://optics-framework.org/docs/reference/config#include-and-exclude). The flags replace them for one run.

## Options

| Option | What it does |
|---|---|
| `--no-use-printer` | Print plain log output instead of the live tree. Useful when a CI log viewer garbles the tree. |
| `--include NAME ...` | Run only these test cases. |
| `--exclude NAME ...` | Skip these test cases. |
| `--runner pytest` | Run the suite through pytest instead of Optics' own runner. Most projects don't need this. |

To skip the reachability check, for example when the server is behind a proxy the check can't see, set `OPTICS_SKIP_PREFLIGHT=1`.

## How long steps wait

On Appium and Selenium, action keywords act on the screen as it is. They don't wait for it to change. On Playwright, an action waits up to 10 seconds for its element (`element_timeout_ms`). Checks wait:

| Keyword | Waits up to |
|---|---|
| `Assert Presence`, `Assert Visibility`, `Validate Screen` | 30 seconds |
| `Validate Element`, `Assert Text` | 10 seconds |
| `Detect And Press` | 30 seconds, then carries on without failing |

Pass a different time as the second value: `Assert Presence,Welcome,60`. For `Assert Text`, the time is the third value. Put a check after any step that loads a new screen, so the next action doesn't run too early.

## See also

- [Read the results](https://optics-framework.org/docs/run/results)
- [Run tests in CI](https://optics-framework.org/docs/run/ci)
- [CLI reference](https://optics-framework.org/docs/reference/cli)
