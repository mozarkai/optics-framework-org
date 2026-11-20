# Handle popups

> Write rules that close the popups that block a step, and stop the run on popups you did not plan for.

Apps show popups at times you cannot plan: an offer, a rating request, an update notice, a session timeout or a permission prompt. When a popup covers the element that a step needs, the step fails. Popup rules tell Optics what each known popup looks like and what to do about it.

When a step cannot find its element, Optics does this:

1. It reads the screen and tries your rules in list order. The first rule that matches wins.
2. It does the rule's action, such as a tap on `Not now`, and waits up to 5 seconds for the popup to go.
3. It tries the step again.

If no rule matches but the screen shows a dialog, the step fails with [E0206](https://optics-framework.org/docs/reference/errors#e02-elements) and Optics saves a screenshot and the page source. Optics never guesses which button to press.

Nothing changes until you write a rule. A step that finds its element reads nothing more and tries no rule. Rules run before [AI self-heal](https://optics-framework.org/docs/elements/self-heal), so a known popup costs no LLM call.

**Appium only:**
Popup rules work on Android and iOS apps through Appium. Playwright, Selenium and the other drivers see no popups. On those drivers, use [Detect And Press](https://optics-framework.org/docs/reference/keywords/actions#detect-and-press) for a popup that shows only sometimes.

**Try it in your browser:**
The [popups playground](https://optics-framework.org/playground/popups) runs the real popup guard against eleven popups on a demo app. Turn each popup and each rule on or off, then watch what Optics does.

## Write your first rule

### Find the text of the popup

Open the screen in `optics live`, or look at the screenshot of the failed step, and read the title of the popup. Pick text that only the popup shows.

### Add popup_rules.json

Put a file named `popup_rules.json` in your project, for example in `test_data/`. It holds a list of rules:

`test_data/popup_rules.json`:

```json
[
  {
    "name": "rate_prompt",
    "detect": {"text_contains": ["Enjoying Birch?"]},
    "action": {"type": "tap", "target": "Not now"}
  }
]
```

### Run the suite

```shell
$ optics execute birch --output plain
```

A step that the popup blocked passes, and a `popup` line shows below it:

```terminal
10:12:31 RUNNING      keyword "Press Element"
10:12:34 PASS         keyword "Press Element" (3.2s)
10:12:34 PASS           popup "rate_prompt" handled
```

A file that Optics cannot read, or a rule that is not valid, stops the run before it starts. `optics dry_run` does the same check:

```terminal
╭──────────────────────────── Cannot start: E0501 ─────────────────────────────╮
│ birch/test_data/popup_rules.json: rule 1 is invalid (detect: Value error,    │
│ detect needs text_contains, resource_id or xpath; action: Value error,       │
│ action 'tap' needs a target)                                                 │
│                                                                              │
│ Fix that popup_rules.json, then re-run.                                      │
╰──────────────────────────────────────────────────────────────────────────────╯
```

## Rule fields

| Field | Default | What it does |
|---|---|---|
| `name` | Required | The name of the rule. Each name must be unique. |
| `detect` | Required | What the popup looks like. See [Detect a popup](#detect-a-popup). |
| `action` | `{"type": "none"}` | What to do about the popup. See [Actions](#actions). |
| `then` | `retry_step` | What happens after the action: `retry_step`, `fail_step` or `stop_run`. See [After the action](#after-the-action). |
| `check` | `on_failure` | When to check: `on_failure`, after a step does not find its element, or `before_every_step`. See [Check before every step](#check-before-every-step). |
| `sensitive` | `false` | `true` presses nothing, saves the evidence and ends the run. See [Sensitive popups](#sensitive-popups). |
| `max_per_step` | `2` | How many times the rule can act in one step. |
| `max_per_run` | `5` | How many times the rule can act in one run. |

## Detect a popup

`detect` takes one or more keys. Every key that you give must match the screen.

| Key | Matches when |
|---|---|
| `text_contains` | Any one of the strings is part of the text on the screen. Case does not matter. |
| `resource_id` | An element has exactly this resource id, such as `com.birch.shop:id/promo_close`. |
| `xpath` | The XPath finds at least one element in the page source. |

`text_contains` searches all the text on the screen, not only the popup. Use text that only the popup shows, or add a `resource_id` or `xpath` key, so the rule does not match a normal screen.

## Actions

| `type` | `target` | What it does |
|---|---|---|
| `tap` | Required | Taps the element `target` names: text, a resource id or an XPath. Optics uses the position from the page source. If the target is not there, it searches the screen as Press Element does. |
| `back` | None | Presses back, as Go Back does. |
| `alert` | Required | iOS only. Presses the button with this label on a system alert, such as `Allow`. See [iOS](https://optics-framework.org/docs/platforms/ios#answer-system-alerts). |
| `module` | Required | Runs the module with this name from your suite. Use it for a popup that needs more than one tap. |
| `none` | None | Does nothing. Use it with `then: fail_step` or `then: stop_run` to stop and keep the evidence. |

Add `fallback` to a `tap` action to give a second target. Optics tries it when it does not find `target`:

```json
{"type": "tap", "target": "Not now", "fallback": "//*[@content-desc='Close']"}
```

### Run a module

A `module` action runs a module from your modules file, in the same session. Any keyword works in it:

`test_data/popup_rules.json`:

```json
[
  {
    "name": "survey",
    "detect": {"text_contains": ["Tell us how we did"]},
    "action": {"type": "module", "target": "Close Survey"}
  }
]
```

`modules/modules.csv`:

```csv
module_name,module_step,param_1
Close Survey,Press Element,${survey_skip}
Close Survey,Press Element,${survey_confirm}
```

- Other popup rules stay on while the module runs. The rule that started the module does not act on its own popup until the module ends.
- When the module fails, or ends with the popup still on the screen, the step fails with E0408.
- When the session has no module with that name, the step fails with [E0601](https://optics-framework.org/docs/reference/errors#e06-modules-and-engines).

## After the action

| `then` | What happens |
|---|---|
| `retry_step` | Optics tries the step again. The rule needs an action other than `none`. |
| `fail_step` | The step fails with [E0408](https://optics-framework.org/docs/reference/errors#e04-keywords-and-parameters). The run continues with the next test case. |
| `stop_run` | The step fails with E0408, and the test cases that have not started do not run. They show as `NOT_RUN`. |

When the popup is still on the screen 5 seconds after the action, the step fails with E0408, whatever `then` says.

```terminal
10:14:02 FAIL         keyword "Press Element" (3.2s): Popup 'update_required' was dismissed and then ended the run [E0408]
10:14:02 FAIL           popup "update_required" stopped: Update required. Install the latest version to continue. Later Update [E0408]
10:14:02 FAIL       module "Checkout" (3.5s): Popup 'update_required' was dismissed and then ended the run [E0408]
10:14:02 FAIL     test case "Shopper can check out" (9.7s) [E0408]
10:14:02 NOT_RUN  test case "Shopper can sign out"
```

### Sensitive popups

Set `sensitive: true` for a popup that you must never press, such as a payment or account deletion prompt. Optics ignores `action` and `then`, presses nothing, saves a screenshot and the page source, and stops the run with E0408:

```json
{"name": "delete_account", "detect": {"text_contains": ["Delete your account?"]}, "sensitive": true}
```

```terminal
10:15:40 FAIL         keyword "Press Element" (0.9s): Popup 'delete_account' ended the run; nothing was pressed [E0408]
```

## Check before every step

Some popups do not block the element. A session timeout dialog can leave the screen below it visible. Set `check: before_every_step` to try the rule before each action step that finds an element. See [Steps that check for popups](#steps-that-check-for-popups) for the keywords:

```json
{
  "name": "session_timeout",
  "check": "before_every_step",
  "detect": {"resource_id": "com.birch.shop:id/session_expired"},
  "action": {"type": "tap", "target": "Sign in again"}
}
```

Each such step reads the page source once more, so use this only for popups that need it.

## Limits

`max_per_step` and `max_per_run` stop a popup that comes back again and again. When a rule reaches a limit, the step fails with [E0407](https://optics-framework.org/docs/reference/errors#e04-keywords-and-parameters) and the run continues:

```terminal
10:16:21 FAIL         keyword "Press Element" (0.7s): Popup 'rate_prompt' came back too often (step 0/2, run 5/5) [E0407]
```

## Popups with no rule

When a step does not find its element, no rule matches and the screen shows a dialog, the step fails with E0206:

```terminal
10:18:05 FAIL         keyword "Press Element" (0.9s): A popup with no rule is on screen: 'Allow Birch to send you notifications? Allow Don't allow' [E0206]
```

Copy text from the message into a new rule. The screenshot and the page source in the output folder show the popup.

- Optics finds dialogs, alerts, bottom sheets and system prompts. A popup that the app draws as a normal view is not found as a dialog, so the step fails with E0201 as before. Write a rule for it.
- Optics looks for unknown popups only when the project has at least one rule.

## Steps that check for popups

The rules run for keywords that find an element and act on it: Press Element, Enter Text, Enter Number, Clear Element Text, Get Text, Swipe From Element and Scroll From Element.

Other keywords do not check for popups:

- Assertions, such as Assert Presence and Validate Element. `check: before_every_step` does not apply to them either. When you put Assert Presence before an action, as the platform pages recommend, a popup that appears first makes the assertion fail with E0201. Move the assertion after the action, or close the popup with [Detect And Press](https://optics-framework.org/docs/reference/keywords/actions#detect-and-press) before the assertion.
- Detect And Press, Swipe Until Element Appears and Scroll Until Element Appears.
- Steps that use coordinates or the whole screen, such as Press By Coordinates, Swipe and Scroll.

## Evidence and events

Each time a rule acts or a popup stops a step, Optics saves files to the output folder:

| File | When |
|---|---|
| `popup_<run>_<n>_before.png` | Before the action, and for a popup with no rule. |
| `popup_<run>_<n>_after.png` | After the action. |
| `popup_<run>_<n>_source.xml` | When the popup stops the step or the run. |

Optics saves these files only when [`save_captures`](https://optics-framework.org/docs/reference/config#save-captures) is on. The screenshots also need a screenshot source, such as `appium_screenshot`. `optics serve` turns captures off, so it saves no files.

With `--output jsonl`, each popup is an event with `"entity_type": "popup"`. Its `args` hold the details:

```json
{
  "rule": "rate_prompt",
  "check": "on_failure",
  "matched": ["text_contains"],
  "popup_kind": "in_app",
  "popup_title": "Enjoying Birch?",
  "popup_text": "Enjoying Birch? Rate us in the store. Not now Rate",
  "verdict": "handled",
  "action": "tap Not now",
  "popup_gone": true,
  "dismissed_in_ms": 1531,
  "step_count": 1,
  "run_count": 1,
  "screenshots": ["popup_1e30795d_1_before.png", "popup_1e30795d_1_after.png"],
  "page_source": null,
  "code": null,
  "stop_run": false
}
```

- `verdict` is `handled`, `stopped`, `limit` or `unknown`.
- `popup_kind` is `system_alert` for a prompt of the operating system, and `in_app` for a popup of the app.
- The event also names the keyword, the element, the test case and the module.

With `file_log: true`, `execution_logs.log` ends with one line for each rule:

```text
Popup 'rate_prompt': handled 1, limit 1, stopped 0
```

## Where to put rules

Optics reads rules from these places. A rule replaces an earlier rule with the same name.

- `popup_rules` in [config.yaml](https://optics-framework.org/docs/reference/config#popup-rules), as a list in the same format.
- Every file named `popup_rules.json` in the project, in path order. `optics execute`, `optics dry_run`, `optics live` and `optics generate` read them. See [Project files](https://optics-framework.org/docs/reference/files#popup-rules).
- Over HTTP, `popup_rules` when you start a session, or `PUT /v1/sessions/{id}/popup_rules` later. See [Popups over HTTP](https://optics-framework.org/docs/reference/http-api#popups-over-http).
- In Python and Robot Framework, `add_popup_rules` (`Add Popup Rules`). Read the results with `get_popup_events` and `get_popup_summary`.

`optics generate` copies the rules into the generated code. When a rule runs a module, the generated code also gets every module and element of the suite.

## Permission prompts

On Android, set `permissions` in config.yaml to grant or deny app permissions before the app opens, so the prompt never shows. See [Android](https://optics-framework.org/docs/platforms/android#grant-permissions-before-launch). On iOS, answer system alerts with a capability or an `alert` action. See [iOS](https://optics-framework.org/docs/platforms/ios#answer-system-alerts).

## See also

- [Conditions and loops](https://optics-framework.org/docs/advanced/conditions), for screens that show only sometimes
- [Self-heal](https://optics-framework.org/docs/elements/self-heal)
- [Error codes](https://optics-framework.org/docs/reference/errors)
