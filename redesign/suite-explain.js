// Explains one row of a suite loaded by suite.js: what the keyword does with each value, where
// each ${name} comes from and how Optics looks for it, and the problems only a real run finds.
(function (root) {
  "use strict";
  var S = root.OpticsSuite;

  // A sentence per keyword; {param} is filled from the row, or from the default.
  var SAY = {
    launch_app: "Start {app_identifier}", start_appium_session: "Start a driver session", launch_other_app: "Switch to {app_name}",
    close_and_terminate_app: "End the session and close the app", force_terminate_app: "Kill {app_name}",
    get_app_version: "Read the version of {app_package}", get_driver_session_id: "Return the driver session id", initialise_setup: "Do nothing",
    press_element: "Tap {element}", press_by_percentage: "Tap the point {percent_x} % across and {percent_y} % down",
    press_by_coordinates: "Tap the pixel {coor_x}, {coor_y}", detect_and_press: "Tap {element} if it appears within {timeout} s",
    select_dropdown_option: "Open {element} and pick {option}", enter_text: "Type {text} into {element}", enter_number: "Type the number {number} into {element}",
    enter_text_direct: "Type {text} into the focused field", enter_text_using_keyboard: "Type {text_input} one key at a time",
    clear_element_text: "Empty {element}", swipe: "Swipe {direction} from the pixel {coor_x}, {coor_y}",
    swipe_by_percentage: "Swipe {direction} from {percent_x} %, {percent_y} %", swipe_from_element: "Swipe {direction} starting on {element}",
    swipe_until_element_appears: "Swipe {direction} until {element} is on screen, for up to {timeout} s", scroll: "Scroll {direction} once",
    scroll_from_element: "Scroll {direction} starting on {element}", scroll_until_element_appears: "Scroll {direction} until {element} is on screen, for up to {timeout} s",
    go_back: "Go back one screen", press_keycode: "Press the key {keycode}", execute_script: "Run {script_or_json}", get_text: "Read the text of {element}",
    sleep: "Wait {duration} s", press_checkbox: "Tap {element}", press_radio_button: "Tap {element}", swipe_seekbar_to_right_android: "Drag {element} to the right",
    assert_presence: "Wait up to {timeout_str} s for {elements} to be in the app. Fail if it isn't",
    assert_visibility: "Wait up to {timeout_str} s for {elements} to be on screen. Fail if it isn't",
    validate_element: "Wait up to {timeout} s for {element}. Fail if it isn't there", validate_screen: "Look for {elements} for up to {timeout} s, without failing",
    is_element: "Check that {element} is {element_state} within {timeout} s", assert_text: "Fail unless {element} shows {expected}",
    assert_equality: "Fail unless {output} equals {expression}", capture_screenshot: "Take a screenshot", capture_pagesource: "Save the UI tree",
    get_interactive_elements: "List the elements you can tap or type into", get_screen_elements: "Take a screenshot and list every element",
    execute_module: "Run the module {module_name}", run_loop: "Run {target} in a loop", condition: "Run the first module whose condition is true",
    read_data: "Read {file_path} into {input_element}", evaluate: "Compute {param2} and keep it in {param1}", date_evaluate: "Move {param2} by {param3} and keep it in {param1}",
    invoke_api: "Call the API {api_identifier}",
  };

  var HOW = {
    XPath: "XPath. Optics looks it up in the app's UI tree.",
    Text: "Text. Optics looks in the UI tree first, then reads the screenshot with OCR if a text engine is on.",
    text_only: "Text, OCR only. Optics skips the UI tree and reads the screenshot.",
    Image: "Image. Optics matches this picture on a screenshot. The file can be anywhere in the project folder.",
    CSS: "CSS selector. Playwright, Selenium, and web pages on Appium.",
    ID: "An id: locator. Optics turns it into one XPath: @id on the web and on a desktop, @resource-id on Android, @name on iOS.",
    Class: "A class name. Assert Presence, Assert Visibility, Validate Element and Validate Screen skip class names.",
  };

  var AOI = ["aoi_x", "aoi_y", "aoi_width", "aoi_height"];
  var DOCS = {
    keywords: "docs/reference/keywords/", variables: "docs/reference/keywords/#variables", flow: "docs/reference/keywords/flow#rules-for-every-flow-keyword",
    params: "docs/reference/keywords/#parameters", elements: "docs/reference/keywords/#element-arguments", aoi: "docs/elements/area-of-interest",
    errors: "docs/run/error-detection", api: "docs/advanced/api-calls", define: "docs/elements/define", organise: "docs/create/organise",
  };

  function isNamed(param) { return !/^(\/|\/\/|\()/.test(param) && /(^|[^=!<>])=(?!=)/.test(param); }

  // DataReader.split_params_by_signature; a step run by a flow keyword gets no named params.
  function bind(kw, params, positionalOnly) {
    var names = kw.params.map(function (p) { return p.name; }), out = [];
    var named = new Set(params.filter(function (p) { return isNamed(p.v); }).map(function (p) { return p.v.split("=")[0].trim(); }));
    var locatorFirst = names[0] === "element" && !named.has("element");
    params.forEach(function (p, i) {
      if (!positionalOnly && isNamed(p.v)) {
        var key = p.v.slice(0, p.v.indexOf("=")).trim(), slot = i === 0 && locatorFirst && /^(text|css|xpath)$/.test(key);
        if (names.indexOf(key) >= 0 && !slot) return out.push({ p: p, name: key, value: p.v.slice(p.v.indexOf("=") + 1).trim(), named: true });
      }
      out.push({ p: p, value: p.v });
    });
    return placePositional(kw, out);
  }

  function placePositional(kw, bound) {
    var free = kw.params.filter(function (p) { return !p.variadic; }), variadic = kw.params.some(function (p) { return p.variadic; }), k = 0;
    var taken = new Set(bound.filter(function (b) { return b.named; }).map(function (b) { return b.name; }));
    bound.forEach(function (b) {
      if (b.named) return;
      var slot = free[k++];
      if (slot) { b.name = slot.name; b.clash = taken.has(slot.name); }
      else if (variadic) b.name = "args";
      else b.extra = true;
    });
    return bound;
  }

  // TestRunner._check_params: inspect.signature(method).bind on the split params, with Python's messages.
  function bindError(kw, params) {
    var bound = bind(kw, params), named = new Set(), args = 0;
    bound.forEach(function (b) { if (b.named) named.add(b.name); else args++; });
    var i = 0;
    for (; i < args; i++) {
      var slot = kw.params[i];
      if (!slot) return "too many positional arguments";
      if (slot.variadic) { i = kw.params.length; break; }
      if (named.has(slot.name)) return "multiple values for argument '" + slot.name + "'";
    }
    var missing = kw.params.slice(i).filter(function (p) { return p.required && !named.has(p.name); })[0];
    return missing ? "missing a required argument: '" + missing.name + "'" : null;
  }

  function checkParams(keyword, kw, params) {
    var error = bindError(kw, params);
    return error && keyword + " cannot take these params: " + error;
  }

  function eachStep(p, fn) { p.modules.forEach(function (m) { m.steps.forEach(fn); }); }

  function loopVars(params) {
    var vars = [];
    if (params.length < 3) return vars;
    for (var i = 1; i + 1 < params.length; i += 2) vars.push({ name: S.wholeVarName(params[i].v) || params[i].v.trim(), at: params[i].at, values: params[i + 1] });
    return vars;
  }

  function provenance(p, name) {
    var found = [], el = p.elements.get(name);
    if (el) found.push({ kind: el.values.length ? "elements" : "empty", at: el.rows[0] && el.rows[0].nameAt, count: el.values.length });
    eachStep(p, function (step) { stepDefines(p, step, name, found); });
    p.apis.forEach(function (col) {
      col.apis.forEach(function (api) { api.extract.forEach(function (x) { if (x.name === name) found.push({ kind: "Invoke API", at: api.at, api: col.key + "." + api.key, path: x.path }); }); });
    });
    return found;
  }

  function stepDefines(p, step, name, found) {
    var split = S.splitStoreAs(step.params), kw = p.catalogue.keywords[S.slug(step.keyword)], first = split.params[0];
    var add = function (kind, at, extra) { found.push(Object.assign({ kind: kind, at: at, module: step.module }, extra)); };
    if (split.storeAs && split.storeAs.v === name) add("store_as", split.storeAs.cell.at);
    if (!kw) return;
    if (writesName(kw, first, name)) add(kw.title, first.at);
    if (kw.slug === "run_loop") loopVars(split.params).forEach(function (v) { if (v.name === name) add("Run Loop", v.at, { target: first.v }); });
  }

  function writesName(kw, first, name) { return kw.definesVariable && first && (S.wholeVarName(first.v) || first.v.trim()) === name; }

  function locators(p, value) {
    var name = S.wholeVarName(value), list = name === null ? value.split("|") : (p.elements.get(name) || { values: [] }).values.map(function (v) { return v.v; });
    return list.filter(function (v) { return v.trim(); }).map(function (v) { var type = S.locatorType(v); return { v: v, type: type === "text_only" ? "Text" : type, how: HOW[type] }; });
  }

  function reach(p) {
    var direct = new Map(), via = new Map();
    p.testCases.order.forEach(function (tc) { tc.steps.forEach(function (s) { push(direct, s.name, { tc: tc.name, at: s.at }); }); });
    eachStep(p, function (step) {
      var kw = p.catalogue.keywords[S.slug(step.keyword)];
      flowTargets(p, kw, S.splitStoreAs(step.params).params).forEach(function (t) { push(via, t.name, { kw: kw.title, at: t.at, from: step.module }); });
    });
    return { direct: direct, via: via };
  }

  function push(map, key, value) { if (!map.has(key)) map.set(key, []); map.get(key).push(value); }

  function flowTargets(p, kw, params) {
    if (!kw || !params.length) return [];
    if (kw.slug === "execute_module" || kw.slug === "run_loop") return [{ name: params[0].v, at: params[0].at }];
    if (kw.slug !== "condition") return [];
    return conditionParts(p, params).flatMap(function (c) {
      return [c.module ? { name: c.module, at: c.at } : null, { name: c.target.v, at: c.target.at }].filter(Boolean);
    });
  }

  function conditionParts(p, params) {
    var parts = [], odd = params.length % 2 === 1, end = odd ? params.length - 1 : params.length;
    for (var i = 0; i < end; i += 2) {
      var cond = params[i].v.trim(), bare = cond[0] === "!" ? cond.slice(1).trim() : cond;
      parts.push({ cond: cond, at: params[i].at, module: p.modules.has(bare) ? bare : null, negate: cond[0] === "!", target: params[i + 1] });
    }
    if (odd) parts.push({ otherwise: true, target: params[params.length - 1], at: params[params.length - 1].at });
    return parts;
  }

  function notes(p) {
    var out = [], r = reach(p);
    eachStep(p, function (step) { stepNotes(p, step, r, out); });
    p.modules.forEach(function (m) {
      if (!r.direct.has(m.name) && !r.via.has(m.name)) out.push(note("info", m.steps[0].nameAt || m.steps[0].row, "No test case or flow keyword runs " + m.name + ".", DOCS.organise));
    });
    return out;
  }

  function note(level, at, text, docs) { return { level: level, at: at, text: text, docs: docs }; }

  function stepNotes(p, step, r, out) {
    step.dropped.filter(function (at) { return at.end > at.start; }).forEach(function (at) { out.push(note("warn", at, "Optics drops this cell. Its column has no header, so add a param_ column to the header row.", DOCS.params)); });
    emptySlide(step, out);
    var kw = p.catalogue.keywords[S.slug(step.keyword)];
    if (!kw) return;
    var params = S.splitStoreAs(step.params).params, insideFlow = !r.direct.has(step.module) && r.via.has(step.module);
    var bound = bind(kw, params, insideFlow);
    bound.forEach(function (b) { paramNotes(p, kw, b, insideFlow, out); });
    if (insideFlow) missingNote(kw, params, step, out);
    aoiNote(bound, step, out);
    flowNotes(p, kw, params, step, out);
  }

  function emptySlide(step, out) {
    step.empty.forEach(function (e) {
      var after = step.params.filter(function (prm) { return prm.at.start > e.at.start; })[0];
      if (after) out.push(note("warn", e.at, "Empty cells are dropped, so " + after.v + " moves into this slot. Write it as name=value to skip a parameter.", DOCS.params));
    });
  }

  function paramNotes(p, kw, b, insideFlow, out) {
    if (b.extra) out.push(note("fail", b.p.at, kw.title + " takes " + kw.params.length + " values at most, so this one is too many. " + (insideFlow ? "The step fails when it runs." : "optics dry_run fails the step with E0403."), kw.url));
    if (insideFlow && isNamed(b.value) && !/^\s*store_as\s*=/.test(b.value) && kw.params.some(function (x) { return x.name === b.value.split("=")[0].trim(); })) {
      out.push(note("warn", b.p.at, "A module run by Execute Module, Run Loop or Condition reads no name=value, so this reaches " + kw.title + " as the text " + b.value + ".", DOCS.flow));
    }
    if (b.name === "element" || b.name === "elements") locatorNotes(p, b, out);
  }

  function missingNote(kw, params, step, out) {
    var missing = kw.params.slice(params.length).filter(function (x) { return x.required; })[0];
    if (missing) out.push(note("fail", step.at, kw.title + " needs " + missing.name + ". optics dry_run does not check a module that a flow keyword runs, so the step fails when it runs.", kw.url));
  }

  function locatorNotes(p, b, out) {
    locators(p, b.value).forEach(function (l) {
      if (S.wholeVarName(b.value) === null && looksLikeText(l)) out.push(note("warn", b.p.at, l.v + " is read as " + (l.type === "XPath" ? "an XPath" : "a CSS selector") + ". Write text=" + l.v + " to find the text.", DOCS.elements));
    });
  }

  function looksLikeText(l) {
    if (l.type === "XPath") return /^\(/.test(l.v) && l.v.indexOf("/") < 0;
    return l.type === "CSS" && /\s/.test(l.v) && !/[=>~]/.test(l.v) && !/^css=/i.test(l.v);
  }

  function aoiValues(bound) {
    var values = { aoi_x: 0, aoi_y: 0, aoi_width: 100, aoi_height: 100 }, set = false;
    bound.forEach(function (b) { if (AOI.indexOf(b.name) >= 0) { values[b.name] = parseFloat(b.value); set = true; } });
    return set ? values : null;
  }

  function aoiNote(bound, step, out) {
    var a = aoiValues(bound), at = bound.filter(function (b) { return AOI.indexOf(b.name) >= 0; }).pop();
    if (!a) return;
    if (a.aoi_x + a.aoi_width > 100) out.push(note("fail", at.p.at, "aoi_x plus aoi_width is " + (a.aoi_x + a.aoi_width) + ". The area must stay on the screen, at 100 or less.", DOCS.aoi));
    if (a.aoi_y + a.aoi_height > 100) out.push(note("fail", at.p.at, "aoi_y plus aoi_height is " + (a.aoi_y + a.aoi_height) + ". The area must stay on the screen, at 100 or less.", DOCS.aoi));
  }

  var FLOW_NOTES = {
    execute_module: function (p, kw, params, step, out) { targetNote(p, params[0], step, out); },
    run_loop: loopNotes,
    condition: conditionNotes,
    invoke_api: function (p, kw, params, step, out) { if (params[0]) apiNote(p, params[0], out); },
  };
  function flowNotes(p, kw, params, step, out) {
    if (FLOW_NOTES[kw.slug]) FLOW_NOTES[kw.slug](p, kw, params, step, out);
  }

  function loopNotes(p, kw, params, step, out) {
    targetNote(p, params[0], step, out);
    if (params.length > 2 && params.length % 2 === 0) out.push(note("fail", params[params.length - 1].at, "Run Loop needs a variable and a list in pairs after the module. The step fails with E0403.", kw.url));
  }

  function conditionNotes(p, kw, params, step, out) {
    conditionParts(p, params).forEach(function (c) {
      targetNote(p, c.target, step, out);
      if (!c.otherwise && !c.module && !/[=<>!]|\$\{|\b(and|or|not)\b/.test(c.cond)) out.push(note("warn", c.at, "No module is named " + c.cond + ", so Condition reads it as an expression.", kw.url));
    });
  }

  function targetNote(p, param, step, out) {
    if (!param) return;
    if (param.v === step.module) return out.push(note("warn", param.at, "This module runs itself. dry_run passes it, but at run time it starts again with no end.", DOCS.flow));
    if (!p.modules.has(param.v)) out.push(note("fail", param.at, "No module is named " + param.v + ". The step fails with E0601: Module '" + param.v + "' not found in modules.", DOCS.flow));
  }

  function apiNote(p, param, out) {
    var dot = param.v.indexOf(".");
    var parts = [param.v.slice(0, dot), param.v.slice(dot + 1)];
    if (dot < 0) return out.push(note("fail", param.at, "Write the API as collection.api. The step fails with E0403.", DOCS.api));
    var col = p.apis.get(parts[0]);
    if (!col) out.push(note("fail", param.at, "No API file defines the collection " + parts[0] + ". The step fails with E0601.", DOCS.api));
    else if (!col.apis.has(parts[1])) out.push(note("fail", param.at, "The collection " + parts[0] + " has no API named " + parts[1] + ". The step fails with E0601.", DOCS.api));
  }

  function recordAt(p, path, offset) {
    var best = null;
    function consider(rec, row) { if (row && row.file === path && row.start <= offset && offset <= row.end + 1 && (!best || row.start >= best.row.start)) best = { rec: rec, row: row }; }
    p.testCases.order.forEach(function (tc) { tc.steps.forEach(function (s) { consider({ type: "case", tc: tc, step: s }, s.row); }); });
    eachStep(p, function (s) { consider({ type: "step", step: s }, s.row); });
    p.elements.forEach(function (el) { el.rows.forEach(function (r) { consider({ type: "element", el: el }, r.row); }); });
    p.errors.forEach(function (e) { consider({ type: "error", error: e }, e.row); });
    p.apis.forEach(function (col) { col.apis.forEach(function (api) { consider({ type: "api", col: col, api: api }, apiSpan(p, path, api)); }); });
    return best ? best.rec : fileRecord(p, path, offset);
  }

  function apiSpan(p, path, api) {
    var f = p.files.filter(function (x) { return x.path === path; })[0];
    if (!f || api.at.file !== path) return null;
    var lines = f.text.split("\n"), indent = lines[api.at.line - 1].search(/\S/), n = api.at.line;
    while (n < lines.length && (!lines[n].trim() || lines[n].search(/\S/) > indent)) n++;
    return { file: path, start: api.at.start - indent, end: lines.slice(0, n).join("\n").length, line: api.at.line };
  }

  function fileRecord(p, path, offset) {
    var f = p.files.filter(function (x) { return x.path === path; })[0];
    if (!f) return { type: "none" };
    if (f.error) return { type: "yaml-error", file: f };
    if (f.csv && offset <= f.text.indexOf("\n")) return { type: "header", file: f };
    if (!f.kinds.length) return { type: "data", file: f, readers: readersOf(p, f.path) };
    return { type: "file", file: f };
  }

  function readersOf(p, path) {
    var found = [];
    eachStep(p, function (s) {
      var kw = p.catalogue.keywords[S.slug(s.keyword)];
      if (kw && kw.slug === "read_data" && s.params[1] && path.indexOf(s.params[1].v.replace(/^\.\//, "")) >= 0) found.push(s);
    });
    return found;
  }

  function usages(p, name) {
    var found = [];
    eachStep(p, function (s) { s.params.forEach(function (prm) { if (S.varRefs(prm.v).some(function (r) { return r.name.trim() === name; })) found.push({ step: s, at: prm.at }); }); });
    return found;
  }

  root.OpticsExplain = {
    SAY: SAY, HOW: HOW, AOI: AOI, DOCS: DOCS, bind: bind, checkParams: checkParams, provenance: provenance, locators: locators, reach: reach, notes: notes,
    conditionParts: conditionParts, loopVars: loopVars, aoiValues: aoiValues, recordAt: recordAt, usages: usages, isNamed: isNamed,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
