# Record a test

> Build a test by running steps one at a time against the live app, then save the ones that worked.

`optics live` opens an interactive session next to your device or browser. You type a step, Optics runs it straight away, and you see whether it worked. Every step that succeeds is recorded. When the flow is done, `/save` writes it into your suite as a module, ready for `optics execute`.

## Before you begin

You need a project with a working `config.yaml` that has **exactly one** driver enabled. Any project from `optics quickstart` or the [first test tutorial](https://optics-framework.org/docs/get-started/first-test) works. For a phone, start the Appium server and your emulator first. See [Android](https://optics-framework.org/docs/platforms/android) or [iOS](https://optics-framework.org/docs/platforms/ios).

## Start a session

```shell
$ optics live birch-tests
```

Leave out the folder to use the config.yaml in the current one. The driver comes only from config.yaml, so the same session works for Appium, Selenium, Playwright and TV projects. Optics opens the app straight away (it runs `launch_app` for you), so the first line of the session is already a recorded step. Appium launches the `appPackage` and `appActivity` of the config, and Selenium and Playwright open the configured URL. Optics loads the elements of your project the first time a step needs them.

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

- **History**, at the top: each step as you typed it, with ✓, ✗ or `⋯` while it runs, how long it took, and how the element was found (`[XPath]`, `[Text]`, `[OCR]` or `[Image]`). It scrolls to the newest step.
- **Input**, in the middle: where you type.
- **Status bar**, at the bottom: the device or browser you're connected to, such as `appium:emulator-5554`, `selenium:chrome` or `playwright:chromium`, `rec ●` to show recording is on, and a hint of the commands.

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
- Put a name inside a longer value, such as `enter_text ${email_field} "ava+${tag}@birch.shop"`. Live uses the first value of `tag`. A name that is not defined fails the step.
- Type `name=value` to give a parameter by name. For example, `press_element "Add to cart" index=1` presses the second match. On Appium, `index=` also picks among native elements with the same text.
- Type `go_back` to go back one screen. Type `assert_text ${greeting} "Hi, Ava"` to fail the step when the element shows other text.
- Press Tab to complete a keyword name. Completion lists the same keywords that `optics execute` runs. The parameters of the keyword then appear in grey as a hint: required ones in `<>`, optional ones in `[]`, such as `press_element <element> [repeat]`.
- When you type `${`, each element name shows its first locator. A `${name}` tries each locator of the element in order, as in a run.
- Press Ctrl+K to browse every keyword. Use ↑ and ↓ to move, Enter to put the keyword in the input, and Esc to close.

If a step fails, it's shown with ✗, the reason and the error code, and it isn't recorded. The session stays open. Try a different value and run it again. Only steps that work end up in your test.

## Save the recording

When the flow works, save it with a test case name and a module name:

```terminal
› /save Checkout Sign_In
  • Saved 4 step(s) → module 'Sign_In' in modules/modules.csv, test case 'Checkout' in test_cases/test_cases.csv
```

Optics then:

- appends the steps to `modules/modules.csv` as the module `Sign_In`,
- adds new elements to your elements CSV, or creates `elements/elements.csv` when the project has none,
- adds a `Checkout,Sign_In` row to `test_cases/test_cases.csv`,
- copies the session's screenshots to `execution_output/Sign_In/`,
- clears the recording, so the next steps you run become the next module.

Run more steps, then `/save Checkout Add_To_Cart` to add a second module to the same test case.

**Note:**
Names in `/save` can't contain spaces. Use underscores, or rename the module in `modules.csv` afterwards. If the module or test case already exists, Optics asks you to run the same `/save` again to confirm that you want to append to it.

`/save` writes the steps as you typed them. If you typed `press_element "Sign in"`, the module uses the text `Sign in`. To use a named element instead, type `${sign_in}`, or edit `modules.csv` afterwards and add the element to `elements.csv`. `/save` always writes CSV, even in a project that uses YAML.

`/save` does not write a value that you type into a secret field, such as a password. Live finds a secret field by its type (a password field), by a masked value, or by a name, caption, hint or locator such as "Password" or "PIN". A value typed without an element goes into the field that has focus. When live cannot tell which field that is, a secret field anywhere on the screen makes the value secret. The session keeps the real value, so you can run the steps again in the same session. The step `enter_text ${password_field} "correct horse"` is saved as `Enter Text,${password_field},${password_field_value}`. The elements CSV gets the row `password_field_value,<redacted>`. Before you run the test, put the real value in that row, or read it with `Read Data`. See [Hide sensitive values](https://optics-framework.org/docs/advanced/variables#hide-sensitive-values).

**Tip:**
When a password field is on screen, `/save` also hides a value that you type into a raw locator, such as `enter_text css=#user-name ava`. This makes sure that no password goes into your files. To keep the value, press the field first, or type into a named element, such as `${email_field}`.

## Commands and keys

| Command | What it does |
|---|---|
| `/save <test_case> <module>` | Save the recorded steps as a module in a test case. |
| `/elements` | Show every element defined in the project, with its locators, in a popup. |
| `/screenshot` | Save a screenshot to `screenshots/`. The history shows the path. |
| `/device` | List the Android (`adb`) and iOS (`idevice_id`) devices on this computer and pick one (Appium only). `/device <id>` switches directly. The device must match the platform in config.yaml. |
| `/help` | Show help. |
| `/quit`, `/exit` | Close the app, end the session and leave. `quit` and `exit` without the slash work too. If you have unsaved steps, Optics warns you once; `/quit` again discards them. |

An unknown command prints the list of commands.

**Remote Appium hubs:**
`/device` runs `adb devices` and `idevice_id -l` on your computer, so it sees only devices plugged into it. A device on a remote Appium hub is attached to the hub, so `/device` says it finds no devices, even while the session drives one. Pick a hub device with `udid` or `deviceName` in config.yaml. With Selenium or Playwright, `/device` says that it does not apply.

| Key | What it does |
|---|---|
| Enter | Run the step, or accept the selected completion. |
| Tab / Shift+Tab | Complete a keyword or element name. |
| ↑ / ↓ | Scroll an open popup (PgUp / PgDn for a page). Otherwise, recall earlier input. |
| Ctrl+K | Browse keywords. |
| Ctrl+N | Switch to plain-English mode. See [Describe a test](https://optics-framework.org/docs/create/describe). |
| Ctrl+X | Stop a plain-English run. It stops at the next step. |
| Esc | Close a popup. |
| Ctrl+C or Ctrl+D | Quit. |

On Android, plugging in a new phone during a session switches to it automatically and opens the app.

## Where files go

| Path | What's in it |
|---|---|
| `modules/modules.csv`, `test_cases/test_cases.csv` | Saved modules and test cases |
| `screenshots/session_<time>/` | Screenshots from every step in the session |
| `execution_output/<module>/` | A copy of the session's screenshots, made by `/save` |
| `logs/optics_live_<time>.log` | A full log of the session, useful when a step fails for unclear reasons |

- Every step, typed or from plain-English mode, saves the screenshot before the action, the result image and the area-of-interest captures to `screenshots/session_<time>/`. The folder stays after `/quit`. If the session took no screenshots, Optics deletes the empty folder when you quit.
- `/save` copies these screenshots to `execution_output/<module>/`, so a saved test has its pictures with it. Running `/save` again for the same module updates the copy.
- The screenshots that plain-English mode sends to the model are not saved.
- The log has the internal and the execution log lines in time order. `<time>` is the same in the log and the screenshot folder names. The first history line shows the log path, and Optics prints it again after `/quit`. The log stays whether you save or not.

## If it isn't working

- **"optics live needs a config.yaml…"**: run it from a project folder, or pass the folder: `optics live my_project`. To make a config.yaml for a folder, run `optics configure <folder>`. A config.yaml that is not valid shows its own parse or validation error.
- **"optics live supports exactly one enabled driver"**: set `enabled: false` on every driver in `config.yaml` except one.
- **Every step fails with "run `launch_app` first"**: the app didn't open. Check that the Appium server is running and the device is connected (`optics doctor my_project`), then type `launch_app`.

## See also

- [Describe a test in plain English](https://optics-framework.org/docs/create/describe)
- [Write a test suite](https://optics-framework.org/docs/create/write)
- [Keyword reference](https://optics-framework.org/docs/reference/keywords/)
