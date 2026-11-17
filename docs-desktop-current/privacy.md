# Privacy

This page covers optics-framework.org and its install scripts. The short version: the site counts how its pages are used, and nothing it counts can identify you.

## This website

optics-framework.org is a static site. It sets no cookies, runs no advertising and loads nothing from third-party servers: the fonts, video and scripts are all served from this domain. Your browser keeps your theme, the docs tabs you pick and the checklist items you tick in its local storage on your device; they are never sent anywhere.

The site is hosted on GitHub Pages behind Cloudflare. Like any web host, GitHub and Cloudflare receive your IP address and request details when you load a page, and may keep them in server logs for security and operations. That processing is covered by the [GitHub General Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement) and the [Cloudflare Privacy Policy](https://www.cloudflare.com/privacypolicy/).

## What the site counts

To learn which pages help and where people get stuck, the site keeps its own usage counts, stored with Cloudflare and read only by the Optics maintainers. Nothing is shared with or sold to anyone.

For each request it records the page, the time, the response, the kind of client (a browser and its version, a script such as curl, or a named crawler or AI agent), the site that linked to the page and your country. It does not record your IP address.

In the browser, a small script on this domain reports what happens on a page, tagged with a random visit id that lives in your tab's session storage and ends when you close the tab, your device size (mobile, tablet or desktop) and your country. It reports these events:

**Reading:** `view` (a page opened, with the page or site you came from), `campaign` (the `ref` tag of a link you followed), `pref` (your theme, language and reduced-motion setting, once per visit), `section` (a section scrolled into view), `read` (how far down you read and for how long) and `vital` (how fast the page loaded and responded).

**Doing:** `copy` (a command you copied, or the length of other text), `tab` (a tab you picked), `nav` and `out` (a link you followed on this site or to another one), `search` and `result` (what you searched the docs for, how many results it found and which one you opened), `helpful` (your answer to "Was this page helpful?"), `check` (a checklist item you ticked), `details` (a collapsed section you opened), `film` and `scene` (the demo film and animations you played or paused), `theme` and `filter` (the theme toggle and the blog filters), `ui` (the docs menu and search button) and `error` (a script error on the page).

The script sends nothing when your browser asks sites not to track it, through Global Privacy Control or Do Not Track. It never reads what you type outside the docs search box.

## The install scripts

The scripts at `/install` and `/install.ps1` run on your machine. They create a Python environment under `~/.optics` and install the `optics-framework` package from the Python Package Index, so PyPI receives the download request. Fetching a script is counted like any other request; once running, the scripts send nothing about you or your machine anywhere.

## The framework

Optics runs on your own machine or CI and contains no telemetry. Your suites, screenshots and results stay where you run them. If you turn on the optional AI features (natural-language mode in `optics live` or AI self-heal), Optics sends screenshots and page source to the model provider you configure, under that provider's terms.
