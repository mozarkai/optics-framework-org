---
title: Choose how to create tests
nav: Overview
summary: Learn which way of creating tests fits your team. Every way produces the same files.
---

Optics gives you several ways to turn a user flow into a test. They all end in the same plain-text suite: CSV or YAML files that live in your repository and run with `optics execute`. You can mix them in one project, so a test someone recorded can sit next to one an AI agent wrote.

::scene{name="fourways" caption="Each way of creating a test writes the same suite, which runs the same way on every build."}

## Choose your approach

:::cards{cols="2"}
- [Write it](/docs/create/write): List the steps in a spreadsheet or text editor. Anyone can read and review them. {No code}
- [Record it](/docs/create/record): Run steps one at a time against the live app in `optics live`. What works is saved. {No code}
- [Describe it](/docs/create/describe): Type what you want in plain English. An AI model drives the app and keeps the steps. {AI}
- [Delegate it](/docs/create/agent): Connect your AI agent with `optics mcp`. It explores the app and writes the suite. {AI}
- [Code it in Python](/docs/create/python): Call keywords from pytest or any Python script. {Code}
- [Code it in Robot Framework](/docs/create/robot): Use Optics keywords in `.robot` files. {Code}
:::

### Which one should I use?

We recommend **recording** for most people starting out. You see each step work on the real app before it's saved, and you end up with readable CSV files you can edit by hand later. Teams then usually **write** small changes directly in the files.

Choose **describe** or **delegate** when you have a Gemini API key or an AI agent, and want a first draft of a long flow quickly. Review what the AI saved, the same way you'd review a colleague's change.

Choose **Python or Robot Framework** only if your tests need logic that the files can't express, or your team already runs everything through pytest or Robot. Code-based tests lose the main benefit of Optics files: that anyone on the team can read them.

| | Write | Record | Describe | Delegate | Python / Robot |
|---|---|---|---|---|---|
| **Best for** | Small edits, reviews | Building a flow on the real app | Long flows, quick drafts | Agent-driven teams | Custom logic |
| **You need** | An editor | A running app | A Gemini API key | An MCP client | Python skills |
| **Output** | CSV or YAML | CSV | CSV | CSV | Python or `.robot` |
| **Runs with** | `optics execute` | `optics execute` | `optics execute` | `optics execute` | pytest or `robot` |
| **Effort** | No code | No code | No code | No code | Code |

## Every way ends in plain text

Tests are files in your repository, not records in someone else's cloud. That has two practical benefits:

- **Changing a test is a pull request.** When a redesign moves the sign-in button, the diff shows the one element that changed.
- **CI runs exactly what was merged.** There's no separate test-management system to keep in sync.

```diff title="test_data/elements.csv"
 Element_Name,Element_ID
 email_field,//*[@resource-id='email']
-sign_in,//*[@text='Sign in']
+sign_in,//*[@resource-id='login']
+sign_in,Sign in
 search_bar,//*[@resource-id='search']
```

## See also

- [How Optics works](/docs/get-started/concepts)
- [Organise a suite](/docs/create/organise)
- [Project files reference](/docs/reference/files)
