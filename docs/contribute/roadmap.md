---
title: Help wanted
nav: Help wanted
tables: full
summary: The ideas we want to build with contributors, with a prompt for your agent on each one.
---

These are the ideas we want to build with you. Each idea says what we imagine, not how to build it. The design is the part we work out together.

**Copy prompt** gives your coding agent a prompt that explains the idea's area of the Optics code. It asks for understanding, not for code.

## Propose work {#propose-work}

:::steps
### Pick an idea and explore it

Copy its prompt into Claude Code, Codex or another agent, and read the code that the agent points to.

### Open an issue with your plan

Search the [open issues](https://github.com/mozarkai/optics-framework/issues) first. If there is none, [open one](https://github.com/mozarkai/optics-framework/issues/new?template=feature_request.yml). Agree on the direction with a maintainer before a large pull request.

### Build it

Start with [Set up for development](/docs/contribute/setup) and the steps in [Contribute](/docs/contribute/).
:::

## Ideas at a glance {#ideas-at-a-glance}

| Idea | Priority | Difficulty |
| --- | --- | --- |
| [Run one suite on many devices at once](#many-devices) | High | Advanced |
| [Move a session to another server](#move-sessions) | High | Advanced |
| [Drag, long press and pinch](#gestures) | High | Intermediate |
| [Clipboard and biometrics](#device-features) | Medium | Intermediate |
| [Flutter apps](#flutter) | Medium | Advanced |
| [Check what a web page asks the server](#network) | Medium | Intermediate |
| [Locators that each platform knows best](#platform-locators) | High | Intermediate |
| [Find elements by what they look like](#vision) | Medium | Intermediate to Advanced |
| [Test the API and the database behind the app](#data) | High | Advanced |
| [Check what the device says](#audio) | Medium | Advanced |
| [Build tests visually](#visual-builder) | Medium | Advanced |
| [Learn from recorded sessions](#traces) | Medium | Intermediate |
| [Find elements faster](#faster-location) | High | Advanced |
| [A server that a team can share](#server-security) | High | Intermediate |
| [Make every run faster](#performance) | Medium | Intermediate |
| [One place for each decision](#simplify) | Medium | Intermediate |
| [Journeys on every platform](#test-journeys) | High | Beginner to Intermediate |
| [Documentation](#documentation) | Medium | Beginner |
| [CI and tooling](#infrastructure) | Low to Medium | Intermediate |

## Run at scale

### Run one suite on many devices at once {#many-devices}

**Priority**: High · **Difficulty**: Advanced

Point Optics at a set of devices, such as a rack of phones, a group of emulators or a device cloud. It runs the same suite on all of them at the same time, or splits a long suite to finish sooner. One report shows each device side by side.

**Today:** `optics execute` runs one session on one device. Several enabled drivers form a fallback chain, not parallel runs.

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Run one suite on many devices at once" (https://optics-framework.org/docs/contribute/roadmap#many-devices).

Clone the repository and read CLAUDE.md first. Then follow the path of `optics execute` from the CLI to the device, and read how a session, its drivers and its event manager are built.

Help me understand:
- What ties one run of `optics execute` to one session and one device today.
- Which parts of a run (session, events, report, popup state, output folder) belong to one device, and which belong to the whole run.
- How the JUnit report and the live output are built from events.

The maintainers' open questions:
- How does a project name its devices, and how does it say "every device" or "split the suite"?
- How do the live output and the JUnit report show several devices without noise?
- What happens to the run when one device disconnects?

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

### Move a session to another server {#move-sessions}

**Priority**: High · **Difficulty**: Advanced · **Issue**: [#351](https://github.com/mozarkai/optics-framework/issues/351)

Many copies of `optics serve` work as one service. A session can move to another copy and survive a restart, so teams can scale out and deploy without downtime.

**Today:** each session lives in the memory of one process, with its drivers, engines and recorded steps.

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Move a session to another server" (https://optics-framework.org/docs/contribute/roadmap#move-sessions), and issue #351.

Clone the repository and read CLAUDE.md first. Then read how `SessionManager` and `Session` are built, how `optics serve` (common/expose_api.py) and `optics mcp` (helper/mcp_server.py) create and look up sessions, and what a session holds.

Help me understand:
- Everything a session holds, sorted into configuration and live state.
- How a session starts, how it ends, and what happens when its driver goes away.
- Where `optics serve` and `optics mcp` keep their sessions, and how they differ.

The maintainers' open questions:
- Which parts of a session can a new process rebuild, and which are live state?
- What should a caller see while a session moves?
- How does this fit the HTTP API and the MCP server, which both keep sessions?

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

## Reach every part of the app

### Drag, long press and pinch {#gestures}

**Priority**: High · **Difficulty**: Intermediate

A test does every gesture a person does: reorder a list by drag, open a menu with a long press, zoom a map with a pinch. Each gesture starts and ends on elements, so it still works when the layout changes.

**Today:** Optics presses, swipes and scrolls, from an element or from a point.

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Drag, long press and pinch" (https://optics-framework.org/docs/contribute/roadmap#gestures).

Clone the repository and read CLAUDE.md first. Then read how `Press Element` and `Swipe From Element` work, from the keyword in api/action_keyword.py down to each driver in engines/drivers/.

Help me understand:
- How a keyword finds an element and then acts on it (`_locate_and_act`), and what the act receives.
- Which gesture methods `DriverInterface` has, and how each driver implements them or refuses them.
- What a new keyword must reach to work in every entry point (CSV runner, Python library, HTTP API, MCP, optics live).

The maintainers' open questions:
- Which drivers (Appium on each platform, Playwright, Selenium, the `ble` driver) can do which gesture?
- How should a step name where a gesture starts and where it ends?
- How does each gesture fit the fallback ladder and AI self-heal?

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

### Clipboard and biometrics {#device-features}

**Priority**: Medium · **Difficulty**: Intermediate

A test reads what the app copied, such as a referral code, and puts text on the clipboard before a paste. It passes or fails a fingerprint or face prompt on an emulator or a simulator, so a biometric sign-in runs end to end.

**Today:** there is no keyword for either yet.

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Clipboard and biometrics" (https://optics-framework.org/docs/contribute/roadmap#device-features).

Clone the repository and read CLAUDE.md first. Then read the section on optional driver capabilities, `DriverInterface` (common/driver_interface.py), and how the Appium driver groups platforms with `PlatformProfile` and `@supported_on`.

Help me understand:
- How Optics adds a capability that only some drivers or platforms have, and what a user sees on the others.
- How Optics finds and hides secret values in recordings, logs and reports.
- Which keywords today come close to these features.

The maintainers' open questions:
- Which platforms allow these features on emulators, on simulators and on real devices?
- When is a clipboard value a secret, and how should a report show it?
- How should a platform that does not have the feature answer?

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

### Flutter apps {#flutter}

**Priority**: Medium · **Difficulty**: Advanced

A Flutter app is as easy to test as a native app. A test finds widgets by their keys and labels, and the same suite runs on the Android and iOS builds.

**Today:** Optics drives a Flutter app through the accessibility tree, OCR and image matching, with no link to Flutter's own widget tree.

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Flutter apps" (https://optics-framework.org/docs/contribute/roadmap#flutter).

Clone the repository and read CLAUDE.md first. Then read how Optics locates an element: `determine_element_type` in common/utils.py, the strategies in common/strategies.py, and the Appium element sources in engines/elementsources/.

Help me understand:
- How Optics reads a native app's screen today, and which sources and strategies take part.
- How an element source declares the locators it can handle.
- Where a Flutter app's screen would look different from a native app's screen to these sources.

The maintainers' open questions:
- Which signals does a Flutter app give in a release build, and which only in a debug build?
- How does a Flutter element fit the locator types and the fallback ladder?
- Which sample app should the work use, so that tests can run in CI?

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

### Check what a web page asks the server {#network}

**Priority**: Medium · **Difficulty**: Intermediate · **Issue**: [#686](https://github.com/mozarkai/optics-framework/issues/686)

A web test checks what the page asked the server, not only what it shows. A step waits for a response, checks its status and data, and keeps a value for a later step.

**Today:** web tests read the page. `Invoke API` calls an API directly but does not see the page's own requests.

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Check what a web page asks the server" (https://optics-framework.org/docs/contribute/roadmap#network), and issue #686.

Clone the repository and read CLAUDE.md first. Then read the Playwright driver (engines/drivers/playwright.py), the Selenium driver (engines/drivers/selenium.py), and how `Invoke API` saves values from a response (api/flow_control.py).

Help me understand:
- How the Playwright and Selenium drivers open and follow pages and tabs.
- How a keyword saves a value for a later step, and how variables move between steps.
- How Optics hides secret values in logs and reports.

The maintainers' open questions:
- Which drivers can watch requests, and does this also work on mobile web through Appium?
- How does a step name the request it waits for?
- How should a report show requests and responses that hold secrets?

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

### Locators that each platform knows best {#platform-locators}

**Priority**: High · **Difficulty**: Intermediate

Each platform brings its strongest lookup, such as UI Automator selectors on Android or predicate strings on iOS, into the same fallback chain. A new driver adds a lookup without changes to the core.

**Today:** Optics reads XPath, CSS, a cross-platform `id:`, Playwright's semantic locators, accessibility IDs and class names. The four locate strategies are a fixed list.

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Locators that each platform knows best" (https://optics-framework.org/docs/contribute/roadmap#platform-locators).

Clone the repository and read CLAUDE.md first. Then read the element location pipeline: `determine_element_type` and `resolve_locator` in common/utils.py, `StrategyFactory` and `StrategyManager` in common/strategies.py, and the Appium and Playwright locator code.

Help me understand:
- How a locator string becomes a lookup, step by step, from the keyword to the element source.
- Why the strategy list is fixed today, and what depends on its order.
- Which locator forms each driver understands today.

The maintainers' open questions:
- Which platform locators do users ask for most?
- How does a locator string tell Optics which lookup it needs?
- How does a driver offer a lookup of its own, and where does that lookup go in the fallback order?

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

### Find elements by what they look like {#vision}

**Priority**: Medium · **Difficulty**: Intermediate to Advanced

A test finds an element on any screen, also where there is no element tree: a game, a video, a camera view of a TV. You describe it in words, such as "the blue Pay button", or show a picture, and Optics finds it fast on a normal computer.

**Today:** two image engines match pictures, and six OCR engines read text.

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Find elements by what they look like" (https://optics-framework.org/docs/contribute/roadmap#vision).

Clone the repository and read CLAUDE.md first. Then read `ImageInterface` and `TextInterface` (common/), the engines in engines/vision_models/, and the vision strategies in common/strategies.py.

Help me understand:
- What an image engine and an OCR engine receive, and what they must return.
- How a vision match becomes a press on the device, including the area of interest and the pixel scaling.
- How the engines are chosen and loaded from config.yaml.

The maintainers' open questions:
- Which kinds of model fit: element detectors, models that find an element from a description, faster OCR?
- How does an element described in words fit the elements file and the fallback ladder?
- How do we measure accuracy and speed on real app screens?

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

## Test beyond the screen

### Test the API and the database behind the app {#data}

**Priority**: High · **Difficulty**: Advanced

API and database checks are as natural in a suite as screen steps. One test creates data through an API, acts on the screen, then confirms the result in the database, and a suite can also be API-only. We want to design this as a whole, from the project files to the report.

**Today:** `Invoke API` calls an endpoint, checks the response and saves values ([Call APIs in a test](/docs/advanced/api-calls)). A contribution in review adds database checks ([#752](https://github.com/mozarkai/optics-framework/pull/752)).

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Test the API and the database behind the app" (https://optics-framework.org/docs/contribute/roadmap#data). Pull request #752 adds database checks.

Clone the repository and read CLAUDE.md first. Then read `Invoke API`, `Evaluate`, `Condition` and `Read Data` in api/flow_control.py, how the runner loads API files (helper/execute.py, common/runner/data_reader.py), and the page https://optics-framework.org/docs/advanced/api-calls.

Help me understand:
- How a project describes an API today, and how a step uses it.
- How values move between steps, and how secrets stay out of logs and reports.
- What pull request #752 adds, and how it fits beside the API support.

The maintainers' open questions:
- What should a project file for APIs and databases look like, beside `config.yaml` and the elements file?
- Which checks do teams need most: status, schema, values, timing, data that eventually arrives?
- How should data steps work in each entry point: the CSV runner, the Python library, `optics live` and the MCP server?

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

### Check what the device says {#audio}

**Priority**: Medium · **Difficulty**: Advanced

A test hears the device. It checks that a voice assistant answered correctly or that the app said "Payment done". Speech becomes text on the test machine, so the audio stays private.

**Today:** Optics reads what a device shows, not what it plays.

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Check what the device says" (https://optics-framework.org/docs/contribute/roadmap#audio).

Clone the repository and read CLAUDE.md first. Then read how Optics reads a screen: the screenshot and OCR path in common/strategies.py, the element source interface in common/elementsource_interface.py, and how assertions wait in `Verifier` (api/verifier.py).

Help me understand:
- How an assertion keyword waits and decides pass or fail.
- How Optics adds a new kind of engine, as it did for OCR and LLM engines.
- Where a failure's evidence (screenshots, page source) is saved for the report.

The maintainers' open questions:
- How can Optics get the sound from each kind of device: phone, browser, desktop app and TV?
- How should an audio check read in a suite, and how long should it wait?
- How should the report keep the audio, so that a person can listen to a failure?

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

## Create tests faster

### Build tests visually {#visual-builder}

**Priority**: Medium · **Difficulty**: Advanced

Anyone builds a test by pointing at a live screen. They select an element, see how stable each locator is, add the step, and run steps one at a time while they build.

**Today:** `optics live` runs keywords on a live app, and `/save` writes the steps that worked ([Record a test](/docs/create/record)).

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Build tests visually" (https://optics-framework.org/docs/contribute/roadmap#visual-builder).

Clone the repository and read CLAUDE.md first. Then read the live session journey (helper/live.py, helper/live_tui.py), the screen elements endpoint of `optics serve` (common/expose_api.py) and how the MCP server lists rows and locators (common/screen_snapshot.py).

Help me understand:
- How `optics live` runs a step and how `/save` writes the suite files.
- How Optics lists the elements on a screen and suggests locators for each one.
- What the HTTP API already gives a user interface that wants to drive a session.

The maintainers' open questions:
- Should the builder live in a browser, inside `optics live`, or beside an editor?
- How does it show a locator's stability before the step is saved?
- How do visual edits stay in step with the CSV or YAML files?

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

### Learn from recorded sessions {#traces}

**Priority**: Medium · **Difficulty**: Intermediate

A team learns from its own sessions. A person chooses to export the screens, actions and results of their Optics sessions in an open format for agent traces, to study failures or train a model that knows their app. This is not telemetry: nothing leaves the machine unless a person exports it.

**Today:** Optics records the steps that work, from `optics live`, the MCP server and AI self-heal, with secrets written as `<redacted>`.

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Learn from recorded sessions" (https://optics-framework.org/docs/contribute/roadmap#traces).

Clone the repository and read CLAUDE.md first. Then read how sessions are recorded: the `Recorder` and `AgentSession` in common/agent_core.py, the `steps` resource in helper/mcp_server.py, `/save` in helper/live.py, and how AI self-heal records its steps (common/ai_self_heal.py).

Help me understand:
- What each recording holds today, and where it is saved.
- How Optics decides that a value is secret, and how it hides it.
- What differs between a recording from the MCP server, from `optics live` and from self-heal.

The maintainers' open questions:
- Which trace formats do people use, and which tools read them?
- What must a trace keep (screens, reasoning, timing), and what must it never keep?
- Should traces come from the MCP server, `optics live`, self-heal or all three?

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

## Make the core faster and safer

### Find elements faster {#faster-location}

**Priority**: High · **Difficulty**: Advanced

Optics finds an element in the time of its fastest strategy that succeeds, not the sum of the ones before it. It still acts once, through the element it found first.

**Today:** strategies look one at a time, and a later one looks only after the act on an earlier result fails.

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Find elements faster" (https://optics-framework.org/docs/contribute/roadmap#faster-location).

Clone the repository and read CLAUDE.md first. Then read the element location pipeline: `StrategyManager.locate` and `_assert` in common/strategies.py, `_act_until_success` in api/action_keyword.py, and the four fallback layers that CLAUDE.md describes.

Help me understand:
- The order in which strategies look and act today, and why a later strategy waits.
- Which resources (driver, page source, screenshot) each strategy uses.
- How assertion rounds already share work between strategies.

The maintainers' open questions:
- Which strategies share the driver, and which only need a screenshot?
- What does a faster lookup cost in CPU when OCR runs on every step?
- How do we measure the gain on real suites?

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

### A server that a team can share {#server-security}

**Priority**: High · **Difficulty**: Intermediate · **Issue**: [#314](https://github.com/mozarkai/optics-framework/issues/314)

A team runs one `optics serve` on its network and shares it safely. Each caller signs in, sees only its own sessions and stays within limits the team sets.

**Today:** the server has no sign-in of its own. It checks hosts and origins, and it refuses requests to read its own files.

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "A server that a team can share" (https://optics-framework.org/docs/contribute/roadmap#server-security), and issue #314.

Clone the repository and read CLAUDE.md first. Then read the HTTP server (common/expose_api.py, helper/serve.py), the guards in common/http_guard.py and common/caller_policy.py, and how the MCP server ties each session to the client that started it (helper/mcp_server.py).

Help me understand:
- How a request reaches a keyword today, and which checks it passes on the way.
- How the MCP server decides who owns a session.
- What a remote caller can and cannot ask the server to do.

The maintainers' open questions:
- Which sign-in methods do teams expect: API keys, bearer tokens, a gateway in front?
- How do sessions belong to a caller, as they already do in the MCP server?
- Which limits matter: requests per caller, sessions per caller, request size?

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

### Make every run faster {#performance}

**Priority**: Medium · **Difficulty**: Intermediate

A run spends its time on the app, not on Optics, and a report shows where the time went.

**Today:** engines are created once and reused, and OCR remembers its last four frames.

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Make every run faster" (https://optics-framework.org/docs/contribute/roadmap#performance).

Clone the repository and read CLAUDE.md first. Then read how a keyword runs from the test runner to the driver (common/runner/test_runnner.py, api/action_keyword.py, common/strategies.py), how engines are created and cached (common/base_factory.py), and how events flow (common/events.py).

Help me understand:
- Every place where a step reads the screen, and how often it does so.
- Which work is cached today, and for how long.
- How I could measure where the time of a run goes, with the tools the project already has.

The maintainers' open questions:
- Where does the time of a typical run go today? Measure it before you change anything.
- Which image and OCR work could run on a GPU when there is one?
- What should a time report look like, and who reads it?

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

### One place for each decision {#simplify}

**Priority**: Medium · **Difficulty**: Intermediate · **Issues**: [#484](https://github.com/mozarkai/optics-framework/issues/484), [#300](https://github.com/mozarkai/optics-framework/issues/300)

A new keyword, engine or driver takes one change in one place, and every entry point gets it.

**Today:** most entry points find a new keyword on their own, but the Python and Robot Framework library needs its own wrapper.

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "One place for each decision" (https://optics-framework.org/docs/contribute/roadmap#simplify), and issues #484 and #300.

Clone the repository and read CLAUDE.md first, especially "Keyword entry points" and "Layer order". Then read api/keywords.py, common/runner/keyword_register.py, optics.py and scripts/check_layers.py.

Help me understand:
- What a new keyword must reach today, and which entry points find it on their own.
- Which code in the drivers and element sources repeats the same decision.
- How the layer check limits where shared code can live.

The maintainers' open questions:
- Which decisions are still repeated across entry points or drivers?
- Which repeated code is the same idea, and which only looks similar?
- How do we keep the public keyword names stable during the change?

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

## Quality and community

### Journeys on every platform {#test-journeys}

**Priority**: High · **Difficulty**: Beginner to Intermediate · **Issue**: [#365](https://github.com/mozarkai/optics-framework/issues/365)

Every behavior a user can see has one journey test, and the journeys run on every platform Optics supports, real devices included.

**Today:** journeys run whole suites in a real browser, and a hook refuses tests that assert nothing or read source code.

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Journeys on every platform" (https://optics-framework.org/docs/contribute/roadmap#test-journeys), and issue #365.

Clone the repository and read CLAUDE.md first, especially the "Tests" section. Then read scripts/check_tests.py, the journeys in tests/integration/, and the CI workflows in .github/workflows/.

Help me understand:
- The project's rules for a test that earns its place, and why they exist.
- Which user-visible behaviors the journeys cover today, and which they do not.
- What CI runs today, on which platforms, and what it skips.

The maintainers' open questions:
- Which user-visible behaviors have no journey yet?
- How can CI run Android emulators, iOS simulators and desktop apps at a cost the project can carry?
- Which journeys should block a release, and which should only report?

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

### Documentation {#documentation}

**Priority**: Medium · **Difficulty**: Beginner

Everyone finds their answer on this site in a few minutes, with real examples for each task, each CI system and each upgrade.

**Today:** the docs live in the [optics-framework-org repository](https://github.com/mozarkai/optics-framework-org). CI examples cover GitHub Actions and GitLab CI.

:::prompt
I want to contribute to the Optics documentation (https://optics-framework.org/docs/). I am looking at this idea from its Help wanted page: "Documentation" (https://optics-framework.org/docs/contribute/roadmap#documentation).

Clone https://github.com/mozarkai/optics-framework-org and read CLAUDE.md first, especially the "Documentation" section. Then read docs/nav.json and the pages under docs/run/ and docs/help/.

Help me understand:
- How the docs are organised and how a new page is added.
- The voice and style rules that the pages follow.
- Which tasks a new user is likely to look for that the docs do not answer yet.

The maintainers' open questions:
- Which CI systems need examples next: Jenkins, Azure DevOps, CircleCI?
- Which tasks need a guide: tuning for speed, upgrading between versions, choosing locators?
- Which workflows are easier to learn from a short video?

Do not write new pages yet. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

### CI and tooling {#infrastructure}

**Priority**: Low to Medium · **Difficulty**: Intermediate · **Issue**: [#320](https://github.com/mozarkai/optics-framework/issues/320)

Every pull request shows what it changes in coverage and speed, and the container images build and get scanned in CI.

**Today:** CI runs the tests on Linux, Windows and macOS, with pre-commit hooks, CodeQL and a SonarQube scan, but no coverage report.

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "CI and tooling" (https://optics-framework.org/docs/contribute/roadmap#infrastructure), and issue #320.

Clone the repository and read CLAUDE.md first. Then read .github/workflows/, .pre-commit-config.yaml, pytest.toml, scripts/ and Docker/.

Help me understand:
- What each workflow and each hook checks today, and when it runs.
- How tests and coverage are configured, and what CI reports.
- How the Docker images are built and used.

The maintainers' open questions:
- Which coverage and speed numbers help a reviewer, and which only add noise?
- How should CI build and scan the images under `Docker/`?
- Which benchmarks show a slow-down before a release?

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::
