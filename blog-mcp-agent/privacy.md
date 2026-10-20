# Privacy

This page covers optics-framework.org and its install scripts. The short version: the site does not track you.

## This website

optics-framework.org is a static site. It sets no cookies, runs no analytics or advertising scripts and loads nothing from third-party servers: the fonts, video and scripts are all served from this domain. The only thing it stores in your browser is your light or dark theme choice, kept in local storage on your device and never sent anywhere.

The site is hosted on GitHub Pages. Like any web host, GitHub receives your IP address and request details when you load a page, and may keep them in server logs for security and operations. That processing is covered by the [GitHub General Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).

## The install scripts

The scripts at `/install` and `/install.ps1` run on your machine. They create a Python environment under `~/.optics` and install the `optics-framework` package from the Python Package Index, so PyPI receives the download request. The scripts send nothing else about you or your machine anywhere.

## The framework

Optics runs on your own machine or CI and contains no telemetry. Your suites, screenshots and results stay where you run them. If you turn on the optional AI features (natural-language mode in `optics live` or AI self-heal), Optics sends screenshots and page source to the model provider you configure, under that provider's terms.
