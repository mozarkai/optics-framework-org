---
title: Help wanted
nav: Help wanted
summary: The ideas we want to build with contributors. Each one says what we imagine for the people who use Optics, where Optics is today, and gives a prompt to explore it with your agent.
---

Optics grows with its contributors. This page lists the ideas we want help with. Each idea says what we imagine for the people who use Optics, where Optics is today and which questions are still open. It does not prescribe a design. The design is the part we want to work out with you.

:::tip[Explore an idea with your agent]
Each idea ends with a prompt. Copy it into Claude Code, Codex or another coding agent. The agent reads the Optics source and explains the area to you. The prompt asks only for understanding, so you come to the issue with a plan of your own.
:::

## Propose work {#propose-work}

:::steps
### Pick an idea

Read the ideas below and pick one that interests you. The priority and difficulty of each idea are in [the table](#ideas-at-a-glance).

### Explore it with the prompt

Paste the idea's prompt into your agent. Read the code that it points to, and run Optics on the area yourself.

### Open an issue with your plan

Search the [open issues](https://github.com/mozarkai/optics-framework/issues) first. If an issue for the idea exists, add your plan to it. If not, [open one](https://github.com/mozarkai/optics-framework/issues/new?template=feature_request.yml) with the feature request form. Say which idea you picked and how you want to approach it. Before a large pull request, agree on the direction with a maintainer in the issue.

### Build it

Set up with [Set up for development](/docs/contribute/setup), and follow the steps in [Contribute](/docs/contribute/). You can open a draft pull request at any time to ask for direction.
:::

A typo or a small fix needs no issue. Issues that the maintainers marked for contributors carry the [`help wanted`](https://github.com/mozarkai/optics-framework/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22) label.

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
| [Let Optics explore the app on its own](#explore) | Medium | Advanced |
| [Build tests visually](#visual-builder) | Medium | Advanced |
| [Learn from recorded sessions](#traces) | Medium | Intermediate |
| [Find elements faster](#faster-location) | High | Advanced |
| [A server that a team can share](#server-security) | High | Intermediate |
| [Make every run faster](#performance) | Medium | Intermediate |
| [One place for each decision](#simplify) | Medium | Intermediate |
| [Journeys on every platform](#test-journeys) | High | Beginner to Intermediate |
| [Documentation](#documentation) | Medium | Beginner |
| [CI and tooling](#infrastructure) | Low to Medium | Intermediate |

| Level | Meaning |
| --- | --- |
| **High** | Teams that run Optics at scale need it |
| **Medium** | It makes Optics more useful or more complete |
| **Low** | It is good to have |
| **Beginner** | A good first contribution; little framework knowledge is necessary |
| **Intermediate** | Some knowledge of the framework is necessary |
| **Advanced** | Deep knowledge of the framework is necessary |

## Run at scale

### Run one suite on many devices at once {#many-devices}

**Priority**: High · **Difficulty**: Advanced

**What we imagine.** You point Optics at a set of devices: a rack of phones, a group of emulators, a device cloud or a mix of browsers. Optics runs the same suite on all of them at the same time, or splits a long suite across them to finish sooner. One report shows each device's result side by side, so a failure that happens on one device only is easy to find.

**Optics today.**

- `optics execute` runs a suite in one session, on one device.
- When `config.yaml` turns on more than one driver, Optics uses them as a fallback chain, one after the other (`optics_framework/common/instance_fallback.py`).
- `optics serve` and `optics mcp` already keep many sessions open at the same time (`optics_framework/common/session_manager.py`).

**Questions to explore.**

- How does a project name its devices, and how does it say "every device" or "split the suite"?
- How do the live output and the JUnit report show several devices without noise?
- What happens to the run when one device disconnects?

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Run one suite on many devices at once" (https://optics-framework.org/docs/contribute/roadmap#many-devices).

Clone the repository and read CLAUDE.md first. Then follow the path of `optics execute` from the CLI to the device, and read how a session, its drivers and its event manager are built.

Help me understand:
- What ties one run of `optics execute` to one session and one device today.
- Which parts of a run (session, events, report, popup state, output folder) belong to one device, and which belong to the whole run.
- How the JUnit report and the live output are built from events.

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

### Move a session to another server {#move-sessions}

**Priority**: High · **Difficulty**: Advanced · **Issue**: [#351](https://github.com/mozarkai/optics-framework/issues/351)

**What we imagine.** Many copies of `optics serve` work as one service. A session can move from one copy to another and keep its context, and a session survives when its server restarts. Teams can scale the service out, balance the load and deploy without downtime.

**Optics today.**

- `SessionManager` keeps each session in the memory of one process (`optics_framework/common/session_manager.py`).
- A session holds live objects: drivers, element sources, vision models and the recorded steps.
- When a driver session ends, Optics stops the session with `E0106` and you start a new one (`optics_framework/common/session_liveness.py`).

**Questions to explore.**

- Which parts of a session are configuration that a new process can rebuild, and which are live state?
- What should a caller see while a session moves?
- How does this fit the HTTP API and the MCP server, which both keep sessions?

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Move a session to another server" (https://optics-framework.org/docs/contribute/roadmap#move-sessions), and issue #351.

Clone the repository and read CLAUDE.md first. Then read how `SessionManager` and `Session` are built, how `optics serve` (common/expose_api.py) and `optics mcp` (helper/mcp_server.py) create and look up sessions, and what a session holds.

Help me understand:
- Everything a session holds, sorted into configuration and live state.
- How a session starts, how it ends, and what happens when its driver goes away.
- Where `optics serve` and `optics mcp` keep their sessions, and how they differ.

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

## Reach every part of the app

### Drag, long press and pinch {#gestures}

**Priority**: High · **Difficulty**: Intermediate

**What we imagine.** A test does every gesture that a person does. It reorders a list by drag, opens a context menu with a long press, and zooms a map or a photo with a pinch. The gesture starts and ends on elements, not on fixed coordinates, so the step still works when the layout changes. These gestures are among the features that mobile testers ask for most.

**Optics today.**

- Optics presses, swipes and scrolls, from an element or from a point (`Press Element`, `Swipe From Element`, `Scroll From Element`, `Swipe Until Element Appears`).
- Each keyword runs on every driver that can do it. A driver that cannot do it refuses the keyword with `E0105`.

**Questions to explore.**

- Which drivers (Appium on each platform, Playwright, Selenium, the `ble` driver) can do which gesture?
- How should a step name where a gesture starts and where it ends?
- How does each gesture fit the fallback ladder and AI self-heal?

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Drag, long press and pinch" (https://optics-framework.org/docs/contribute/roadmap#gestures).

Clone the repository and read CLAUDE.md first. Then read how `Press Element` and `Swipe From Element` work, from the keyword in api/action_keyword.py down to each driver in engines/drivers/.

Help me understand:
- How a keyword finds an element and then acts on it (`_locate_and_act`), and what the act receives.
- Which gesture methods `DriverInterface` has, and how each driver implements them or refuses them.
- What a new keyword must reach to work in every entry point (CSV runner, Python library, HTTP API, MCP, optics live).

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

### Clipboard and biometrics {#device-features}

**Priority**: Medium · **Difficulty**: Intermediate

**What we imagine.** A test uses the device as a person does. It reads what the app copied, such as a referral code, and puts text on the clipboard before a paste. It passes or fails a fingerprint or face prompt on an emulator or a simulator, so a test of a sign-in flow that uses biometrics runs from start to end.

**Optics today.**

- Optics has no keyword for the clipboard or for biometric prompts yet.
- Optics treats secret values with care: it writes them as `<redacted>` in recordings and reports (`is_secret` in `optics_framework/common/screen_snapshot.py`).

**Questions to explore.**

- Which platforms allow these features on emulators, on simulators and on real devices?
- When is a clipboard value a secret, and how should a report show it?
- How should a platform that does not have the feature answer?

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Clipboard and biometrics" (https://optics-framework.org/docs/contribute/roadmap#device-features).

Clone the repository and read CLAUDE.md first. Then read the section on optional driver capabilities, `DriverInterface` (common/driver_interface.py), and how the Appium driver groups platforms with `PlatformProfile` and `@supported_on`.

Help me understand:
- How Optics adds a capability that only some drivers or platforms have, and what a user sees on the others.
- How Optics finds and hides secret values in recordings, logs and reports.
- Which keywords today come close to these features.

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

### Flutter apps {#flutter}

**Priority**: Medium · **Difficulty**: Advanced

**What we imagine.** A Flutter app is as easy to test as a native app. A test finds Flutter widgets by their keys and labels, and it stays stable when a widget has no accessibility label. The same suite runs on the Android and iOS builds of the app.

**Optics today.**

- Optics drives a Flutter app as it drives any app: through the platform's accessibility tree, OCR and image matching.
- Optics has no link to Flutter's own widget tree.

**Questions to explore.**

- Which signals does a Flutter app give in a release build, and which only in a debug build?
- How does a Flutter element fit the locator types and the fallback ladder?
- Which sample app should the work use, so that tests can run in CI?

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Flutter apps" (https://optics-framework.org/docs/contribute/roadmap#flutter).

Clone the repository and read CLAUDE.md first. Then read how Optics locates an element: `determine_element_type` in common/utils.py, the strategies in common/strategies.py, and the Appium element sources in engines/elementsources/.

Help me understand:
- How Optics reads a native app's screen today, and which sources and strategies take part.
- How an element source declares the locators it can handle.
- Where a Flutter app's screen would look different from a native app's screen to these sources.

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

### Check what a web page asks the server {#network}

**Priority**: Medium · **Difficulty**: Intermediate · **Issue**: [#686](https://github.com/mozarkai/optics-framework/issues/686)

**What we imagine.** A web test checks what the page shows and what the page asked the server. A step waits for the response to a request, checks its status and its data, and keeps a value from it for a later step. When a test fails, the report shows the requests that led to the failure.

**Optics today.**

- A web test reads the page: its elements, its text and its screenshots, through the Playwright and Selenium drivers.
- `Invoke API` calls an API directly, but it does not see the requests that the page makes itself.

**Questions to explore.**

- Which drivers can watch requests, and does this also work on mobile web through Appium?
- How does a step name the request it waits for?
- How should a report show requests and responses that hold secrets?

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Check what a web page asks the server" (https://optics-framework.org/docs/contribute/roadmap#network), and issue #686.

Clone the repository and read CLAUDE.md first. Then read the Playwright driver (engines/drivers/playwright.py), the Selenium driver (engines/drivers/selenium.py), and how `Invoke API` saves values from a response (api/flow_control.py).

Help me understand:
- How the Playwright and Selenium drivers open and follow pages and tabs.
- How a keyword saves a value for a later step, and how variables move between steps.
- How Optics hides secret values in logs and reports.

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

### Locators that each platform knows best {#platform-locators}

**Priority**: High · **Difficulty**: Intermediate

**What we imagine.** Each platform brings its strongest way to find an element, and that way joins the same fallback chain as every other locator. An Android test can use a UI Automator selector, and an iOS test can use a predicate string or a class chain. A new driver can add a lookup of its own without changes to the core.

**Optics today.**

- Optics reads XPath, CSS (`css=`), a cross-platform `id:`, Playwright's `role=`, `label=`, `placeholder=`, `text=`, `title=`, `alt=` and `data-testid=`, accessibility IDs and class names.
- The four locate strategies are a fixed list in `StrategyFactory` (`optics_framework/common/strategies.py`).

**Questions to explore.**

- Which platform locators do users ask for most?
- How does a locator string tell Optics which lookup it needs?
- How does a driver offer a lookup of its own, and where does that lookup go in the fallback order?

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Locators that each platform knows best" (https://optics-framework.org/docs/contribute/roadmap#platform-locators).

Clone the repository and read CLAUDE.md first. Then read the element location pipeline: `determine_element_type` and `resolve_locator` in common/utils.py, `StrategyFactory` and `StrategyManager` in common/strategies.py, and the Appium and Playwright locator code.

Help me understand:
- How a locator string becomes a lookup, step by step, from the keyword to the element source.
- Why the strategy list is fixed today, and what depends on its order.
- Which locator forms each driver understands today.

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

### Find elements by what they look like {#vision}

**Priority**: Medium · **Difficulty**: Intermediate to Advanced

**What we imagine.** A test finds an element on any screen, also where there is no element tree: a game, a video, a camera view of a TV. You describe the element in words, such as "the blue Pay button", or show a picture of it, and Optics finds it fast on a normal computer.

**Optics today.**

- Two image engines match pictures: `templatematch` (OpenCV, local) and `remote_oir` (a remote service).
- OCR engines read text on the screen: EasyOCR, RapidOCR, Pytesseract, Apple Vision, Google Vision and a remote OCR service.

**Questions to explore.**

- Which kinds of model fit: element detectors, models that find an element from a description, faster OCR?
- How does an element described in words fit the elements file and the fallback ladder?
- How do we measure accuracy and speed on real app screens, not on document pages?

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Find elements by what they look like" (https://optics-framework.org/docs/contribute/roadmap#vision).

Clone the repository and read CLAUDE.md first. Then read `ImageInterface` and `TextInterface` (common/), the engines in engines/vision_models/, and the vision strategies in common/strategies.py.

Help me understand:
- What an image engine and an OCR engine receive, and what they must return.
- How a vision match becomes a press on the device, including the area of interest and the pixel scaling.
- How the engines are chosen and loaded from config.yaml.

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

## Test beyond the screen

### Test the API and the database behind the app {#data}

**Priority**: High · **Difficulty**: Advanced

**What we imagine.** API and database checks are a natural part of every suite, as natural as screen steps. One test creates data through an API, acts on the screen, then confirms the result in the database. A suite can also be API-only. Each check shows in the live output and in the report like any other step, and credentials stay secret. We want to design this as a whole: how a project describes its services and databases, how values move between data steps and screen steps, and how the report tells the story.

**Optics today.**

- `Invoke API` calls an endpoint that a YAML file describes, checks the response and saves values as variables. See [Call APIs in a test](/docs/advanced/api-calls).
- `Evaluate`, `Condition` and `Read Data` work with values in a test.
- A contribution in review adds database checks: [#752](https://github.com/mozarkai/optics-framework/pull/752).

**Questions to explore.**

- What should a project file for APIs and databases look like, beside `config.yaml` and the elements file?
- Which checks do teams need most: status, schema, values, timing, data that eventually arrives?
- How should data steps work in each entry point: the CSV runner, the Python library, `optics live` and the MCP server?

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Test the API and the database behind the app" (https://optics-framework.org/docs/contribute/roadmap#data). Pull request #752 adds database checks.

Clone the repository and read CLAUDE.md first. Then read `Invoke API`, `Evaluate`, `Condition` and `Read Data` in api/flow_control.py, how the runner loads API files (helper/execute.py, common/runner/data_reader.py), and the page https://optics-framework.org/docs/advanced/api-calls.

Help me understand:
- How a project describes an API today, and how a step uses it.
- How values move between steps, and how secrets stay out of logs and reports.
- What pull request #752 adds, and how it fits beside the API support.

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

### Check what the device says {#audio}

**Priority**: Medium · **Difficulty**: Advanced

**What we imagine.** A test hears the device. It checks that a voice assistant gave the right answer, that the app spoke "Payment done", or that a sound played when a timer ended. Speech becomes text on the test machine, so the audio stays private and the check runs offline.

**Optics today.**

- Optics reads what a device shows: its page source, its screenshots and the text in them.
- Optics does not record the sound of a device yet.

**Questions to explore.**

- How can Optics get the sound from each kind of device: phone, browser, desktop app and TV?
- How should an audio check read in a suite, and how much time should it wait?
- How should the report keep the audio, so that a person can listen to a failure?

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Check what the device says" (https://optics-framework.org/docs/contribute/roadmap#audio).

Clone the repository and read CLAUDE.md first. Then read how Optics reads a screen: the screenshot and OCR path in common/strategies.py, the element source interface in common/elementsource_interface.py, and how assertions wait in `Verifier` (api/verifier.py).

Help me understand:
- How an assertion keyword waits and decides pass or fail.
- How Optics adds a new kind of engine, as it did for OCR and LLM engines.
- Where a failure's evidence (screenshots, page source) is saved for the report.

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

### Let Optics explore the app on its own {#explore}

**Priority**: Medium · **Difficulty**: Advanced · **Issue**: [#364](https://github.com/mozarkai/optics-framework/issues/364)

**What we imagine.** You point Optics at an app and let it explore. It taps, types and scrolls through the app by itself, and it checks rules all the time: no error screen, no crash, the app stays in front. When a rule breaks, Optics gives back the shortest list of steps that repeats the problem, as a module that you can run again. This works on phones, desktops, TVs and the web.

**Optics today.**

- Optics lists the elements on a screen (`Get Interactive Elements`).
- At the end of a run, it finds known error screens from `error_definitions.csv`.
- It dismisses popups by rules, and it records the steps that work as modules.

**Questions to explore.**

- How does a user write a rule, and which rules should be on by default?
- How does a run stay repeatable, so that the same seed gives the same steps?
- How does exploration stay away from actions with real effects, such as a purchase or a delete?

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Let Optics explore the app on its own" (https://optics-framework.org/docs/contribute/roadmap#explore), and issue #364.

Clone the repository and read CLAUDE.md first. Then read how Optics lists what is on a screen (common/screen_snapshot.py), how it detects error screens (common/error_detection.py), how popup rules work (common/popup_guard.py), and how the MCP server records steps (common/agent_core.py).

Help me understand:
- What Optics knows about a screen at each step, and how it refers to each element.
- How error detection and popup rules decide that something is wrong.
- How recorded steps become a module that `optics execute` can run.

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

## Create tests faster

### Build tests visually {#visual-builder}

**Priority**: Medium · **Difficulty**: Advanced

**What we imagine.** A person who does not type keywords builds a test by pointing at a live screen. They select an element, see the locators that would find it and how stable each one is, and add a step. They reorder, edit and remove steps, and run them one at a time while they build.

**Optics today.**

- `optics live` runs one keyword at a time on a live app, and `/save` writes the steps that worked into the suite. See [Record a test](/docs/create/record).
- In plain-English mode, an AI model picks the steps for a goal that you describe. See [Describe a test in plain English](/docs/create/describe).
- `GET /v1/sessions/{session_id}/screen_elements` and the MCP server list the elements on a screen with ways to find each one.

**Questions to explore.**

- Should the builder live in a browser, inside `optics live`, or beside your editor?
- How does it show a locator's stability before you save the step?
- How do visual edits stay in step with the CSV or YAML files?

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Build tests visually" (https://optics-framework.org/docs/contribute/roadmap#visual-builder).

Clone the repository and read CLAUDE.md first. Then read the live session journey (helper/live.py, helper/live_tui.py), the screen elements endpoint of `optics serve` (common/expose_api.py) and how the MCP server lists rows and locators (common/screen_snapshot.py).

Help me understand:
- How `optics live` runs a step and how `/save` writes the suite files.
- How Optics lists the elements on a screen and suggests locators for each one.
- What the HTTP API already gives a user interface that wants to drive a session.

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

### Learn from recorded sessions {#traces}

**Priority**: Medium · **Difficulty**: Intermediate

**What we imagine.** A team can learn from its own sessions. A person chooses to export the sessions that agents and testers ran with Optics, with the screens they saw, the actions they took and the results, in an open format for agent traces. With these traces, the team can study why tests fail, share examples, or train a smaller model that knows their app. This is not telemetry. Nothing leaves the machine unless a person exports it.

**Optics today.**

- Optics records the steps that work: `/save` in `optics live`, the `steps` resource of the MCP server, and the steps that AI self-heal adds, which the JUnit report keeps.
- Secret values are written as `<redacted>` in every recording.

**Questions to explore.**

- Which trace formats do people use, and which tools read them?
- What must a trace keep (screens, reasoning, timing), and what must it never keep?
- Should traces come from the MCP server, `optics live`, self-heal or all three?

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Learn from recorded sessions" (https://optics-framework.org/docs/contribute/roadmap#traces).

Clone the repository and read CLAUDE.md first. Then read how sessions are recorded: the `Recorder` and `AgentSession` in common/agent_core.py, the `steps` resource in helper/mcp_server.py, `/save` in helper/live.py, and how AI self-heal records its steps (common/ai_self_heal.py).

Help me understand:
- What each recording holds today, and where it is saved.
- How Optics decides that a value is secret, and how it hides it.
- What differs between a recording from the MCP server, from `optics live` and from self-heal.

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

## Make the core faster and safer

### Find elements faster {#faster-location}

**Priority**: High · **Difficulty**: Advanced

**What we imagine.** Optics finds an element in the time of its fastest strategy that succeeds, not in the sum of the strategies before it. It still acts only once, and only through the element that it found first. Tests with many fallback locators become faster, and their results stay the same.

**Optics today.**

- `StrategyManager.locate` gives results one strategy at a time: XPath, text, OCR, then image (`optics_framework/common/strategies.py`).
- A later strategy looks only after the act on an earlier result fails, so the device never gets two actions for one step.
- Assertions already share one screenshot per round among the vision strategies, and skip a screen that did not change.

**Questions to explore.**

- Which strategies share the driver, and which only need a screenshot?
- What does a faster lookup cost in CPU when OCR runs on every step?
- How do we measure the gain on real suites?

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Find elements faster" (https://optics-framework.org/docs/contribute/roadmap#faster-location).

Clone the repository and read CLAUDE.md first. Then read the element location pipeline: `StrategyManager.locate` and `_assert` in common/strategies.py, `_act_until_success` in api/action_keyword.py, and the four fallback layers that CLAUDE.md describes.

Help me understand:
- The order in which strategies look and act today, and why a later strategy waits.
- Which resources (driver, page source, screenshot) each strategy uses.
- How assertion rounds already share work between strategies.

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

### A server that a team can share {#server-security}

**Priority**: High · **Difficulty**: Intermediate · **Issue**: [#314](https://github.com/mozarkai/optics-framework/issues/314)

**What we imagine.** A team runs one `optics serve` on its network and shares it safely. Each caller signs in with a key or a token, sees only its own sessions, and stays within limits that the team sets.

**Optics today.**

- `optics serve` and `optics mcp` have no sign-in of their own, and they log a warning when they listen beyond the local machine (`optics_framework/common/http_guard.py`).
- Browsers can call the server only from the origins in `OPTICS_CORS_ORIGINS`, and none by default.
- A loopback-bound server, or any server once `OPTICS_ALLOWED_HOSTS` is set, refuses requests for other host names.
- Optics refuses a remote caller's request to read the server's files or environment (`optics_framework/common/caller_policy.py`), and refuses images over 64 MB or 64 megapixels.

**Questions to explore.**

- Which sign-in methods do teams expect: API keys, bearer tokens, a gateway in front?
- How do sessions belong to a caller, as they already do in the MCP server?
- Which limits matter: requests per caller, sessions per caller, request size?

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "A server that a team can share" (https://optics-framework.org/docs/contribute/roadmap#server-security), and issue #314.

Clone the repository and read CLAUDE.md first. Then read the HTTP server (common/expose_api.py, helper/serve.py), the guards in common/http_guard.py and common/caller_policy.py, and how the MCP server ties each session to the client that started it (helper/mcp_server.py).

Help me understand:
- How a request reaches a keyword today, and which checks it passes on the way.
- How the MCP server decides who owns a session.
- What a remote caller can and cannot ask the server to do.

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

### Make every run faster {#performance}

**Priority**: Medium · **Difficulty**: Intermediate

**What we imagine.** A test run spends its time on the app, not on Optics. Screens are read once, engines start once, and a report shows where the time of a run went, so that a slow step is easy to find.

**Optics today.**

- The factories keep engine instances and reuse them (`optics_framework/common/base_factory.py`).
- Each OCR engine remembers its result for the last four frames, so a repeated read of the same screen is free (`optics_framework/common/text_interface.py`).
- Events go through an `asyncio` queue, and `EventSDK` sends them in batches.

**Questions to explore.**

- Where does the time of a typical run go today? Measure it before you change anything.
- Which image and OCR work could run on a GPU when there is one?
- What should a time report look like, and who reads it?

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Make every run faster" (https://optics-framework.org/docs/contribute/roadmap#performance).

Clone the repository and read CLAUDE.md first. Then read how a keyword runs from the test runner to the driver (common/runner/test_runnner.py, api/action_keyword.py, common/strategies.py), how engines are created and cached (common/base_factory.py), and how events flow (common/events.py).

Help me understand:
- Every place where a step reads the screen, and how often it does so.
- Which work is cached today, and for how long.
- How I could measure where the time of a run goes, with the tools the project already has.

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

### One place for each decision {#simplify}

**Priority**: Medium · **Difficulty**: Intermediate · **Issues**: [#484](https://github.com/mozarkai/optics-framework/issues/484), [#300](https://github.com/mozarkai/optics-framework/issues/300)

**What we imagine.** A new keyword, engine or driver takes one change in one place, and every entry point gets it. Contributors find each decision where they expect it, and a change does not need edits in many files.

**Optics today.**

- A keyword reaches eight entry points. Most find it by reflection, but the Python and Robot Framework library needs its own wrapper in `optics.py`.
- `scripts/check_layers.py` keeps the order of the layers, and the shared fallback ladder (`common/fallback.py`) and `build_keywords` (`api/keywords.py`) already serve every entry point.

**Questions to explore.**

- Which decisions are still repeated across entry points or drivers?
- Which repeated code in the drivers and element sources is the same idea, and which only looks similar?
- How do we keep the public keyword names stable during the change?

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "One place for each decision" (https://optics-framework.org/docs/contribute/roadmap#simplify), and issues #484 and #300.

Clone the repository and read CLAUDE.md first, especially "Keyword entry points" and "Layer order". Then read api/keywords.py, common/runner/keyword_register.py, optics.py and scripts/check_layers.py.

Help me understand:
- What a new keyword must reach today, and which entry points find it on their own.
- Which code in the drivers and element sources repeats the same decision.
- How the layer check limits where shared code can live.

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

## Quality and community

### Journeys on every platform {#test-journeys}

**Priority**: High · **Difficulty**: Beginner to Intermediate · **Issue**: [#365](https://github.com/mozarkai/optics-framework/issues/365)

**What we imagine.** Every behavior that a user can see has one journey test that guards it, and the journeys run on every platform that Optics supports, real devices included. A change that breaks a user's suite fails in CI before it reaches a release.

**Optics today.**

- Each contract has one test that owns it, at the strongest boundary that is cheap to drive: `run_project`, the `Optics` library, `optics serve`, an MCP session or a real browser. See "Tests" in `CLAUDE.md`.
- Journeys such as `tests/integration/test_playwright_journey.py` and `tests/integration/test_selenium_journey.py` run whole suites.
- The `check-tests` hook refuses tests that assert nothing, sleep for a fixed time, read source code or assert a tautology (`scripts/check_tests.py`).

**Questions to explore.**

- Which user-visible behaviors have no journey yet?
- How can CI run Android emulators, iOS simulators and desktop apps at a cost the project can carry?
- Which journeys should block a release, and which should only report?

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "Journeys on every platform" (https://optics-framework.org/docs/contribute/roadmap#test-journeys), and issue #365.

Clone the repository and read CLAUDE.md first, especially the "Tests" section. Then read scripts/check_tests.py, the journeys in tests/integration/, and the CI workflows in .github/workflows/.

Help me understand:
- The project's rules for a test that earns its place, and why they exist.
- Which user-visible behaviors the journeys cover today, and which they do not.
- What CI runs today, on which platforms, and what it skips.

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

### Documentation {#documentation}

**Priority**: Medium · **Difficulty**: Beginner

**What we imagine.** Every person who uses Optics finds the answer on this site in a few minutes, from a first test to a large CI setup. The docs show real examples for each task and each CI system, and they guide each upgrade.

**Optics today.**

- The docs are in the [optics-framework-org repository](https://github.com/mozarkai/optics-framework-org), under `docs/`.
- [Troubleshooting](/docs/help/troubleshooting), [Error codes](/docs/reference/errors), [Run in CI](/docs/run/ci) (GitHub Actions and GitLab CI) and the [readiness checklist](/docs/run/checklist) exist.

**Questions to explore.**

- Which CI systems need examples next: Jenkins, Azure DevOps, CircleCI?
- Which tasks need a guide: tuning for speed, upgrading between versions, choosing locators?
- Which workflows are easier to learn from a short video?

:::prompt
I want to contribute to the Optics documentation (https://optics-framework.org/docs/). I am looking at this idea from its Help wanted page: "Documentation" (https://optics-framework.org/docs/contribute/roadmap#documentation).

Clone https://github.com/mozarkai/optics-framework-org and read CLAUDE.md first, especially the "Documentation" section. Then read docs/nav.json and the pages under docs/run/ and docs/help/.

Help me understand:
- How the docs are organised and how a new page is added.
- The voice and style rules that the pages follow.
- Which tasks a new user is likely to look for that the docs do not answer yet.

Do not write new pages yet. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

### CI and tooling {#infrastructure}

**Priority**: Low to Medium · **Difficulty**: Intermediate · **Issue**: [#320](https://github.com/mozarkai/optics-framework/issues/320)

**What we imagine.** Every pull request shows what it changes in coverage and in speed, the container images build and get scanned in CI, and maintainers see the health of the code at a glance.

**Optics today.**

- The test workflow runs `pytest` without coverage (`.github/workflows/tests.yml`).
- The pre-commit hooks run Ruff, `check-tests`, `check-layers`, `sonar-lint`, Bandit, Commitizen, Gitleaks and file checks (`.pre-commit-config.yaml`).
- CodeQL, the OpenSSF Scorecard, Dependabot and a SonarQube scan run in CI.

**Questions to explore.**

- Which coverage and speed numbers help a reviewer, and which only add noise?
- How should CI build and scan the images under `Docker/`?
- Which benchmarks show a slow-down before a release?

:::prompt
I want to contribute to Optics, an open-source test automation framework (https://github.com/mozarkai/optics-framework). I am looking at this idea from its Help wanted page: "CI and tooling" (https://optics-framework.org/docs/contribute/roadmap#infrastructure), and issue #320.

Clone the repository and read CLAUDE.md first. Then read .github/workflows/, .pre-commit-config.yaml, pytest.toml, scripts/ and Docker/.

Help me understand:
- What each workflow and each hook checks today, and when it runs.
- How tests and coverage are configured, and what CI reports.
- How the Docker images are built and used.

Do not write code and do not propose a design. Explain what you find, point me to the files that matter, and list the questions I should ask the maintainers when I open an issue.
:::

## Smaller open issues {#smaller-issues}

These issues are smaller and well defined. Each one is a good way to learn a part of Optics.

- [#684](https://github.com/mozarkai/optics-framework/issues/684): see and act inside iframes in web sessions.
- [#687](https://github.com/mozarkai/optics-framework/issues/687): list the elements inside shadow roots.
- [#683](https://github.com/mozarkai/optics-framework/issues/683): headless Chromium that does not tell sites it is automated.
- [#297](https://github.com/mozarkai/optics-framework/issues/297): device discovery behind `DriverInterface`.
- [#493](https://github.com/mozarkai/optics-framework/issues/493): parameter signatures and types in `optics list`.
- [#492](https://github.com/mozarkai/optics-framework/issues/492): a non-interactive mode for `optics quickstart`.

:::tip[Start small]
If you are new to the project, start with a smaller issue or with documentation. It is a good way to learn the codebase while you make a useful contribution.
:::
