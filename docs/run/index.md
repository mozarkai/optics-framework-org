---
title: Run a suite
nav: Overview
summary: Check a suite without a device, run it for real, and choose which test cases run.
level: Beginner
---

Two commands cover almost every run. `optics dry_run` checks your files without touching a device. `optics execute` runs the suite on the device or browser in your `config.yaml` and writes the results to `execution_output/`.

::scene{name="run" caption="optics execute shows each step as it runs and writes a JUnit report, screenshots and logs to execution_output."}

## Check the suite first

```shell
$ optics dry_run birch-tests
```

A dry run reads every file and checks that:

- every test step names a module or keyword that exists,
- every keyword in every module exists, with a suggestion when you mistype one,
- every `${name}` is defined in an elements file.

It doesn't tap, type or open anything, so it's quick and safe to run before every commit. It still starts the engines in your `config.yaml`, so they must be installed and a driver must be enabled.

## Run it

```shell
$ optics execute birch-tests
```

Before the run, Optics checks that the target is reachable: for Appium, that the server answers and (on Android) that a device is connected; for Selenium, that the server answers. If not, it stops with a message saying what to start. Playwright needs no check.

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
| `1` | At least one test case failed, or the run couldn't start (no driver enabled, server unreachable, missing files). |

CI systems use this to mark a build as passed or failed.

## Choose which test cases run

List test cases to run, or to skip, in `config.yaml`. Names match exactly, ignoring case:

```yaml title="config.yaml"
include:
  - Shopper can sign in
```

Use `include` or `exclude`, not both. Suite Setup and Suite Teardown always run. There's no command-line option for this, so a common pattern in CI is a small config per job. See [Organise a suite](/docs/create/organise#run-the-same-suite-on-different-devices).

## Options

| Option | What it does |
|---|---|
| `--no-use-printer` | Print plain log output instead of the live tree. Useful when a CI log viewer garbles the tree. |
| `--runner pytest` | Run the suite through pytest instead of Optics' own runner. Most projects don't need this. |

To skip the reachability check, for example when the server is behind a proxy the check can't see, set `OPTICS_SKIP_PREFLIGHT=1`.

## How long steps wait

Action keywords act on the screen as it is. They don't wait for it to change. Checks wait:

| Keyword | Waits up to |
|---|---|
| `Assert Presence`, `Assert Visibility` | 30 seconds |
| `Validate Element` | 10 seconds |
| `Detect And Press` | 30 seconds, then carries on without failing |

Pass a different time as the second value: `Assert Presence,Welcome,60`. Put a check after any step that loads a new screen, so the next action doesn't run too early.

## See also

- [Read the results](/docs/run/results)
- [Run tests in CI](/docs/run/ci)
- [CLI reference](/docs/reference/cli)
