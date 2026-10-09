---
title: Recover failing steps with AI self-heal
nav: AI self-heal
summary: Let an AI model look at the screen and finish a step when every way of finding its element has failed.
level: Advanced
time: 6 min
---

AI self-heal is a last line of defence. When a step can't find its element by any value or any method, Optics sends a screenshot to an AI model and asks it to complete the step. If the button now says *Log in* instead of *Sign in*, the model can spot that and press it, and the test carries on. It's off by default.

::scene{name="selfheal" caption="Every value fails after a redesign. Self-heal reads the screen, finds the renamed button, and the step passes. The log records what it did."}

## When to use it

Self-heal keeps long runs going through small, expected UI changes, such as monitoring a production app on a schedule, or a nightly regression where you'd rather get a full report than stop at the first renamed button.

It isn't a substitute for good elements. A healed step **passes**, so a real change in the app can go unnoticed unless you read the logs. Fix the element afterwards, as described in [Find out what healed](#find-out-what-healed).

## Turn it on

:::steps
### Install the AI engine and set your key

Self-heal uses Google's Gemini models, the same as [plain-English mode](/docs/create/describe):

```shell
$ optics setup --install llm
$ export GEMINI_API_KEY="your-key"
```

### Enable it in config.yaml

```yaml title="config.yaml"
ai_self_heal: true

llm_models:
  - gemini:
      enabled: true
```

### Enable a screenshot source

The model works from a screenshot, so `elements_sources` must include one, such as `appium_screenshot` or `playwright_screenshot`. Without it, self-heal does nothing.
:::

If the AI engine isn't installed or the key is missing, Optics logs a warning and runs without self-heal. It never fails a run because self-heal is unavailable.

## What it does

When a step that finds an element fails, Optics gives the model:

- the step that failed and the element it was looking for,
- a screenshot of the screen, and the UI tree if there is one,
- the steps that ran just before.

The model can take up to five actions to finish the step, using only six keywords: Press Element, Enter Text, Scroll, Swipe By Percentage, Press Keycode and Press By Percentage. Each action goes through Optics' normal ways of finding elements. If the step is done within five actions, it passes. If not, it fails with the original error.

Self-heal covers steps that find an element and act on it: Press Element, Enter Text, Enter Number, Clear Element Text, Get Text, Swipe From Element, Scroll From Element, and the keywords built on them (Detect And Press, Select Dropdown Option). Checks such as Assert Presence don't self-heal, so a missing element still fails a check.

## Find out what healed

With `optics execute` and `optics live`, a healed step shows as passed. To see what happened, turn on file logs:

```yaml title="config.yaml"
file_log: true
```

Then search `execution_output/internal_logs.log` for `AI self-heal`:

```text
AI self-heal: attempting recovery for 'press_element' on 'Sign in'
AI self-heal step 1/5 for 'press_element': action=keyword keyword=press_element params=['Log in'] reason=The button now reads 'Log in'
AI self-heal: recovered 'press_element' via keyword 'press_element'
```

Update the element with what the model used, here by adding `sign_in,Log in` to `elements.csv`.

Over the [HTTP API](/docs/advanced/http-api) and [MCP](/docs/create/agent), a healed step's result says so directly, with `"healed": true` and the steps that worked.

## Costs and limits

- Each healed step makes up to six calls to the model, and each call takes a few seconds and costs API usage.
- Screenshots are sent to Google while self-heal runs. Don't enable it on screens with data you can't share with a third party.
- Gemini is the only supported provider.
- The model's instructions are tuned for phones. It works in browsers, but key presses use Android key codes.

## See also

- [How Optics finds elements](/docs/elements/)
- [Describe a test in plain English](/docs/create/describe)
- [config.yaml reference](/docs/reference/config)
