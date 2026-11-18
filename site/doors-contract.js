window.OPTICS_DOORS = {
 "version": "1.11.5",
 "keywords": {
  "launch_app": {
   "robot": "Launch App",
   "params": [
    [
     "app_identifier",
     null
    ],
    [
     "app_activity",
     null
    ],
    [
     "event_name",
     null
    ]
   ]
  },
  "enter_text": {
   "robot": "Enter Text",
   "params": [
    [
     "element"
    ],
    [
     "text"
    ],
    [
     "event_name",
     null
    ]
   ]
  },
  "press_element": {
   "robot": "Press Element",
   "params": [
    [
     "element"
    ],
    [
     "repeat",
     "1"
    ],
    [
     "offset_x",
     "0"
    ],
    [
     "offset_y",
     "0"
    ],
    [
     "index",
     "0"
    ],
    [
     "aoi_x",
     null
    ],
    [
     "aoi_y",
     null
    ],
    [
     "aoi_width",
     null
    ],
    [
     "aoi_height",
     null
    ],
    [
     "event_name",
     null
    ]
   ]
  },
  "assert_presence": {
   "robot": "Assert Presence",
   "params": [
    [
     "elements"
    ],
    [
     "timeout",
     "60"
    ],
    [
     "rule",
     "any"
    ],
    [
     "event_name",
     null
    ]
   ]
  },
  "go_back": {
   "robot": "Go Back",
   "params": [
    [
     "event_name",
     null
    ]
   ]
  }
 },
 "http": {
  "paths": [
   "/v1/sessions/start",
   "/v1/sessions/{session_id}/action"
  ],
  "required": [
   "mode"
  ],
  "fields": [
   "keyword",
   "mode",
   "params",
   "template_images",
   "test_case"
  ],
  "mode": "keyword",
  "ok": "SUCCESS",
  "result": "result",
  "run": {
   "start": [
    "driver_id",
    "session_id",
    "status"
   ],
   "ok": {
    "status": 200,
    "body": {
     "execution_id": "…",
     "status": "SUCCESS",
     "data": {
      "result": null
     }
    }
   },
   "present": {
    "status": 200,
    "body": {
     "execution_id": "…",
     "status": "SUCCESS",
     "data": {
      "result": true
     }
    }
   },
   "miss": {
    "press_element": {
     "status": 404,
     "body": {
      "detail": {
       "type": "optics:element",
       "code": "Code.E0201",
       "status": 404,
       "message": "No valid strategies found for '{target}' in 'press_element'",
       "details": null,
       "meta": null,
       "cause": "Code.E0201: Element '{target}' not found."
      }
     }
    },
    "enter_text": {
     "status": 404,
     "body": {
      "detail": {
       "type": "optics:element",
       "code": "Code.E0201",
       "status": 404,
       "message": "No valid strategies found for '{target}' in 'enter_text'",
       "details": null,
       "meta": null,
       "cause": "Code.E0201: Element '{target}' not found."
      }
     }
    },
    "assert_presence": {
     "status": 404,
     "body": {
      "detail": {
       "type": "optics:element",
       "code": "Code.E0201",
       "status": 404,
       "message": "['{target}'] not found based on rule 'any'.",
       "details": null,
       "meta": null,
       "cause": null
      }
     }
    }
   },
   "miss_list": {
    "press_element": {
     "status": 404,
     "body": {
      "detail": {
       "type": "optics:element",
       "code": "Code.E0201",
       "status": 404,
       "message": "All 2 fallback combinations failed for keyword 'Press Element':\n('{first}',) -> Code.E0201: No valid strategies found for '{first}' in 'press_element' (cause: Code.E0201: Element '{first}' not found.)\n('{last}',) -> Code.E0201: No valid strategies found for '{last}' in 'press_element' (cause: Code.E0201: Element '{last}' not found.)",
       "details": null,
       "meta": null,
       "cause": null
      }
     }
    },
    "enter_text": {
     "status": 404,
     "body": {
      "detail": {
       "type": "optics:element",
       "code": "Code.E0201",
       "status": 404,
       "message": "All 2 fallback combinations failed for keyword 'Enter Text':\n('{first}', '{text}') -> Code.E0201: No valid strategies found for '{first}' in 'enter_text' (cause: Code.E0201: Element '{first}' not found.)\n('{last}', '{text}') -> Code.E0201: No valid strategies found for '{last}' in 'enter_text' (cause: Code.E0201: Element '{last}' not found.)",
       "details": null,
       "meta": null,
       "cause": null
      }
     }
    }
   }
  }
 },
 "python": {
  "returns": {
   "enter_text": null,
   "press_element": null,
   "assert_presence": true,
   "go_back": null
  },
  "miss": {
   "press_element": "FallbackExhausted: Code.E0201: No valid strategies found for '{target}' in 'press_element' (cause: Code.E0201: Element '{target}' not found.)",
   "enter_text": "FallbackExhausted: Code.E0201: No valid strategies found for '{target}' in 'enter_text' (cause: Code.E0201: Element '{target}' not found.)",
   "assert_presence": "FallbackExhausted: Code.E0201: ['{target}'] not found based on rule 'any'."
  },
  "miss_list": {
   "press_element": "FallbackExhausted: Code.E0201: All 2 fallback combinations failed for press_element:\n('{first}', '1', '0', '0', '0') -> Code.E0201: No valid strategies found for '{first}' in 'press_element' (cause: Code.E0201: Element '{first}' not found.)\n('{last}', '1', '0', '0', '0') -> Code.E0201: No valid strategies found for '{last}' in 'press_element' (cause: Code.E0201: Element '{last}' not found.)",
   "enter_text": "FallbackExhausted: Code.E0201: All 2 fallback combinations failed for enter_text:\n('{first}', '{text}') -> Code.E0201: No valid strategies found for '{first}' in 'enter_text' (cause: Code.E0201: Element '{first}' not found.)\n('{last}', '{text}') -> Code.E0201: No valid strategies found for '{last}' in 'enter_text' (cause: Code.E0201: Element '{last}' not found.)"
  }
 },
 "mcp": {
  "tools": {
   "start_session": {
    "params": [
     "ai_self_heal",
     "app",
     "capabilities",
     "driver",
     "elements_sources",
     "image_detection",
     "llm_model",
     "llm_provider",
     "project_path",
     "strict_element_match",
     "text_detection",
     "url"
    ],
    "required": []
   },
   "terminate_session": {
    "params": [
     "session_id"
    ],
    "required": []
   },
   "observe": {
    "params": [
     "max_rows",
     "query",
     "screenshot",
     "session_id"
    ],
    "required": []
   },
   "tap": {
    "params": [
     "expect_absent",
     "expect_present",
     "repeat",
     "session_id",
     "target"
    ],
    "required": [
     "target"
    ]
   },
   "type_text": {
    "params": [
     "clear_first",
     "expect_absent",
     "expect_present",
     "session_id",
     "target",
     "text"
    ],
    "required": [
     "target",
     "text"
    ]
   },
   "scroll": {
    "params": [
     "direction",
     "expect_absent",
     "expect_present",
     "session_id",
     "timeout_s",
     "until"
    ],
    "required": [
     "direction"
    ]
   },
   "press_key": {
    "params": [
     "expect_absent",
     "expect_present",
     "key",
     "session_id"
    ],
    "required": [
     "key"
    ]
   },
   "launch_app": {
    "params": [
     "app",
     "expect_absent",
     "expect_present",
     "session_id"
    ],
    "required": []
   },
   "batch": {
    "params": [
     "expect_absent",
     "expect_present",
     "session_id",
     "steps"
    ],
    "required": [
     "steps"
    ]
   },
   "check": {
    "params": [
     "absent",
     "present",
     "session_id",
     "timeout_s"
    ],
    "required": []
   },
   "run_keyword": {
    "params": [
     "expect_absent",
     "expect_present",
     "keyword",
     "params",
     "session_id"
    ],
    "required": [
     "keyword"
    ]
   }
  },
  "replies": {
   "type_xpath": [
    "type_text \"xpath=//*[@id='email']\" -> ok (XPath) · verified: unknown (add expect_present/expect_absent to verify)"
   ],
   "tap_label": [
    "tap e4 \"Sign in\" -> ok (Text) · verified: unknown (add expect_present/expect_absent to verify)"
   ],
   "check": [
    "check -> passed",
    "present \"Picked for you\": met"
   ],
   "check_miss": [
    "check -> not passed",
    "present \"{target}\": not met"
   ],
   "tap_miss": [
    "tap \"{target}\" -> FAIL · verified: fail",
    "[E0201] not found: tried {target}.",
    "Next: Pick a ref from the current screen."
   ],
   "type_miss": [
    "type_text \"{target}\" -> FAIL · verified: fail",
    "[E0201] not found: tried {target}.",
    "Next: Pick a ref from the current screen."
   ],
   "back": [
    "press_key back -> ok · verified: unknown (add expect_present/expect_absent to verify)"
   ],
   "launch_same": [
    "launch_app -> ok · verified: unknown (add expect_present/expect_absent to verify)"
   ]
  }
 }
};
