# Record a test

> Build a test by running steps one at a time against the live app, then save the ones that worked.

`optics live` opens an interactive session next to your device or browser. You type a step, Optics runs it straight away, and you see whether it worked. Every step that succeeds is recorded. When the flow is done, `/save` writes it into your suite as a module, ready for `optics execute`.

## Before you begin

You need a project with a working `config.yaml` that has **exactly one** driver enabled. Any project from `optics quickstart` or the [first test tutorial](https://optics-framework.org/docs/get-started/first-test) works. For a phone, start the Appium server and your emulator first. See [Android](https://optics-framework.org/docs/platforms/android) or [iOS](https://optics-framework.org/docs/platforms/ios).

## Start a session

```shell
$ optics live birch-tests
```

Leave out the folder to use the current one. Optics opens the app straight away (it runs `launch_app` for you), so the first line of the session is already a recorded step.

The screen has three parts:

```terminal
  ✓ launch_app
     1.21s
  ✓ enter_text ${email_field} ava@birch.shop
     0.48s  [XPath]
─────────────────────────────────────────────────────────────────
› press_element "Sign in"
─────────────────────────────────────────────────────────────────
appium:emulator-5554  ·  rec ●  ·  /help · /quit · Tab complete · Ctrl-K keywords · Ctrl-N AI mode
```

- **History**, at the top: each step with ✓ or ✗, how long it took, and how the element was found (`[XPath]`, `[Text]`, `[OCR]` or `[Image]`).
- **Input**, in the middle: where you type.
- **Status bar**, at the bottom: the device or browser you're connected to, and `rec ●` to show recording is on.

## Run steps

Type a keyword and its values, separated by spaces, and press Enter:

```terminal
› enter_text ${email_field} ava@birch.shop
› enter_text ${password_field} "correct horse"
› press_element "Sign in"
› assert_presence "Picked for you"
```

- Write keyword names in `snake_case` or in words: `press_element`, `Press Element` and `press element` all work.
- Put quotes around a value that contains spaces.
- Type `${` to pick from the elements already defined in your project.
- Press Tab to complete a keyword name. The rest of its parameters appear in grey as a hint.
- Press Ctrl+K to browse every keyword.

If a step fails, it's shown with ✗ and the reason, and it isn't recorded. Try a different value and run it again. Only steps that work end up in your test.

## Save the recording

When the flow works, save it with a test case name and a module name:

```terminal
› /save Checkout Sign_In
  • Saved 4 step(s) → module 'Sign_In' in modules/modules.csv, test case 'Checkout' in test_cases/test_cases.csv
```

Optics then:

- appends the steps to `modules/modules.csv` as the module `Sign_In`,
- adds a `Checkout,Sign_In` row to `test_cases/test_cases.csv`,
- copies the session's screenshots to `execution_output/Sign_In/`,
- clears the recording, so the next steps you run become the next module.

Run more steps, then `/save Checkout Add_To_Cart` to add a second module to the same test case.

**Note:**
Names in `/save` can't contain spaces. Use underscores, or rename the module in `modules.csv` afterwards. If the module or test case already exists, Optics asks you to run the same `/save` again to confirm that you want to append to it.

`/save` writes the steps exactly as you typed them. If you typed `press_element "Sign in"`, the module uses the text `Sign in`. To use a named element instead, type `${sign_in}`, or edit `modules.csv` afterwards and add the element to `elements.csv`. `/save` always writes CSV, even in a project that uses YAML.

## Commands and keys

| Command | What it does |
|---|---|
| `/save <test_case> <module>` | Save the recorded steps as a module in a test case. |
| `/elements` | Show every element defined in the project. |
| `/screenshot` | Save a screenshot to `screenshots/`. |
| `/device` | Pick a different connected phone or emulator (Appium only). `/device <id>` switches directly. |
| `/help` | Show help. |
| `/quit` | Leave. If you have unsaved steps, Optics warns you once; `/quit` again discards them. |

| Key | What it does |
|---|---|
| Enter | Run the step. |
| Tab / Shift+Tab | Complete a keyword or element name. |
| ↑ / ↓ | Recall earlier input. |
| Ctrl+K | Browse keywords. |
| Ctrl+N | Switch to plain-English mode. See [Describe a test](https://optics-framework.org/docs/create/describe). |
| Ctrl+X | Stop a plain-English run. |
| Esc | Close a popup. |
| Ctrl+C or Ctrl+D | Quit. |

On Android, plugging in a new phone during a session switches to it automatically and opens the app.

## Where files go

| Path | What's in it |
|---|---|
| `modules/modules.csv`, `test_cases/test_cases.csv` | Saved modules and test cases |
| `screenshots/session_<time>/` | Screenshots from every step in the session |
| `logs/optics_live_<time>.log` | A full log of the session, useful when a step fails for unclear reasons |

## If it isn't working

- **"optics live needs a config.yaml…"**: run it from a project folder, or pass the folder: `optics live my_project`.
- **"optics live supports exactly one enabled driver"**: set `enabled: false` on every driver in `config.yaml` except one.
- **Every step fails with "run `launch_app` first"**: the app didn't open. Check that the Appium server is running and the device is connected (`optics doctor my_project`), then type `launch_app`.

## See also

- [Describe a test in plain English](https://optics-framework.org/docs/create/describe)
- [Write a test suite](https://optics-framework.org/docs/create/write)
- [Keyword reference](https://optics-framework.org/docs/reference/keywords/)
