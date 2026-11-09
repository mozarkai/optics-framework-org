---
title: Readiness checklist
nav: Readiness checklist
summary: Use this checklist before you rely on a suite in CI or for production monitoring.
level: Intermediate
---

A suite that passes on your laptop can still be flaky, slow or hard to debug in CI. Work through these items before the team starts trusting its results. Your ticks are saved in this browser, so you can come back to the list.

## The suite

- [ ] **Every test case has a clear outcome in its name.** *Shopper can add a backpack* tells whoever reads a failure what broke. *Test 3* doesn't.
- [ ] **Every screen change is followed by a check.** On Appium and Selenium, action keywords do not wait. Put `Assert Presence` or `Validate Element` after any step that loads a new screen, instead of `Sleep`. See [Run a suite](/docs/run/#how-long-steps-wait).
- [ ] **Important elements have a fallback.** Give key buttons and fields a second value, usually their visible text, so one renamed id doesn't fail the run. See [Define elements](/docs/elements/define).
- [ ] **No test relies on another.** Each test case should be able to run on its own, with Suite Setup handling shared setup. Check with `optics execute <folder> --include "<test case>"`.
- [ ] **`optics dry_run` passes.** Run it before every commit, and as the first CI step.

## The configuration

- [ ] **The Optics version is pinned** in CI (`optics-framework==1.11.2`). Upgrade on purpose, in its own change.
- [ ] **Only the engines you use are enabled.** Every enabled OCR or image engine loads at the start of each run, even when no step needs it.
- [ ] **No secrets are in `config.yaml` or the suite files.** Keep API keys in environment variables, and refer to them as `api_key: ${GEMINI_API_KEY}`. Keep passwords in CI secrets.
- [ ] **The project folder holds one config file** and no stray copies of old suites. Optics reads every CSV and YAML in the folder.

## The run

- [ ] **Error screens are defined.** Add the crash, timeout and "something went wrong" messages your app can show to an [error definitions file](/docs/run/error-detection).
- [ ] **CI reads the exit code and the JUnit report.** An error screen gives exit code `1` and adds a failing test case to the report. See [Run tests in CI](/docs/run/ci#decide-pass-or-fail).
- [ ] **Screenshots are kept when a run fails.** Upload `execution_output/` as a CI artifact.
- [ ] **File logs are on for CI runs.** `file_log: true` gives you every locator attempt when a failure is hard to explain.
- [ ] **Someone owns the failures.** Decide who looks at a red run, and how fast. A suite people learn to ignore is worse than no suite.

## If you use AI features

- [ ] **Healed steps are reviewed.** With [AI self-heal](/docs/elements/self-heal) on, a healed step passes. Search the logs for `AI self-heal` after each run and update the elements.
- [ ] **Screens sent to the AI model are safe to share.** Plain-English mode and self-heal send screenshots to your LLM provider.
