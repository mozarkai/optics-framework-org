---
title: Set up a development environment
nav: Development setup
summary: Clone Optics, install the tools, make a change, run the tests and the static analysis, then commit.
level: Intermediate
time: 15 min
---

This developer guide tells you how to set up the Optics source code on your computer and how to make a change to it. Before you start, read [Contribute to Optics](/docs/contribute/) for the contribution process.

You need Python 3.12 or later, [pipx](https://pipx.pypa.io/) and git.

## Setting up the development environment

### Clone the repository

Clone the Optics repository to your computer:

```bash
git clone <repository_url>
cd optics-framework
```

For `<repository_url>`, use `https://github.com/mozarkai/optics-framework.git`, or the URL of your fork.

### Install dependencies

Optics uses `poetry` to manage the dependencies and the virtual environment. Install it with `pipx`:

```bash
pipx install poetry
```

Then install the dependency groups for your work:

| Work | Command |
|---|---|
| All work (code, tests and documentation) | `poetry install --with dev,test,docs` |
| Changes to the source code | `poetry install --with dev,test` |
| Changes to the documentation | `poetry install --with docs` |
| Default installation (only the runtime dependencies) | `poetry install` |

The `dev` group has the tools: `ruff`, `bandit`, `pre-commit`, `commitizen`, `pylint`, `tox`, `pytest` and `pytest-cov`. The `test` group adds `pytest-mock`, `pytest-asyncio` and `httpx2`. The test configuration needs `pytest-asyncio`, so install the `test` group too before you run the tests.

For more information about `pipx` and `poetry`, see the [pipx documentation](https://pipx.pypa.io/) and the [poetry documentation](https://python-poetry.org/docs/).

### Install pre-commit hooks

After you install the dependencies, install the pre-commit hooks. They check the code quality and the format of the commit messages:

```bash
poetry run pre-commit install
```

The hooks do these checks:

- Run `ruff` with `--fix` to find lint problems and to fix them where possible. This hook does not run `ruff format`.
- Run `bandit` on `optics_framework` for security checks.
- Validate commit messages with `commitizen` (Conventional Commits format).
- Check for trailing whitespace, end-of-file issues, and YAML and JSON validity.
- Scan for secrets with `gitleaks`.

The hooks run automatically on `git commit`. Do not skip them with `--no-verify`. To run them manually on all files:

```bash
poetry run pre-commit run --all-files
```

To run them only on the files that you changed:

```bash
poetry run pre-commit run --files $(git diff --name-only main)
```

## Create a new branch

Before you change the code, create a new branch for your contribution:

```bash
git checkout -b <branch_name>
```

## Make changes

Put your feature, bug fix or documentation change in the correct directory:

- **Source code:** `optics_framework/`
- **Tests:** `tests/`, with unit tests in `tests/units/` and integration tests in `tests/integration/`
- **Documentation:** the [optics-framework-org](https://github.com/mozarkai/optics-framework-org) repository, under `docs/`

### Source code changes

Make your changes to the source code in the `optics_framework/` directory.

Obey the coding standards of the project. Use Ruff for linting and formatting:

```bash
poetry run ruff check .
poetry run ruff format .
```

To fix the lint problems automatically, and then format:

```bash
poetry run ruff check --fix .
poetry run ruff format .
```

Ruff fixes problems automatically where it can. The pre-commit hook runs `ruff check --fix` on each commit, but not `ruff format`, so run `ruff format .` yourself.

### Documentation changes

The documentation is this site. It lives in the [optics-framework-org](https://github.com/mozarkai/optics-framework-org) repository as Markdown under `docs/`, one file per page, with the table of contents in `docs/nav.json`. Read that repository's `CLAUDE.md` for the page format, the directives and the voice.

- Make your changes in that repository's `docs/` directory.
- Make sure that the documentation is clear, short and obeys the style guide.
- When a change to Optics changes what a page says, open the docs pull request together with the code pull request.

To see your changes while you work, build the site and serve it locally:

```bash
npm run dev
```

This serves the site at `http://localhost:4173`. To build it and run the checks for links, anchors and page format:

```bash
npm test
```

:::note[The old MkDocs pages]
The optics-framework repository used to hold the docs in its own `docs/` folder, built with MkDocs (`poetry run mkdocs serve` to preview at `http://127.0.0.1:8000`, `poetry run mkdocs build` for production). Those pages are no longer updated, and everything they said is on this site.
:::

### Run tests

Run the tests to make sure that your changes do not break existing functions:

```bash
poetry run pytest
```

`pytest.toml` configures the run: it collects the tests from `tests/` and measures coverage of `optics_framework`. Each test has a marker: `white_box` (unit tests with mocked collaborators), `black_box` (integration tests with real collaborators), `hybrid` or `generate` (the code generator). To run only the unit tests:

```bash
poetry run pytest -m white_box
```

### Packaging

To build the package (a wheel and an sdist):

```bash
poetry build
```

## Commit changes

- Write your commit messages in the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) format. The allowed types are `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`, `perf:`, `style:`, `build:` and `ci:`.
- The `commitizen` hook validates each commit message and refuses all other formats.
- To make a correct message, you can use the interactive `commitizen` helper:

```bash
poetry run cz commit
```

It asks you for each part of the message and writes it in the Conventional Commits format.

If you installed the pre-commit hooks (see [Install pre-commit hooks](#install-pre-commit-hooks)), they run on each commit. They check the code quality and validate the commit message. For the rules on rebase, sign-off and pull requests, see [Contribute to Optics](/docs/contribute/#how-to-contribute).

## Local static analysis (SonarQube, optional)

CI runs SonarQube static analysis on each push to `main` (`.github/workflows/mozarksonar.yml`). To find the same problems before you push, run the scanner locally against a SonarQube container on your computer, not the shared server.

Start a local SonarQube server one time:

```bash
docker run -d --name sonarqube -p 9000:9000 sonarqube:community
```

Open `http://localhost:9000` (default login `admin`/`admin`) and wait until it is ready. Then generate a token under **My Account → Security**.

Run the scanner from the root of the repository, and point it at that server:

```bash
docker run --rm \
    -v "$(pwd):/usr/src" \
    --network=host \
    -e SONAR_HOST_URL="http://localhost:9000" \
    -e SONAR_SCANNER_OPTS="-Dsonar.projectKey=optics-framework" \
    -e SONAR_TOKEN="<your-token>" \
    sonarsource/sonar-scanner-cli
```

The project key `optics-framework` is the same as in `sonar-project.properties` at the root of the repository.

The scanner prints the problems that it finds. You can also see them on the dashboard at `http://localhost:9000/dashboard?id=optics-framework`. The scanner writes a `.scannerwork/` directory into the repository. Git ignores this directory.
