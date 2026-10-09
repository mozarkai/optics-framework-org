---
title: Get help
nav: Overview
summary: Find the answer to a problem yourself, or report it so someone else can.
---

Most problems have a known fix. Start with the pages below, and ask on GitHub when they don't cover your case.

:::cards{cols="3"}
- [Troubleshooting](/docs/help/troubleshooting): Fixes for common install, setup and run problems, listed by the message you see.
- [FAQ](/docs/help/faq): Short answers about what Optics does, what it doesn't, and why.
- [Glossary](/docs/help/glossary): Every term the docs use, in one place.
:::

## Where to look first

Run `optics doctor` on your project before anything else. It checks Python, every engine, the Appium server, connected devices and your `config.yaml`, and prints the fix next to each problem:

```shell
$ optics doctor my-project
```

Always pass the project folder. Without it, doctor checks your machine but not your config. If doctor shows no ❌ rows and the problem remains:

1. **Search [Troubleshooting](/docs/help/troubleshooting) for the exact message.** Problems are listed by the words Optics prints, such as `No driver enabled` or `Element not found`.
2. **Look up the code.** If the message has a code like `E0201`, [Error codes](/docs/reference/errors) says what it means and what to do.
3. **Read the [FAQ](/docs/help/faq)** when something works differently from what you expected. Some behavior is a known limit, not a bug.

## Ask a question or report a bug

Open an issue on [GitHub](https://github.com/mozarkai/optics-framework/issues). Search the open and closed issues first, since someone may have hit the same problem.

A good report lets someone reproduce the problem without asking you anything. Include:

- **Your Optics version.** Run `optics --version`.
- **The `optics doctor` output for your project.** Run `optics doctor <project>` and paste everything it prints.
- **Your `config.yaml`, without secrets.** Remove API keys, passwords and tokens, and replace private URLs with placeholders.
- **The failing step.** Paste the rows from `modules/modules.csv` and `test_data/elements.csv` that the step uses, and the full "Failure details" box from the run.
- **The log.** Choose the one that matches what you ran:
  - `optics execute`: set `file_log: true` in `config.yaml`, run again, and attach `execution_output/internal_logs.log` and `execution_output/execution_logs.log`. Set `log_level: DEBUG` for the most detail.
  - `optics live`: attach `logs/optics_live_<time>.log` from the project folder. Its path is printed when you quit.
- **What you expected, and what happened instead.** A screenshot from `execution_output/` often shows the difference at a glance.

:::warning
Logs and screenshots can contain personal data, such as names and email addresses on screen. Check them before you attach them to a public issue. Values written with the `@:` prefix are masked as `****` in log files, but screenshots show whatever was on screen.
:::

## Report a security issue

Don't open a public issue for a security problem. Report it privately, as described in the repository's [security policy](https://github.com/mozarkai/optics-framework/security/policy).
