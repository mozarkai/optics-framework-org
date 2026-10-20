---
title: Run tests in CI
summary: Run the same suite on every pull request and read the results in your CI system.
level: Intermediate
time: 15 min
---

A suite earns its keep when it runs on every change. In CI, Optics needs the same three things as on your machine: Optics itself, the engines in your `config.yaml`, and something to drive. It reports through its exit code and a JUnit file, which every major CI system understands.

::scene{name="ci" caption="Every push installs Optics, runs the suite, and publishes the JUnit report as a check on the pull request."}

## Run a web suite

Web suites are the easiest to run in CI, because the browser runs on the CI machine itself.

:::tabs{group="ci"}
::tab[GitHub Actions]
```yaml title=".github/workflows/optics.yml"
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
          pip install "optics-framework[playwright]==1.10.5"
          python -m playwright install --with-deps chromium

      - name: Run the suite
        run: xvfb-run -a optics execute birch-tests --no-use-printer

      - name: Publish results
        if: always()
        uses: mikepenz/action-junit-report@v6
        with:
          report_paths: birch-tests/execution_output/junit_output.xml

      # Screenshot file names contain colons, which upload-artifact rejects,
      # so the output folder is uploaded as one archive.
      - name: Keep the run output
        if: failure()
        run: tar -czf optics-output.tgz birch-tests/execution_output

      - if: failure()
        uses: actions/upload-artifact@v7
        with:
          name: optics-output
          path: optics-output.tgz
```
::tab[GitLab CI]
```yaml title=".gitlab-ci.yml"
optics-web:
  image: python:3.12-bookworm
  script:
    - apt-get update && apt-get install -y xvfb
    - pip install "optics-framework[playwright]==1.10.5"
    - python -m playwright install --with-deps chromium
    - xvfb-run -a optics execute birch-tests --no-use-printer
  artifacts:
    when: always
    paths:
      - birch-tests/execution_output/
    reports:
      junit: birch-tests/execution_output/junit_output.xml
```
:::

`xvfb-run` gives the browser a virtual screen. Optics 1.10.5 always opens a visible browser window, even with `headless: true` in `config.yaml`, and CI machines have no display. Once the fix in [pull request #600](https://github.com/mozarkai/optics-framework/pull/600) is released, `headless: true` works and you can drop `xvfb-run`.

The `permissions` block lets the report step post its check. Without it, the step logs `Resource not accessible by integration` and no check appears. Pull requests from forks always get a read-only token, so on those the results are in the job log only.

## Run an Android suite

Android suites need an emulator and an Appium server on the CI machine. Linux runners with hardware acceleration, such as GitHub's `ubuntu-latest`, can run the Android emulator.

```yaml title=".github/workflows/optics-android.yml"
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
          pip install "optics-framework[appium]==1.10.5"
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

`optics execute` exits with `1` when any test case fails, so the run step fails the job by itself.

There's one case the exit code misses: [error screens](/docs/run/error-detection) found at the end of a run. They're added to the JUnit report as a failing test case but don't change the exit code. To fail the build on them, have your JUnit reporter fail on any failure. For example, with `mikepenz/action-junit-report`, add `fail_on_failure: true`.

## Make CI runs reliable

- **Pin the Optics version** (`optics-framework==1.10.5`), so a new release doesn't change behavior in the middle of a sprint. Upgrade on purpose, in its own pull request.
- **Run `optics dry_run` first** in a fast job. It catches typos in seconds, before you pay for an emulator.
- **Start from a clean output folder.** CI checkouts usually are. On reused machines, delete `execution_output/` before the run.
- **Keep the artifacts.** Upload `execution_output/` when a run fails, as an archive (see the web example). Its logs and screenshots usually explain the failure faster than the CI log.
- **Keep secrets out of the suite.** Pass model API keys such as `GEMINI_API_KEY`, `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` as CI secrets, in environment variables.
- **Wait for screens to load.** Runners are often slower than your laptop. Put `Assert Presence` before actions that follow a screen change, rather than adding `Sleep` steps.

## See also

- [Readiness checklist](/docs/run/checklist)
- [Read the results](/docs/run/results)
- [Android](/docs/platforms/android) and [Web](/docs/platforms/web) setup
