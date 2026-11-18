// Reads an Optics suite the way optics-framework's runner does and predicts what `optics dry_run`
// reports. Ported from common/runner/data_reader.py, common/utils.py, helper/execute.py and
// common/runner/test_runnner.py; test/explain.test.mjs holds it to real dry_run output.
(function (root) {
  "use strict";

  // ---- CSV, as Python's csv module reads it (excel dialect) ----------------------------
  function csvRows(text) {
    var rows = [], i = text.charCodeAt(0) === 0xfeff ? 1 : 0, line = 1;
    while (i < text.length) {
      var row = { line: line, cells: [] };
      i = csvRow(text, i, row);
      line = row.endLine + 1;
      if (row.cells.length) rows.push(row);
    }
    return rows;
  }

  var LINE_END = /\r?\n?/y;
  function csvRow(text, i, row) {
    var line = row.line;
    for (;;) {
      var cell = { start: i, line: line, v: "" };
      i = csvCell(text, i, cell, function () { line++; });
      var blank = !row.cells.length && cell.start === cell.end && text[i] !== ",";
      if (!blank) row.cells.push(cell);
      if (text[i] !== ",") break;
      i++;
    }
    row.endLine = line;
    LINE_END.lastIndex = i;
    LINE_END.exec(text);
    return LINE_END.lastIndex;
  }

  function csvCell(text, i, cell, newline) {
    if (text[i] === '"') i = csvQuoted(text, i + 1, cell, newline);
    while (i < text.length && ",\n\r".indexOf(text[i]) < 0) cell.v += text[i++];
    cell.end = i;
    return i;
  }

  function csvQuoted(text, i, cell, newline) {
    while (i < text.length) {
      var c = text[i];
      if (c === '"' && text[i + 1] === '"') { cell.v += '"'; i += 2; continue; }
      if (c === '"') return i + 1;
      if (c === "\n") newline();
      cell.v += c;
      i++;
    }
    return i;
  }

  // csv.DictReader: lower-cased stripped headers; a cell past the last header is dropped.
  function csvRecords(text) {
    var rows = csvRows(text);
    if (!rows.length) return { headers: [], records: [] };
    var headers = rows[0].cells.map(function (c) { return c.v.trim().toLowerCase(); });
    var records = rows.slice(1).map(function (row) {
      var fields = {};
      headers.forEach(function (h, k) { fields[h] = row.cells[k] || null; });
      return { line: row.line, cells: row.cells, fields: fields, dropped: row.cells.slice(headers.length) };
    });
    return { headers: headers, records: records };
  }

  function unescapeCsv(s) {
    return s.replace(/\\\\/g, "\u0000").replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t").replace(/\u0000/g, "\\");
  }

  // ---- YAML: the block subset suites use; anything else is reported, never guessed ---------
  function YamlError(line, message) { this.line = line; this.message = message; }

  function yamlLines(text) {
    var out = [], offset = 0;
    text.split("\n").forEach(function (raw, k) {
      var body = stripComment(raw.replace(/\r$/, ""));
      if (body.trim()) out.push({ n: k + 1, at: offset, indent: body.search(/\S/), text: body });
      offset += raw.length + 1;
    });
    return out;
  }

  function stripComment(line) {
    var quote = null;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (quote) { if (c === quote) quote = null; continue; }
      if ("\"'".indexOf(c) >= 0 && after(line, i, /[\s[,:-]/)) quote = c;
      else if (c === "#" && after(line, i, /\s/)) return line.slice(0, i).replace(/\s+$/, "");
    }
    return line;
  }

  function after(line, i, re) { return i === 0 || re.test(line[i - 1]); }

  function parseYaml(text) {
    var lines = yamlLines(text), state = { lines: lines, k: 0 };
    if (!lines.length) return null;
    var node = yamlBlock(state, lines[0].indent);
    if (state.k < lines.length) throw new YamlError(lines[state.k].n, "This line is indented in a way the explainer can't follow.");
    return node;
  }

  function yamlBlock(state, indent) {
    var first = state.lines[state.k];
    return /^-(\s|$)/.test(first.text.slice(indent)) ? yamlSeq(state, indent) : yamlMap(state, indent);
  }

  function yamlSeq(state, indent) {
    var items = [];
    for (var l; (l = state.lines[state.k]) && l.indent === indent && /^-(\s|$)/.test(l.text.slice(indent));) {
      var rest = l.text.slice(indent + 1), pad = rest.search(/\S/);
      if (pad < 0) { state.k++; items.push(yamlChild(state, indent)); continue; }
      var col = indent + 1 + pad;
      if (isMapEntry(l.text.slice(col))) { l.indent = col; items.push(yamlMap(state, col)); continue; }
      state.k++;
      items.push(yamlValue(l, col));
    }
    return { type: "seq", items: items };
  }

  function yamlMap(state, indent) {
    var entries = [];
    for (var l; (l = state.lines[state.k]) && l.indent === indent;) {
      var m = mapEntry(l, indent);
      if (!m) throw new YamlError(l.n, "Expected `name: value` here.");
      state.k++;
      var value = m.valueCol < 0 ? yamlChild(state, indent, true) : yamlValue(l, m.valueCol);
      entries.push({ key: m.key, value: value });
    }
    return { type: "map", entries: entries };
  }

  function yamlChild(state, indent, sameIndentSeq) {
    var next = state.lines[state.k];
    if (next && (next.indent > indent || (sameIndentSeq && next.indent === indent && /^-(\s|$)/.test(next.text.slice(indent))))) {
      return yamlBlock(state, next.indent);
    }
    return { type: "scalar", value: null, plain: true, line: next ? next.n : 0 };
  }

  function isMapEntry(text) { return !!keyMatch(text); }

  function keyMatch(text) {
    return /^("(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^\s"'#\-[{][^:#]*?|-[^\s:#][^:#]*?)\s*:(\s|$)/.exec(text);
  }

  function mapEntry(l, indent) {
    var m = keyMatch(l.text.slice(indent));
    if (!m) return null;
    var after = indent + m[0].length, rest = l.text.slice(after), pad = rest.search(/\S/);
    var key = scalarText(m[1].trim(), l.n);
    return { key: { value: key.value, line: l.n, start: l.at + indent, end: l.at + indent + m[1].trim().length }, valueCol: pad < 0 ? -1 : after + pad };
  }

  function yamlValue(l, col) {
    var raw = l.text.slice(col).replace(/\s+$/, ""), start = l.at + col;
    if (raw[0] === "[") return flowSeq(raw, l, start);
    if (raw === "{}") return { type: "map", entries: [] };
    if (/^[|>{&*!]/.test(raw)) throw new YamlError(l.n, "Block scalars, flow maps, anchors and tags are outside what the explainer reads.");
    var s = scalarText(raw, l.n);
    return { type: "scalar", value: s.value, plain: s.plain, line: l.n, start: start, end: start + raw.length };
  }

  function flowSeq(raw, l, start) {
    if (!/\]$/.test(raw)) throw new YamlError(l.n, "A list in [ ] must close on the same line.");
    var items = [], re = /\s*("(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^,\]]+?)\s*(?:,|\]$)/g, m;
    re.lastIndex = 1;
    while ((m = re.exec(raw)) && m[0]) {
      var at = start + m.index + m[0].indexOf(m[1]), s = scalarText(m[1], l.n);
      items.push({ type: "scalar", value: s.value, plain: s.plain, line: l.n, start: at, end: at + m[1].length });
    }
    return { type: "seq", items: items };
  }

  function scalarText(raw, n) {
    if (raw[0] === '"') {
      if (!/^"(?:[^"\\]|\\.)*"$/.test(raw)) throw new YamlError(n, "This quoted text doesn't close.");
      return { value: raw.slice(1, -1).replace(/\\(["\\/])/g, "$1").replace(/\\n/g, "\n").replace(/\\t/g, "\t"), plain: false };
    }
    if (raw[0] === "'") {
      if (!/^'(?:[^']|'')*'$/.test(raw)) throw new YamlError(n, "This quoted text doesn't close.");
      return { value: raw.slice(1, -1).replace(/''/g, "'"), plain: false };
    }
    return { value: raw, plain: true };
  }

  // PyYAML resolves plain scalars to Python values; Optics then calls str() on them.
  function pyStr(node) {
    if (!node || node.value === null) return null;
    if (!node.plain) return node.value;
    var v = node.value;
    if (/^(?:~|null|Null|NULL)?$/.test(v)) return null;
    if (/^(?:yes|Yes|YES|true|True|TRUE|on|On|ON)$/.test(v)) return "True";
    if (/^(?:no|No|NO|false|False|FALSE|off|Off|OFF)$/.test(v)) return "False";
    if (/^[-+]?(?:0|[1-9][0-9_]*)$/.test(v)) return String(parseInt(v.replace(/_/g, ""), 10));
    return v;
  }

  function mapGet(node, key) {
    if (!node || node.type !== "map") return undefined;
    var hit = node.entries.filter(function (e) { return e.key.value === key; }).pop();
    return hit && hit.value;
  }

  // ---- variables: ${name} -------------------------------------------------------------
  function varRefs(text) {
    var refs = [], pos = 0, start;
    while ((start = text.indexOf("${", pos)) !== -1) {
      var close = text.indexOf("}", start + 2);
      if (close === -1) break;
      if (close === start + 2) { pos = start + 1; continue; }
      refs.push({ start: start, end: close + 1, name: text.slice(start + 2, close), escaped: start > pos && text[start - 1] === "$" });
      pos = close + 1;
    }
    return refs;
  }

  function wholeVarName(param) {
    if (typeof param !== "string") return null;
    var text = param.trim(), ref = varRefs(text)[0];
    return ref && ref.start === 0 && ref.end === text.length ? ref.name.trim() : null;
  }

  function splitStoreAs(params) {
    var rest = [], name = null;
    params.forEach(function (p) {
      var m = /^\s*store_as\s*=\s*([\s\S]*)$/.exec(p.v);
      if (m) name = { v: wholeVarName(m[1]) || m[1].trim(), cell: p };
      else rest.push(p);
    });
    return { params: rest, storeAs: name };
  }

  function slug(name) { return name.split(/\s+/).filter(Boolean).join("_").toLowerCase(); }
  function caseKind(name) {
    var w = name.toLowerCase().split(/\s+/).filter(Boolean), end = w.slice(-2).join(" ");
    if (end === "suite setup") return "suite_setup";
    if (end === "suite teardown") return "suite_teardown";
    return w[w.length - 1] === "setup" ? "setup" : w[w.length - 1] === "teardown" ? "teardown" : "test";
  }

  // ---- locators: utils.determine_element_type -------------------------------------------
  var CSS_TAGS = ["input", "button", "div", "span", "a", "img", "select", "textarea", "form", "label", "p", "h1", "h2", "h3", "h4", "h5", "h6"];
  var LOCATOR_RULES = [
    [/^text_only:/, "text_only"], [/^text=/, "Text"], [/\.(jpg|jpeg|png|bmp)$/, "Image"], [/^css=/, "CSS"],
    [/^(xpath=|\/|\()/, "XPath"], [/^id:/, "ID"], [/^(android\.|xcui)/, "Class"],
  ];
  function locatorType(element) {
    var e = element.trim(), l = e.toLowerCase();
    var rule = LOCATOR_RULES.filter(function (r) { return r[0].test(l); })[0];
    if (rule) return rule[1];
    return looksLikeCss(e, l) ? "CSS" : "Text";
  }

  function looksLikeCss(e, l) {
    if (e.indexOf("[") >= 0 && e.indexOf("]") >= 0) return true;
    if (/^(\.|#[A-Za-z_-])/.test(e)) return true;
    return CSS_TAGS.some(function (t) { return l.indexOf(t) === 0 && /^[[#.]/.test(l.slice(t.length)); });
  }

  // ---- difflib.get_close_matches(word, possibilities, n=1, cutoff=0.6) --------------------
  function ratio(a, b) {
    var b2j = {};
    for (var j = 0; j < b.length; j++) (b2j[b[j]] = b2j[b[j]] || []).push(j);
    var matched = 0, queue = [[0, a.length, 0, b.length]];
    while (queue.length) {
      var q = queue.pop(), m = longest(a, b2j, q[0], q[1], q[2], q[3]);
      if (!m[2]) continue;
      matched += m[2];
      queue.push.apply(queue, sides(q, m));
    }
    return a.length + b.length ? (2 * matched) / (a.length + b.length) : 1;
  }

  function sides(q, m) {
    var out = [];
    if (q[0] < m[0] && q[2] < m[1]) out.push([q[0], m[0], q[2], m[1]]);
    if (m[0] + m[2] < q[1] && m[1] + m[2] < q[3]) out.push([m[0] + m[2], q[1], m[1] + m[2], q[3]]);
    return out;
  }

  function longest(a, b2j, alo, ahi, blo, bhi) {
    var best = [alo, blo, 0], j2len = {};
    for (var i = alo; i < ahi; i++) {
      var next = {}, js = b2j[a[i]] || [];
      for (var x = 0; x < js.length; x++) {
        var j = js[x];
        if (j < blo) continue;
        if (j >= bhi) break;
        var k = (next[j] = (j2len[j - 1] || 0) + 1);
        if (k > best[2]) best = [i - k + 1, j - k + 1, k];
      }
      j2len = next;
    }
    return best;
  }

  function closeMatch(word, possibilities) {
    var best = null;
    possibilities.forEach(function (p) {
      var r = ratio(p, word);
      if (r >= 0.6 && (!best || r > best.r || (r === best.r && p > best.p))) best = { r: r, p: p };
    });
    return best && best.p;
  }

  function title(s) { return s.replace(/_/g, " ").replace(/[A-Za-z]+/g, function (w) { return w[0].toUpperCase() + w.slice(1).toLowerCase(); }); }

  function suggestion(name, catalogue) {
    var match = closeMatch(slug(name), Object.keys(catalogue.keywords));
    return match ? " Did you mean '" + title(match) + "'? (run `optics list` to see all keywords)" : "";
  }

  // ---- YAML steps: data_reader._tokens and _parse_module_step ---------------------------
  var TOKEN = /(?:[^\s"']|"[^"]*"|'[^']*')+/g;
  var WRAPPED = /^(["'])([\s\S]*)\1$/;

  function tokens(step) {
    var found = [], m, gap = 0, unbalanced = false;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(step))) {
      if (step.slice(gap, m.index).trim()) unbalanced = true;
      found.push({ v: m[0], start: m.index, end: m.index + m[0].length });
      gap = TOKEN.lastIndex;
    }
    if (unbalanced || step.slice(gap).trim()) return splitWords(step);
    return found.map(unwrapToken);
  }

  function splitWords(step) {
    var out = [], re = /\S+/g, m;
    while ((m = re.exec(step))) out.push({ v: m[0], start: m.index, end: m.index + m[0].length });
    return out;
  }

  function unwrapToken(t) {
    var whole = WRAPPED.exec(t.v), eq = t.v.indexOf("=");
    if (whole) return { v: whole[2], start: t.start, end: t.end };
    if (eq >= 0) {
      var value = WRAPPED.exec(t.v.slice(eq + 1));
      if (value) return { v: t.v.slice(0, eq) + "=" + value[2], start: t.start, end: t.end };
    }
    return t;
  }

  function keywordSlug(name) { return slug(name.replace(/_/g, " ")); }

  function parseYamlStep(step, moduleNames, catalogue) {
    var module = matchedModule(step, moduleNames);
    if (module !== null) return { keyword: module, params: [] };
    var words = tokens(step), arity = catalogue.yamlArity;
    for (var count = words.length; count > 0; count--) {
      var name = words.slice(0, count).map(function (w) { return w.v; }).join(" ");
      if (keywordSlug(name) in arity) {
        if (!mistyped(name, words.slice(count), arity)) return { keyword: name, params: words.slice(count) };
        break;
      }
    }
    for (var k = 0; k < words.length; k++) {
      if (words[k].v.indexOf("${") >= 0) return { keyword: words.slice(0, k).map(function (w) { return w.v; }).join(" "), params: words.slice(k) };
    }
    return { keyword: step, params: [] };
  }

  function matchedModule(step, names) {
    if (names.has(step)) return step;
    var target = keywordSlug(step), hit = null;
    Array.from(names).sort().some(function (n) { return n.indexOf("${") < 0 && keywordSlug(n) === target && (hit = n); });
    return hit;
  }

  function mistyped(name, params, arity) {
    if (!params.length || !/^[A-Za-z][A-Za-z_]*$/.test(params[0].v)) return false;
    var extended = keywordSlug(name + " " + params[0].v) + "_";
    if (Object.keys(arity).some(function (s) { return s.indexOf(extended) === 0; })) return true;
    var limit = arity[keywordSlug(name)];
    return limit !== null && limit !== undefined && params.length > limit;
  }

  // ---- files: helper/execute.py tells them apart by what is inside -----------------------
  function fileKinds(file) {
    if (/\.csv$/i.test(file.path)) {
      var first = file.text.replace(/^﻿/, "").split(/\r?\n/)[0];
      var h = new Set(first.trim().split(",").map(function (x) { return x.trim().toLowerCase(); }));
      return csvKinds(h);
    }
    if (/\.ya?ml$/i.test(file.path)) return yamlKinds(file);
    return [];
  }

  function csvKinds(h) {
    var kinds = [];
    if (h.has("test_case") && h.has("test_step")) kinds.push("test_cases");
    if (h.has("module_name") && h.has("module_step")) kinds.push("modules");
    if (h.has("element_name") && Array.from(h).some(isElementIdColumn)) kinds.push("elements");
    if (h.has("error_code") && h.has("match_string")) kinds.push("error_definitions");
    return kinds;
  }

  function isElementIdColumn(header) { return header.replace(/\s+/g, "").toLowerCase().indexOf("element_id") === 0; }

  function yamlKinds(file) {
    if (!file.yaml || file.yaml.type !== "map") return [];
    var keys = new Set(file.yaml.entries.map(function (e) { return String(e.key.value).trim().toLowerCase(); })), kinds = [];
    if (["test cases", "test_cases", "test-cases", "testcases"].some(function (k) { return keys.has(k); })) kinds.push("test_cases");
    if (keys.has("modules")) kinds.push("modules");
    if (keys.has("elements")) kinds.push("elements");
    if (keys.has("api") || keys.has("apis")) kinds.push("api");
    return kinds;
  }

  function cellRef(file, cell) { return { file: file.path, start: cell.start, end: cell.end, line: cell.line }; }

  // ---- readers -----------------------------------------------------------------------
  function csvTestCases(file, out) {
    file.csv.records.forEach(function (r) {
      var tc = r.fields.test_case, st = r.fields.test_step;
      var name = tc ? tc.v.trim() : "", step = st ? st.v.trim() : "";
      if (!name || !step) return;
      addStep(out, name, { name: step, at: cellRef(file, st), row: rowRef(file, r), caseAt: cellRef(file, tc) });
    });
  }

  function addStep(out, name, step) {
    var tc = out.order.get(name);
    if (!tc || tc.file !== step.at.file) out.order.set(name, (tc = { name: name, steps: [], at: step.caseAt, file: step.at.file, replaced: !!tc }));
    tc.steps.push(step);
  }

  function rowRef(file, r) {
    var last = r.cells[r.cells.length - 1];
    return { file: file.path, line: r.line, start: r.cells[0].start, end: last.end };
  }

  function csvModules(file, modules) {
    var params = file.csv.headers.map(function (h, k) { return h.indexOf("param_") === 0 ? k : -1; }).filter(function (k) { return k >= 0; });
    file.csv.records.forEach(function (r) {
      var mn = r.fields.module_name, ms = r.fields.module_step;
      if (!mn || !mn.v || !ms || !ms.v) return;
      var name = mn.v.trim(), step = {
        keyword: ms.v.trim(), at: cellRef(file, ms), nameAt: cellRef(file, mn), row: rowRef(file, r), module: name,
        params: [], empty: [], dropped: r.dropped.map(function (c) { return cellRef(file, c); }),
      };
      params.forEach(function (k) {
        var c = r.cells[k];
        if (c && c.v.trim()) step.params.push({ v: unescapeCsv(c.v.trim()), at: cellRef(file, c), slot: file.csv.headers[k] });
        else if (c) step.empty.push({ at: cellRef(file, c), slot: file.csv.headers[k] });
      });
      moduleSteps(modules, name, file.path).push(step);
    });
  }

  function moduleSteps(modules, name, path) {
    if (!modules.has(name)) modules.set(name, { name: name, steps: [], files: new Set() });
    var m = modules.get(name);
    if (!m.files.has(path)) { m.files.add(path); m.steps = m.files.size > 1 ? (m.overwritten = true, []) : m.steps; }
    return m.steps;
  }

  function csvElements(file, elements) {
    var ids = file.csv.headers.map(function (h, k) { return isElementIdColumn(h) ? k : -1; }).filter(function (k) { return k >= 0; });
    var local = new Map();
    file.csv.records.forEach(function (r) {
      var en = r.fields.element_name, name = en ? en.v.trim() : "";
      if (!name) return;
      if (!local.has(name)) local.set(name, []);
      ids.forEach(function (k) {
        var c = r.cells[k];
        if (c && c.v.trim()) local.get(name).push({ v: unescapeCsv(c.v.trim()), at: cellRef(file, c), nameAt: cellRef(file, en), row: rowRef(file, r), column: file.csv.headers[k] });
      });
      if (!local.get(name).rows) local.get(name).rows = [];
      local.get(name).rows.push({ nameAt: cellRef(file, en), row: rowRef(file, r) });
    });
    local.forEach(function (values, name) { mergeElement(elements, name, values, values.rows); });
  }

  function mergeElement(elements, name, values, rows) {
    if (!elements.has(name)) elements.set(name, { name: name, values: [], rows: [] });
    var el = elements.get(name);
    el.rows = el.rows.concat(rows || []);
    if (!el.values.length) { el.values = values.slice(); return; }
    values.forEach(function (v) { if (!el.values.some(function (e) { return e.v === v.v; })) el.values.push(v); });
  }

  function csvErrors(file, out) {
    file.csv.records.forEach(function (r) {
      var c = r.fields.error_code, m = r.fields.match_string, code = c ? c.v.trim() : "", match = m ? m.v.trim() : "";
      if (!code || !match) return;
      var d = r.fields.description, s = r.fields.severity;
      out.set(code, { code: code, match: match, description: d ? d.v.trim() : "", severity: s ? s.v.trim() : "", row: rowRef(file, r) });
    });
  }

  function yamlRef(file, node) { return { file: file.path, start: node.start, end: node.end, line: node.line }; }

  function yamlTestCases(file, out) {
    var list = mapGet(file.yaml, "Test Cases");
    seqItems(list).forEach(function (tc) {
      (tc.entries || []).forEach(function (e) {
        var name = String(e.key.value).trim(), steps = seqItems(e.value).filter(function (s) { return s.type === "scalar" && pyStr(s) && pyStr(s).trim(); });
        if (!name || !steps.length) return;
        steps.forEach(function (s) {
          var at = yamlRef(file, s);
          addStep(out, name, { name: pyStr(s).trim(), at: at, row: at, caseAt: { file: file.path, start: e.key.start, end: e.key.end, line: e.key.line } });
        });
      });
    });
  }

  function seqItems(node) { return node && node.type === "seq" ? node.items : []; }

  function yamlModuleNames(file) {
    var names = [];
    seqItems(mapGet(file.yaml, "Modules")).forEach(function (m) {
      (m.entries || []).forEach(function (e) { if (String(e.key.value).trim()) names.push(String(e.key.value).trim()); });
    });
    return names;
  }

  function yamlModules(file, modules, names, catalogue) {
    seqItems(mapGet(file.yaml, "Modules")).forEach(function (m) {
      (m.entries || []).forEach(function (e) {
        var name = String(e.key.value).trim(), steps = seqItems(e.value);
        if (!name || !steps.length) return;
        var list = moduleSteps(modules, name, file.path);
        steps.forEach(function (s) { var step = yamlStep(file, s, names, catalogue, name); if (step) list.push(step); });
      });
    });
  }

  function yamlStep(file, s, names, catalogue, module) {
    var text = pyStr(s);
    if (s.type !== "scalar" || !text || !text.trim()) return null;
    var lead = text.length - text.replace(/^\s+/, "").length, base = s.plain ? s.start + lead : s.start + 1;
    var parsed = parseYamlStep(text.trim(), names, catalogue), at = yamlRef(file, s);
    var kwEnd = parsed.params.length ? base + parsed.params[0].start : base + text.trim().length;
    return {
      keyword: parsed.keyword, module: module, row: at, nameAt: null, empty: [], dropped: [],
      at: { file: file.path, start: base, end: Math.min(kwEnd, at.end), line: s.line },
      params: parsed.params.map(function (p) { return { v: p.v, at: { file: file.path, start: base + p.start, end: base + p.end, line: s.line } }; }),
    };
  }

  function yamlElements(file, elements) {
    var map = mapGet(file.yaml, "Elements");
    ((map && map.entries) || []).forEach(function (e) {
      var name = String(e.key.value).trim(), nodes = e.value.type === "seq" ? e.value.items : [e.value];
      var values = nodes.filter(function (n) { return n.type === "scalar" && pyStr(n) !== null && pyStr(n).trim(); }).map(function (n) {
        return { v: pyStr(n).trim(), at: yamlRef(file, n), column: "Elements" };
      });
      var keyAt = { file: file.path, start: e.key.start, end: e.key.end, line: e.key.line };
      if (name && values.length) mergeElement(elements, name, values, [{ nameAt: keyAt, row: keyAt }]);
    });
  }

  function yamlApis(file, apis) {
    var root = mapGet(file.yaml, "api") || file.yaml, cols = mapGet(root, "collections");
    ((cols && cols.entries) || []).forEach(function (c) {
      var col = { key: c.key.value, name: pyStr(mapGet(c.value, "name")), base: pyStr(mapGet(c.value, "base_url")) || "", apis: new Map(), file: file.path };
      ((mapGet(c.value, "apis") || {}).entries || []).forEach(function (a) { col.apis.set(a.key.value, apiEntry(file, a)); });
      apis.set(col.key, col);
    });
  }

  function apiEntry(file, a) {
    var req = mapGet(a.value, "request"), exp = mapGet(a.value, "expected_result"), extract = mapGet(exp, "extract");
    return {
      key: a.key.value, name: pyStr(mapGet(a.value, "name")), endpoint: pyStr(mapGet(a.value, "endpoint")) || "",
      method: pyStr(mapGet(req, "method")) || "GET", status: pyStr(mapGet(exp, "expected_status")),
      checks: seqItems(mapGet(exp, "jsonpath_assertions")).map(function (x) { return { path: pyStr(mapGet(x, "path")), condition: pyStr(mapGet(x, "condition")) }; }),
      extract: ((extract && extract.entries) || []).map(function (x) { return { name: x.key.value, path: pyStr(x.value) }; }),
      at: { file: file.path, start: a.key.start, end: a.key.end, line: a.key.line },
    };
  }

  // ---- the project ----------------------------------------------------------------------
  function load(files, catalogue) {
    var p = { files: files.map(readFile), catalogue: catalogue, testCases: { order: new Map() }, modules: new Map(), elements: new Map(), apis: new Map(), errors: new Map() };
    var names = new Set();
    p.files.forEach(function (f) {
      if (f.kinds.indexOf("modules") < 0) return;
      if (f.csv) f.csv.records.forEach(function (r) { var m = r.fields.module_name; if (m && m.v.trim()) names.add(m.v.trim()); });
      else yamlModuleNames(f).forEach(function (n) { names.add(n); });
    });
    p.files.forEach(function (f) { readInto(p, f, names); });
    return p;
  }

  function readFile(file) {
    var f = { path: file.path, text: file.text, kinds: [] };
    if (/\.ya?ml$/i.test(file.path)) {
      try { f.yaml = parseYaml(file.text); } catch (e) { if (!(e instanceof YamlError)) throw e; f.error = e; }
    }
    f.kinds = fileKinds(f);
    if (f.kinds.length && /\.csv$/i.test(file.path)) f.csv = csvRecords(file.text);
    return f;
  }

  function readInto(p, f, names) {
    var csv = !!f.csv;
    f.kinds.forEach(function (kind) {
      if (kind === "test_cases") (csv ? csvTestCases : yamlTestCases)(f, p.testCases);
      if (kind === "modules") csv ? csvModules(f, p.modules) : yamlModules(f, p.modules, names, p.catalogue);
      if (kind === "elements") (csv ? csvElements : yamlElements)(f, p.elements);
      if (kind === "error_definitions") csvErrors(f, p.errors);
      if (kind === "api") yamlApis(f, p.apis);
    });
  }

  // ---- the run order: helper/execute.py get_execution_queue -----------------------------
  var WRAPPER_LABEL = { suite_setup: "suite setup", suite_teardown: "suite teardown", setup: "test setup", teardown: "test teardown" };
  var WRAPPER_SUFFIX = { suite_setup: "Suite Setup", suite_teardown: "Suite Teardown", setup: "Setup", teardown: "Teardown" };

  function queue(p) {
    var wrappers = {}, tests = [];
    for (var tc of p.testCases.order.values()) {
      var kind = caseKind(tc.name);
      if (kind === "test") { tests.push(tc); continue; }
      if (wrappers[kind]) return { abort: secondWrapper(kind, wrappers[kind], tc) };
      wrappers[kind] = tc;
    }
    var q = [];
    if (wrappers.suite_setup) q.push({ name: wrappers.suite_setup.name, kind: "suite_setup", tc: wrappers.suite_setup });
    tests.forEach(function (t) {
      if (wrappers.setup) q.push({ name: wrappers.setup.name + " (" + t.name + ")", kind: "setup", tc: wrappers.setup });
      q.push({ name: t.name, kind: "test", tc: t });
      if (wrappers.teardown) q.push({ name: wrappers.teardown.name + " (" + t.name + ")", kind: "teardown", tc: wrappers.teardown });
    });
    if (wrappers.suite_teardown) q.push({ name: wrappers.suite_teardown.name, kind: "suite_teardown", tc: wrappers.suite_teardown });
    return { queue: q };
  }

  function secondWrapper(kind, first, second) {
    var label = WRAPPER_LABEL[kind];
    return {
      code: "E0503", at: second.at,
      message: "The test cases have more than one " + label + ": '" + first.name + "' and '" + second.name + "'.\nA test case whose name ends with '" + WRAPPER_SUFFIX[kind] + "' is the " + label + ". Rename the others.",
    };
  }

  // ---- dry run: TestRunner._dry_run_module and _dry_run_keyword ---------------------------
  function Failure(code, message, at) { this.code = code; this.message = message; this.at = at; }

  function dryRun(p) {
    var missing = ["test_cases", "modules"].filter(function (k) { return !p.files.some(function (f) { return f.kinds.indexOf(k) >= 0; }); });
    if (missing.length) return { abort: { code: "E0501", message: "Missing required files: " + missing.join(", ") + ". Run `optics init <name>` to scaffold a complete project." } };
    if (!p.testCases.order.size) return { abort: { code: "E0702", message: "No test cases to run." } };
    var plan = queue(p);
    if (plan.abort) return { abort: plan.abort };
    var store = new Map();
    p.elements.forEach(function (el, name) { store.set(name, el.values.map(function (v) { return v.v; })); });
    return { cases: plan.queue.map(function (entry) { return dryRunCase(p, entry, store); }) };
  }

  function dryRunCase(p, entry, store) {
    var result = { name: entry.name, kind: entry.kind, tc: entry.tc, status: "PASS", modules: [] };
    entry.tc.steps.forEach(function (step) {
      result.modules.push({ name: step.name, step: step, status: "NOT_RUN", keywords: (moduleDef(p, step.name) || []).map(function (s) { return { step: s, status: "NOT_RUN" }; }) });
    });
    for (var i = 0; i < result.modules.length; i++) {
      var failure = dryRunModule(p, result.modules[i], store);
      if (failure) { result.status = "FAIL"; result.failure = failure; break; }
    }
    return result;
  }

  function moduleDef(p, name) {
    var m = p.modules.get(name);
    return m && m.steps.length ? m.steps : null;
  }

  function dryRunModule(p, mod, store) {
    if (!moduleDef(p, mod.name) && !(slug(mod.name) in p.catalogue.keywords)) {
      mod.status = "FAIL";
      return new Failure("E0402", "Unknown keyword or module: '" + mod.name + "'" + (suggestion(mod.name, p.catalogue) ? "." + suggestion(mod.name, p.catalogue) : ""), mod.step.at);
    }
    for (var i = 0; i < mod.keywords.length; i++) {
      var kw = mod.keywords[i];
      try { kw.resolved = dryRunKeyword(p, kw.step, store); }
      catch (e) {
        if (!(e instanceof Failure)) throw e;
        kw.status = mod.status = "FAIL";
        return e;
      }
      kw.status = "PASS";
    }
    mod.status = "PASS";
    return null;
  }

  function dryRunKeyword(p, step, store) {
    var split = splitStoreAs(step.params), method = p.catalogue.keywords[slug(step.keyword)];
    substituteInline(method, split.params, store);
    var raw = (method && method.raw) || [];
    var resolved = split.params.map(function (param, i) { return raw.indexOf(i) >= 0 ? param.v : resolveParam(param, store); });
    defineNames(method, split, store);
    if (!method) throw new Failure("E0402", "Keyword not found: " + step.keyword + "." + suggestion(step.keyword, p.catalogue), step.at);
    var unbound = root.OpticsExplain.checkParams(step.keyword, method, split.params);
    if (unbound) throw new Failure("E0403", unbound, step.at);
    return resolved;
  }

  function defineNames(method, split, store) {
    var define = function (name) { store.set(name, ["<" + name + ">"]); };
    if (split.storeAs) {
      if (!split.storeAs.v) throw new Failure("E0403", "store_as needs a name, e.g. store_as=balance.", split.storeAs.cell.at);
      define(split.storeAs.v);
    }
    if (method && method.definesVariable && split.params.length) define(wholeVarName(split.params[0].v) || split.params[0].v.trim());
  }

  function substituteInline(method, params, store) {
    if (method && method.substitutesOwnVars) return;
    var raw = (method && method.raw) || [];
    params.forEach(function (param, i) {
      if (raw.indexOf(i) < 0 && wholeVarName(param.v) === null) checkInline(param, store);
    });
  }

  function checkInline(param, store) {
    varRefs(param.v).forEach(function (ref) {
      var values = store.get(ref.name.trim());
      if (!ref.escaped && !(values && values.length)) throw new Failure("E0403", "Variable '${" + ref.name + "}' in '" + param.v + "' is not defined.", param.at);
    });
  }

  function resolveParam(param, store) {
    var name = wholeVarName(param.v);
    if (name === null) return param.v;
    var values = store.get(name);
    if (!values || !values.length) throw new Failure("E0201", "Element not found: " + name, param.at);
    return values[0];
  }

  root.OpticsSuite = {
    load: load, dryRun: dryRun, parseYamlStep: parseYamlStep, locatorType: locatorType, wholeVarName: wholeVarName,
    varRefs: varRefs, splitStoreAs: splitStoreAs, slug: slug, caseKind: caseKind, suggestion: suggestion, title: title,
    moduleDef: moduleDef, csvRows: csvRows, parseYaml: parseYaml,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
