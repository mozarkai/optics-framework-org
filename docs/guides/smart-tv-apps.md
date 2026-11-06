---
title: Test Android TV, Samsung Tizen and LG webOS apps with one framework
nav: Smart TV apps
summary: Test Android TV, Samsung Tizen and LG webOS apps with one tool and remote-control keys.
description: Automate smart TV app testing on Android TV, Samsung Tizen and LG webOS with Optics, an open-source framework that drives TVs through Appium and remote-control keys.
level: Intermediate
time: 10 min
---

You can test a TV app the way a viewer uses it: press arrow keys on the remote, open a tile, start playback and check what is on screen. Optics drives Android TV, Samsung Tizen and LG webOS through **Appium**, the same server it uses for phones. Your tests are rows in CSV files, so one suite style covers your phone, web and TV apps.

This page walks you through the job and links to the pages that hold the details. [Test TV apps](/docs/platforms/tv) is the full reference.

## Check what each TV supports

Each TV platform has its own Appium driver. You pick it with `platformName` in `config.yaml`.

| TV platform | `platformName` | How you move around | How Optics sees the screen |
|---|---|---|---|
| Android TV | `Android` | Android key numbers, plus taps and typing | UI tree and screenshots, like an Android phone |
| Samsung Tizen | `TizenTV` | Remote key names, and element keywords that move focus | The app's DOM, and a camera for screenshots |
| LG webOS | `LGTV` | Remote key names, and element keywords that move focus | The app's DOM, and screenshots |

Tizen and webOS TVs have no touch screen. Press Element and Enter Text still work there. They press remote keys until the focus reaches the element. Touch keywords, such as Swipe and Scroll, fail with **E0105**. [Keywords that fail on Tizen and webOS](/docs/platforms/tv#keywords-that-fail-on-tizen-and-webos) lists every keyword.

## Set up

:::steps
### Install Optics and Appium

[Install Optics](/docs/get-started/install), then add the Appium engine and the Appium server:

```shell
$ optics setup --install appium
$ npm install -g appium
```

### Prepare the TV

Turn on developer mode on the TV, install the vendor's tools, and put the TV on the same network as your machine. Each Appium driver's project page covers these steps.

### Add the driver for your TV

- **Android TV** uses the same setup as an Android phone. Follow [Test Android apps](/docs/platforms/android) and connect with `adb connect <tv-ip>`.
- **Samsung Tizen**: `appium driver install --source=npm appium-tizen-tv-driver`, then copy the [Tizen config](/docs/platforms/tv#samsung-tizen).
- **LG webOS**: `appium driver install --source=npm appium-lg-webos-driver`, then copy the [webOS config](/docs/platforms/tv#lg-webos).

### Check the setup

Start `appium` in another terminal, then run `optics doctor` on your project. On Tizen and webOS, the doctor warns about phone settings such as `appActivity`. You can ignore those warnings as long as `config: driver` and `config: appium element source` show ✅. See [Check the setup](/docs/platforms/tv#check-the-setup).
:::

## Write the test with remote keys and focus

A TV test is a list of key presses with a check after each page change. This module opens the second tile in a row and checks the title:

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2
Open Birch TV,Launch App
Open Birch TV,Assert Presence,Featured,30
Open the second shoe,Press Keycode,DOWN
Open the second shoe,Press Keycode,RIGHT
Open the second shoe,Press Keycode,ENTER
Open the second shoe,Assert Presence,Trail Runner 2,10
```

On Tizen and webOS, Press Keycode takes key names such as `UP`, `ENTER`, `BACK` and `PLAY`. On Android TV, it takes Android key numbers instead: `19` to `22` for the arrows and `23` for Select. [Move around with remote keys](/docs/platforms/tv#move-around-with-remote-keys) has both tables.

On Tizen and webOS, you can also name the element and let Optics move the focus. Press Element presses the arrow keys until the element has focus, then presses `ENTER`:

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2
Open the second shoe,Press Element,Trail Runner 2
Open the second shoe,Assert Presence,Add to cart,10
```

To type on a Tizen or webOS TV, use Enter Text. Optics types into a real `<input>`, or presses the keys of the on-screen keyboard one by one. If the field does not show the text, the step fails with **E0405**. See [Type on a TV](/docs/platforms/tv#type-on-a-tv).

## Keep TV tests reliable

- **Assert after each page change.** Keys do not wait for the app. Assert Presence waits for the next page, so the next key lands in the right place.
- **Start from a known place.** Begin each test with Launch App and an assertion on the first screen.
- **Expect each focus move to take time.** Each focus move is one key press, and a key press takes 1 to 2 seconds.
- **Use images for icons.** Add [image matching](/docs/elements/text-and-images) when a tile or button has no text.

## Run it on every build

Run the suite with `optics execute`, as you would a phone suite. Before each run, Optics checks that the Appium server answers. It does not check the TV itself, so make sure that the TV is on and reachable. [Run tests in CI](/docs/run/ci) covers the JUnit report your CI system reads.

## See also

- [Test TV apps](/docs/platforms/tv), the full TV reference
- [Supported platforms](/docs/platforms/)
- [Press Keycode](/docs/reference/keywords/actions#press-keycode)
- [Find elements by text and image](/docs/elements/text-and-images)
