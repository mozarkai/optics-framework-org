# Popups, swatted

The popups playground at https://optics-framework.org/popups throws eleven popups at a three-test suite on Birch, a demo shop app drawn in the page. The optics-framework 1.11.5 wheel from PyPI runs on Python in WebAssembly. When a popup blocks a step, its popup guard reads the screen, runs the matching rule and tries the step again. You turn each popup and each rule on or off, then run the suite.

## The popups

| Popup | Shows | Rule | What it shows |
|---|---|---|---|
| Cookie banner | After launch | Tap `Reject all` | A bottom sheet |
| Notifications | After launch | Tap `Don't allow`, found by XPath on the permission controller | Two popups in one step |
| Rate us | After sign-in | Tap `Not now` | A plain dialog |
| Is this you? | After sign-in | `sensitive` | Optics presses nothing and stops the run with E0408 |
| Session expired | After Trail | Run the `Sign In Again` module | A module as the action |
| Update | After Trail | Tap `Remind me later`, with the fallback `Later` | The fallback target |
| Flash sale | On the shoe | Found by `resource_id`; tap the XPath of its close button | A full-screen interstitial |
| What's new | On the shoe | `back` | The back action |
| Spin to win | On the shoe | Tap `No thanks`, `max_per_step: 2` | It comes back each time, so the step fails with E0407 |
| Chat bubble | After size 10 | Tap `Minimise`, `check: before_every_step` | A bubble that covers `Add to cart` |
| Birch Club | After size 10 | Tap `No thanks` | With its rule off, the step fails with E0206 |

## The scenarios

- **Every rule:** eight popups, eight rules. Every test passes.
- **No rules:** the same popups and no `popup_rules.json`. Optics does not look for popups, so the steps fail because their elements are not on the screen.
- **Unknown popup:** Birch Club shows and has no rule. Optics sees a dialog that no rule matches and fails the step with E0206.
- **Clingy:** Spin to win comes back after each dismissal. After two dismissals in one step, Optics stops with E0407.
- **Hands off:** the sign-in check is `sensitive`. Optics presses nothing on it and stops the run with E0408, so the other tests do not run.

## The suite

```yaml
Test Cases:
  - Sign in:
      - Sign In
  - Find the trail shoe:
      - Find Shoe
  - Add it to the cart:
      - Add To Cart

Modules:
  - Sign In:
      - Launch App
      - Enter Text ${email_field} ava@birch.shop
      - Enter Text ${password_field} ${password}
      - Press Element ${sign_in}
  - Find Shoe:
      - Press Element "Trail"
      - Press Element "Trail Runner 2"
  - Add To Cart:
      - Press Element "10"
      - Press Element "Add to cart"
      - Assert Presence "Added to cart" timeout_str=5
  - Sign In Again:
      - Press Element "OK"
      - Enter Text ${email_field} ava@birch.shop
      - Enter Text ${password_field} ${password}
      - Press Element ${sign_in}

Elements:
  email_field: "//*[@resource-id='com.birch.shop:id/email']"
  password_field: "//*[@resource-id='com.birch.shop:id/password']"
  sign_in: "//*[@resource-id='com.birch.shop:id/login']"
  password: correct-horse
```

## The rules

```json
[
  {"name": "cookies", "detect": {"text_contains": ["We use cookies"]}, "action": {"type": "tap", "target": "Reject all"}},
  {"name": "notifications", "detect": {"xpath": "//*[@package='com.android.permissioncontroller']"}, "action": {"type": "tap", "target": "Don't allow"}},
  {"name": "rate_prompt", "detect": {"text_contains": ["Enjoying Birch?"]}, "action": {"type": "tap", "target": "Not now"}},
  {"name": "security_check", "detect": {"text_contains": ["Is this you?"]}, "sensitive": true},
  {"name": "session_expired", "detect": {"text_contains": ["Session expired"]}, "action": {"type": "module", "target": "Sign In Again"}},
  {"name": "update_prompt", "detect": {"text_contains": ["Update available"]}, "action": {"type": "tap", "target": "Remind me later", "fallback": "Later"}},
  {"name": "flash_sale", "detect": {"resource_id": "com.birch.shop:id/promo_interstitial"}, "action": {"type": "tap", "target": "//*[@content-desc='Close']"}},
  {"name": "whats_new", "detect": {"text_contains": ["What's new"]}, "action": {"type": "back"}},
  {"name": "spin_to_win", "detect": {"text_contains": ["Spin to win"]}, "action": {"type": "tap", "target": "No thanks"}, "max_per_step": 2},
  {"name": "chat_bubble", "check": "before_every_step", "detect": {"text_contains": ["Chat with Birch"]}, "action": {"type": "tap", "target": "Minimise"}},
  {"name": "birch_club", "detect": {"text_contains": ["Birch Club"]}, "action": {"type": "tap", "target": "No thanks"}}
]
```

## What runs there

- **Optics:** the optics-framework 1.11.5 wheel from PyPI, unchanged: the popup guard, `popup_rules.json`, the retry, the limits, the popup events and the error codes.
- **The popups:** the page draws them. It gives each one the UI tree a real Android app gives: an AlertDialog under `android:id/parentPanel`, a sheet under `design_bottom_sheet`, a permission prompt from the permission controller.
- **Reading them:** on a device, the Appium driver reads popups. In the page, the Birch driver hands its page source to the same Appium screen reader, so the guard sees what it would see on a phone.

To write rules for your own app, read Handle popups (https://optics-framework.org/docs/advanced/popups).
