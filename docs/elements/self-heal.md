# Recover failing steps with AI self-heal

> Let an AI model look at the screen and finish a step when every way of finding its element has failed.

AI self-heal is the last line of defence. When a step cannot find its element with any value or any method, Optics sends a screenshot to an AI model. The model then tries to complete the step. If the button now says *Log in* instead of *Sign in*, the model can find it and press it, and the test continues. Self-heal is off by default.

## When to use it

Self-heal keeps long runs alive through small, expected changes to the UI. Examples are a scheduled check of a production app, or a nightly regression. There, a full report is better than a stop at the first renamed button.

Self-heal does not replace good elements. A healed step **passes**, so you must read the logs to see a real change in the app. Fix the element after the run, as [Find out what healed](#find-out-what-healed) shows.

## Turn it on

### Install the AI engine and set your key

Self-heal uses the same AI engine and key as [plain-English mode](https://optics-framework.org/docs/create/describe#before-you-begin). Install the engine and set its key, for example:

```shell
$ optics setup --install gemini
$ export GEMINI_API_KEY="your-key"
```

### Enable it in config.yaml

`config.yaml`:

```yaml
ai_self_heal: true

llm_models:
  - gemini:
      enabled: true
```

For OpenAI, Claude or your own model server, use the entry of that engine. See [Choose a model](#choose-a-model).

### Enable a screenshot source

The model works from a screenshot, so `elements_sources` must include a screenshot source, such as `appium_screenshot` or `playwright_screenshot`. Without one, self-heal does nothing.

If the AI engine is not installed or the key is missing, Optics logs a warning and runs without self-heal. A run never fails because self-heal is not available.

## Choose a model

Self-heal works with each engine under [llm_models](https://optics-framework.org/docs/reference/config#llm-models). Use a model that accepts images.

| Model | Engine | Key |
|---|---|---|
| Gemini | `gemini` | `GEMINI_API_KEY` |
| OpenAI, or a hosted service such as OpenRouter | `openai` | `OPENAI_API_KEY`, or `api_key` |
| Claude | `anthropic` | `ANTHROPIC_API_KEY` |
| Your own server with an OpenAI-compatible API, such as vLLM, Ollama or LM Studio | `openai`, with the server in `url` | Only if the server asks for one |

### Use your own model server

The `openai` engine can call any server with an OpenAI-compatible Chat Completions API. For example, a vLLM server can serve a small vision model on a machine in your network:

```shell
$ vllm serve Qwen/Qwen2.5-VL-3B-Instruct --port 8000
```

Set the server address in `url` and the model name in `model`:

`config.yaml`:

```yaml
ai_self_heal: true

llm_models:
  - openai:
      enabled: true
      url: http://gpu-box:8000/v1
      capabilities:
        model: Qwen/Qwen2.5-VL-3B-Instruct
```

If you start the server with an API key, give the key to Optics as `api_key: ${VLLM_API_KEY}` under `capabilities`. If the server rejects JSON-schema output, set `response_format: json_object`.

For a 2B model trained for self-heal, with measured results, read [Self-heal broken locators with a 2B model on your own GPU](https://optics-framework.org/blog/small-model-self-heal).

### Give the API key in config.yaml

Each engine reads its API key from `capabilities.api_key` first, then from its environment variable. Write the key as a reference, so that the file stays safe to commit:

`config.yaml`:

```yaml
llm_models:
  - openai:
      enabled: true
      url: https://openrouter.ai/api/v1
      capabilities:
        model: google/gemini-2.5-flash
        api_key: ${OPENROUTER_API_KEY}
```

Optics reads the variable when it loads the file. If the variable is not set, the run stops before it starts. Logs and reports show `****` in place of the key. The `openai` and `anthropic` engines also take `api_key_env`, the name of the variable to read.

## What it does

When a step that finds an element fails, Optics gives the model:

- The step that failed and the locator of its element.
- The name of the element in your suite, when the step uses `${name}`. For `Press Element,${stopwatch_tab}`, the model gets `stopwatch_tab`.
- A screenshot and a list of the elements on the screen, each with a reference such as `e7` that the model can name. Optics sends the UI tree only when that list is empty or does not show all the elements.
- Up to three rows of that list that are the closest match to the target, best first. See [How Optics points the model to the target](#how-optics-points-the-model-to-the-target).
- The steps that ran before the failure.

Optics tells the model to choose the row whose text or id matches the target. It also tells the model not to choose a row only because it is the main button on the screen.

The model can do up to five actions to complete the step. It can use only six keywords: Press Element, Enter Text, Scroll, Swipe By Percentage, Press Keycode and Press By Percentage. Optics finds the element of each action with its usual methods. If the step is complete within five actions, the step passes. If not, the step fails with the original error.

Self-heal covers the steps that find an element and do an action on it: Press Element, Enter Text, Enter Number, Clear Element Text, Get Text, Swipe From Element, Scroll From Element, and the keywords that use them (Detect And Press, Select Dropdown Option). Checks such as Assert Presence do not self-heal, so a missing element still fails a check.

### How Optics points the model to the target

Optics compares the target with each row on the screen and lists the closest rows in the prompt. It takes the words from the part of the locator that names the target:

- The resource id, if the locator has one. `//*[@resource-id='com.app:id/search_button']` gives `search` and `button`.
- Else the quoted values. Optics ignores XPath syntax such as `android.widget`.
- Else the full text of the locator.

Optics then makes more words from them:

- It divides words at each change of case and at each change between letters and digits. `loginButton` gives `login` and `button`. `timerPreset1` gives `timer`, `preset` and `1`.
- It joins each pair of adjacent words. "Stop watch" also gives `stopwatch`, so it matches a row that says "Stopwatch".
- It adds the words of the element name from your suite.

A row with the exact resource id comes first. The other rows are in order of the number of shared words. If two rows share the same number, a row that takes an action, such as a tap, comes before read-only text. Then the row with fewer other words comes first.

**Tip:**
Give your elements clear names in the elements file, such as `stopwatch_tab` or `timer_preset_1`. Optics sends the name to the model and uses its words to find the closest rows. A clear name helps a small model to find the correct row.

### When a heal ends

A heal of Press Element ends when the model presses the row that the locator names. The step passes, also when the model plans more actions. Optics compares the label and the id of the row with the value in the locator. It ignores case, separators, the words `tab`, `button`, `btn` and `icon`, and a plural "s". Thus `timerPreset1` matches `timer_preset_1`, and `tab_alarm` matches "Alarms".

A press on a different row can lead to the target, such as a press on a menu or a tab. Then the model tells Optics if the step is complete. The same applies to a locator with more than one quoted value, such as an XPath with two conditions.

## Find out what healed

With `optics execute` and `optics live`, a healed step shows as passed. To see what happened, turn on file logs:

`config.yaml`:

```yaml
file_log: true
```

Then search `execution_output/internal_logs.log` for `AI self-heal`:

```text
AI self-heal: attempting recovery for 'press_element' on 'Sign in'
AI self-heal step 1/5 for 'press_element': action=keyword keyword=press_element params=['Log in'] reason=The button now reads 'Log in'
AI self-heal: recovered 'press_element' via keyword 'press_element'
```

Update the element with the value that the model used. In this example, add `sign_in,Log in` to `elements.csv`.

Over the [HTTP API](https://optics-framework.org/docs/advanced/http-api) and [MCP](https://optics-framework.org/docs/create/agent), the result of a healed step shows `"healed": true` and the steps that worked.

## Costs and limits

- Each healed step makes up to six calls to the model. Each call takes some seconds and uses your API quota.
- Self-heal sends screenshots to your model provider, unless the model runs on your own server. Use your own server for screens with data that you cannot share with a third party.
- The model never sees the text of a failed Enter Text step. It sees `<value>` and selects the field, and then Optics types the real text.
- The instructions to the model are for phones. Self-heal works in browsers too, but key presses use Android key codes.

## See also

- [How Optics finds elements](https://optics-framework.org/docs/elements/)
- [Describe a test in plain English](https://optics-framework.org/docs/create/describe)
- [config.yaml reference](https://optics-framework.org/docs/reference/config)
