# Self-heal broken locators with a 2B model on your own GPU

> I taught Qwen3.5-2B the Optics Framework self-heal job with a weight edit and with a LoRA. On a Pixel 4a with Optics Framework 1.11.3, the LoRA model healed 113 of 114 broken locators.

9 Nov 2026, Chinmay Jha. Canonical URL: https://optics-framework.org/blog/small-model-self-heal

When a step cannot find its element, Optics Framework can ask an AI model to find it. This is AI self-heal. Optics Framework sends the failed locator, the rows of the screen and a screenshot to the model. The model selects the correct row. The model can run on any OpenAI-compatible server. You can use a small open model on your own GPU.

I used Qwen3.5-2B, a model with 2 billion parameters. I tried two ways to teach it this job. The first way was a direct edit of the weights, with no gradients. The second way was a small LoRA. Then I connected the LoRA model to Optics Framework 1.11.3 and ran a suite on a Pixel 4a.

## The job of the model

This is part of a self-heal request from the phone run. I broke the locator of the Start button in the Google Clock app:

```text
TARGET ELEMENT (not found by normal locators): //*[@resource-id="com.google.android.deskclock:id/primary_action"]
TARGET ELEMENT NAME (from the test suite): start_button
CURRENT SCREEN:
e3 android.widget.TextView "00:00.00" #com.google.android.deskclock:id/stopwatch_time_text
e4 android.widget.Button "Start" [tap] #com.google.android.deskclock:id/start_stop_button
e5 android.widget.FrameLayout "Alarms" [tap] #com.google.android.deskclock:id/tab_menu_alarm
```

The model replied:

```json
{"reason": "The target is the 'Start' button. Row e4 matches the target name 'Start' and has the #id 'start_stop_button'.",
 "action": "keyword", "keyword": "press_element", "target": "e4", "params": [], "completed": true}
```

The locator `primary_action` has no word in common with "Start". The element name from the suite, `start_button`, gives the model the link. Optics Framework sends this name with each self-heal request. Optics Framework also adds 3 hint rows. These are the rows that have the most words in common with the locator.

I measured two types of broken locators. A text locator repeats the text of the button, for example `id/see_1_tab` for "See 1 tab". A purpose locator gives only the purpose of the button, for example `id/skip_notification_button` for "Not now". The locator `primary_action` above is a purpose locator. The model makes more errors on purpose locators.

## Two ways to teach the skill

