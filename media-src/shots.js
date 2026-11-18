(function () {
  var K = window.OPTICS_KIT;
  var root = document.getElementById("shots");
  var V = function (x) { return '<span class="t-var">' + x + "</span>"; };
  var L = function (x) { return '<span class="t-lit">' + x + "</span>"; };
  var M = function (x) { return '<span class="t-mod">' + x + "</span>"; };
  var D = function (x) { return '<span class="t-dim">' + x + "</span>"; };
  var OK = function (x) { return '<span class="t-ok">' + x + "</span>"; };
  var BAD = function (x) { return '<span class="t-bad">' + x + "</span>"; };
  var B = function (x) { return '<span class="t-b">' + x + "</span>"; };
  var C = { write: "var(--write)", record: "var(--record)", say: "var(--say)", delegate: "var(--delegate)" };

  function shot(out, w, h, cls) {
    var s = K.h(root, '<section class="shot ' + (cls || "") + '" data-out="' + out + '"><div class="sc-world sc-static"></div></section>');
    s.style.width = w + "px";
    s.style.height = h + "px";
    return s.querySelector(".sc-world");
  }
  function at(w, x, y, html) { return K.abs(w, x, y, html); }
  function brand(w) { return K.h(w, '<div class="p-brand"><img src="../site/logo.svg" alt="">Optics</div>'); }
  function title(w, y, lines, size, width) {
    var el = K.h(w, '<h1 class="p-title">' + lines.map(function (l) { return "<span>" + l + "</span>"; }).join("") + "</h1>");
    el.style.top = y + "px";
    if (size) el.style.fontSize = size + "px";
    if (width) el.style.width = width + "px";
    return el;
  }
  function lede(w, y, text, width) {
    var el = K.h(w, '<p class="p-lede">' + text + "</p>");
    el.style.top = y + "px";
    el.style.width = (width || 560) + "px";
    return el;
  }
  function tags(w, y, list, cls) {
    var el = K.h(w, '<div class="p-tags ' + (cls || "") + '">' + list.map(function (t) { return '<span><i style="--c:' + t[1] + '"></i>' + t[0] + "</span>"; }).join("") + "</div>");
    el.style.top = y + "px";
    return el;
  }
  function term(w, o, lines) {
    var T = K.term(w, o);
    lines.forEach(function (l) { K.h(T.body, '<div class="sc-ln">' + (l || " ") + "</div>"); });
    return T;
  }
  function phone(w, x, y, s, screen) {
    var P = K.phone(w, x, y, s);
    P.start(screen);
    return P;
  }
  function lock(P, box, label, color) {
    var tl = new K.Timeline();
    P.lock(tl, box, label, 0, color);
    tl.ev.forEach(function (e) { e.fn(); });
  }

  var hero = {};

  hero.introducing = function () {
    var w = shot("blog/introducing-optics.webp", 1280, 672, "morning");
    brand(w);
    title(w, 124, ["Create it your way.", "Run it forever."], 100);
    lede(w, 398, "Open-source test automation for Android, iOS, web and TV. Tests are CSV or YAML files, and each element can have several locators.", 520);
    tags(w, 562, [["Write", C.write], ["Record", C.record], ["Describe", C.say], ["Delegate", C.delegate]]);
    K.file(w, { x: 652, y: 318, w: 566, title: "modules/modules.csv", rows: [
      D("module_name,module_step,param_1,param_2"),
      M("Sign In") + ",Enter Text," + V("${email_field}") + ",ava@birch.shop",
      M("Sign In") + ",Press Element," + V("${sign_in}"),
      M("Sign In") + ",Assert Presence," + L("Picked for you"),
      M("Add To Cart") + ",Press Element," + V("${search_bar}"),
      M("Add To Cart") + ",Press Element," + L("Add to cart"),
    ] });
    term(w, { x: 700, y: 542, w: 470, h: 134, title: "optics execute birch-tests", top: true }, [
      D("├── ") + "Sign In       1.38s " + D("[XPath]") + "  " + OK("PASS"),
      D("└── ") + "Add To Cart   2.71s " + D("[OCR]") + "    " + OK("PASS"),
      "Total Test Cases: 2 | Passed: " + OK("2") + " | Failed: 0",
    ]);
  };

  hero.errors = function () {
    var w = shot("blog/error-definitions.webp", 1280, 672, "dusk");
    brand(w);
    title(w, 124, ["Your tests passed.", "Your app didn’t."], 100);
    lede(w, 372, "List the messages that mean something broke. Optics checks the last screen of every run.", 540);
    tags(w, 510, [["has stopped", C.write], ["Session expired", C.delegate], ["Something went wrong", C.say], ["No internet", C.record]], "cols-2 as-typed");
    var P = phone(w, 906, 44, 1.04, "product");
    P.modal.classList.add("in");
    var card = P.modal.firstElementChild;
    lock(P, [card.offsetLeft, card.offsetTop, card.offsetWidth, card.offsetHeight], "ERR_SESSION", "#F56FA1");
    term(w, { x: 690, y: 452, w: 420, h: 122, title: "~/birch" }, [
      OK("✓") + " Passed: " + OK("1") + "  Failed: 0",
      BAD("×") + " on-screen error " + D("·") + " " + BAD("ERR_SESSION"),
    ]);
  };

  hero.agent = function () {
    var w = shot("blog/agent-writes-once.webp", 1280, 672, "afternoon");
    brand(w);
    title(w, 124, ["Your agent writes it once.", "Optics runs it forever."], 100);
    lede(w, 372, "An AI agent drives a real browser over MCP and leaves a plain CSV suite. Every replay after that calls no model.", 540);
    tags(w, 540, [["optics mcp", C.write], ["41 tools", C.record], ["3.3 s replay", C.say], ["0 model calls", C.delegate]], "cols-2 as-typed");
    term(w, { x: 652, y: 312, w: 566, h: 208, title: "your AI agent · optics mcp", top: true }, [
      M("start_session") + " " + L("playwright"),
      M("get_interactive_elements"),
      "  " + D("→") + " " + B("Login") + "  " + V('[data-test="login-button"]'),
      M("press_element") + " " + V('[data-test="login-button"]'),
      D("…"),
      B("Write") + " " + L("checkout/modules/modules.csv"),
    ]);
    term(w, { x: 748, y: 532, w: 470, h: 134, title: "terminal · no API keys", top: true }, [
      B("$ optics execute checkout"),
      D("Total: 1 · Passed: ") + OK("1") + D(" · Failed: 0"),
      D("model calls: ") + OK("0") + D(" · 3.3 s"),
    ]);
  };

  function fig(out, w, h, html) {
    var world = shot(out, w, h, "paper");
    K.h(world, '<div class="d">' + html + "</div>");
  }
  var chip = function (t, cls, small) { return '<span class="d-chip ' + (cls || "") + '">' + t + (small ? "<small>" + small + "</small>" : "") + "</span>"; };
  var arrow = function (a) { return '<span class="d-arrow">' + (a || "→") + "</span>"; };
  var push = '<span style="margin-left:auto"></span>';

  hero.replay = function () {
    var row = function (h, note, tag, body) {
      return '<div style="display:grid;grid-template-columns:300px 1fr;align-items:center">' +
        '<div><div class="d-h">' + h + '</div><div class="d-note" style="margin-top:4px">' + note + "</div></div>" +
        '<div class="d-lane">' + tag + body + "</div></div>";
    };
    fig("blog/agent-replay-figure.webp", 1280, 580,
      '<h2 class="d-title">The model works once. The replays do not use it.</h2>' +
      '<p class="d-sub">Measured on saucedemo.com with Claude Code, claude-opus-5-5 and Optics Framework 1.11.0.</p>' +
      '<div style="margin:auto 0;display:grid;gap:22px">' +
      row("Agent session", "one time, while you write the test", '<span class="d-tag sun">model in the loop</span>',
        chip("32 model turns", "ai") + arrow("⇄") + chip("21 Optics tool calls") + arrow() + chip("4 files") + push + chip("71 s · $0.44", "dark")) +
      '<div style="margin-left:300px;display:flex;align-items:center;gap:10px">' + chip("config.yaml", "dash") + chip("test_cases.csv", "dash") + chip("modules.csv", "dash") + chip("elements.csv", "dash") + '<span class="d-arrow" style="font-size:14px">← review, commit</span></div>' +
      row("Every replay", "on each build, in CI or on a laptop", '<span class="d-tag mint">no model</span>',
        chip("optics execute", "kw") + arrow() + chip("13 steps", "kw") + arrow() + chip("PASS", "ok") + push + chip("3.3 s · 0 model calls · $0", "dark")) +
      "</div>");
  };

  hero.aiOnce = function () {
    var lane = function (h, note, big, bigNote, bigColor, cells, tag) {
      return '<div class="d-lane" style="display:block;padding:16px 20px 18px">' + tag +
        '<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:24px"><div><div class="d-h" style="font-size:19px">' + h + '</div><div class="d-note" style="margin-top:4px;font-size:14px">' + note + "</div></div>" +
        '<div style="text-align:right;white-space:nowrap"><div style="font:880 26px/1 var(--sans);font-stretch:75%;text-transform:uppercase;color:' + bigColor + '">' + big + '</div><div class="d-note" style="font-size:12.5px;margin-top:4px">' + bigNote + "</div></div></div>" +
        '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-top:14px">' + cells + "</div></div>";
    };
    var runs = function (list, label, cls) { return list.map(function (r) { return chip(r, cls + '" style="align-items:center;height:48px;font-size:15px', label); }).join(""); };
    fig("blog/ai-once.webp", 1024, 550,
      '<div class="d-eyebrow">Where the AI goes</div>' +
      '<h2 class="d-title" style="font-size:36px">Optics calls a model only while you write a test</h2>' +
      '<p class="d-sub" style="font-size:15px;max-width:52em">An agent or model can explore your app and draft the suite. Optics then replays the keyword rows it wrote without calling a model.</p>' +
      '<div style="margin-top:auto;display:grid;gap:22px">' +
      lane("An AI model on every run", "The model reads the screen and decides each step, every time the test runs.", "AI on every step", "cost and timing vary run to run", "#7A5A00", runs(["run 1", "run 2", "run 3", "run 4", "run 5", "run …"], "model decides", "ai"), "") +
      lane("Optics", "A model can help you write the test. You review the CSV it produces, and Optics replays that file.", "Model calls only to author", "optional self-heal only when every locator fails", "#0A7A6B",
        chip("author once", 'dark" style="align-items:center;height:48px;font-size:15px', "record · describe · delegate") + runs(["run 1", "run 2", "run 3", "run 4", "run …"], "keywords", "kw"), "") +
      "</div>");
  };

  hero.visibleText = function () {
    var x = function (s) { return '<span class="t-mod">' + s + "</span>"; };
    var a = function (s) { return '<span class="t-var">' + s + "</span>"; };
    var t = function (s) { return '<span class="t-lit">' + s + "</span>"; };
    var step = function (n, s) { return '<div style="display:flex;align-items:center;gap:10px;font:650 17px/1.2 var(--sans)"><b style="font:500 13px/1 var(--mono);background:var(--ink);color:var(--bg);padding:5px 8px">' + n + "</b>" + s + "</div>"; };
    var match = function (s, hit) {
      return hit
        ? '<div style="display:flex;align-items:center;gap:14px;height:40px;padding:0 14px;border:1.5px solid var(--ink);background:#F9D3DF;font:500 15px/1 var(--mono)"><b style="color:#B02D63">✓</b>' + s + '<span style="margin-left:auto;font-size:13px;color:#B02D63">ERR_SESSION</span></div>'
        : '<div style="display:flex;align-items:center;gap:14px;height:36px;padding:0 14px;font:400 15px/1 var(--mono);color:var(--ink-3)"><span>—</span>' + s + "</div>";
    };
    fig("blog/visible-text.webp", 1024, 512,
      '<div style="display:grid;grid-template-columns:1fr 40px 1fr;gap:0;height:100%;align-items:start">' +
      '<div>' + step("1", "Optics captures the last screen’s UI tree") +
      '<div class="d-code" style="margin-top:14px"><div class="h">□ page source (Android UI tree)</div><div class="b">' +
      "&lt;" + x("FrameLayout") + " " + a("resource-id") + '="<s>…:id/dialog</s>"&gt;\n' +
      "  &lt;" + x("TextView") + " " + a("text") + "=" + t('"Session expired"') + "\n      " + a("class") + '="<s>android.widget.TextView</s>"/&gt;\n' +
      "  &lt;" + x("TextView") + " " + a("text") + "=" + t('"Please sign in again"') + "\n      " + a("resource-id") + '="<s>…:id/error_body</s>"/&gt;\n' +
      "  &lt;" + x("Button") + " " + a("text") + "=" + t('"OK"') + "\n      " + a("content-desc") + "=" + t('"Dismiss"') + "/&gt;\n" +
      "&lt;/" + x("FrameLayout") + "&gt;</div></div>" +
      '<p class="d-note" style="margin:18px 0 0">Ids, class names and bounds are ignored, so a <span class="ic">resource-id</span> containing “error” never trips a match.</p>' +
      '<p class="d-note" style="margin:10px 0 0">On the web, Optics strips the HTML first, so <span class="ic">class="error"</span> in the markup can’t match either.</p></div>' +
      '<div class="d-arrow" style="align-self:center;text-align:center;font-size:24px;color:var(--ink)">→</div>' +
      '<div>' + step("2", "keeps only the text a person can see") +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px">' + ["Session expired", "Please sign in again", "OK", "Dismiss"].map(function (c) { return chip(c, '" style="min-height:40px;font-size:14px;padding:0 12px'); }).join("") + "</div>" +
      '<div style="margin-top:26px">' + step("3", "checks every match_string, ignoring case") + "</div>" +
      '<div style="margin-top:10px;display:grid;gap:2px">' + match("has stopped") + match("isn't responding") + match("Session expired", true) + match("Something went wrong") + match("No internet connection") + "</div>" +
      '<p class="d-note" style="margin:16px 0 0">Text it reads: <span class="ic">text</span>, <span class="ic">content-desc</span>, <span class="ic">label</span>, <span class="ic">value</span>, <span class="ic">hint</span> and <span class="ic">name</span> on Android and iOS, the rendered text on the web.</p></div>' +
      "</div>");
  };

  hero.ciStep = function () {
    var ok = '<i style="width:22px;height:22px;display:grid;place-items:center;background:#1A9E5C;color:#fff;font:700 13px/1 var(--sans);font-style:normal">✓</i>';
    var no = '<i style="width:22px;height:22px;display:grid;place-items:center;background:#D93D63;color:#fff;font:700 17px/1 var(--sans);font-style:normal">×</i>';
    var step = function (icon, name, time, bold) { return '<div style="display:flex;align-items:center;gap:14px;height:52px;padding:0 22px;border-top:1.5px solid var(--ink);font:' + (bold ? 650 : 480) + ' 17px/1 var(--sans)">' + icon + name + '<span style="margin-left:auto;font:400 14px/1 var(--mono);color:var(--ink-3)">' + time + "</span></div>"; };
    var n = function (i) { return '<span style="color:#5B5F8C;display:inline-block;width:3ch">' + i + "</span>"; };
    fig("blog/ci-step.webp", 1024, 512,
      '<div style="margin:auto 0;border:1.5px solid var(--ink);background:#FBF8F2;box-shadow:var(--shadow)">' +
      '<div style="display:flex;align-items:center;gap:14px;height:60px;padding:0 22px;font:650 19px/1 var(--sans)">' + no + 'e2e · checkout journey<span style="margin-left:auto;font:500 13px/1 var(--mono);text-transform:uppercase;letter-spacing:.08em;color:#B02D63">failed after 1m 12s</span></div>' +
      step(ok, "Set up Optics", "31s") + step(ok, "Run optics execute birch-tests", "38s") + step(no, "Fail on error screens", "0s", true) +
      '<div class="d-code" style="border-width:1.5px 0 0;line-height:1.7"><div class="b" style="padding:12px 22px 14px">' +
      n(1) + '{ <span class="t-var">"detected"</span>: [ {\n' +
      n(2) + '    <span class="t-var">"error_code"</span>: <span class="t-lit">"ERR_SESSION"</span>,\n' +
      n(3) + '    <span class="t-var">"match_string"</span>: <span class="t-lit">"Session expired"</span>,\n' +
      n(4) + '    <span class="t-var">"description"</span>: <span class="t-lit">"The user was signed out"</span>,\n' +
      n(5) + '    <span class="t-var">"severity"</span>: <span class="t-lit">"high"</span> } ] }\n' +
      n(6) + '<span class="t-bad">Error: Process completed with exit code 1.</span></div></div>' +
      step(ok, "Upload execution_output", "3s") + "</div>");
  };

  // Animations play on a virtual clock: events fire in order, and every CSS transition or
  // animation they start is paused and seeked by hand, so each frame is exact.
  var A = null, now = 0, timers = [], born = new WeakMap(), realTimeout = window.setTimeout;
  window.setTimeout = function (fn, ms) { if (!A) return realTimeout(fn, ms); timers.push({ t: now + (ms || 0), fn: fn }); return 0; };
  function adopt(t) { document.getAnimations().forEach(function (a) { if (!born.has(a)) { born.set(a, t); a.pause(); } }); }
  function anim(out, w, h, W, H, build, hold) {
    var s = K.h(root, '<section class="shot scene" data-out="' + out + '" data-anim></section>');
    s.style.cssText = "width:" + w + "px;height:" + h + "px;aspect-ratio:auto;border:0";
    var world = K.h(s, '<div class="sc-world"></div>');
    world.style.cssText = "width:" + W + "px;height:" + H + "px;transform:scale(" + w / W + ")";
    var tl = new K.Timeline();
    A = { tl: tl };
    build(world, tl, K, { w: W, h: H });
    A.events = tl.ev.sort(function (a, b) { return a.t - b.t; });
    A.k = 0;
    A.dur = tl.end + (hold || 2600);
    adopt(0);
  }
  window.__duration = function () { return A.dur; };
  window.__frame = function (T) {
    for (;;) {
      timers.sort(function (a, b) { return a.t - b.t; });
      var e = A.events[A.k], tm = timers[0];
      var next = e && e.t <= T ? e : null;
      if (tm && tm.t <= T && (!next || tm.t < next.t)) next = timers.shift();
      else if (next) A.k++;
      if (!next) break;
      now = next.t;
      next.fn();
      adopt(now);
    }
    now = T;
    document.getAnimations().forEach(function (a) {
      if (!born.has(a)) { born.set(a, T); a.pause(); }
      a.currentTime = Math.max(0, T - born.get(a));
    });
  };

  var S = window.OPTICS_SCENES;
  [["fourways", "four-ways"], ["record", "optics-live"], ["ladder", "locator-fallback"], ["platforms", "platforms"]].forEach(function (p) {
    hero[p[0]] = function () { anim("blog/" + p[1] + ".webp", 1000, 568, S[p[0]].w, S[p[0]].h, S[p[0]].build, S[p[0]].hold); };
  });

  function ci(w, x, y, width) {
    var el = at(w, x, y, '<div class="p-ci" style="width:' + width + 'px"><i></i><div><b>CI · checkout journey</b><small>optics execute birch-tests</small></div><span>Passed</span></div>');
    return {
      el: el,
      fail: function (tl, t, sub) { return tl.at(t, function () { el.classList.add("bad"); el.querySelector("small").textContent = sub; el.querySelector("span").textContent = "Failed"; }); },
    };
  }
  var PROMPT = '<span class="t-ok">~/birch</span> <span class="t-mod">❯</span>';
  var row = function (indent, name, time) { return D(indent) + (name + " ").padEnd(52 - indent.length) + D("| " + time + " |") + "   " + OK("PASS"); };
  var cardBox = function (P) { var c = P.modal.firstElementChild; return [c.offsetLeft, c.offsetTop, c.offsetWidth, c.offsetHeight]; };

  hero.greenRun = function () {
    anim("blog/green-run.webp", 1100, 650, 1100, 650, function (w, tl) {
      var T = K.term(w, { x: 30, y: 26, w: 752, h: 480, title: "~/birch", top: true });
      var card = ci(w, 30, 532, 752);
      card.el.classList.add("sc-fade");
      var P = K.phone(w, 818, 36, 1);
      P.start("login");
      var t = T.cmd(tl, PROMPT, "optics execute birch-tests", 300, 34);
      T.line(tl, "Test Suite", t + 200);
      T.line(tl, row("└── ", "Shopper can buy running shoes", "6.12s"), t + 300);
      T.line(tl, row("    ├── ", "Sign In", "2.31s"), t + 400);
      var e = P.typeField(tl, ".f-email", "ava@birch.shop", t + 600, 30);
      T.line(tl, row("    │   ├── ", "Enter Text (${email_field}, ava@bi...", "0.52s"), e + 100);
      e = P.typeField(tl, ".f-pass", "•••••••••••••", e + 300, 34);
      T.line(tl, row("    │   ├── ", "Enter Text (${password_field}, •••...", "0.47s"), e + 100);
      P.tap(tl, "signin", e + 400);
      e = P.screen(tl, "home", e + 650);
      T.line(tl, row("    │   ├── ", "Press Element (${sign_in})", "0.49s"), e + 100);
      T.line(tl, row("    │   └── ", "Assert Presence (Running)", "0.83s"), e + 600);
      T.line(tl, row("    └── ", "Add To Cart", "3.81s"), e + 800);
      P.tap(tl, "card0", e + 1100);
      e = P.screen(tl, "product", e + 1400);
      T.line(tl, row("        ├── ", "Press Element (Trail Runner 2)", "1.12s"), e + 100);
      P.tap(tl, "add", e + 700);
      e = tl.add(P.toast, "in", e + 950);
      T.line(tl, row("        ├── ", "Press Element (Add to cart)", "0.48s"), e + 100);
      T.line(tl, row("        └── ", "Assert Presence (Added to cart)", "0.66s"), e + 600);
      T.line(tl, "Total Test Cases: 1 | Passed: " + OK("1") + " | Failed: 0", e + 900);
      tl.rm(P.toast, "in", e + 1500);
      e = tl.add(P.modal, "in", e + 1800);
      tl.show(card.el, e + 600);
      tl.at(e + 1600, function () { lock(P, cardBox(P), "Session expired", "#F56FA1"); });
    }, 3000);
  };

  hero.endOfRun = function () {
    anim("blog/end-of-run.webp", 1100, 675, 1100, 675, function (w, tl) {
      var f = K.file(w, { x: 30, y: 26, w: 752, title: "test_data/error_definitions.csv", rows: [
        D("error_code,match_string,description,severity"),
        "ERR_CRASH," + L("has stopped") + ",The app crashed,critical",
        "ERR_ANR," + L("isn't responding") + ",The app froze,critical",
        "ERR_SESSION," + L("Session expired") + ",The user was signed out,high",
        "ERR_SERVER," + L("Something went wrong") + ",Server error page,high",
        "ERR_NETWORK," + L("No internet connection") + ",Offline,medium",
      ] });
      var j = K.file(w, { x: 30, y: 252, w: 752, title: "execution_output/detected_errors_c56291e5….json", rows: [] });
      j.el.classList.add("sc-fade");
      var card = ci(w, 30, 566, 752);
      var P = K.phone(w, 818, 50, 1);
      P.start("product");
      var t = tl.add(P.modal, "in", 700) + 700;
      P.scan(tl, t);
      [1, 2, 3, 4, 5].forEach(function (i, n) {
        tl.add(f.rows[i], "hl", t + n * 380);
        if (i !== 3) tl.rm(f.rows[i], "hl", t + n * 380 + 380);
      });
      tl.at(t + 1200, function () { lock(P, cardBox(P), "ERR_SESSION", "#F56FA1"); });
      tl.rm(f.rows[3], "hl", t + 2100);
      tl.add(f.rows[3], "bad", t + 2100);
      t = tl.show(j.el, t + 2500) + 300;
      [
        '{ "detected": [ {',
        '    "error_code": ' + L('"ERR_SESSION"') + ",",
        '    "match_string": ' + L('"Session expired"') + ",",
        '    "severity": ' + L('"high"') + ",",
        '    "detected_at": ' + L('"end_of_run"'),
        "} ] }",
      ].forEach(function (r, n) { j.add(tl, r, t + n * 260); });
      card.fail(tl, t + 6 * 260 + 600, "ERR_SESSION · high · Session expired");
    }, 3200);
  };

  // Video frames: the recorded panel bodies are laid over these by render.mjs.
  function frame(out, n, title, label, left, right, rightBody) {
    var w = shot(out, 1280, 720, "afternoon");
    K.h(w, '<div class="v-head"><b>' + n + "</b><h1>" + title + "</h1><span>" + label + "</span></div>");
    var win = function (x, width, bar, body) { var el = K.h(w, '<div class="v-win"><div class="sc-bar"><i></i><i></i><i></i><span>' + bar + "</span></div></div>"); el.style.left = x + "px"; el.style.width = width + "px"; el.style.setProperty("--body", body); };
    win(44, 520, left, "#14173D");
    win(588, 648, right, rightBody);
  }
  function endCard(out, title, stats, foot) {
    var w = shot(out, 1280, 720, "afternoon");
    K.h(w, '<div class="v-card"><h1>' + title + '</h1><div class="v-stats">' + stats.map(function (s) { return "<div><b" + (s[2] ? ' style="color:' + s[2] + '"' : "") + ">" + s[0] + "</b><small>" + s[1] + "</small></div>"; }).join("") + '</div><p class="v-foot">' + foot + "</p></div>");
  }
  var AGENT = ["1", "Your AI agent explores the app"];
  var REPLAY = ["2", "Optics replays it. No agent, no model"];
  hero.agentVid1 = function () { frame("video/agent-session-0.png", AGENT[0], AGENT[1], "real recording · 1.5× speed", "claude code · optics mcp tool calls", "chromium · driven by the agent", "#fff"); };
  hero.agentVid2 = function () { frame("video/agent-session-1.png", AGENT[0], AGENT[1], "then it writes the suite", "claude code · optics mcp tool calls", "checkout/modules/modules.csv", "#14173D"); };
  hero.agentVid3 = function () { endCard("video/agent-session-2.png", "One agent session", [["71 s", "wall time"], ["32", "model turns"], ["21", "Optics tool calls"], ["$0.44", "model cost"]], "claude-opus-5-5 · Optics Framework 1.11.0 · 4 files written"); };
  [1, 2, 3].forEach(function (n) {
    hero["replayVid" + n] = function () { frame("video/replay-runs-" + (n - 1) + ".png", REPLAY[0], REPLAY[1], "real recording · run " + n + " of 3 · 1× speed", "terminal · no API keys set", "chromium · driven by optics execute", "#fff"); };
  });
  hero.replayVid4 = function () { endCard("video/replay-runs-3.png", "Every later run", [["10 / 10", "replays passed", "#0B7A45"], ["3.3 s", "median run"], ["0", "model calls"], ["$0", "model cost"]], "and 0 network connections from the Optics process, measured on every run"); };

  hero.og = function () {
    var w = shot("optics-og.jpg", 1200, 630, "morning");
    brand(w);
    title(w, 128, ["Create it your way.", "Run it forever."], 116);
    lede(w, 372, "Open-source test automation for Android, iOS, web and TV.", 470);
    at(w, 64, 486, '<div class="p-cmd">$ curl -fsSL https://optics-framework.org/install | sh</div>');
    var P = phone(w, 852, 300, 1.04, "product");
    P.toast.classList.add("in");
  };

  var only = new URLSearchParams(location.search).get("only");
  window.SHOT_KEYS = Object.keys(hero);
  if (only) hero[only]();
  window.SHOTS_READY = true;
})();
