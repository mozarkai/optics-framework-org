window.BIRCH_RUN = {
 "optics": "1.11.4",
 "playwright": "1.62.0",
 "platform": "macOS arm64",
 "suite": {
  "config.yaml": "driver_sources:\n  - playwright:\n      enabled: true\n      capabilities:\n        browser: chromium\n        headless: true\n        device: \"Pixel 7\"\nelements_sources:\n  - playwright_find_element: {enabled: true}\n  - playwright_page_source: {enabled: true}\n  - playwright_screenshot: {enabled: true}\ntext_detection:\n  - easyocr: {enabled: true}\nimage_detection:\n  - templatematch: {enabled: true}\nfile_log: true\njson_log: true\n",
  "test_cases/test_cases.csv": "test_case,test_step\nSuite Setup,Open Birch\nShopper can sign in,Sign In\nShopper can find a shoe,Find A Shoe\nShopper can add it to the cart,Add To Cart\nShopper can check out,Check Out\n",
  "modules/modules.csv": "module_name,module_step,param_1,param_2\nOpen Birch,Read Data,${birch_url},ENV:BIRCH_URL\nOpen Birch,Launch App,${birch_url}\nSign In,Enter Text,${email_field},ava@birch.shop\nSign In,Enter Text,${password_field},birch-demo\nSign In,Press Element,Sign in\nSign In,Assert Presence,Picked for you\nFind A Shoe,Assert Presence,Free returns\nFind A Shoe,Enter Text,${search_field},trail\nFind A Shoe,Press Element,Trail Runner 2\nAdd To Cart,Press Element,10\nAdd To Cart,Press Element,Add to cart\nAdd To Cart,Assert Presence,Added to cart\nCheck Out,Press Element,${cart_button}\nCheck Out,Press Element,Check out\n",
  "test_data/elements.csv": "Element_Name,Element_ID\nemail_field,//input[@id='email']\npassword_field,//input[@id='password']\nsearch_field,css=#search\ncart_button,cart.png\n",
  "test_data/error_definitions.csv": "error_code,match_string,description,severity\nERR_SESSION,Session expired,The shopper was signed out,high\nERR_SERVER,Something went wrong,The server returned an error page,high\n"
 },
 "runs": [
  {
   "release": "2.1",
   "command": "BIRCH_URL='http://127.0.0.1:4180/birch/' optics execute birch-tests",
   "exit": 0,
   "date": "2026-11-18",
   "started": "2026-11-18T17:01:24+00:00",
   "tree": "Test Suite\n\u251c\u2500\u2500 Suite Setup                                          |      0.84s |    PASS\n\u2502   \u2514\u2500\u2500 Open Birch                                       |      0.84s |    PASS\n\u2502       \u251c\u2500\u2500 Read Data (${birch_url}, ENV:BIRCH_URL)      |      0.00s |    PASS\n\u2502       \u2514\u2500\u2500 Launch App (${birch_url})                    |      0.83s |    PASS\n\u251c\u2500\u2500 Shopper can sign in                                  |      0.31s |    PASS\n\u2502   \u2514\u2500\u2500 Sign In                                          |      0.31s |    PASS\n\u2502       \u251c\u2500\u2500 Enter Text (//input[@id='email'], ava@bir... |      0.11s |    PASS\n\u2502       \u251c\u2500\u2500 Enter Text (//input[@id='password'], birc... |      0.08s |    PASS\n\u2502       \u251c\u2500\u2500 Press Element (Sign in)                      |      0.09s |    PASS\n\u2502       \u2514\u2500\u2500 Assert Presence (Picked for you)             |      0.03s |    PASS\n\u251c\u2500\u2500 Shopper can find a shoe                              |      0.94s |    PASS\n\u2502   \u2514\u2500\u2500 Find A Shoe                                      |      0.93s |    PASS\n\u2502       \u251c\u2500\u2500 Assert Presence (Free returns)               |      0.82s |    PASS\n\u2502       \u251c\u2500\u2500 Enter Text (css=#search, trail)              |      0.04s |    PASS\n\u2502       \u2514\u2500\u2500 Press Element (Trail Runner 2)               |      0.08s |    PASS\n\u251c\u2500\u2500 Shopper can add it to the cart                       |      0.19s |    PASS\n\u2502   \u2514\u2500\u2500 Add To Cart                                      |      0.19s |    PASS\n\u2502       \u251c\u2500\u2500 Press Element (10)                           |      0.08s |    PASS\n\u2502       \u251c\u2500\u2500 Press Element (Add to cart)                  |      0.08s |    PASS\n\u2502       \u2514\u2500\u2500 Assert Presence (Added to cart)              |      0.03s |    PASS\n\u2514\u2500\u2500 Shopper can check out                                |      0.19s |    PASS\n    \u2514\u2500\u2500 Check Out                                        |      0.19s |    PASS\n        \u251c\u2500\u2500 Press Element (cart.png)                     |      0.10s |    PASS\n        \u2514\u2500\u2500 Press Element (Check out)                    |      0.08s |    PASS\n\u256d\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256e\n\u2502 Total Test Cases: 5 | Passed: 5 | Failed: 0                                  \u2502\n\u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256f",
   "cases": [
    {
     "name": "Suite Setup",
     "status": "PASS",
     "time": 0.84
    },
    {
     "name": "Shopper can sign in",
     "status": "PASS",
     "time": 0.31
    },
    {
     "name": "Shopper can find a shoe",
     "status": "PASS",
     "time": 0.94
    },
    {
     "name": "Shopper can add it to the cart",
     "status": "PASS",
     "time": 0.19
    },
    {
     "name": "Shopper can check out",
     "status": "PASS",
     "time": 0.19
    }
   ],
   "steps": [
    {
     "case": "Suite Setup",
     "module": "Open Birch",
     "keyword": "Read Data",
     "args": [
      "${birch_url}",
      "ENV:BIRCH_URL"
     ],
     "status": "PASS",
     "elapsed": 0.004,
     "at": 0.001,
     "found_by": [],
     "message": null
    },
    {
     "case": "Suite Setup",
     "module": "Open Birch",
     "keyword": "Launch App",
     "args": [
      "${birch_url}"
     ],
     "status": "PASS",
     "elapsed": 0.829,
     "at": 0.006,
     "found_by": [],
     "message": null
    },
    {
     "case": "Shopper can sign in",
     "module": "Sign In",
     "keyword": "Enter Text",
     "args": [
      "${email_field}",
      "ava@birch.shop"
     ],
     "status": "PASS",
     "elapsed": 0.109,
     "at": 0.837,
     "found_by": [
      {
       "rung": "XPath",
       "strategy": "XPathStrategy",
       "value": "//input[@id='email']",
       "ok": true
      }
     ],
     "message": null,
     "pre": "runs/birch-2.1/03-pre.webp?v=0eea8e3ad4",
     "found": "runs/birch-2.1/03-found.webp?v=11f2acacea",
     "box": [
      31,
      244,
      382,
      273
     ]
    },
    {
     "case": "Shopper can sign in",
     "module": "Sign In",
     "keyword": "Enter Text",
     "args": [
      "${password_field}",
      "birch-demo"
     ],
     "status": "PASS",
     "elapsed": 0.076,
     "at": 0.947,
     "found_by": [
      {
       "rung": "XPath",
       "strategy": "XPathStrategy",
       "value": "//input[@id='password']",
       "ok": true
      }
     ],
     "message": null,
     "pre": "runs/birch-2.1/04-pre.webp?v=2bbd480c42",
     "found": "runs/birch-2.1/04-found.webp?v=3f226d37a0",
     "box": [
      31,
      316,
      382,
      345
     ]
    },
    {
     "case": "Shopper can sign in",
     "module": "Sign In",
     "keyword": "Press Element",
     "args": [
      "Sign in"
     ],
     "status": "PASS",
     "elapsed": 0.09,
     "at": 1.023,
     "found_by": [
      {
       "rung": "Text",
       "strategy": "TextElementStrategy",
       "value": "Sign in",
       "ok": true
      }
     ],
     "message": null,
     "pre": "runs/birch-2.1/05-pre.webp?v=875e411cc2",
     "found": "runs/birch-2.1/05-found.webp?v=544f423dff",
     "box": [
      16,
      369,
      397,
      428
     ]
    },
    {
     "case": "Shopper can sign in",
     "module": "Sign In",
     "keyword": "Assert Presence",
     "args": [
      "Picked for you"
     ],
     "status": "PASS",
     "elapsed": 0.034,
     "at": 1.113,
     "found_by": [
      {
       "rung": "Text",
       "strategy": "TextElementStrategy",
       "value": "['Picked for you']",
       "ok": true
      }
     ],
     "message": null,
     "found": "runs/birch-2.1/06-found.webp?v=2beebbe335",
     "box": [
      16,
      269,
      397,
      302
     ]
    },
    {
     "case": "Shopper can find a shoe",
     "module": "Find A Shoe",
     "keyword": "Assert Presence",
     "args": [
      "Free returns"
     ],
     "status": "PASS",
     "elapsed": 0.818,
     "at": 1.149,
     "found_by": [
      {
       "rung": "OCR",
       "strategy": "TextDetectionStrategy",
       "value": "['Free returns']",
       "ok": true
      }
     ],
     "message": null,
     "found": "runs/birch-2.1/07-found.webp?v=86d65fd0de",
     "box": [
      33,
      168,
      183,
      199
     ]
    },
    {
     "case": "Shopper can find a shoe",
     "module": "Find A Shoe",
     "keyword": "Enter Text",
     "args": [
      "${search_field}",
      "trail"
     ],
     "status": "PASS",
     "elapsed": 0.038,
     "at": 1.968,
     "found_by": [
      {
       "rung": "Text",
       "strategy": "TextElementStrategy",
       "value": "css=#search",
       "ok": true
      }
     ],
     "message": null,
     "pre": "runs/birch-2.1/08-pre.webp?v=e5240abacb",
     "found": "runs/birch-2.1/08-found.webp?v=9cf9306134",
     "box": [
      57,
      78,
      383,
      129
     ]
    },
    {
     "case": "Shopper can find a shoe",
     "module": "Find A Shoe",
     "keyword": "Press Element",
     "args": [
      "Trail Runner 2"
     ],
     "status": "PASS",
     "elapsed": 0.077,
     "at": 2.006,
     "found_by": [
      {
       "rung": "Text",
       "strategy": "TextElementStrategy",
       "value": "Trail Runner 2",
       "ok": true
      }
     ],
     "message": null,
     "pre": "runs/birch-2.1/09-pre.webp?v=019118af55",
     "found": "runs/birch-2.1/09-found.webp?v=2c68d4ce70",
     "box": [
      16,
      493,
      203,
      518
     ]
    },
    {
     "case": "Shopper can add it to the cart",
     "module": "Add To Cart",
     "keyword": "Press Element",
     "args": [
      "10"
     ],
     "status": "PASS",
     "elapsed": 0.08,
     "at": 2.084,
     "found_by": [
      {
       "rung": "Text",
       "strategy": "TextElementStrategy",
       "value": "10",
       "ok": true
      }
     ],
     "message": null,
     "pre": "runs/birch-2.1/10-pre.webp?v=c8850590fc",
     "found": "runs/birch-2.1/10-found.webp?v=11d9444bff",
     "box": [
      126,
      400,
      179,
      437
     ]
    },
    {
     "case": "Shopper can add it to the cart",
     "module": "Add To Cart",
     "keyword": "Press Element",
     "args": [
      "Add to cart"
     ],
     "status": "PASS",
     "elapsed": 0.085,
     "at": 2.165,
     "found_by": [
      {
       "rung": "Text",
       "strategy": "TextElementStrategy",
       "value": "Add to cart",
       "ok": true
      }
     ],
     "message": null,
     "pre": "runs/birch-2.1/11-pre.webp?v=e6da39585c",
     "found": "runs/birch-2.1/11-found.webp?v=5fa17412c5",
     "box": [
      16,
      755,
      397,
      814
     ]
    },
    {
     "case": "Shopper can add it to the cart",
     "module": "Add To Cart",
     "keyword": "Assert Presence",
     "args": [
      "Added to cart"
     ],
     "status": "PASS",
     "elapsed": 0.028,
     "at": 2.25,
     "found_by": [
      {
       "rung": "Text",
       "strategy": "TextElementStrategy",
       "value": "['Added to cart']",
       "ok": true
      }
     ],
     "message": null,
     "found": "runs/birch-2.1/12-found.webp?v=32562c964e",
     "box": [
      70,
      715,
      174,
      741
     ]
    },
    {
     "case": "Shopper can check out",
     "module": "Check Out",
     "keyword": "Press Element",
     "args": [
      "${cart_button}"
     ],
     "status": "PASS",
     "elapsed": 0.104,
     "at": 2.28,
     "found_by": [
      {
       "rung": "Image",
       "strategy": "ImageDetectionStrategy",
       "value": "cart.png",
       "ok": true
      }
     ],
     "message": null,
     "pre": "runs/birch-2.1/13-pre.webp?v=b7be2fe29f",
     "found": "runs/birch-2.1/13-found.webp?v=74451909f1",
     "box": [
      360,
      24,
      393,
      55
     ]
    },
    {
     "case": "Shopper can check out",
     "module": "Check Out",
     "keyword": "Press Element",
     "args": [
      "Check out"
     ],
     "status": "PASS",
     "elapsed": 0.081,
     "at": 2.384,
     "found_by": [
      {
       "rung": "Text",
       "strategy": "TextElementStrategy",
       "value": "Check out",
       "ok": true
      }
     ],
     "message": null,
     "pre": "runs/birch-2.1/14-pre.webp?v=434694b387",
     "found": "runs/birch-2.1/14-found.webp?v=47cba47f9e",
     "box": [
      16,
      755,
      397,
      814
     ]
    }
   ],
   "errors": [],
   "end": "runs/birch-2.1/end.webp?v=85b68dd007",
   "failure": null,
   "files": [
    "execution_logs.log",
    "internal_logs.log",
    "junit_output.xml",
    "logs.json",
    "terminal.txt"
   ]
  },
  {
   "release": "2.2",
   "command": "BIRCH_URL='http://127.0.0.1:4180/birch/?release=2.2' optics execute birch-tests",
   "exit": 1,
   "date": "2026-11-18",
   "started": "2026-11-18T17:01:34+00:00",
   "tree": "Test Suite\n\u251c\u2500\u2500 Suite Setup                                          |      0.49s |    PASS\n\u2502   \u2514\u2500\u2500 Open Birch                                       |      0.49s |    PASS\n\u2502       \u251c\u2500\u2500 Read Data (${birch_url}, ENV:BIRCH_URL)      |      0.01s |    PASS\n\u2502       \u2514\u2500\u2500 Launch App (${birch_url})                    |      0.48s |    PASS\n\u251c\u2500\u2500 Shopper can sign in                                  |      0.25s |    PASS\n\u2502   \u2514\u2500\u2500 Sign In                                          |      0.25s |    PASS\n\u2502       \u251c\u2500\u2500 Enter Text (//input[@id='email'], ava@bir... |      0.07s |    PASS\n\u2502       \u251c\u2500\u2500 Enter Text (//input[@id='password'], birc... |      0.06s |    PASS\n\u2502       \u251c\u2500\u2500 Press Element (Sign in)                      |      0.09s |    PASS\n\u2502       \u2514\u2500\u2500 Assert Presence (Picked for you)             |      0.02s |    PASS\n\u251c\u2500\u2500 Shopper can find a shoe                              |      0.70s |    PASS\n\u2502   \u2514\u2500\u2500 Find A Shoe                                      |      0.70s |    PASS\n\u2502       \u251c\u2500\u2500 Assert Presence (Free returns)               |      0.58s |    PASS\n\u2502       \u251c\u2500\u2500 Enter Text (css=#search, trail)              |      0.04s |    PASS\n\u2502       \u2514\u2500\u2500 Press Element (Trail Runner 2)               |      0.08s |    PASS\n\u251c\u2500\u2500 Shopper can add it to the cart                       |      0.18s |    PASS\n\u2502   \u2514\u2500\u2500 Add To Cart                                      |      0.18s |    PASS\n\u2502       \u251c\u2500\u2500 Press Element (10)                           |      0.08s |    PASS\n\u2502       \u251c\u2500\u2500 Press Element (Add to cart)                  |      0.07s |    PASS\n\u2502       \u2514\u2500\u2500 Assert Presence (Added to cart)              |      0.03s |    PASS\n\u251c\u2500\u2500 Shopper can check out                                |      0.17s |    PASS\n\u2502   \u2514\u2500\u2500 Check Out                                        |      0.17s |    PASS\n\u2502       \u251c\u2500\u2500 Press Element (cart.png)                     |      0.10s |    PASS\n\u2502       \u2514\u2500\u2500 Press Element (Check out)                    |      0.07s |    PASS\n\u2514\u2500\u2500 on-screen-error-detection                            |      0.00s |    FAIL\n\u256d\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256e\n\u2502 Total Test Cases: 6 | Passed: 5 | Failed: 1                                  \u2502\n\u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256f",
   "cases": [
    {
     "name": "Suite Setup",
     "status": "PASS",
     "time": 0.49
    },
    {
     "name": "Shopper can sign in",
     "status": "PASS",
     "time": 0.25
    },
    {
     "name": "Shopper can find a shoe",
     "status": "PASS",
     "time": 0.7
    },
    {
     "name": "Shopper can add it to the cart",
     "status": "PASS",
     "time": 0.18
    },
    {
     "name": "Shopper can check out",
     "status": "PASS",
     "time": 0.17
    }
   ],
   "steps": [
    {
     "case": "Suite Setup",
     "module": "Open Birch",
     "keyword": "Read Data",
     "args": [
      "${birch_url}",
      "ENV:BIRCH_URL"
     ],
     "status": "PASS",
     "elapsed": 0.007,
     "at": 0.001,
     "found_by": [],
     "message": null
    },
    {
     "case": "Suite Setup",
     "module": "Open Birch",
     "keyword": "Launch App",
     "args": [
      "${birch_url}"
     ],
     "status": "PASS",
     "elapsed": 0.479,
     "at": 0.009,
     "found_by": [],
     "message": null
    },
    {
     "case": "Shopper can sign in",
     "module": "Sign In",
     "keyword": "Enter Text",
     "args": [
      "${email_field}",
      "ava@birch.shop"
     ],
     "status": "PASS",
     "elapsed": 0.066,
     "at": 0.49,
     "found_by": [
      {
       "rung": "XPath",
       "strategy": "XPathStrategy",
       "value": "//input[@id='email']",
       "ok": true
      }
     ],
     "message": null,
     "pre": "runs/birch-2.2/03-pre.webp?v=0eea8e3ad4",
     "found": "runs/birch-2.2/03-found.webp?v=11f2acacea",
     "box": [
      31,
      244,
      382,
      273
     ]
    },
    {
     "case": "Shopper can sign in",
     "module": "Sign In",
     "keyword": "Enter Text",
     "args": [
      "${password_field}",
      "birch-demo"
     ],
     "status": "PASS",
     "elapsed": 0.064,
     "at": 0.556,
     "found_by": [
      {
       "rung": "XPath",
       "strategy": "XPathStrategy",
       "value": "//input[@id='password']",
       "ok": true
      }
     ],
     "message": null,
     "pre": "runs/birch-2.2/04-pre.webp?v=e996ebeab2",
     "found": "runs/birch-2.2/04-found.webp?v=57c6137911",
     "box": [
      31,
      316,
      382,
      345
     ]
    },
    {
     "case": "Shopper can sign in",
     "module": "Sign In",
     "keyword": "Press Element",
     "args": [
      "Sign in"
     ],
     "status": "PASS",
     "elapsed": 0.093,
     "at": 0.621,
     "found_by": [
      {
       "rung": "Text",
       "strategy": "TextElementStrategy",
       "value": "Sign in",
       "ok": true
      }
     ],
     "message": null,
     "pre": "runs/birch-2.2/05-pre.webp?v=875e411cc2",
     "found": "runs/birch-2.2/05-found.webp?v=544f423dff",
     "box": [
      16,
      369,
      397,
      428
     ]
    },
    {
     "case": "Shopper can sign in",
     "module": "Sign In",
     "keyword": "Assert Presence",
     "args": [
      "Picked for you"
     ],
     "status": "PASS",
     "elapsed": 0.025,
     "at": 0.714,
     "found_by": [
      {
       "rung": "Text",
       "strategy": "TextElementStrategy",
       "value": "['Picked for you']",
       "ok": true
      }
     ],
     "message": null,
     "found": "runs/birch-2.2/06-found.webp?v=2beebbe335",
     "box": [
      16,
      269,
      397,
      302
     ]
    },
    {
     "case": "Shopper can find a shoe",
     "module": "Find A Shoe",
     "keyword": "Assert Presence",
     "args": [
      "Free returns"
     ],
     "status": "PASS",
     "elapsed": 0.581,
     "at": 0.74,
     "found_by": [
      {
       "rung": "OCR",
       "strategy": "TextDetectionStrategy",
       "value": "['Free returns']",
       "ok": true
      }
     ],
     "message": null,
     "found": "runs/birch-2.2/07-found.webp?v=86d65fd0de",
     "box": [
      33,
      168,
      183,
      199
     ]
    },
    {
     "case": "Shopper can find a shoe",
     "module": "Find A Shoe",
     "keyword": "Enter Text",
     "args": [
      "${search_field}",
      "trail"
     ],
     "status": "PASS",
     "elapsed": 0.042,
     "at": 1.321,
     "found_by": [
      {
       "rung": "Text",
       "strategy": "TextElementStrategy",
       "value": "css=#search",
       "ok": true
      }
     ],
     "message": null,
     "pre": "runs/birch-2.2/08-pre.webp?v=e5240abacb",
     "found": "runs/birch-2.2/08-found.webp?v=9cf9306134",
     "box": [
      57,
      78,
      383,
      129
     ]
    },
    {
     "case": "Shopper can find a shoe",
     "module": "Find A Shoe",
     "keyword": "Press Element",
     "args": [
      "Trail Runner 2"
     ],
     "status": "PASS",
     "elapsed": 0.078,
     "at": 1.363,
     "found_by": [
      {
       "rung": "Text",
       "strategy": "TextElementStrategy",
       "value": "Trail Runner 2",
       "ok": true
      }
     ],
     "message": null,
     "pre": "runs/birch-2.2/09-pre.webp?v=019118af55",
     "found": "runs/birch-2.2/09-found.webp?v=2c68d4ce70",
     "box": [
      16,
      493,
      203,
      518
     ]
    },
    {
     "case": "Shopper can add it to the cart",
     "module": "Add To Cart",
     "keyword": "Press Element",
     "args": [
      "10"
     ],
     "status": "PASS",
     "elapsed": 0.077,
     "at": 1.445,
     "found_by": [
      {
       "rung": "Text",
       "strategy": "TextElementStrategy",
       "value": "10",
       "ok": true
      }
     ],
     "message": null,
     "pre": "runs/birch-2.2/10-pre.webp?v=c8850590fc",
     "found": "runs/birch-2.2/10-found.webp?v=11d9444bff",
     "box": [
      126,
      400,
      179,
      437
     ]
    },
    {
     "case": "Shopper can add it to the cart",
     "module": "Add To Cart",
     "keyword": "Press Element",
     "args": [
      "Add to cart"
     ],
     "status": "PASS",
     "elapsed": 0.068,
     "at": 1.522,
     "found_by": [
      {
       "rung": "Text",
       "strategy": "TextElementStrategy",
       "value": "Add to cart",
       "ok": true
      }
     ],
     "message": null,
     "pre": "runs/birch-2.2/11-pre.webp?v=e6da39585c",
     "found": "runs/birch-2.2/11-found.webp?v=5fa17412c5",
     "box": [
      16,
      755,
      397,
      814
     ]
    },
    {
     "case": "Shopper can add it to the cart",
     "module": "Add To Cart",
     "keyword": "Assert Presence",
     "args": [
      "Added to cart"
     ],
     "status": "PASS",
     "elapsed": 0.028,
     "at": 1.591,
     "found_by": [
      {
       "rung": "Text",
       "strategy": "TextElementStrategy",
       "value": "['Added to cart']",
       "ok": true
      }
     ],
     "message": null,
     "found": "runs/birch-2.2/12-found.webp?v=32562c964e",
     "box": [
      70,
      715,
      174,
      741
     ]
    },
    {
     "case": "Shopper can check out",
     "module": "Check Out",
     "keyword": "Press Element",
     "args": [
      "${cart_button}"
     ],
     "status": "PASS",
     "elapsed": 0.102,
     "at": 1.621,
     "found_by": [
      {
       "rung": "Image",
       "strategy": "ImageDetectionStrategy",
       "value": "cart.png",
       "ok": true
      }
     ],
     "message": null,
     "pre": "runs/birch-2.2/13-pre.webp?v=52ef24a487",
     "found": "runs/birch-2.2/13-found.webp?v=372203fed0",
     "box": [
      360,
      24,
      393,
      55
     ]
    },
    {
     "case": "Shopper can check out",
     "module": "Check Out",
     "keyword": "Press Element",
     "args": [
      "Check out"
     ],
     "status": "PASS",
     "elapsed": 0.065,
     "at": 1.724,
     "found_by": [
      {
       "rung": "Text",
       "strategy": "TextElementStrategy",
       "value": "Check out",
       "ok": true
      }
     ],
     "message": null,
     "pre": "runs/birch-2.2/14-pre.webp?v=434694b387",
     "found": "runs/birch-2.2/14-found.webp?v=47cba47f9e",
     "box": [
      16,
      755,
      397,
      814
     ]
    }
   ],
   "errors": [
    {
     "error_code": "ERR_SESSION",
     "matched_on": "match_string",
     "match_string": "Session expired",
     "description": "The shopper was signed out",
     "severity": "high",
     "detected_at": "end_of_run"
    }
   ],
   "end": "runs/birch-2.2/end.webp?v=2e76779fbb",
   "failure": null,
   "files": [
    "detected_errors.json",
    "execution_logs.log",
    "internal_logs.log",
    "junit_output.xml",
    "logs.json",
    "terminal.txt"
   ]
  }
 ]
};
