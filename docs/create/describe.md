---
title: Describe a test in plain English
nav: Describe it
summary: Tell Optics what to do in a sentence, let an AI model drive the app, and keep the steps it took.
level: Intermediate
time: 10 min
---

In plain-English mode, you type a goal like *add trail runners to the cart*. An AI model looks at the screen, picks one keyword at a time, and runs it on the real device until the goal is done. The steps it took are recorded like any other `optics live` steps, and `/save` writes them into your suite.

::scene{name="describe" caption="Ctrl+N switches optics live to plain-English mode. The model works a step at a time, and every step it takes is a normal Optics keyword."}

This mode uses Google's Gemini models. It's the fastest way to draft a long flow, and the result is ordinary keywords you can read and edit.

## Before you begin

You need:

- A project that works in [`optics live`](/docs/create/record).
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey), or a Google Cloud project with Vertex AI.

:::steps
### Install the AI engine

```shell
$ optics setup --install llm
```

### Turn it on in config.yaml

Add an `llm_models` section to your project's `config.yaml`:

```yaml title="config.yaml"
llm_models:
  - gemini:
      enabled: true
      capabilities:
        model: gemini-2.5-flash
```

`model` is optional; `gemini-2.5-flash` is the default.

### Give Optics your key

Set the key as an environment variable in the terminal you'll run `optics live` from:

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

:::warning
Don't put API keys in `config.yaml`. The file is meant to be committed with your tests, and a key in it would be shared with everyone who can read the repository.
:::

To use Vertex AI instead, set `GOOGLE_GENAI_USE_VERTEXAI=true`, `GOOGLE_CLOUD_PROJECT` and `GOOGLE_CLOUD_LOCATION`, and sign in with your usual Google Cloud credentials.
:::

## Describe a flow

Start `optics live`, then press [[Ctrl]]+[[N]]. The prompt changes from `›` to `ai ›`. Type what you want in plain English:

```terminal
ai › add trail runners to the cart
  ⋯ [ai] add trail runners to the cart
     thinking: open search and look for the shoes
    ✓ press_element "Search Birch"
       0.42s  [Text]
    ✓ enter_text "Search Birch" "trail runner"
       0.51s  [Text]
     thinking: Trail Runner 2 is the first result
    ✓ press_element "Trail Runner 2"
       0.88s  [OCR]
    ✓ press_element "Add to cart"
       0.37s  [Text]
  ✓ [ai] add trail runners to the cart
     done · 4 step(s) · 9.4s · recorded 4 (/save to keep)
```

Each turn, the model sees a screenshot, the list of elements on screen, your project's element names and the steps so far. Its reasoning appears as `thinking:` lines. Every action is a normal keyword, so it uses the same ways of finding elements as a test you wrote yourself.

Press [[Ctrl]]+[[X]] to stop a run, or [[Ctrl]]+[[N]] again to go back to typing keywords. You can mix both modes in one session.

## Keep the steps

When the goal is reached, Optics asks the model to drop dead ends and detours, so the recording keeps only the steps that mattered. If it pruned anything, the summary says so, for example `(kept 4 of 6 steps)`.

Save the steps the same way as a manual recording:

```terminal
ai › /save Checkout Add_To_Cart
```

Only runs that finish successfully are recorded. If the model gives up, hits its step limit, or you stop it, nothing from that run is saved.

### Review what you saved

Open `modules/modules.csv` and read the new rows before you commit them. The model names elements by their visible text, such as `"Add to cart"`. For steps that matter, replace the text with a named element from `elements.csv` and add a fallback, as described in [Define elements](/docs/elements/define).

## Write goals the model can finish

- **Describe one outcome per instruction.** *Sign in as ava@birch.shop* works better than a whole checkout in one sentence. Run several instructions in a row instead.
- **Use the words on screen.** *Tap Add to cart* is clearer than *buy it*.
- **Give values explicitly.** *Search for "trail runner"*, not *search for shoes*.

Each run stops after 15 steps, after 3 failed steps in a row, or when the model repeats gestures without getting closer. Break long flows into smaller goals.

## Limits

- Gemini is the only supported model provider.
- Each step is a call to the model, so a run costs API usage and takes several seconds per step.
- Screenshots go to Google's API while the mode is on. Don't use it on screens that show data you can't send to a third party.

## See also

- [Record a test](/docs/create/record)
- [AI self-heal](/docs/elements/self-heal), which uses the same model to recover a failing step during a run
- [Let your AI agent build tests](/docs/create/agent)
