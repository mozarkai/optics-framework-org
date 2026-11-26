---
title: Contribute to Optics
nav: Overview
summary: How to report a bug, ask for a feature, and send a change to Optics, and the rules that every contributor obeys.
---

We welcome bug reports, feature requests, documentation improvements and code. Each of them has the same value to us. These contributing guidelines tell you how to contribute. The repository files [CONTRIBUTING.md](https://github.com/mozarkai/optics-framework/blob/main/CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](https://github.com/mozarkai/optics-framework/blob/main/CODE_OF_CONDUCT.md) have the same rules.

:::important[Before you contribute]
Read the [Code of Conduct](#code-of-conduct). It gives the standards of behavior that we expect from all contributors.
:::

## Code of conduct

The Optics Code of Conduct is in one place only, so that it cannot drift: [`CODE_OF_CONDUCT.md`](https://github.com/mozarkai/optics-framework/blob/main/CODE_OF_CONDUCT.md) at the root of the repository. It is the Contributor Covenant.

It applies to all persons in the project, in issues, pull requests, discussions and all other project spaces. When you take part in the project, you agree to obey it.

To report unacceptable behavior, write to the maintainers at [lalit@mozark.ai](mailto:lalit@mozark.ai), as the [Enforcement section](https://github.com/mozarkai/optics-framework/blob/main/CODE_OF_CONDUCT.md#enforcement) tells you.

## Ways to contribute

| If you want to | Start here |
|---|---|
| Report a bug | [Bug report form](https://github.com/mozarkai/optics-framework/issues/new?template=bug_report.yml) |
| Ask for a feature | [Feature request form](https://github.com/mozarkai/optics-framework/issues/new?template=feature_request.yml) |
| Do a larger task | [`help wanted` queue](https://github.com/mozarkai/optics-framework/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22) and the [Help wanted](/docs/contribute/roadmap) ideas |
| Improve the documentation | For a typo or a small fix, you do not need an issue. For a large rewrite, open an issue first. |

Before you open an issue, search the [existing issues](https://github.com/mozarkai/optics-framework/issues). If your issue exists, add a thumbs-up reaction and any new details to it. Do not open a duplicate.

## How to contribute

:::steps
### Fork the repository

On the repository page, click **Fork** (top right). GitHub makes a copy of the repository in your GitHub account.

### Clone the repository

Clone your fork to your computer:

```bash
git clone <your_forked_repository_url>
```

To install the tools, see [Set up a development environment](/docs/contribute/setup).

### Create a branch

Create a new branch for your contribution:

```bash
git checkout -b <branch_name>
```

### Make changes

Make your changes to the code, the documentation or the tests. Before your first code change, read [Extend Optics](/docs/contribute/extending). It shows how to add a keyword from start to end and how to add an engine.

### Commit changes

Commit your changes with a descriptive commit message. See [Commit messages](#commit-messages).

### Rebase on main

We do not accept merge commits. Rebase your branch on `main` before you open the pull request, and keep it rebased until the merge:

```bash
git fetch origin && git rebase origin/main
```

### Push changes

Push your branch to your fork.

### Create a pull request

Create a pull request from your fork to the main repository. See [Pull requests](#pull-requests).

### Review and merge

The maintainers review your pull request. If it obeys the project guidelines, they merge it.
:::

## Commit messages

Write each commit message in the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) format, for example `feat: add new feature` or `fix: resolve bug #123`. The allowed types are `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`, `perf:`, `style:`, `build:` and `ci:`. The commit-msg hook (`commitizen`) refuses all other messages.

You can add a scope when it makes the message clearer, for example `fix(runner): advance the param-fallback ladder`. To make a correct message interactively:

```bash
poetry run cz commit
```

:::note[Signing commits]
We like it when you sign off your commits with the [Developer Certificate of Origin (DCO)](https://developercertificate.org/), but it is not necessary. Use `git commit -s` to add a `Signed-off-by` line.
:::

Do not add AI co-author trailers. The human committer is the author of each commit.

For a large change, you can divide the work into a small number of logical commits, for example scaffolding, then core logic, then tests, then docs. This makes the review easier, but it is not a rule.

## Pull requests

You can open a pull request at any time. A rough draft that asks for direction is as welcome as finished work. Early feedback is better than a surprise. Nothing in this list stops a merge:

- If you fix an issue, reference it in the pull request message with `Fixes #<issue_number>`. GitHub then closes the issue automatically at the merge.
- Smaller diffs usually get a faster review.
- The pull request template gives a description shape: **What** changed, **Why**, the **non-obvious choices** that a reviewer must otherwise reconstruct, how you **validated** it in addition to CI (new tests, manual steps), and optional **follow-ups**. Skip the parts that do not apply.
- Before you push, run the pre-commit hooks and the tests. This saves one review cycle:

```bash
poetry run pre-commit run --files $(git diff --name-only main)
poetry run pytest
```

On each pull request, CI runs the test suite, CodeQL, the pre-commit hooks and a documentation preview. A red build is not a problem: fix it and push again. SonarQube and Scorecard run on each push to `main`. To run the SonarQube checks before you push, see [Local static analysis](/docs/contribute/setup#local-static-analysis-sonarqube-optional).

A review usually comes in a few days. If your pull request gets no reply for longer, add a short comment to it.

## Reporting issues

To report a bug, do these steps:

1. **Check existing issues:** search the existing issues. The bug can be in an existing issue already.
2. **Create a new issue:** if nobody reported the bug, create a new issue with these details:
   1. **Issue title:** a descriptive title that summarizes the bug.
   2. **Description:** a full description of the bug, with the steps to reproduce it.
   3. **Expected behavior:** what you expected to occur.
   4. **Actual behavior:** what occurred.
   5. **Environment:** details about your environment, for example the operating system, the Python version and other related information.
   6. **Screenshots:** if they help to show the bug, add screenshots.
   7. **Labels:** add the applicable labels, for example `bug` or `enhancement`. The bug report form adds `bug` and the feature request form adds `enhancement` automatically.

## Questions

To ask a question about how to use Optics, first search the [existing questions](https://github.com/mozarkai/optics-framework/issues?q=is%3Aissue+label%3Aquestion). Then open a [new issue](https://github.com/mozarkai/optics-framework/issues/new/choose) with the `question` label. You can also write to the maintainers at [lalit@mozark.ai](mailto:lalit@mozark.ai).

Do not report a security vulnerability in a public issue. Follow [SECURITY.md](https://github.com/mozarkai/optics-framework/blob/main/SECURITY.md).

## Next steps

:::cards{cols="2"}
- [Development setup](/docs/contribute/setup): Clone Optics, install the tools, run the tests and the static analysis.
- [Architecture](/docs/contribute/architecture): The parts of Optics and how they work together.
- [Extend Optics](/docs/contribute/extending): Add a keyword, a driver, an element source or a vision engine.
- [Architecture decisions](/docs/contribute/decisions): Why Optics has its current design.
- [Help wanted](/docs/contribute/roadmap): The ideas we want to build with contributors.
:::
