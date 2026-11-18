# Run Optics in your browser

The playground at https://optics-framework.org/playground runs the optics-framework 1.11.4 wheel from PyPI on Python, compiled to WebAssembly. You edit a YAML suite, then run `dry_run` or `execute` on Birch, a demo shop app drawn in the page.

## What runs there

- **Optics:** the optics-framework 1.11.4 wheel from PyPI, unchanged: suite loading, `dry_run`, keywords, element fallbacks, events and the JUnit report.
- **Python:** CPython 3.14 in WebAssembly, from Pyodide 314.0.8, with numpy, pandas, lxml, pydantic and the other libraries Optics imports. The site serves every file.
- **Driver:** on your machine, Optics drives apps through Appium, Playwright or Selenium. In the page, a small driver written for the page drives Birch, and an element source reads Birch as an Android-style UI tree.
- **Left out:** image and OCR matching (OpenCV), screenshot comparison (scikit-image) and the pytest runner. Text matching uses difflib, not python-Levenshtein, so a near match can score differently.
- **Pace:** the page waits after each step so you can watch the phone. The times in the run are the times Optics measured. In a browser without JSPI, the page cannot change while Python runs, so Optics skips its waits and moves its clock on instead.

## The suite

```yaml
Test Cases:
  - Shopper can add trail runners:
      - Sign In
      - Add To Cart

Modules:
  - Sign In:
      - Launch App
      - Enter Text ${email_field} ava@birch.shop
      - Enter Text ${password_field} ${password}
      - Press Element ${sign_in}
      - Assert Presence "Trail Runner 2"
  - Add To Cart:
      - Press Element "Trail Runner 2"
      - Press Element "Add to cart"
      - Assert Presence "Added to cart" timeout_str=5

Elements:
  email_field: "//*[@resource-id='com.birch.shop:id/email']"
  password_field: "//*[@resource-id='com.birch.shop:id/password']"
  sign_in:
    - "//*[@resource-id='com.birch.shop:id/login']"
    - Sign in
  password: correct-horse
```

To run the same suite on your own device, install Optics (https://optics-framework.org/#install) and read the YAML format (https://optics-framework.org/docs/create/yaml).