My first method came from [weight-space programming](https://x.com/TensorSlay/status/2119416808273019037) (WSP). With WSP, an agent wrote facts into Qwen 0.8B in closed form. It changed 5 of 488 tensors and used no gradients. A fact is one link, for example "the capital of Japan" to "Tokyo". I wanted to know if the same method can add a skill.

My best edit used the difference between two runs of the model, with a hint and without the hint. The hint tells the model to select the row whose text matches the target name. I added this difference as a rank-1 update to the attention output projection in 5 of 24 layers. Each matrix changed by 0.6% to 1.7%.

The second method was a LoRA. The LoRA adds 0.7% more weights to the model. I trained it for 1 epoch on 2,628 examples.

![Bar chart: the weight edit adds 1.6 points. The LoRA adds 3.1 points on text locators and 7.0 points on purpose locators](https://optics-framework.org/media/blog/small-model-self-heal-results.webp)

*Each score comes from recorded screens of 96 Android and iOS apps, with 4-fold cross-validation by app. In each fold, the model did not train on the apps that I scored.*

| Setup | Text locators | Purpose locators |
|---|---|---|
| Qwen3.5-2B with the Optics Framework self-heal prompt | 95.5% | 77.9% |
| The same, with the LoRA | **98.6%** | **84.9%** |

The weight edit added 1.6 points on text locators, from 86.3% to 87.9%. This prompt had no hint rows. On a separate set of 377 steps, the edit got 58% of the gain of the hint. A stronger edit broke correct answers at the same rate as it repaired incorrect answers.

The LoRA added 3.1 points on text locators and 7.0 points on purpose locators. It got these scores on apps that it did not see when I trained it. I used only one model and one task.

## On a phone

I served the LoRA model with vLLM and connected Optics Framework 1.11.3 to it. The suite operates Google Clock on a Pixel 4a. It has 2 test cases, with an assert after each press. I broke the locators in 7 ways and ran each break set 2 times. With `strict_element_match: true`, Optics Framework does not use its fuzzy match. Each broken locator goes to the model.

![Three screenshots: the stopwatch screen when the locator fails, the press on the Start button, and the stopwatch in operation at the next assert](https://optics-framework.org/media/blog/small-model-self-heal-pilot.webp)

*A heal from the purpose set. The broken locator is `id/primary_action`. The model selected Start, and the next assert passed.*

| Break sets | Correct heals | Test cases passed |
|---|---|---|
| Wrong ID (4 sets: old ID, camelCase, package, class) | 64 of 64 | 16 of 16 |
| Wrong words (3 sets: new label, purpose, purpose with correct tabs) | 49 of 50 | 11 of 12 |

The model healed 109 of the 114 locators in 1 step and 5 in 2 steps. 1 of the 2-step heals was incorrect. The log of the purpose set shows each heal and the reason of the model:

```text
AI self-heal: attempting recovery for 'press_element' on '//*[@content-desc="Chronometer"]'
AI self-heal step 1/5 for 'press_element': ... reason=The target is 'stopwatch_tab'. Row e13 "Stopwatch" matches the target name exactly.
AI self-heal: attempting recovery for 'press_element' on '//*[@resource-id="com.google.android.deskclock:id/halt"]'
AI self-heal step 1/5 for 'press_element': ... reason=The target is 'stop_button'. Row e10 "Stop" matches the target name exactly.
```

## Use the model with Optics Framework

The adapter (60 MB) and the scripts are in the [qwen-self-heal repository](https://github.com/chinmayajha/qwen-self-heal). You need a GPU with 16 GB of memory or more for the server.

1. Download `Qwen/Qwen3.5-2B` from Hugging Face.
2. Download the adapter from the release of the repository.
3. Merge the adapter into the base model with `scripts/merge_adapter.py`.
4. Start the server with `vllm serve`. Use the flags in the repository README.
5. Add the server to `config.yaml`:

`config.yaml`:

```yaml
ai_self_heal: true
llm_models:
  - openai:
      enabled: true
      url: http://<gpu-host>:8000/v1
      capabilities:
        model: qwen-heal
        response_format: json_object
        temperature: 0.0
        max_tokens: 400
```

6. Run your suite with `optics execute`.

The value of `model` must be the same as `--served-model-name` in the server command. vLLM asks for a key only when you start it with `--api-key`. For a server with a key, add `api_key: ${QWEN_API_KEY}` under `capabilities`. Optics Framework reads the variable when it loads the file. The logs show `****` in place of the key.

## Tips

- Use the settings from the measurements: a screenshot of 1 megapixel maximum, `enable_thinking: false`, temperature 0 and `json_object`. The vLLM flags in the README set the first two.
- Give your elements descriptive names in the suite. The model uses the name when the locator has no word in common with the screen.
- Keep an assert after each press. The assert confirms each heal on the next screen.
- After a run, read the self-heal lines in the log.
- Update the locators that healed.

The full results, the edit methods that did not work and the phone report are on the [results page](https://chinmayajha.github.io/qwen-self-heal/). For the self-heal settings, read [Recover failing steps with AI self-heal](https://optics-framework.org/docs/elements/self-heal).

- Source: [github.com/mozarkai/optics-framework](https://github.com/mozarkai/optics-framework)
- Model and scripts: [github.com/chinmayajha/qwen-self-heal](https://github.com/chinmayajha/qwen-self-heal)
