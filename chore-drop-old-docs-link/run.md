# A real run

Birch is a real web app at https://optics-framework.org/birch/. On 18 November 2026, Optics 1.11.4 (Playwright 1.62.0, Chromium as Pixel 7, macOS arm64) ran the Birch suite at https://optics-framework.org/birch-tests/ against two releases of it. Every step passed both times. Release 2.2 shows "Session expired" at checkout, and on-screen error detection failed the run.

## Run it yourself

```shell
pip install optics-framework==1.11.4 && optics setup --install playwright easyocr
for f in config.yaml test_cases/test_cases.csv modules/modules.csv test_data/elements.csv test_data/error_definitions.csv test_data/cart.png; do curl -fsSL --create-dirs -o "birch-tests/$f" "https://optics-framework.org/birch-tests/$f"; done
BIRCH_URL=https://optics-framework.org/birch/ optics execute birch-tests
BIRCH_URL='https://optics-framework.org/birch/?release=2.2' optics execute birch-tests
```

## Birch 2.1: exit 0

Command: `BIRCH_URL='http://127.0.0.1:4180/birch/' optics execute birch-tests`

| Test case | Keyword | Parameters | Found by | Took | Status |
|---|---|---|---|---|---|
| Suite Setup | Read Data | ${birch_url}, ENV:BIRCH_URL |  | 0.004 s | PASS |
| Suite Setup | Launch App | ${birch_url} |  | 0.829 s | PASS |
| Shopper can sign in | Enter Text | ${email_field}, ava@birch.shop | XPath | 0.109 s | PASS |
| Shopper can sign in | Enter Text | ${password_field}, birch-demo | XPath | 0.076 s | PASS |
| Shopper can sign in | Press Element | Sign in | Text | 0.090 s | PASS |
| Shopper can sign in | Assert Presence | Picked for you | Text | 0.034 s | PASS |
| Shopper can find a shoe | Assert Presence | Free returns | OCR | 0.818 s | PASS |
| Shopper can find a shoe | Enter Text | ${search_field}, trail | Text | 0.038 s | PASS |
| Shopper can find a shoe | Press Element | Trail Runner 2 | Text | 0.077 s | PASS |
| Shopper can add it to the cart | Press Element | 10 | Text | 0.080 s | PASS |
| Shopper can add it to the cart | Press Element | Add to cart | Text | 0.085 s | PASS |
| Shopper can add it to the cart | Assert Presence | Added to cart | Text | 0.028 s | PASS |
| Shopper can check out | Press Element | ${cart_button} | Image | 0.104 s | PASS |
| Shopper can check out | Press Element | Check out | Text | 0.081 s | PASS |

```terminal
Test Suite
├── Suite Setup                                          |      0.84s |    PASS
│   └── Open Birch                                       |      0.84s |    PASS
│       ├── Read Data (${birch_url}, ENV:BIRCH_URL)      |      0.00s |    PASS
│       └── Launch App (${birch_url})                    |      0.83s |    PASS
├── Shopper can sign in                                  |      0.31s |    PASS
│   └── Sign In                                          |      0.31s |    PASS
│       ├── Enter Text (//input[@id='email'], ava@bir... |      0.11s |    PASS
│       ├── Enter Text (//input[@id='password'], birc... |      0.08s |    PASS
│       ├── Press Element (Sign in)                      |      0.09s |    PASS
│       └── Assert Presence (Picked for you)             |      0.03s |    PASS
├── Shopper can find a shoe                              |      0.94s |    PASS
│   └── Find A Shoe                                      |      0.93s |    PASS
│       ├── Assert Presence (Free returns)               |      0.82s |    PASS
│       ├── Enter Text (css=#search, trail)              |      0.04s |    PASS
│       └── Press Element (Trail Runner 2)               |      0.08s |    PASS
├── Shopper can add it to the cart                       |      0.19s |    PASS
│   └── Add To Cart                                      |      0.19s |    PASS
│       ├── Press Element (10)                           |      0.08s |    PASS
│       ├── Press Element (Add to cart)                  |      0.08s |    PASS
│       └── Assert Presence (Added to cart)              |      0.03s |    PASS
└── Shopper can check out                                |      0.19s |    PASS
    └── Check Out                                        |      0.19s |    PASS
        ├── Press Element (cart.png)                     |      0.10s |    PASS
        └── Press Element (Check out)                    |      0.08s |    PASS
╭──────────────────────────────────────────────────────────────────────────────╮
│ Total Test Cases: 5 | Passed: 5 | Failed: 0                                  │
╰──────────────────────────────────────────────────────────────────────────────╯
```

