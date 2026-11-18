---
title: Describe a test in plain English
nav: Describe it
summary: Tell Optics what to do in a sentence, let an AI model drive the app, and keep the steps it took.
level: Intermediate
time: 10 min
---

In plain-English mode, you type a goal like *add trail runners to the cart*. An AI model looks at the screen, picks one keyword at a time, and runs it on the real device until the goal is done. The steps it took are recorded like any other `optics live` steps, and `/save` writes them into your suite.

::scene{name="describe" caption="Ctrl+N switches optics live to plain-English mode. The model works a step at a time, and every step it takes is a normal Optics keyword."}

It works with Gemini, Claude, OpenAI, or a model you run yourself. It's the fastest way to draft a long flow, and the result is ordinary keywords you can read and edit.

## Before you begin

You need:

- A project that works in [`optics live`](/docs/create/record).
- An API key for an AI model, or a local model server such as Ollama.

:::steps
### Install the AI engine

Pick the engine for the account you have:

| You have | Install |
|---|---|
| A Gemini API key, or Google Cloud Vertex AI | `gemini` |
| An OpenAI or OpenRouter key, Azure OpenAI, or a local model in Ollama, vLLM or LM Studio | `openai` |
| A Claude API key, or Claude on Amazon Bedrock or Vertex AI | `anthropic` |

Install that name, for example:

```shell
$ optics setup --install gemini
```

### Turn it on in config.yaml

Add an `llm_models` section to your project's `config.yaml`, using the same name:

```yaml title="config.yaml"
llm_models:
  - gemini:
      enabled: true
```

For a server such as OpenRouter or Ollama, add its `url`. Gemini uses `gemini-2.5-flash` unless you set a `model`. The other engines need one. Pick a model that accepts images, or set `vision: never` in [Agent settings](#agent-settings). See [llm_models](/docs/reference/config#llm-models) for every setting.

### Give Optics your key

Set the engine's key in the terminal you run `optics live` from:

:::tabs{group="os"}
::tab[macOS and Linux]
```shell
$ export GEMINI_API_KEY="your-key"
```
::tab[Windows]
```powershell
PS> $env:GEMINI_API_KEY = "your-key"
```
:::

Use `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or the variable you named in `api_key_env`. A local server needs no key.

You can also give the key in `config.yaml`, under `capabilities.api_key`. Optics uses it before the environment variable.

:::tip
Write the key as a reference, such as `api_key: ${GEMINI_API_KEY}`. Optics reads the variable when it loads the file, so you can commit `config.yaml` with your tests and keep the key private.
:::
:::

## Describe a flow

Start `optics live`, then press [[Ctrl]]+[[N]]. The prompt changes from `›` to `ai ›`. Type what you want in plain English:

```terminal
ai › add trail runners to the cart
  ⋯ [ai] add trail runners to the cart
     thinking: open search and look for the shoes
    ✓ press_element '//*[@resource-id="com.birch.shop:id/search"]'
       0.42s  [XPath]
    ✓ enter_text '//*[@resource-id="com.birch.shop:id/search_input"]' 'trail runner'
       0.51s  [XPath]
     thinking: Trail Runner 2 is the first result
    ✓ press_element '//android.widget.TextView[@text="Trail Runner 2"]'
       0.88s  [XPath]
    ✓ press_element '//*[@resource-id="com.birch.shop:id/add_to_cart"]'
       0.37s  [XPath]
  ✓ [ai] add trail runners to the cart
     done · 4 step(s) · 9.4s · recorded 4 (/save to keep)
```

Each turn, the model sees the screen as rows, such as `e7 button "Search Birch" [tap] #search`. It also sees the last 8 steps, your project's element names and the keyword list. The model picks one action on a ref, such as `e7`, and names the text that the next screen must show. Optics runs the action with a locator that matches only that element. Then it reads the screen again and judges the step as pass, fail or unknown.

The model's thoughts appear as `thinking:` lines. Every action is a normal keyword, and the history shows the locator it used.

Press [[Ctrl]]+[[X]] to stop a run, or [[Ctrl]]+[[N]] again to go back to typing keywords. You can mix both modes in one session.

## Keep the steps

The model ends a run with `done` and the text that proves the goal. Optics accepts `done` only when that text is on the screen. If the model gives no text, the run ends as `PASS (unverified)`. Check the app yourself before you keep those steps.

When the run ends with `done`, Optics asks the model to remove dead ends and detours. Only the steps that mattered stay.

Save the steps the same way as a manual recording:

```terminal
ai › /save Checkout Add_To_Cart
```

Optics records only runs that end with `done` or `PASS (unverified)`. If the model gives up, reaches its step limit, or you stop it, Optics records nothing from that run.

### Review what you saved

The agent turns each element it acts on into a named element, such as `${add_to_cart_button}`. Its values are the element's locators, then its label as the last fallback. If a project element has the same first locator, the agent uses that element. `/save` writes the steps to `modules/modules.csv` and the new elements to your elements CSV. Read both before you commit them. See [Define elements](/docs/elements/define).

## Write goals the model can finish

- **Describe one outcome per instruction.** *Sign in as ava@birch.shop* works better than a whole checkout in one sentence. Run several instructions in a row instead.
- **Use the words on screen.** *Tap Add to cart* is clearer than *buy it*.
- **Give values explicitly.** *Search for "trail runner"*, not *search for shoes*.

A run stops when one of these occurs:

- It reaches `max_steps` steps (15 by default).
- 3 steps in a row fail.
- The model asks for a fourth blind action in a row, such as a scroll, a swipe, a key press or a coordinate tap.
- The screen does not change after 4 actions in a row.
- Optics rejects `done` two times, because the goal text is not on the screen.

Break long flows into smaller goals.

## Agent settings

Add an `nl_agent` section to `config.yaml` to change how the model works:

```yaml title="config.yaml"
nl_agent:
  vision: auto
  max_steps: 15
  escalation_model: ""
```

| Setting | Default | What it does |
|---|---|---|
| `vision` | `auto` | When the model gets a screenshot. `auto`: on the first turn, after a step that did not pass, when the screen has fewer than 3 controls or a control without a label, and when Optics cannot read the rows. `always`: every turn. `never`: no screenshots, so a text-only model works. |
| `max_steps` | `15` | The most steps in one run. The minimum is 1. |
| `escalation_model` | `""` | A second model of the same engine for hard turns: a retry after a bad reply, a turn after 2 failures in a row, and a turn after a warning. Empty uses one model for all turns. |

## Limits

- Each step is a call to the model, so a run costs API usage and takes several seconds per step.
- The screen rows, and some screenshots unless `vision` is `never`, go to your model provider. Run the model locally for screens that show data you cannot send to a third party.
- AI self-heal is off during a plain-English run, so every step the model takes shows in the history.

## See also

- [Record a test](/docs/create/record)
- [AI self-heal](/docs/elements/self-heal), which uses the same model to recover a failing step during a run
- [Let your AI agent build tests](/docs/create/agent)
