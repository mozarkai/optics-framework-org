# Describe a test in plain English

> Tell Optics what to do in a sentence, let an AI model drive the app, and keep the steps it took.

In plain-English mode, you type a goal like *add trail runners to the cart*. An AI model looks at the screen, picks one keyword at a time, and runs it on the real device until the goal is done. The steps it took are recorded like any other `optics live` steps, and `/save` writes them into your suite.

It works with Gemini, Claude, OpenAI, or a model you run yourself. It's the fastest way to draft a long flow, and the result is ordinary keywords you can read and edit.

## Before you begin

You need:

- A project that works in [`optics live`](https://optics-framework.org/docs/create/record).
- An API key for an AI model, or a local model server such as Ollama.

### Install the AI engine

Pick the engine that matches the account you already have:

| You have | Install | Enable in config.yaml |
|---|---|---|
| A Gemini API key, or Google Cloud Vertex AI | `gemini` | `gemini` |
| An OpenAI API key | `openai` | `openai` |
| An OpenRouter key, for any model it hosts | `openai` | `openai`, with OpenRouter's `url` |
| A local model in Ollama, vLLM or LM Studio | `openai` | `openai`, with the server's `url` |
| A Claude API key, or Claude on Amazon Bedrock or Vertex AI | `anthropic` | `anthropic` |

Install it by the name in the Install column, for example:

```shell
$ optics setup --install gemini
```

### Turn it on in config.yaml

Add an `llm_models` section to your project's `config.yaml`:

**Gemini**

`config.yaml`:

```yaml
llm_models:
  - gemini:
      enabled: true
```
**OpenAI**

`config.yaml`:

```yaml
llm_models:
  - openai:
      enabled: true
      capabilities:
        model: gpt-5-mini
```
**OpenRouter**

`config.yaml`:

```yaml
llm_models:
  - openai:
      enabled: true
      url: https://openrouter.ai/api/v1
      capabilities:
        model: anthropic/claude-sonnet-5-5
        api_key_env: OPENROUTER_API_KEY
```
**Ollama**

`config.yaml`:

```yaml
llm_models:
  - openai:
      enabled: true
      url: http://localhost:11434/v1
      capabilities:
        model: qwen2.5vl
```
**Claude**

`config.yaml`:

```yaml
llm_models:
  - anthropic:
      enabled: true
      capabilities:
        model: claude-sonnet-5-5
```

Gemini uses `gemini-2.5-flash` unless you set a `model`; the other engines need one. Optics sends the model screenshots, so pick one that accepts images. Every setting is listed under [llm_models](https://optics-framework.org/docs/reference/config#llm-models).

### Give Optics your key

Set the key as an environment variable in the terminal you'll run `optics live` from:

**macOS and Linux**

```shell
$ export GEMINI_API_KEY="your-key"
```
**Windows**

```powershell
PS> $env:GEMINI_API_KEY = "your-key"
```

Use the variable for your engine: `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or the one you named in `api_key_env`. A local server such as Ollama needs no key.

**Warning:**
Don't put API keys in `config.yaml`. The file is meant to be committed with your tests, and a key in it would be shared with everyone who can read the repository.

For Vertex AI or Amazon Bedrock, see [llm_models](https://optics-framework.org/docs/reference/config#llm-models) for the settings and credentials each one needs.

## Describe a flow

Start `optics live`, then press Ctrl+N. The prompt changes from `›` to `ai ›`. Type what you want in plain English:

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

Press Ctrl+X to stop a run, or Ctrl+N again to go back to typing keywords. You can mix both modes in one session.

## Keep the steps

When the goal is reached, Optics asks the model to drop dead ends and detours, so the recording keeps only the steps that mattered. If it pruned anything, the summary says so, for example `(kept 4 of 6 steps)`.

Save the steps the same way as a manual recording:

```terminal
ai › /save Checkout Add_To_Cart
```

Only runs that finish successfully are recorded. If the model gives up, hits its step limit, or you stop it, nothing from that run is saved.

### Review what you saved

Open `modules/modules.csv` and read the new rows before you commit them. The model names elements by their visible text, such as `"Add to cart"`. For steps that matter, replace the text with a named element from `elements.csv` and add a fallback, as described in [Define elements](https://optics-framework.org/docs/elements/define).

## Write goals the model can finish

- **Describe one outcome per instruction.** *Sign in as ava@birch.shop* works better than a whole checkout in one sentence. Run several instructions in a row instead.
- **Use the words on screen.** *Tap Add to cart* is clearer than *buy it*.
- **Give values explicitly.** *Search for "trail runner"*, not *search for shoes*.

Each run stops after 15 steps, after 3 failed steps in a row, or when the model repeats gestures without getting closer. Break long flows into smaller goals.

## Limits

- Each step is a call to the model, so a run costs API usage and takes several seconds per step.
- Screenshots go to your model provider while the mode is on, unless the model runs on your own machine. Don't use a hosted model on screens that show data you can't send to a third party.

## See also

- [Record a test](https://optics-framework.org/docs/create/record)
- [AI self-heal](https://optics-framework.org/docs/elements/self-heal), which uses the same model to recover a failing step during a run
- [Let your AI agent build tests](https://optics-framework.org/docs/create/agent)