Files: [execution_logs.log](https://optics-framework.org/runs/birch-2.1/execution_logs.log), [internal_logs.log](https://optics-framework.org/runs/birch-2.1/internal_logs.log), [junit_output.xml](https://optics-framework.org/runs/birch-2.1/junit_output.xml), [logs.json](https://optics-framework.org/runs/birch-2.1/logs.json), [terminal.txt](https://optics-framework.org/runs/birch-2.1/terminal.txt)

## Birch 2.2: exit 1

Command: `BIRCH_URL='http://127.0.0.1:4180/birch/?release=2.2' optics execute birch-tests`

| Test case | Keyword | Parameters | Found by | Took | Status |
|---|---|---|---|---|---|
| Suite Setup | Read Data | ${birch_url}, ENV:BIRCH_URL |  | 0.007 s | PASS |
| Suite Setup | Launch App | ${birch_url} |  | 0.479 s | PASS |
| Shopper can sign in | Enter Text | ${email_field}, ava@birch.shop | XPath | 0.066 s | PASS |
| Shopper can sign in | Enter Text | ${password_field}, birch-demo | XPath | 0.064 s | PASS |
| Shopper can sign in | Press Element | Sign in | Text | 0.093 s | PASS |
| Shopper can sign in | Assert Presence | Picked for you | Text | 0.025 s | PASS |
| Shopper can find a shoe | Assert Presence | Free returns | OCR | 0.581 s | PASS |
| Shopper can find a shoe | Enter Text | ${search_field}, trail | Text | 0.042 s | PASS |
| Shopper can find a shoe | Press Element | Trail Runner 2 | Text | 0.078 s | PASS |
| Shopper can add it to the cart | Press Element | 10 | Text | 0.077 s | PASS |
| Shopper can add it to the cart | Press Element | Add to cart | Text | 0.068 s | PASS |
| Shopper can add it to the cart | Assert Presence | Added to cart | Text | 0.028 s | PASS |
| Shopper can check out | Press Element | ${cart_button} | Image | 0.102 s | PASS |
| Shopper can check out | Press Element | Check out | Text | 0.065 s | PASS |

```terminal
Test Suite
├── Suite Setup                                          |      0.49s |    PASS
│   └── Open Birch                                       |      0.49s |    PASS
│       ├── Read Data (${birch_url}, ENV:BIRCH_URL)      |      0.01s |    PASS
│       └── Launch App (${birch_url})                    |      0.48s |    PASS
├── Shopper can sign in                                  |      0.25s |    PASS
│   └── Sign In                                          |      0.25s |    PASS
│       ├── Enter Text (//input[@id='email'], ava@bir... |      0.07s |    PASS
│       ├── Enter Text (//input[@id='password'], birc... |      0.06s |    PASS
│       ├── Press Element (Sign in)                      |      0.09s |    PASS
│       └── Assert Presence (Picked for you)             |      0.02s |    PASS
├── Shopper can find a shoe                              |      0.70s |    PASS
│   └── Find A Shoe                                      |      0.70s |    PASS
│       ├── Assert Presence (Free returns)               |      0.58s |    PASS
│       ├── Enter Text (css=#search, trail)              |      0.04s |    PASS
│       └── Press Element (Trail Runner 2)               |      0.08s |    PASS
├── Shopper can add it to the cart                       |      0.18s |    PASS
│   └── Add To Cart                                      |      0.18s |    PASS
│       ├── Press Element (10)                           |      0.08s |    PASS
│       ├── Press Element (Add to cart)                  |      0.07s |    PASS
│       └── Assert Presence (Added to cart)              |      0.03s |    PASS
├── Shopper can check out                                |      0.17s |    PASS
│   └── Check Out                                        |      0.17s |    PASS
│       ├── Press Element (cart.png)                     |      0.10s |    PASS
│       └── Press Element (Check out)                    |      0.07s |    PASS
└── on-screen-error-detection                            |      0.00s |    FAIL
╭──────────────────────────────────────────────────────────────────────────────╮
│ Total Test Cases: 6 | Passed: 5 | Failed: 1                                  │
╰──────────────────────────────────────────────────────────────────────────────╯
```

Detected errors:

```json
[
  {
    "error_code": "ERR_SESSION",
    "matched_on": "match_string",
    "match_string": "Session expired",
    "description": "The shopper was signed out",
    "severity": "high",
    "detected_at": "end_of_run"
  }
]
```

Files: [detected_errors.json](https://optics-framework.org/runs/birch-2.2/detected_errors.json), [execution_logs.log](https://optics-framework.org/runs/birch-2.2/execution_logs.log), [internal_logs.log](https://optics-framework.org/runs/birch-2.2/internal_logs.log), [junit_output.xml](https://optics-framework.org/runs/birch-2.2/junit_output.xml), [logs.json](https://optics-framework.org/runs/birch-2.2/logs.json), [terminal.txt](https://optics-framework.org/runs/birch-2.2/terminal.txt)
