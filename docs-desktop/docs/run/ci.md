# Run tests in CI

> Run the same suite on every pull request and read the results in your CI system.

A suite earns its keep when it runs on every change. In CI, Optics needs the same three things as on your machine: Optics itself, the engines in your `config.yaml`, and something to drive. It reports through its exit code and a JUnit file, which every major CI system understands.

## Run a web suite

Web suites are the easiest to run in CI, because the browser runs on the CI machine itself.

**GitHub Actions**

`.github/workflows/optics.yml`:

```yaml
name: Optics

on: [push, pull_request]

permissions:
  contents: read
  checks: write   # lets the report step post a check

jobs:
  web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-python@v7
        with:
          python-version: "3.12"

      - name: Install Optics and the browser
        run: |
          pip install "optics-framework[playwright]==1.11.4"
          python -m playwright install --with-deps chromium

      - name: Run the suite
        run: optics execute birch-tests --no-use-printer

      - name: Publish results
        if: always()
        uses: mikepenz/action-junit-report@v6
        with:
          report_paths: birch-tests/execution_output/junit_output.xml

      - name: Keep the run output
        if: failure()
        uses: actions/upload-artifact@v7
        with:
          name: optics-output
          path: birch-tests/execution_output/
```
**GitLab CI**

`.gitlab-ci.yml`:

```yaml
optics-web:
  image: python:3.12-bookworm
  script:
    - pip install "optics-framework[playwright]==1.11.4"
    - python -m playwright install --with-deps chromium
    - optics execute birch-tests --no-use-printer
  artifacts:
    when: always
    paths:
      - birch-tests/execution_output/
    reports:
      junit: birch-tests/execution_output/junit_output.xml
```

CI machines have no display, so set `headless: true` under the Playwright `capabilities` in `config.yaml`:

`config.yaml`:

```yaml
driver_sources:
  - playwright:
      enabled: true
      capabilities:
        browser: chromium
        headless: true
```

To use a browser grid instead of a local browser, set the Playwright `url` and keep the token in a CI secret. Then you do not need `playwright install`. See [Use a remote browser](https://optics-framework.org/docs/platforms/web#use-a-remote-browser).

The `permissions` block lets the report step post its check. Without it, the step logs `Resource not accessible by integration` and no check appears. Pull requests from forks always get a read-only token, so on those the results are in the job log only.

## Run an Android suite

Android suites need an emulator and an Appium server on the CI machine. Linux runners with hardware acceleration, such as GitHub's `ubuntu-latest`, can run the Android emulator.

`.github/workflows/optics-android.yml`:

```yaml
name: Optics Android

on: [pull_request]

permissions:
  contents: read
  checks: write

jobs:
  android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - name: Enable KVM
        run: |
          echo 'KERNEL=="kvm", GROUP="kvm", MODE="0666", OPTIONS+="static_node=kvm"' | sudo tee /etc/udev/rules.d/99-kvm4all.rules
          sudo udevadm control --reload-rules
          sudo udevadm trigger --name-match=kvm

      - uses: actions/setup-python@v7
        with:
          python-version: "3.12"
      - uses: actions/setup-node@v7
        with:
          node-version: 22

      - name: Install Optics and Appium
        run: |
          pip install "optics-framework[appium]==1.11.4"
          npm install -g appium
          appium driver install uiautomator2

      - name: Run the suite on an emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          arch: x86_64
          script: |
            adb install app/build/outputs/apk/debug/app-debug.apk
            appium > appium.log 2>&1 &
            sleep 5
            optics execute birch-tests --no-use-printer

      - name: Publish results
        if: always()
        uses: mikepenz/action-junit-report@v6
        with:
          report_paths: birch-tests/execution_output/junit_output.xml
```

Make sure `deviceName` in `config.yaml` matches the emulator (`emulator-5554` for the first one), and that `appPackage` and `appActivity` match the app you install.

## Decide pass or fail

`optics execute` exits with a non-zero code when a run does not pass, so the run step fails the job by itself:

| Code | Meaning |
|---|---|
| `0` | Every test case passed. |
| `1` | A test case failed, or an [error screen](https://optics-framework.org/docs/run/error-detection) was found. The run also exits with `1` when it cannot start, for example when the server is not reachable. |
| `2` | The command line is not valid. |
| `3` | A name in `--include`, `--exclude` or the config `include` and `exclude` matches no test case. |
| `130` or `143` | A person or the CI system stopped the run with Ctrl+C or SIGTERM. |

Optics also writes `junit_output.xml` when it stops with `130` or `143`. A run that cannot start because of the project, such as a bad config, writes no report. See [What each outcome writes](https://optics-framework.org/docs/run/results#what-each-outcome-writes).

An error screen adds a failing `on-screen-error-detection` test case to the report and changes the exit code to `1`. You do not need extra settings to fail the build on it.

## Make CI runs reliable

- **Pin the Optics version** (`optics-framework==1.11.4`), so a new release doesn't change behavior in the middle of a sprint. Upgrade on purpose, in its own pull request.
- **Run `optics dry_run` first** in a fast job. It catches typos in seconds, before you pay for an emulator.
- **Split a long suite** into parallel jobs with `--include` and `--exclude`, for example `optics execute birch-tests --include "checkout*"` in one job. See [Pick test cases](https://optics-framework.org/docs/reference/cli#pick-test-cases).
- **Start from a clean output folder.** CI checkouts usually are. On reused machines, delete `execution_output/` before the run.
- **Keep the artifacts.** Upload `execution_output/` when a run fails (see the web example). Its logs and screenshots usually explain the failure faster than the CI log.
- **Keep secrets out of the suite.** Pass model API keys such as `GEMINI_API_KEY`, `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` as CI secrets, in environment variables. Optics writes `****` in place of a secret in the console, the logs and the JUnit report. See [Hide sensitive values](https://optics-framework.org/docs/advanced/variables#hide-sensitive-values).
- **Wait for screens to load.** Runners are often slower than your laptop. Put `Assert Presence` before actions that follow a screen change, rather than adding `Sleep` steps.

## See also

- [Readiness checklist](https://optics-framework.org/docs/run/checklist)
- [Read the results](https://optics-framework.org/docs/run/results)
- [Android](https://optics-framework.org/docs/platforms/android) and [Web](https://optics-framework.org/docs/platforms/web) setup
- [Run desktop tests in CI](https://optics-framework.org/docs/platforms/desktop#run-in-ci) on Linux and Windows runners
