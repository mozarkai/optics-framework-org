// /explain: edit a suite, see each row explained and the predicted optics dry_run, live.
(function () {
  "use strict";
  var S = window.OpticsSuite, X = window.OpticsExplain, root = document.querySelector(".xp"), site = new URL(".", document.currentScript.src);
  if (!S || !X || !root) return;
  var data = JSON.parse(document.getElementById("xp-data").textContent);
  var cat = data.catalogue, examples = data.examples;
  var $ = function (sel) { return root.querySelector(sel); };
  var ui = {
    examples: $(".xp-examples"), tabs: $(".xp-tabs"), code: $(".xp-code"), hl: $(".xp-hl"), input: $(".xp-input"), gutter: $(".xp-gutter"),
    band: $(".xp-band"), explain: $(".xp-explain"), run: $(".xp-run-out"), notes: $(".xp-notes"), where: $(".xp-where"), copy: $(".xp-copy"),
  };
  var state = { files: [], active: 0, example: null }, model, run, notes, lineH = 22;
  var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
  var docs = function (path) { return esc(new URL(path, site).href); };
  var prose = function (s) {
    return esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\[([^\]]+)\]\(\/?([^)]+)\)/g, function (_, text, path) { return '<a href="' + docs(path) + '">' + text + "</a>"; });
  };
  var reduce = matchMedia("(prefers-reduced-motion: reduce)");

  // The suite lives in the URL fragment, which the browser never sends to a server.
  function b64(bytes) { var s = ""; bytes.forEach(function (b) { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function unb64(text) { var s = atob(text.replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(s, function (c) { return c.charCodeAt(0); }); }
  function pipe(bytes, stream) { return new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer().then(function (b) { return new Uint8Array(b); }); }

  function encodeState() {
    var json = new TextEncoder().encode(JSON.stringify({ f: state.files.map(function (f) { return [f.path, f.text]; }), a: state.active, c: ui.input.selectionStart }));
    if (!window.CompressionStream) return Promise.resolve("u=" + b64(json));
    return pipe(json, new CompressionStream("deflate-raw")).then(function (z) { return "s=" + b64(z); });
  }

  // A suite this size takes seconds to explain; a link that unpacks to more is not one we wrote.
  var MAX_LINK = 65536, MAX_SUITE = 262144;
  function decodeState(hash) {
    var m = /^#([su])=(.+)$/.exec(hash);
    if (!m || m[2].length > MAX_LINK) return Promise.resolve(null);
    return Promise.resolve().then(function () {
      var bytes = unb64(m[2]);
      return m[1] === "s" ? pipe(bytes, new DecompressionStream("deflate-raw")) : bytes;
    }).then(function (b) {
      if (b.length > MAX_SUITE) return null;
      var o = JSON.parse(new TextDecoder().decode(b));
      return { files: o.f.map(function (f) { return { path: f[0], text: f[1] }; }), active: o.a || 0, caret: o.c || 0 };
    });
  }

  var saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var ex = pristineExample();
      ui.examples.querySelectorAll(".xp-ex").forEach(function (b) { b.setAttribute("aria-pressed", String(!!ex && b.dataset.ex === ex.slug)); });
      if (ex) return history.replaceState(null, "", "#" + ex.slug);
      encodeState().then(function (h) { history.replaceState(null, "", "#" + h); });
    }, 250);
  }

  function pristineExample() {
    var ex = examples.filter(function (e) { return e.slug === state.example; })[0];
    if (!ex || ex.files.length !== state.files.length) return null;
    return ex.files.every(function (f, i) { return f.path === state.files[i].path && f.text === state.files[i].text; }) ? ex : null;
  }

  function openExample(slug, push) {
    var ex = examples.filter(function (e) { return e.slug === slug; })[0] || examples[0];
    state.example = ex.slug;
    state.files = ex.files.map(function (f) { return { path: f.path, text: f.text }; });
    var focus = ex.focus.split(":"), active = Math.max(0, state.files.map(function (f) { return f.path; }).indexOf(focus[0]));
    if (push) history.pushState(null, "", "#" + ex.slug);
    show(active, lineOffset(state.files[active].text, Number(focus[1]) || 1));
    document.dispatchEvent(new CustomEvent("optics:play", { detail: "explain-" + ex.slug }));
  }

  function lineOffset(text, line) {
    var at = 0;
    for (var n = 1; n < line; n++) { var next = text.indexOf("\n", at); if (next < 0) break; at = next + 1; }
    return at;
  }

  function show(active, caret) {
    state.active = active;
    renderExamples();
    analyse();
    ui.input.value = state.files[active].text;
    ui.input.setSelectionRange(caret, caret);
    renderAll();
  }

  function fromHash() {
    var slug = location.hash.slice(1);
    if (examples.some(function (e) { return e.slug === slug; })) return openExample(slug, false);
    decodeState(location.hash).then(function (s) {
      if (!s || !s.files.length) return brokenLink();
      state.example = null;
      state.files = s.files;
      show(Math.min(s.active, s.files.length - 1), s.caret);
    }).catch(brokenLink);
  }

  function brokenLink() {
    openExample(examples[0].slug, false);
    history.replaceState(null, "", "#" + examples[0].slug);
  }

  function analyse() {
    model = S.load(state.files, cat);
    run = S.dryRun(model);
    notes = X.notes(model);
  }

  function renderAll() {
    renderTabs();
    renderCode();
    renderRun();
    renderNotes();
    renderExplain();
  }

  function renderExamples() {
    ui.examples.innerHTML = examples.map(function (e) {
      return '<button type="button" class="xp-ex" data-ex="' + esc(e.slug) + '" aria-pressed="' + (e.slug === state.example) + '">' + esc(e.title) + "</button>";
    }).join("");
  }

  function fileMarks(path) {
    var fail = (run.cases || []).some(function (c) { return c.failure && c.failure.at && c.failure.at.file === path; });
    return fail ? "fail" : notes.some(function (n) { return n.at && n.at.file === path && n.level !== "info"; }) ? "warn" : "";
  }

  function renderTabs() {
    ui.tabs.innerHTML = state.files.map(function (f, i) {
      var kinds = model.files[i].kinds, mark = fileMarks(f.path);
      return '<div class="xp-tab" role="presentation"><button type="button" role="tab" class="xp-file" data-file="' + i + '" aria-selected="' + (i === state.active) + '" tabindex="' + (i === state.active ? 0 : -1) + '"' +
        ' title="' + esc(kinds.length ? kinds.join(", ").replace(/_/g, " ") : "data") + '">' + (mark ? '<i class="xp-dot ' + mark + '" aria-label="' + (mark === "fail" ? "fails dry_run" : "has notes") + '"></i>' : "") +
        esc(f.path) + "</button>" + (state.files.length > 1 ? '<button type="button" class="xp-close" data-close="' + i + '" aria-label="Remove ' + esc(f.path) + '"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6"/></svg></button>' : "") + "</div>";
    }).join("") + '<button type="button" class="xp-add" aria-label="Add a file"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2v8M2 6h8"/></svg></button>';
  }

  // The editor is a transparent textarea over a highlighted copy of its text.
  function decorations(path) {
    var spans = [];
    function add(at, cls) { if (at && at.file === path && at.end > at.start) spans.push({ start: at.start, end: at.end, cls: cls }); }
    model.testCases.order.forEach(function (tc) { tc.steps.forEach(function (s) { add(s.caseAt, "c-case"); add(s.at, "c-mod"); }); });
    model.modules.forEach(function (m) {
      m.steps.forEach(function (s) {
        add(s.nameAt, "c-mod");
        add(trimAt(s.at), cat.keywords[S.slug(s.keyword)] ? "c-kw" : "c-kw c-unknown");
        s.params.forEach(function (p) { add(p.at, /^\s*store_as\s*=/.test(p.v) ? "c-store" : "c-lit"); });
        s.dropped.forEach(function (d) { add(d, "c-drop"); });
      });
    });
    model.elements.forEach(function (el) { el.rows.forEach(function (r) { add(r.nameAt, "c-var"); }); el.values.forEach(function (v) { add(v.at, "c-lit"); }); });
    model.apis.forEach(function (col) { col.apis.forEach(function (a) { add(a.at, "c-mod"); }); });
    return spans.sort(function (a, b) { return a.start - b.start; });
  }

  function trimAt(at) {
    if (!at) return at;
    var f = state.files.filter(function (x) { return x.path === at.file; })[0], text = f ? f.text.slice(at.start, at.end) : "";
    return { file: at.file, start: at.start, end: at.start + text.replace(/\s+$/, "").length, line: at.line };
  }

  function problems(path) {
    var out = [];
    (run.cases || []).forEach(function (c) { if (c.failure && c.failure.at && c.failure.at.file === path) out.push({ at: trimAt(c.failure.at), level: "fail" }); });
    notes.forEach(function (n) { if (n.at && n.at.file === path && n.level !== "info") out.push({ at: n.at, level: n.level === "fail" ? "fail" : "warn" }); });
    return out;
  }

  function paint(text, spans) {
    var html = "", pos = 0;
    spans.forEach(function (s) {
      if (s.start < pos) return;
      html += vars(text.slice(pos, s.start)) + '<span class="' + s.cls + '">' + vars(text.slice(s.start, s.end)) + "</span>";
      pos = s.end;
    });
    return html + vars(text.slice(pos));
  }

  function vars(text) { return esc(text).replace(/\$\{[^}\n]*\}/g, function (m) { return '<span class="c-var">' + m + "</span>"; }); }

  function renderCode() {
    var f = state.files[state.active], text = f.text, path = f.path, lines = text.split("\n").length;
    var spans = decorations(path), probs = problems(path);
    var marked = paintProblems(text, spans, probs);
    ui.hl.innerHTML = marked + "\n";
    var byLine = {};
    probs.forEach(function (p) { byLine[p.at.line] = byLine[p.at.line] === "fail" ? "fail" : p.level; });
    var g = "";
    for (var n = 1; n <= lines; n++) g += '<span class="' + (byLine[n] || "") + '">' + n + "</span>";
    ui.gutter.innerHTML = g;
    ui.code.classList.toggle("is-yaml", /\.ya?ml$/i.test(path));
    syncScroll();
    placeBand();
  }

  function paintProblems(text, spans, probs) {
    var marks = probs.map(function (p) { return { start: p.at.start, end: Math.max(p.at.end, p.at.start + 1), cls: "c-" + p.level }; });
    var outer = marks.concat(spans).sort(function (a, b) { return a.start - b.start || (b.end - b.start) - (a.end - a.start); });
    var html = "", pos = 0;
    outer.forEach(function (m) {
      if (m.start < pos || !/^c-(fail|warn)$/.test(m.cls)) return;
      var inner = spans.filter(function (s) { return s.start >= m.start && s.end <= m.end; }).map(function (s) { return { start: s.start - m.start, end: s.end - m.start, cls: s.cls }; });
      html += paint(text.slice(pos, m.start), spans.filter(function (s) { return s.start >= pos && s.end <= m.start; }).map(function (s) { return { start: s.start - pos, end: s.end - pos, cls: s.cls }; }));
      html += '<span class="' + m.cls + '">' + paint(text.slice(m.start, m.end), inner) + "</span>";
      pos = m.end;
    });
    return html + paint(text.slice(pos), spans.filter(function (s) { return s.start >= pos; }).map(function (s) { return { start: s.start - pos, end: s.end - pos, cls: s.cls }; }));
  }

  function syncScroll() {
    ui.hl.style.transform = "translate(" + -ui.input.scrollLeft + "px," + -ui.input.scrollTop + "px)";
    ui.gutter.style.transform = "translateY(" + -ui.input.scrollTop + "px)";
    ui.band.style.translate = "0 " + -ui.input.scrollTop + "px";
  }

  function caretLine() { return ui.input.value.slice(0, ui.input.selectionStart).split("\n").length; }

  function placeBand() {
    lineH = parseFloat(getComputedStyle(ui.input).lineHeight) || lineH;
    ui.band.style.top = (caretLine() - 1) * lineH + parseFloat(getComputedStyle(ui.input).paddingTop) + "px";
    ui.where.textContent = state.files[state.active].path + ":" + caretLine();
  }

  function onEdit() {
    state.files[state.active].text = ui.input.value;
    analyse();
    renderAll();
    save();
  }

  function jump(at) {
    if (!at) return;
    var i = state.files.map(function (f) { return f.path; }).indexOf(at.file);
    if (i < 0) return;
    if (i !== state.active) { state.active = i; ui.input.value = state.files[i].text; renderTabs(); }
    ui.input.focus({ preventScroll: true });
    ui.input.setSelectionRange(at.start, at.end);
    ui.input.scrollTop = Math.max(0, (at.line - 4) * lineH);
    renderCode();
    renderExplain();
    if (matchMedia("(max-width: 980px)").matches) ui.code.scrollIntoView({ block: "nearest", behavior: reduce.matches ? "auto" : "smooth" });
  }

  function atAttr(at) { return at ? ' data-at="' + esc(JSON.stringify([at.file, at.start, at.end, at.line])) + '"' : ""; }
  function readAt(el) { var a = JSON.parse(el.dataset.at); return { file: a[0], start: a[1], end: a[2], line: a[3] }; }
  function loc(at) { return '<button type="button" class="xp-loc"' + atAttr(at) + ">" + esc(at.file.split("/").pop()) + ":" + at.line + "</button>"; }

  // Laid out like the tree that optics dry_run prints.
  function masked(v) { return /^@:/.test(v) ? "****" : v; }

  function renderRun() {
    if (run.abort) {
      ui.run.innerHTML = '<div class="xp-abort"><b>Cannot start: ' + esc(run.abort.code) + "</b>" + esc(run.abort.message).replace(/\n/g, "<br>") + (run.abort.at ? " " + loc(run.abort.at) : "") + "</div>";
      return;
    }
    var lines = ['<li class="xp-t-root">Test Suite</li>'];
    run.cases.forEach(function (c, ci) { treeCase(c, ci === run.cases.length - 1, lines); });
    var failed = run.cases.filter(function (c) { return c.status === "FAIL"; });
    ui.run.innerHTML = '<ol class="xp-tree">' + lines.join("") + "</ol>" +
      '<p class="xp-total">Total Test Cases: ' + run.cases.length + " | Passed: " + (run.cases.length - failed.length) + " | Failed: " + failed.length + "</p>" +
      (failed.length ? '<div class="xp-fails"><p class="xp-fails-h">Failures</p>' + failed.map(failureLine).join("") + "</div>" : "");
  }

  function treeCase(c, last, lines) {
    lines.push(treeLine(last ? "└── " : "├── ", c.name, c.status, c.tc.at));
    var pad = last ? "    " : "│   ";
    c.modules.forEach(function (m, mi) {
      var lastM = mi === c.modules.length - 1;
      lines.push(treeLine(pad + (lastM ? "└── " : "├── "), m.name, m.status, m.step.at));
      var pad2 = pad + (lastM ? "    " : "│   ");
      m.keywords.forEach(function (k, ki) {
        lines.push(treeLine(pad2 + (ki === m.keywords.length - 1 ? "└── " : "├── "), kwLabel(k), k.status, k.step.at));
      });
    });
  }

  function kwLabel(k) {
    var shown = k.resolved || S.splitStoreAs(k.step.params).params.map(function (p) { return p.v; });
    return k.step.keyword + (shown.length ? " (" + shown.map(masked).join(", ") + ")" : "");
  }

  function treeLine(branch, label, status, at) {
    return '<li><button type="button" class="xp-t"' + atAttr(at) + '><span class="xp-t-b" aria-hidden="true">' + branch + '</span><span class="xp-t-n">' + esc(label) +
      '</span><span class="xp-t-s s-' + status.toLowerCase() + '">' + status.replace("_", " ") + "</span></button></li>";
  }

  function failureLine(c) {
    return '<button type="button" class="xp-fail"' + atAttr(c.failure.at) + "><span>" + esc(c.name) + '</span><b class="xp-code-tag">' + esc(c.failure.code) + "</b> " + esc(c.failure.message) + "</button>";
  }

  function renderNotes() {
    var list = notes.filter(function (n) { return n.level !== "info"; });
    ui.notes.hidden = !list.length;
    ui.notes.querySelector("ul").innerHTML = list.map(function (n) {
      return '<li class="n-' + n.level + '">' + loc(n.at) + "<span>" + esc(n.text) + '</span> <a href="' + docs(n.docs) + '">Docs</a></li>';
    }).join("");
  }

  function renderExplain() {
    placeBand();
    var rec = X.recordAt(model, state.files[state.active].path, ui.input.selectionStart);
    var view = (EXPLAIN[rec.type] || EXPLAIN.file)(rec);
    ui.explain.innerHTML = view;
    wires();
  }

  var EXPLAIN = {
    step: explainStep, case: explainCase, element: explainElement, error: explainError, api: explainApi,
    header: explainHeader, data: explainData, "yaml-error": explainYamlError, file: explainFile, none: explainFile,
  };

  function head(kind, title, extra) {
    return '<header class="xp-x-head"><span class="label">' + esc(kind) + '</span><h2 class="xp-x-title">' + title + "</h2>" + (extra || "") + "</header>";
  }

  function chip(text, cls, i) { return '<b class="xp-chip ' + (cls || "") + '"' + (i !== undefined ? ' data-i="' + i + '"' : "") + ">" + esc(text) + "</b>"; }

  function rowFailure(row) {
    var hits = (run.cases || []).filter(function (c) { return c.failure && c.failure.at && within(c.failure.at, row); });
    if (!hits.length) return "";
    var f = hits[0].failure;
    return '<div class="xp-verdict"><span class="label">optics dry_run stops here</span><p><b class="xp-code-tag">' + esc(f.code) + "</b> " + esc(f.message) + "</p>" +
      '<p class="xp-in">In ' + hits.map(function (c) { return esc(c.name); }).join(", ") + "</p></div>";
  }

  function within(at, row) { return at.file === row.file && at.start >= row.start && at.end <= row.end + 1; }

  function rowNotes(row) {
    var list = notes.filter(function (n) { return n.at && within(n.at, row); });
    return list.length ? '<ul class="xp-rnotes">' + list.map(function (n) { return '<li class="n-' + n.level + '">' + esc(n.text) + ' <a href="' + docs(n.docs) + '">Docs</a></li>'; }).join("") + "</ul>" : "";
  }

  function explainStep(rec) {
    var step = rec.step, kw = cat.keywords[S.slug(step.keyword)], r = X.reach(model);
    var insideFlow = !r.direct.has(step.module) && r.via.has(step.module);
    var split = S.splitStoreAs(step.params), bound = kw ? X.bind(kw, split.params, insideFlow) : split.params.map(function (p) { return { p: p, value: p.v }; });
    var parts = rowParts(step, kw, split, bound, r), title = kw ? sentence(kw, bound) : esc(step.keyword);
    return head(insideFlow ? "Step in a module run by " + r.via.get(step.module)[0].kw : "Step", title) + rowFailure(step.row) + rowNotes(step.row) +
      '<div class="xp-split"><div class="xp-tokens">' + parts.tokens.join("") + '</div><svg class="xp-wires" aria-hidden="true"></svg><ol class="xp-boxes">' + parts.boxes.join("") + "</ol></div>" +
      (kw ? flowBox(kw, split.params, step) + aoiBox(bound) + defaultsBox(kw, bound) : "");
  }

  function rowParts(step, kw, split, bound, r) {
    var tokens = [], boxes = [];
    var add = function (text, cls, i, label, body) { tokens.push(tok(text, cls, i)); boxes.push(box(i, label, body)); };
    if (step.nameAt) add(step.module, "t-mod", "m", "Module", moduleBox(step, r));
    add(step.keyword, kw ? "t-kw" : "t-kw t-unknown", "k", "Keyword", keywordBox(step, kw));
    bound.forEach(function (b, i) { add(b.p.v, tokClass(b.p.v), i, paramLabel(b), paramBox(b, kw, i, bound)); });
    if (split.storeAs) add(split.storeAs.cell.v, "t-store", "s", "store_as", storeBox(split.storeAs, kw));
    step.dropped.filter(function (d) { return d.end > d.start; }).forEach(function (d, i) { add(cellText(d), "t-drop", "d" + i, "Dropped", "<p>This cell has no header above it, so Optics never reads it.</p>"); });
    return { tokens: tokens, boxes: boxes };
  }

  function paramLabel(b) { return b.name ? b.name + (b.named ? " · by name" : "") : "value"; }

  function cellText(at) { var f = state.files.filter(function (x) { return x.path === at.file; })[0]; return f.text.slice(at.start, at.end); }
  function tokClass(v) { return /^\s*\$\{[^}]+\}\s*$/.test(v) ? "t-var" : v.indexOf("${") >= 0 ? "t-lit t-mix" : "t-lit"; }
  function tok(text, cls, i) { return '<span class="xp-tok ' + cls + '" data-i="' + i + '">' + esc(text) + "</span>"; }
  function box(i, label, body) { return '<li class="xp-box" data-i="' + i + '"><span class="label">' + esc(label) + "</span>" + body + "</li>"; }

  function sentence(kw, bound) {
    var template = X.SAY[kw.slug] || kw.title;
    return esc(template).replace(/\{(\w+)\}/g, function (_, name) {
      var i = -1;
      bound.forEach(function (b, k) { if (b.name === name && i < 0) i = k; });
      if (i >= 0) return chip(display(bound[i].value), tokClass(bound[i].value).replace("t-", "s-"), i);
      var param = kw.params.filter(function (p) { return p.name === name; })[0];
      return chip(param && param.default ? param.default : name === "app_identifier" || name === "app_package" ? "the app in config.yaml" : name, "s-default");
    }) + ".";
  }

  function display(v) { var n = S.wholeVarName(v); return n !== null ? n : masked(v); }

  function moduleBox(step, r) {
    var direct = r.direct.get(step.module) || [], via = r.via.get(step.module) || [];
    var who = direct.map(function (d) { return "test case " + chip(d.tc, "s-mod"); }).concat(via.map(function (v) { return v.kw + " in " + chip(v.from, "s-mod"); }));
    var n = (S.moduleDef(model, step.module) || []).length;
    return "<p>" + n + (n === 1 ? " step" : " steps") + ". " + (who.length ? "Run by " + who.join(", ") + "." : "Nothing runs this module.") + "</p>" +
      (!direct.length && via.length ? "<p>optics dry_run only checks modules that a test case names, so it skips this one. Steps here read no name=value and use only the first value of each element.</p>" : "");
  }

  function keywordBox(step, kw) {
    if (kw) return "<p>" + prose(kw.summary) + ' <a href="' + docs(kw.url) + '">Docs</a></p>';
    if (model.modules.has(step.keyword)) return "<p>" + esc(step.keyword) + " is a module, not a keyword. Write <code>Execute Module," + esc(step.keyword) + "</code> to run it from here.</p>";
    var hint = S.suggestion(step.keyword, cat);
    return "<p>Optics has no keyword with this name." + (hint ? " The closest is " + esc(hint.split("'")[1]) + "." : "") + ' <a href="' + docs("docs/reference/keywords/") + '">All keywords</a></p>';
  }

  function paramBox(b, kw, i, bound) {
    if (!kw) return varsBox(b.value, kw);
    if (b.extra) return "<p>" + esc(kw.title) + " has no parameter left for this value.</p>";
    var special = SPECIAL_PARAMS[kw.slug] ? SPECIAL_PARAMS[kw.slug](b, kw, i, bound) : null;
    if (special !== null) return special;
    var what = paramDocs(b, kw);
    if (kw.definesVariable && i === 0) return what + writesBox(S.wholeVarName(b.value) || b.value);
    if (/^elements?$/.test(b.name)) return what + ladder(b.value);
    return what + varsBox(b.value, kw);
  }

  function writesBox(name) { return "<p>This step writes " + chip(name, "s-var") + ". Later steps read it as ${" + esc(name) + "}.</p>"; }

  var SPECIAL_PARAMS = { run_loop: loopParam, condition: conditionParam };

  function paramDocs(b, kw) {
    var what = b.name && kw.docs[b.name] ? "<p>" + prose(kw.docs[b.name]) + "</p>" : "";
    return b.named ? "<p>Set by name to " + chip(b.value, "s-lit") + ".</p>" + what : what;
  }

  function conditionParam(b, kw, i, bound) {
    if (i % 2 === 1) return "<p>The module to run when the condition before it is true.</p>";
    if (i === bound.length - 1) return "<p>The module to run when no condition is true.</p>";
    return "<p>A module name, true when all its steps pass, or an expression. Start it with ! to flip it.</p>" + varsBox(b.value, kw);
  }

  function loopParam(b, kw, i, bound) {
    if (i === 0) return "<p>The module to run on each pass.</p>" + (model.modules.has(b.value) ? "" : "<p>No module has this name.</p>");
    if (bound.length === 2) return "<p>How many times to run it, 1 or more.</p>" + varsBox(b.value, kw);
    if (kw.raw.indexOf(i) >= 0) return "<p>The loop sets " + chip("${" + (S.wholeVarName(b.value) || b.value) + "}", "s-var") + " on each pass, for the steps of " + esc(bound[0].value) + ".</p>";
    if (i % 2 === 0) return "<p>The values, separated by | or written as a JSON list.</p>" + varsBox(b.value, kw);
    return null;
  }

  function varsBox(value, kw) {
    var whole = S.wholeVarName(value);
    if (whole !== null) return valueOf(whole);
    if (kw && kw.substitutesOwnVars) return value.indexOf("${") >= 0 ? "<p>" + esc(kw.title) + " puts in each ${name} itself when it runs.</p>" : "";
    var refs = S.varRefs(value).filter(function (r) { return !r.escaped; });
    return refs.map(function (r) { return valueOf(r.name.trim()); }).join("");
  }

  function valueOf(name) {
    var from = X.provenance(model, name), el = model.elements.get(name);
    var parts = from.map(function (f) {
      if (f.kind === "elements") return "the elements file " + loc(f.at) + (el.values.length > 1 ? ", " + el.values.length + " values" : "");
      if (f.kind === "empty") return "an elements row with no value " + loc(f.at);
      if (f.kind === "Invoke API") return "Invoke API " + esc(f.api) + " (" + esc(f.path) + ") when it runs";
      if (f.kind === "Run Loop") return "Run Loop in " + esc(f.module) + ", inside " + esc(f.target) + " only";
      return esc(f.kind) + " in " + esc(f.module) + " " + loc(f.at);
    });
    var first = el && el.values.length ? " First value: " + chip(masked(el.values[0].v), "s-lit") + "." : "";
    return "<p>" + chip("${" + name + "}", "s-var") + (parts.length ? " comes from " + parts.join(", and ") + "." : " isn't defined anywhere.") + first + "</p>";
  }

  function ladder(value) {
    var list = X.locators(model, value), name = S.wholeVarName(value);
    if (!list.length) return name !== null ? valueOf(name) : "";
    var intro = name !== null ? "<p>" + chip("${" + name + "}", "s-var") + (list.length > 1 ? " has " + list.length + " values. Optics tries them in order until one is found." : " has one value.") + "</p>" : "";
    if (name === null && list.length > 1) intro = "<p>" + list.length + " elements, separated by |.</p>";
    return intro + '<ol class="xp-ladder">' + list.map(function (l) {
      return '<li><span class="xp-lt lt-' + l.type.toLowerCase() + '">' + esc(l.type) + "</span><code>" + esc(masked(l.v)) + "</code><p>" + esc(l.how) + "</p></li>";
    }).join("") + "</ol>";
  }

  function storeBox(store, kw) {
    if (!store.v) return "<p>store_as needs a name, such as <code>store_as=balance</code>.</p>";
    return "<p>Keeps what " + esc(kw ? kw.title : "the keyword") + " returns in " + chip("${" + store.v + "}", "s-var") + ". Later steps read it, also in later test cases. A keyword that returns nothing fails the step.</p>";
  }

  function defaultsBox(kw, bound) {
    var set = new Set(bound.map(function (b) { return b.name; }));
    var rest = kw.params.filter(function (p) { return !p.variadic && !set.has(p.name) && !p.required; });
    var missing = kw.params.filter(function (p) { return p.required && !set.has(p.name); });
    return (missing.length ? '<p class="xp-missing">' + missing.map(function (p) { return "<code>" + esc(p.name) + "</code>"; }).join(", ") + (missing.length > 1 ? " are" : " is") + " required. The step fails when it runs.</p>" : "") +
      (rest.length ? '<dl class="xp-defaults">' + rest.map(function (p) { return "<div><dt>" + esc(p.name) + "</dt><dd>" + esc(p.default === null ? "empty" : p.default === "" ? '""' : p.default) + "</dd></div>"; }).join("") + "</dl>" : "");
  }

  function flowBox(kw, params, step) {
    if (kw.slug === "run_loop") return loopBox(params);
    if (kw.slug === "condition") return conditionBox(params);
    if (kw.slug === "invoke_api") return apiCallBox(params[0]);
    if (kw.slug === "execute_module" && params[0]) return targetSteps(params[0].v);
    if (kw.slug === "read_data" && params[2]) return queryBox(params[2].v);
    return "";
  }

  function listValues(param) {
    var name = S.wholeVarName(param.v), el = name !== null && model.elements.get(name), raw = el && el.values.length ? el.values[0].v : param.v;
    if (/^\s*\[/.test(raw)) { try { return JSON.parse(raw).map(String); } catch (e) { return null; } }
    return name !== null && !el ? null : raw.split("|").map(function (v) { return v.trim(); });
  }

  function loopBox(params) {
    if (params.length === 2) return '<div class="xp-flow"><span class="label">Loop</span><p>Runs ' + chip(params[0].v, "s-mod") + " " + esc(params[1].v) + " times.</p></div>";
    var vars = X.loopVars(params).map(function (v) { return { name: v.name, values: listValues(v.values) }; });
    if (!vars.length || vars.some(function (v) { return !v.values; })) return "";
    var passes = Math.min.apply(null, vars.map(function (v) { return v.values.length; }));
    var rows = "";
    for (var i = 0; i < passes; i++) rows += "<tr><th>" + (i + 1) + "</th>" + vars.map(function (v) { return "<td>" + esc(v.values[i]) + "</td>"; }).join("") + "</tr>";
    return '<div class="xp-flow"><span class="label">' + passes + (passes === 1 ? " pass" : " passes") + " of " + esc(params[0].v) + '</span><table class="xp-passes"><thead><tr><th></th>' +
      vars.map(function (v) { return "<th>${" + esc(v.name) + "}</th>"; }).join("") + "</tr></thead><tbody>" + rows + "</tbody></table>" +
      (vars.some(function (v) { return v.values.length > passes; }) ? "<p>The loop stops at the end of the shortest list.</p>" : "") + "</div>";
  }

  function conditionBox(params) {
    var parts = X.conditionParts(model, params);
    return '<div class="xp-flow"><span class="label">Branches, checked in order</span><ol class="xp-branches">' + parts.map(function (c) {
      var test = c.otherwise ? "Otherwise" : c.module ? (c.negate ? "If " + chip(c.module, "s-mod") + " fails" : "If " + chip(c.module, "s-mod") + " passes") : "If " + chip(c.cond.replace(/^!/, ""), "s-lit") + (c.negate ? " is false" : " is true");
      return "<li><span>" + test + '</span><span class="xp-arrow" aria-hidden="true"></span>' + chip(c.target.v, "s-mod") + "</li>";
    }).join("") + "</ol>" + (parts.some(function (c) { return c.module; }) ? "<p>A module condition really runs its steps.</p>" : "") +
      (parts.some(function (c) { return !c.module && !c.otherwise; }) ? "<p>Each ${name} in an expression becomes its value in quotes.</p>" : "") + "</div>";
  }

  function apiCallBox(param) {
    if (!param) return "";
    var bits = param.v.split("."), col = model.apis.get(bits[0]), api = col && col.apis.get(bits[1]);
    if (!api) return "";
    return '<div class="xp-flow">' + requestCard(col, api) + "</div>";
  }

  function requestCard(col, api) {
    var url = /^https?:/.test(api.endpoint) ? api.endpoint : col.base.replace(/\/$/, "") + api.endpoint;
    return '<p class="xp-req"><b>' + esc(api.method) + "</b> " + vars(url) + "</p>" +
      (api.status ? "<p>Fails unless the status is " + esc(api.status) + ".</p>" : "") +
      api.checks.map(function (c) { return "<p>Checks " + chip(c.path, "s-lit") + ": " + esc(c.condition) + "</p>"; }).join("") +
      (api.extract.length ? '<ul class="xp-sets">' + api.extract.map(function (x) { return "<li>Sets " + chip("${" + x.name + "}", "s-var") + " from " + chip(x.path, "s-lit") + "</li>"; }).join("") + "</ul>" +
        "<p>optics dry_run doesn't call the API, so it counts these names as defined only if an elements file has a row for each.</p>" : "");
  }

  function targetSteps(name) {
    var steps = S.moduleDef(model, name);
    if (!steps) return "";
    return '<div class="xp-flow"><span class="label">' + esc(name) + "</span><ol class=\"xp-mini\">" + steps.map(function (s) {
      return "<li>" + loc(s.row) + " " + esc(s.keyword) + " " + esc(s.params.map(function (p) { return p.v; }).join(" ")) + "</li>";
    }).join("") + "</ol></div>";
  }

  function queryBox(query) {
    var parts = query.split(";").map(function (q) { return q.trim(); }).filter(Boolean);
    return '<div class="xp-flow"><span class="label">Query</span><ul class="xp-sets">' + parts.map(function (q) {
      return "<li>" + (/^select\s*=/.test(q) ? "Keep the column " + chip(q.replace(/^select\s*=\s*/, ""), "s-lit") : "Keep rows where " + chip(q, "s-lit")) + "</li>";
    }).join("") + "</ul></div>";
  }

  function aoiBox(bound) {
    var a = X.aoiValues(bound);
    if (!a) return "";
    var over = a.aoi_x + a.aoi_width > 100 || a.aoi_y + a.aoi_height > 100;
    return '<div class="xp-flow xp-aoi-wrap"><span class="label">Area of interest</span><div class="xp-aoi' + (over ? " over" : "") + '"><i style="left:' + a.aoi_x + "%;top:" + a.aoi_y + "%;width:" + a.aoi_width + "%;height:" + a.aoi_height + '%"></i></div>' +
      "<p>Optics only accepts a match inside this part of the screen: from " + a.aoi_x + " % to " + (a.aoi_x + a.aoi_width) + " % across, and " + a.aoi_y + " % to " + (a.aoi_y + a.aoi_height) + " % down. OCR and image matching read only this part.</p></div>";
  }

  var KIND = { suite_setup: "Runs once, before everything else.", suite_teardown: "Runs once, after everything else.", setup: "Runs before each test case.", teardown: "Runs after each test case.", test: "" };

  function explainCase(rec) {
    var tc = rec.tc, step = rec.step, kind = S.caseKind(tc.name), def = S.moduleDef(model, step.name), kw = cat.keywords[S.slug(step.name)];
    var what = def ? "Runs the module " + chip(step.name, "s-mod") + ", " + def.length + (def.length === 1 ? " step." : " steps.") : kw ? "Runs the keyword " + esc(kw.title) + " with no values." : "No module or keyword has this name.";
    var cases = (run.cases || []).filter(function (c) { return c.tc === tc; });
    return head(kind === "test" ? "Test case" : kind.replace("_", " "), esc(tc.name)) + rowFailure(step.row) +
      '<div class="xp-body"><p>' + esc(KIND[kind]) + " Step " + (tc.steps.indexOf(step) + 1) + " of " + tc.steps.length + ". " + what + "</p>" +
      (def ? '<ol class="xp-mini">' + def.map(function (s) { return "<li>" + loc(s.row) + " " + esc(s.keyword) + " " + esc(s.params.map(function (p) { return p.v; }).join(" ")) + "</li>"; }).join("") + "</ol>" : "") +
      (cases.length > 1 ? "<p>This test case runs " + cases.length + " times, once per test case.</p>" : "") + "</div>";
  }

  function explainElement(rec) {
    var el = rec.el, used = X.usages(model, el.name);
    var body = el.values.length ? ladder("${" + el.name + "}") : "<p>This row has no value, so a step that uses ${" + esc(el.name) + "} fails with E0201.</p>";
    var from = X.provenance(model, el.name).filter(function (f) { return f.kind !== "elements" && f.kind !== "empty"; });
    return head("Element", esc(el.name)) + '<div class="xp-body">' + body +
      (from.length ? "<p>A step also writes it: " + from.map(function (f) { return esc(f.kind) + (f.at ? " " + loc(f.at) : ""); }).join(", ") + ". The new value replaces these.</p>" : "") +
      "<p>" + (used.length ? "Used by " + used.length + (used.length === 1 ? " step" : " steps") + ": " + used.map(function (u) { return loc(u.at); }).join(" ") : "No step uses it.") + "</p></div>";
  }

  function explainError(rec) {
    var e = rec.error, teardown = Array.from(model.testCases.order.keys()).some(function (n) { return S.caseKind(n) === "suite_teardown"; });
    return head("Error definition", esc(e.code), e.severity ? chip(e.severity, "s-lit") : "") + '<div class="xp-body">' +
      "<p>" + (teardown ? "Before Suite Teardown" : "After the last test case") + ", Optics reads the text in the UI tree of the screen once. If it contains " + chip(e.match, "s-lit") + " or " + chip(e.code, "s-lit") + ", in any case, the run gets a failed test case " + chip("on-screen-error-detection", "s-mod") + " and exits with code 1.</p>" +
      (e.description ? "<p>The report says: " + esc(e.description) + (/[.!?]$/.test(e.description) ? "" : ".") + "</p>" : "") +
      "<p>optics dry_run, optics live, the HTTP API and MCP don't run this check. " + '<a href="' + docs(X.DOCS.errors) + '">Docs</a></p></div>';
  }

  function explainApi(rec) {
    var used = [];
    model.modules.forEach(function (m) { m.steps.forEach(function (s) { if (S.slug(s.keyword) === "invoke_api" && s.params[0] && s.params[0].v === rec.col.key + "." + rec.api.key) used.push(s); }); });
    return head("API", esc(rec.col.key + "." + rec.api.key), rec.api.name ? '<span class="xp-sub">' + esc(rec.api.name) + "</span>" : "") +
      '<div class="xp-body">' + requestCard(rec.col, rec.api) + "<p>" + (used.length ? "Called by " + used.map(function (s) { return loc(s.row); }).join(" ") : "No step calls it. Write <code>Invoke API," + esc(rec.col.key + "." + rec.api.key) + "</code>.") + "</p></div>";
  }

  var HEADERS = {
    test_cases: "Each row adds one step to a test case: the name of a module to run. Rows with the same test_case run in order.",
    modules: "Each row is one step: the module it belongs to, a keyword, and its values. Each param_ column holds one value. A cell past the last header is dropped.",
    elements: "Each row gives a name one or more values. Every column whose name starts with Element_ID holds a value. Repeat a name on more rows to add fallbacks.",
    error_definitions: "Each row is an error to look for on the last screen of a run. error_code and match_string are required.",
  };

  function explainHeader(rec) {
    var f = rec.file;
    return head("Header", esc(f.path)) + '<div class="xp-body">' + (f.kinds.map(function (k) { return "<p>" + esc(HEADERS[k] || "") + "</p>"; }).join("") || "<p>Optics doesn't recognise this header.</p>") + "</div>";
  }

  function explainData(rec) {
    return head("Data file", esc(rec.file.path)) + '<div class="xp-body"><p>Optics doesn\'t load this file into the suite' +
      (rec.readers.length ? ". Read Data opens it when the step runs: " + rec.readers.map(function (s) { return loc(s.row); }).join(" ") + "</p>" : ", because its header is not one Optics knows.</p>") + "</div>";
  }

  function explainYamlError(rec) {
    return head("YAML", esc(rec.file.path)) + '<div class="xp-body xp-yaml-err"><p>Line ' + rec.file.error.line + ": " + esc(rec.file.error.message) + "</p></div>";
  }

  function explainFile() {
    var f = model.files[state.active];
    var counts = { test_cases: model.testCases.order.size + " test cases", modules: model.modules.size + " modules", elements: model.elements.size + (model.elements.size === 1 ? " element" : " elements"), error_definitions: model.errors.size + " error definitions", api: model.apis.size + " API collections" };
    return head("File", esc(f.path)) + '<div class="xp-body"><p>' + (f.kinds.length ? f.kinds.map(function (k) { return esc(counts[k]); }).join(", ") + " in the suite." : "Optics doesn't read this file as part of the suite.") + "</p></div>";
  }

  // Lanes run down the right of the boxes, and the left-most token takes the lowest level,
  // so that no two wires cross.
  function wires() {
    var svg = ui.explain.querySelector(".xp-wires"), split = ui.explain.querySelector(".xp-split");
    if (!svg || getComputedStyle(svg).display === "none") return;
    var pairs = [];
    ui.explain.querySelectorAll(".xp-box").forEach(function (b) {
      var t = split.querySelector('.xp-tok[data-i="' + b.dataset.i + '"]');
      if (t) pairs.push([t, b]);
    });
    var n = pairs.length, gap = 6, paths = "";
    split.style.setProperty("--lanes", 14 + n * gap + "px");
    split.style.setProperty("--bus", 16 + n * gap + "px");
    var base = split.getBoundingClientRect(), row = split.querySelector(".xp-tokens").getBoundingClientRect().bottom - base.top;
    pairs.forEach(function (p, k) {
      var tr = p[0].getBoundingClientRect(), br = p[1].getBoundingClientRect();
      var x = tr.left + Math.min(tr.width / 2, 14) - base.left, edge = br.right - base.left;
      var level = row + 8 + (n - 1 - k) * gap, lane = edge + 8 + k * gap;
      paths += '<path style="--d:' + k * 40 + 'ms" d="M' + x + " " + (tr.bottom - base.top) + "V" + level + "H" + lane + "V" + (br.top - base.top + 16) + "H" + edge + '"/>';
    });
    svg.setAttribute("viewBox", "0 0 " + base.width + " " + base.height);
    svg.innerHTML = paths;
  }

  ui.input.addEventListener("input", onEdit);
  ui.input.addEventListener("scroll", syncScroll);
  ["keyup", "click", "focus"].forEach(function (t) { ui.input.addEventListener(t, function () { renderExplain(); save(); }); });
  // In YAML, Tab indents where a line starts; anywhere else, or after Escape, it leaves the editor.
  var tabLeaves = false;
  ui.input.addEventListener("keydown", function (e) {
    var leave = tabLeaves, v = ui.input.value, at = ui.input.selectionStart;
    tabLeaves = e.key === "Escape";
    var indenting = at === ui.input.selectionEnd && /^\s*$/.test(v.slice(v.lastIndexOf("\n", at - 1) + 1, at));
    if (leave || !indenting || e.key !== "Tab" || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey || !/\.ya?ml$/i.test(state.files[state.active].path)) return;
    e.preventDefault();
    document.execCommand("insertText", false, "  ");
  });
  ui.tabs.addEventListener("keydown", function (e) {
    var t = e.target.closest("[data-file]"), step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!t) return;
    if (e.key === "F2") return renameFile(Number(t.dataset.file));
    if (!step) return;
    e.preventDefault();
    var next = (Number(t.dataset.file) + step + state.files.length) % state.files.length;
    ui.tabs.querySelector('[data-file="' + next + '"]').click();
    ui.tabs.querySelector('[data-file="' + next + '"]').focus();
  });
  root.addEventListener("click", function (e) {
    var t = e.target.closest("[data-ex], [data-file], [data-close], .xp-add, [data-at], .xp-copy");
    if (!t) return;
    if (t.dataset.ex) return openExample(t.dataset.ex, true);
    if (t.dataset.file) {
      if (e.detail > 1) return renameFile(Number(t.dataset.file));
      if (Number(t.dataset.file) === state.active) return;
      state.active = Number(t.dataset.file); ui.input.value = state.files[state.active].text; renderAll(); return save();
    }
    if (t.dataset.close) return removeFile(Number(t.dataset.close));
    if (t.classList.contains("xp-add")) return addFile();
    if (t.classList.contains("xp-copy")) return copyLink();
    jump(readAt(t));
  });
  root.addEventListener("mouseover", function (e) { hover(e.target.closest(".xp-box, .xp-tok, .xp-chip[data-i]")); });
  root.addEventListener("focusin", function (e) { hover(e.target.closest(".xp-box")); });
  window.addEventListener("hashchange", fromHash);
  window.addEventListener("resize", function () { placeBand(); wires(); });

  function hover(el) {
    ui.explain.querySelectorAll(".is-hot").forEach(function (h) { h.classList.remove("is-hot"); });
    if (!el || el.dataset.i === undefined) return;
    ui.explain.querySelectorAll('[data-i="' + el.dataset.i + '"]').forEach(function (h) { h.classList.add("is-hot"); });
  }

  function addFile() {
    var n = 1;
    while (state.files.some(function (f) { return f.path === "new" + n + ".csv"; })) n++;
    state.files.push({ path: "new" + n + ".csv", text: "Element_Name,Element_ID\n" });
    state.example = null;
    show(state.files.length - 1, state.files[state.files.length - 1].text.length);
    renameFile(state.active);
    save();
  }

  function removeFile(i) {
    state.files.splice(i, 1);
    state.example = null;
    show(Math.min(state.active, state.files.length - 1), 0);
    save();
  }

  function renameFile(i) {
    var tab = ui.tabs.querySelector('[data-file="' + i + '"]'), field = document.createElement("input");
    if (!tab) return;
    field.className = "xp-rename";
    field.value = state.files[i].path;
    field.setAttribute("aria-label", "File name, ending in .csv, .yaml or .yml");
    tab.replaceWith(field);
    field.focus();
    field.select();
    var done = false;
    function commit(keep) {
      if (done) return;
      done = true;
      var name = field.value.trim();
      var ok = /\.(csv|ya?ml)$/i.test(name) && !state.files.some(function (f, k) { return k !== i && f.path === name; });
      if (keep && ok) { state.files[i].path = name; state.example = null; analyse(); save(); }
      renderAll();
    }
    var finish = function (keep) { commit(keep); ui.tabs.querySelector('[data-file="' + i + '"]').focus(); };
    field.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); finish(true); }
      if (e.key === "Escape") finish(false);
    });
    field.addEventListener("blur", function () {
      commit(true);
      setTimeout(function () { if (document.activeElement === document.body) ui.tabs.querySelector('[data-file="' + i + '"]').focus(); });
    });
  }

  function copyLink() {
    clearTimeout(saveTimer);
    var ex = pristineExample();
    (ex ? Promise.resolve(ex.slug) : encodeState()).then(function (h) {
      history.replaceState(null, "", "#" + h);
      return navigator.clipboard.writeText(location.href);
    }).then(function () { flash("Link copied"); }, function () { flash("Copy the address bar"); });
  }

  function flash(text) {
    var label = ui.copy.querySelector("span");
    label.dataset.label = label.dataset.label || label.textContent;
    label.textContent = text;
    clearTimeout(flash.timer);
    flash.timer = setTimeout(function () { label.textContent = label.dataset.label; }, 1600);
  }

  fromHash();
})();
