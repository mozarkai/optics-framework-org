// The scenes. Each one builds a fixed-size world and schedules what happens on a
// timeline (milliseconds). The kit (terminals, files, the Birch phone, wires) is in
// scenes.js. Copy here is short on purpose: the page text does the explaining.
(function () {
  var K = window.OPTICS_KIT, S = window.OPTICS_SCENES;
  if (!K) return;
  var h = K.h, abs = K.abs;

  function label(world, x, y, text) { return abs(world, x, y, '<div class="sc-label">' + text + "</div>"); }
  function chip(world, x, y, html, cls) { return abs(world, x, y, '<div class="sc-chip ' + (cls || "") + '">' + html + "</div>"); }
  function fadeIn(tl, el, t) { el.classList.add("sc-fade"); return tl.show(el, t); }
  function pop(tl, el, t) { el.classList.add("sc-pop"); return tl.show(el, t); }

  // ------------------------------------------------------------------ shared: values and the ways they're found
  // A panel of an element's values, each with the ways Optics finds that kind of value:
  // an XPath only by XPath, plain text in the UI tree and then by OCR, an image file by
  // image match. Values are tried in order. groups: [{head, rungs: [[name, detail]]}].
  function ladder(world, x, y, width, groups) {
    var box = abs(world, x, y, '<div class="sc-rungs" style="width:' + width + 'px"></div>');
    var rungs = [];
    groups.forEach(function (g) {
      h(box, '<div class="sc-vh">' + g.head + "</div>");
      g.rungs.forEach(function (r) {
        rungs.push(h(box, '<div class="sc-rung' + (r[2] ? " " + r[2] : "") + '"><span class="n">' + (rungs.length + 1) + '</span><span class="k">' + r[0] + "<small>" + r[1] + '</small></span><span class="st"></span></div>'));
      });
    });
    return { el: box, rungs: rungs };
  }
  function mark(tl, r, cls, t, dur) {
    tl.add(r, "trying", t);
    tl.at(t + (dur || 700), function () { r.classList.remove("trying"); r.classList.add(cls); r.querySelector(".st").textContent = cls === "found" ? "✓" : "✕"; });
    return t + (dur || 700);
  }
  function keyChip(world, x, y, k, v) {
    return abs(world, x, y, '<div class="sc-chip mono" style="height:38px;font-size:13.5px;padding:0 16px"><span style="color:var(--sc-ink2)">' + k + '</span>&nbsp;<span class="v" style="color:#B8860B">' + v + "</span></div>");
  }

  // ------------------------------------------------------------------ ladder
  // Pass 1: sign_in has two values. A redesign changed the button's id, so the XPath
  // value misses and the text value is found in the UI tree. Pass 2: a product name
  // painted into a banner picture isn't in the UI tree at all, so OCR reads it.
  S.ladder = {
    w: 880, h: 500,
    build: function (w, tl) {
      var P = K.phone(w, 56, 26, 0.8);
      P.start("login");
      tl.at(0, function () { P.S.login.querySelector(".f-email .v").textContent = "ava@birch.shop"; P.S.login.querySelector(".f-pass .v").textContent = "••••••••••"; });
      // pass 1
      var a = abs(w, 0, 0, '<div style="position:absolute;left:0;top:0"></div>');
      keyChip(a, 330, 26, "Press Element", "${sign_in}");
      var f = K.file(a, { x: 330, y: 80, w: 500, title: "test_data/elements.csv", rows: ['<span class="t-var">sign_in</span>,//*[@resource-id=\'login\']', '<span class="t-var">sign_in</span>,Sign in'] });
      var L1 = ladder(a, 330, 184, 500, [
        { head: "value 1 · an XPath", rungs: [["XPath", "//*[@resource-id='login']"]] },
        { head: "value 2 · text", rungs: [["Text in the UI tree", "“Sign in”"], ["Text on a screenshot (OCR)", "“Sign in”"]] },
      ]);
      // pass 2
      var b = abs(w, 0, 0, '<div class="sc-fade" style="position:absolute;left:0;top:0"></div>');
      keyChip(b, 330, 26, "Press Element", "Trail Runner 2");
      abs(b, 330, 84, '<div style="width:500px;font:400 14px/1.5 var(--sans);color:var(--sc-ink2)">A plain value: Optics looks for this text. In this banner the words are part of the picture, so the UI tree doesn’t have them.</div>');
      var L2 = ladder(b, 330, 184, 500, [
        { head: "value 1 · text", rungs: [["Text in the UI tree", "“Trail Runner 2”"], ["Text on a screenshot (OCR)", "“Trail Runner 2”"]] },
      ]);
      abs(w, 330, 432, '<div class="sc-foot" style="width:460px">Image files, such as <code>sign_in.png</code>, are found by image match. With <code>ai_self_heal</code> on, an AI model gets a turn after a value fails.</div>');
      var t = 900;
      tl.add(f.rows[0], "hl", t);
      t = mark(tl, L1.rungs[0], "missed", t) + 300;
      tl.rm(f.rows[0], "hl", t); tl.add(f.rows[1], "hl", t);
      t = mark(tl, L1.rungs[1], "found", t);
      P.lock(tl, "signin", "Text · Sign in", t, "#24C3AB");
      P.tap(tl, "signin", t + 650);
      P.unlock(tl, t + 1100);
      P.screen(tl, "promo", t + 1200);
      t += 2600;
      tl.css(a, { transition: "opacity .4s ease", opacity: "0" }, t);
      tl.show(b, t + 300);
      t += 1100;
      t = mark(tl, L2.rungs[0], "missed", t, 900) + 200;
      tl.add(L2.rungs[1], "trying", t);
      P.scan(tl, t);
      tl.at(t + 1150, function () { L2.rungs[1].classList.remove("trying"); L2.rungs[1].classList.add("found"); L2.rungs[1].querySelector(".st").textContent = "✓"; });
      P.lock(tl, "bannerText", "OCR · Trail Runner 2", t + 1150, "#F3BE00");
      P.tap(tl, "bannerText", t + 1900);
      P.unlock(tl, t + 2300);
      P.screen(tl, "product", t + 2400);
      tl.end = t + 4400;
    },
  };

  // ------------------------------------------------------------------ anatomy
  // A test case names modules; a module is keyword steps; ${names} come from elements.
  S.anatomy = {
    w: 880, h: 500,
    build: function (w, tl) {
      var tc = K.file(w, { x: 30, y: 22, w: 330, title: "test_cases/test_cases.csv", rows: ['<span class="t-dim">test_case,test_step</span>', '<span class="t-mod">Checkout</span>,Sign In', '<span class="t-mod">Checkout</span>,Add To Cart'] });
      var md = K.file(w, { x: 30, y: 150, w: 560, title: "modules/modules.csv", rows: [
        '<span class="t-dim">module_name,module_step,param_1,param_2</span>',
        '<span class="t-mod">Sign In</span>,<span class="t-b">Enter Text</span>,<span class="t-var">${email_field}</span>,ava@birch.shop',
        '<span class="t-mod">Sign In</span>,<span class="t-b">Press Element</span>,<span class="t-var">${sign_in}</span>',
        '<span class="t-mod">Add To Cart</span>,<span class="t-b">Press Element</span>,<span class="t-lit">Trail Runner 2</span>',
        '<span class="t-mod">Add To Cart</span>,<span class="t-b">Press Element</span>,<span class="t-lit">Add to cart</span>'] });
      var el = K.file(w, { x: 30, y: 336, w: 560, title: "test_data/elements.csv", rows: [
        '<span class="t-dim">Element_Name,Element_ID</span>',
        '<span class="t-var">email_field</span>,//*[@resource-id=\'email\']',
        '<span class="t-var">sign_in</span>,//*[@resource-id=\'login\']'] });
      var P = K.phone(w, 640, 30, 0.78);
      P.start("login");
      var wire = K.wire(w, 880, 500);
      var Y = { tc1: 94, tc2: 121, m1: 222, m2: 249, m3: 276, m4: 303, e1: 395, e2: 422 };
      var t = 700;
      tl.add(tc.rows[1], "hl", t);
      wire.draw(tl, [[30, Y.tc1], [16, Y.tc1], [16, Y.m1], [30, Y.m1]], t + 300, "#7086FF");
      tl.add(md.rows[1], "hl", t + 800); tl.add(md.rows[2], "hl", t + 800);
      t += 1700;
      tl.add(el.rows[1], "hl", t);
      wire.draw(tl, [[590, Y.m1], [606, Y.m1], [606, Y.e1], [590, Y.e1]], t, "#F3BE00");
      P.lock(tl, "email", "email_field", t + 500, "#F3BE00");
      var e = P.typeField(tl, ".f-email", "ava@birch.shop", t + 1000, 30);
      P.unlock(tl, e + 200);
      tl.rm(el.rows[1], "hl", e + 300);
      t = e + 600;
      tl.add(el.rows[2], "hl", t);
      wire.draw(tl, [[590, Y.m2], [616, Y.m2], [616, Y.e2], [590, Y.e2]], t, "#F3BE00");
      P.lock(tl, "signin", "sign_in", t + 500, "#9672F8");
      P.tap(tl, "signin", t + 1100);
      P.unlock(tl, t + 1500);
      P.screen(tl, "home", t + 1600);
      tl.rm(md.rows[1], "hl", t + 1700); tl.rm(md.rows[2], "hl", t + 1700); tl.rm(el.rows[2], "hl", t + 1700);
      wire.clear(tl, t + 1700);
      // the next test step
      t += 2300;
      tl.rm(tc.rows[1], "hl", t); tl.add(tc.rows[2], "hl", t);
      wire.draw(tl, [[30, Y.tc2], [10, Y.tc2], [10, Y.m3], [30, Y.m3]], t + 200, "#7086FF");
      tl.add(md.rows[3], "hl", t + 500);
      P.lock(tl, [14, 280, 111, 34], "Text · Trail Runner 2", t + 900, "#24C3AB");
      P.tap(tl, "card0", t + 1500);
      P.unlock(tl, t + 1700);
      P.screen(tl, "product", t + 1800);
      tl.rm(md.rows[3], "hl", t + 2300); tl.add(md.rows[4], "hl", t + 2300);
      P.lock(tl, "add", "Text · Add to cart", t + 2700, "#24C3AB");
      P.tap(tl, "add", t + 3300);
      P.unlock(tl, t + 3500);
      tl.add(P.toast, "in", t + 3500);
      tl.end = t + 4800;
    },
  };

  // ------------------------------------------------------------------ record (optics live)
  // Matches optics live 1.10.5: launch_app runs and is recorded at startup, each result
  // line is followed by its time and the way the element was found, and /save writes
  // every recorded step (launch_app included) to modules.csv.
  var LIVE_BAR = '<b>appium:emulator-5554</b>  ·  <span class="m sc-rec">rec ●</span>  ·  /help · /quit · Tab complete · Ctrl-K keywords · Ctrl-N AI mode';
  function liveStep(T, tl, raw, time, how, t) {
    T.line(tl, '<span class="t-ok">  ✓</span> ' + raw, t);
    T.line(tl, '<span class="t-dim">     ' + time + (how ? "  [" + how + "]" : "") + "</span>", t);
  }
  S.record = {
    w: 880, h: 500,
    build: function (w, tl) {
      var T = K.term(w, { x: 24, y: 22, w: 588, h: 268, title: "~/birch — optics live checkout", status: LIVE_BAR });
      T.status.style.fontSize = "9.2px";
      var P = K.phone(w, 636, 20, 0.82);
      P.start("login");
      var f = K.file(w, { x: 24, y: 304, w: 588, title: "checkout/modules/modules.csv", rows: ['<span class="t-dim">module_name,module_step,param_1,param_2</span>'] });
      f.el.classList.add("sc-fade", "up");
      var v = function (s) { return s.replace(/(\$\{[^}]+\})/g, '<span class="t-var">$1</span>'); };
      T.line(tl, '<span class="t-info">  •</span> <span class="t-dim">Session log: checkout/logs/optics_live_2026-10-10T09-41-07.log</span>', 200);
      T.line(tl, '<span class="t-dim">  ⋯</span> launch_app', 500, "launch");
      T.line(tl, '<span class="t-dim">     running…</span>', 500, "launchT");
      T.set(tl, "launch", '<span class="t-ok">  ✓</span> launch_app', 1700);
      T.set(tl, "launchT", '<span class="t-dim">     1.21s</span>', 1700);
      var t = T.cmd(tl, '<span class="t-mod">›</span>', "enter_text ${email_field} ava@birch.shop", 2300, 34);
      var e = P.typeField(tl, ".f-email", "ava@birch.shop", t, 32);
      liveStep(T, tl, v("enter_text ${email_field} ava@birch.shop"), "0.48s", "XPath", e);
      t = T.cmd(tl, '<span class="t-mod">›</span>', "enter_text ${password_field} birch-demo", e + 500, 34);
      e = P.typeField(tl, ".f-pass", "••••••••••", t, 30);
      liveStep(T, tl, v("enter_text ${password_field} birch-demo"), "0.41s", "XPath", e);
      t = T.cmd(tl, '<span class="t-mod">›</span>', 'press_element "Sign in"', e + 500, 34);
      P.lock(tl, "signin", "Text · Sign in", t, "#24C3AB");
      P.tap(tl, "signin", t + 500);
      P.unlock(tl, t + 900);
      P.screen(tl, "home", t + 900);
      liveStep(T, tl, 'press_element "Sign in"', "0.31s", "Text", t + 700);
      t = T.cmd(tl, '<span class="t-mod">›</span>', "/save Checkout Sign_In", t + 1700, 30);
      T.line(tl, '<span class="t-info">  •</span> <span class="t-ok">Saved 4 step(s) → module \'Sign_In\' in checkout/modules/modules.csv, test case \'Checkout\' in checkout/test_cases/test_cases.csv</span>', t + 200, null, "wrap");
      tl.show(f.el, t + 500);
      ["Launch App,,", v("Enter Text,${email_field},ava@birch.shop"), v("Enter Text,${password_field},birch-demo"), "Press Element,Sign in,"].forEach(function (r, i) {
        var c = r.indexOf(",");
        f.add(tl, '<span class="t-mod">Sign_In</span>,<span class="t-b">' + r.slice(0, c) + "</span>" + r.slice(c), t + 900 + i * 280, "add");
      });
      tl.end = t + 4600;
    },
  };

  // ------------------------------------------------------------------ describe (AI mode)
  // Ctrl+N switches optics live to plain English. The [ai] line and the line under it
  // update in place; each keyword the model runs is printed beneath them with its time.
  S.describe = {
    w: 880, h: 500,
    build: function (w, tl) {
      var T = K.term(w, { x: 24, y: 22, w: 588, h: 456, title: "~/birch — optics live checkout", status: LIVE_BAR });
      T.status.style.fontSize = "9.2px";
      var mode = T.status.querySelector(".m");
      var P = K.phone(w, 636, 20, 0.82);
      P.start("home");
      var key = abs(w, 210, 190, '<div class="sc-chip" style="height:44px;font-size:15px;gap:6px"><kbd>Ctrl</kbd>+<kbd>N</kbd><span style="color:#B8860B;margin-left:6px">AI mode</span></div>');
      pop(tl, key, 400);
      tl.hide(key, 1500);
      liveStep(T, tl, "launch_app", "1.18s", "", 0);
      tl.at(1100, function () { mode.className = "m sc-aion"; mode.textContent = "AI ●"; });
      T.line(tl, '<span class="t-info">  •</span> <span class="t-dim">Natural-language mode ON — describe an action in English. Ctrl-N to exit.</span>', 1100, null, "wrap");
      var t = T.cmd(tl, '<span class="t-ai">ai ›</span>', "add trail runners to the cart", 1800, 30);
      tl.at(t, function () { mode.textContent = "AI …"; });
      T.line(tl, '<span class="t-ai">  ⋯</span> [ai] add trail runners to the cart', t, "head");
      T.line(tl, '<span class="t-dim">     running…</span>', t, "sum");
      function think(text, at) { T.line(tl, '<span class="t-ghost">     thinking: ' + text + "</span>", at); }
      function step(raw, time, how, at) {
        T.line(tl, '<span class="t-ok">    ✓</span> ' + raw, at);
        T.line(tl, '<span class="t-dim">       ' + time + "  [" + how + "]</span>", at);
      }
      think("search for the shoes first", t + 800);
      P.tap(tl, "search", t + 1500);
      var e = P.typeSearch(tl, "trail runner", t + 1700);
      P.filter(tl, 0, e + 300);
      step("enter_text 'Search Birch' 'trail runner'", "1.06s", "Text", e + 200);
      think("Trail Runner 2 is the only result", e + 900);
      P.lock(tl, [14, 280, 111, 34], "OCR · Trail Runner 2", e + 1500, "#F3BE00");
      P.tap(tl, "card0", e + 2000);
      P.unlock(tl, e + 2200);
      P.screen(tl, "product", e + 2300);
      step("press_element 'Trail Runner 2'", "0.87s", "OCR", e + 2200);
      think("press Add to cart", e + 2900);
      P.lock(tl, "add", "Text · Add to cart", e + 3400, "#24C3AB");
      P.tap(tl, "add", e + 3900);
      P.unlock(tl, e + 4100);
      tl.add(P.toast, "in", e + 4100);
      step("press_element 'Add to cart'", "0.34s", "Text", e + 4100);
      T.set(tl, "head", '<span class="t-ok">  ✓</span> [ai] add trail runners to the cart', e + 4900);
      T.set(tl, "sum", '<span class="t-dim">     7.82s  done · 3 step(s) · 7.8s · recorded 3 (/save to keep)</span>', e + 4900);
      tl.at(e + 4900, function () { mode.textContent = "AI ●"; });
      tl.end = e + 7200;
    },
  };

  // ------------------------------------------------------------------ agent (MCP)
  // An MCP client calling optics mcp. The tool and resource names are the real ones;
  // the transcript styling is the client's, not Optics'.
  S.agent = {
    w: 880, h: 500,
    build: function (w, tl) {
      var T = K.term(w, { x: 24, y: 22, w: 588, h: 456, title: "your AI agent  ·  connected to optics mcp", top: true });
      T.body.style.fontSize = "12.5px";
      var P = K.phone(w, 636, 20, 0.82);
      P.start("login2");
      var dot = '<span class="t-pink">⏺</span> ';
      var sid = 'session_id=<span class="t-lit">"7f3c…"</span>';
      function call(name, args, at, key) {
        T.line(tl, dot + '<span class="t-b">optics</span><span class="t-dim"> · </span>' + name + '<span class="t-dim">(</span>' + args + '<span class="t-dim">)</span>', at, key);
      }
      function ok(key, name, args, at) {
        T.set(tl, key, dot + '<span class="t-b">optics</span><span class="t-dim"> · </span>' + name + '<span class="t-dim">(</span>' + args + '<span class="t-dim">)</span> <span class="t-ok">✓</span>', at);
      }
      var t = T.cmd(tl, '<span class="t-pink">›</span>', "Write a checkout test for the Birch app", 300, 36);
      call("start_session", 'driver=<span class="t-lit">"appium"</span>', t + 300, "s");
      ok("s", "start_session", 'driver=<span class="t-lit">"appium"</span>', t + 1000);
      call("screenshot", sid, t + 1300, "sh");
      ok("sh", "screenshot", sid, t + 1700);
      T.line(tl, dot + 'Read <span class="t-b">optics://session/7f3c…/elements</span>', t + 2100);
      var a1 = sid + ', element=<span class="t-lit">"Log in"</span>';
      call("press_element", a1, t + 2700, "p1");
      P.lock(tl, [16, 334, 220, 46], "Text · Log in", t + 2800, "#F56FA1");
      P.tap(tl, [16, 334, 220, 46], t + 3300);
      P.unlock(tl, t + 3600);
      P.screen(tl, "home", t + 3700);
      ok("p1", "press_element", a1, t + 3600);
      var a2 = sid + ', element=<span class="t-lit">"Trail Runner 2"</span>';
      call("press_element", a2, t + 4200, "p2");
      P.tap(tl, "card0", t + 4500);
      P.screen(tl, "product", t + 4800);
      ok("p2", "press_element", a2, t + 4800);
      var a3 = sid + ', element=<span class="t-lit">"Add to cart"</span>';
      call("press_element", a3, t + 5300, "p3");
      P.tap(tl, "add", t + 5600);
      tl.add(P.toast, "in", t + 5800);
      ok("p3", "press_element", a3, t + 5800);
      call("terminate_session", sid, t + 6300, "x");
      ok("x", "terminate_session", sid, t + 6700);
      T.line(tl, dot + 'Read <span class="t-b">optics://project-format</span>', t + 7100);
      T.line(tl, dot + 'Write <span class="t-b">checkout/config.yaml</span>', t + 7600);
      T.line(tl, dot + 'Write <span class="t-b">checkout/test_cases/test_cases.csv</span>', t + 7900);
      T.line(tl, dot + 'Write <span class="t-b">checkout/modules/modules.csv</span>', t + 8200);
      T.line(tl, dot + 'Write <span class="t-b">checkout/test_data/elements.csv</span>', t + 8500);
      T.line(tl, dot + 'Bash <span class="t-b">optics dry_run checkout</span> <span class="t-ok">✓</span>', t + 9100);
      T.line(tl, "", t + 9400);
      T.line(tl, '<span class="t-ok">●</span> The checkout suite is ready: sign in, open Trail Runner 2,', t + 9600);
      T.line(tl, "  add it to the cart. Run it with <span class=\"t-pink\">optics execute checkout</span>", t + 9600);
      tl.end = t + 11800;
    },
  };

  // ------------------------------------------------------------------ run output helpers
  // optics execute prints a tree: test case → module → keyword with its values filled in,
  // each row padded to a column with "| time | STATUS". Rich cuts long labels with "...".
  var TD = function (t) { return '<span class="t-dim">' + t + "</span>"; };
  var ST = { PASS: '<span class="t-ok">PASS</span>', FAIL: '<span class="t-bad">FAIL</span>', NOT_RUN: '<span class="t-dim">NOT_RUN</span>' };
  function treeRow(prefix, name, time, status, col) {
    var room = col - prefix.length - 1;
    if (name.length > room) name = name.slice(0, room - 3) + "...";
    var gap = Array(col - prefix.length - name.length + 1).join(" ");
    return TD(prefix) + K.esc(name) + gap + TD("| ") + time + TD(" |") + " " + (status === "NOT_RUN" ? "" : "   ") + ST[status];
  }
  // A Rich panel: a rounded box with an optional title on the top border and subtitle
  // on the bottom one. Drawn with CSS so its edges line up at any width.
  function panel(html, o) {
    o = o || {};
    return '<div class="sc-box' + (o.tone ? " " + o.tone : "") + '"' + (o.title ? ' data-title="' + o.title + '"' : "") + (o.sub ? ' data-sub="' + o.sub + '"' : "") + ">" + html + "</div>";
  }

  // ------------------------------------------------------------------ run (optics execute)
  S.run = {
    w: 880, h: 500,
    build: function (w, tl) {
      var T = K.term(w, { x: 20, y: 22, w: 580, h: 456, title: "~/birch", top: true });
      T.body.style.fontSize = "11.5px";
      var t = T.cmd(tl, '<span class="t-ok">~/birch</span> <span class="t-mod">❯</span>', "optics execute birch-tests", 300, 32);
      T.line(tl, 'Running tests <span class="sc-bar-fill" style="width:0"></span> <span class="pc">0%</span>', t + 200);
      var bar, pc;
      tl.at(t + 210, function () { bar = T.body.querySelector(".sc-bar-fill"); pc = T.body.querySelector(".pc"); });
      var C = 52;
      var rows = [
        "Test Suite",
        treeRow("├── ", "Suite Setup", "1.21s", "PASS", C),
        treeRow("│   └── ", "Launch Birch", "1.21s", "PASS", C),
        treeRow("│       └── ", "Launch App", "1.21s", "PASS", C),
        treeRow("└── ", "Shopper can buy running shoes", "6.94s", "PASS", C),
        treeRow("    ├── ", "Sign In", "2.37s", "PASS", C),
        treeRow("    │   ├── ", "Enter Text (//*[@resource-id='com.birch.shop:id/email'], ava@birch.shop)", "0.52s", "PASS", C),
        treeRow("    │   ├── ", "Enter Text (//*[@resource-id='com.birch.shop:id/password'], correct-horse)", "0.47s", "PASS", C),
        treeRow("    │   ├── ", "Press Element (//*[@resource-id='com.birch.shop:id/login'])", "0.55s", "PASS", C),
        treeRow("    │   └── ", "Assert Presence (Picked for you)", "0.83s", "PASS", C),
        treeRow("    └── ", "Add To Cart", "4.57s", "PASS", C),
        treeRow("        ├── ", "Press Element (Search Birch)", "0.61s", "PASS", C),
        treeRow("        ├── ", "Enter Text Direct (trail runner)", "0.70s", "PASS", C),
        treeRow("        ├── ", "Press Element (Trail Runner 2)", "1.12s", "PASS", C),
        treeRow("        ├── ", "Press Element (Add to cart)", "0.48s", "PASS", C),
        treeRow("        └── ", "Assert Presence (Added to cart)", "0.66s", "PASS", C),
      ];
      rows.forEach(function (r, i) {
        var at = t + 500 + i * 260;
        T.line(tl, r, at);
        tl.at(at, function () { if (bar) { var p = Math.round((i + 1) / rows.length * 100); bar.style.width = p * 1.6 + "px"; pc.textContent = p + "% 0:00:0" + Math.min(8, Math.round(p / 12)); } });
      });
      var end = t + 500 + rows.length * 260;
      T.line(tl, panel('Total Test Cases: 2 | Passed: <span class="t-ok">2</span> | Failed: 0'), end + 100);
      label(w, 622, 34, "execution_output/");
      var files = [
        ["junit_output.xml", "results your CI reads"],
        ["…-pre_press_element.jpg", "the screen before a step"],
        ["…-press_element_element_detection_result.jpg", "a box on the element found"],
        ["…-end_of_run.jpg", "the last screen"],
        ["execution_logs.log", "every step, with file_log on"],
      ];
      files.forEach(function (f, i) {
        var n = abs(w, 622, 62 + i * 82, '<div class="sc-node" style="width:240px;height:70px;flex-direction:column;align-items:flex-start;justify-content:center;gap:6px;white-space:normal"><span style="font:500 11.5px/1.25 var(--mono);word-break:break-all">' + f[0] + '</span><span style="font:400 12px/1 var(--sans);color:var(--sc-ink2)">' + f[1] + "</span></div>");
        n.classList.add("up");
        fadeIn(tl, n, i === 0 ? t + 700 : t + 1300 + i * 750);
      });
      tl.end = end + 2800;
    },
  };

  // ------------------------------------------------------------------ results (screenshots)
  S.results = {
    w: 880, h: 500,
    build: function (w, tl) {
      var lab = function (x, text) { var n = label(w, x, 24, text); n.style.textTransform = "none"; n.style.letterSpacing = "0"; n.style.fontFamily = "var(--mono)"; n.style.fontWeight = "500"; n.style.fontSize = "12px"; return n; };
      lab(40, "…-pre_press_element.jpg");
      lab(440, "…-press_element_element_detection_result.jpg");
      var A = K.phone(w, 80, 50, 0.7);
      A.start("login");
      var B = K.phone(w, 520, 50, 0.7);
      B.start("login");
      tl.at(0, function () {
        [A, B].forEach(function (P) { P.S.login.querySelector(".f-email .v").textContent = "ava@birch.shop"; P.S.login.querySelector(".f-pass .v").textContent = "••••••••••"; });
      });
      var g = h(B.scr, '<div class="sc-abs sc-fade" style="left:14px;top:332px;width:224px;height:50px;border:3px solid #22D63E;z-index:8"></div>');
      tl.show(g, 900);
      var log = K.file(w, { x: 190, y: 452, w: 500, title: "", rows: [] });
      log.el.querySelector(".sc-file-h").remove();
      log.el.classList.add("sc-log", "sc-fade", "up");
      log.add(tl, "Trying TextElementStrategy on 'Sign in' ... <span class=\"t-ok\">SUCCESS</span>", 1300);
      tl.show(log.el, 1300);
      tl.end = 4400;
    },
  };

  // ------------------------------------------------------------------ errors (on-screen error detection)
  // A step fails because the app signed the shopper out. After the last test case,
  // Optics reads the text on the final screen, matches it against error_definitions.csv
  // and adds the match to the JUnit report, which says why the step failed.
  S.errors = {
    w: 880, h: 500,
    build: function (w, tl) {
      var T = K.term(w, { x: 20, y: 18, w: 584, h: 262, title: "~/birch", top: true });
      T.body.style.fontSize = "11.5px";
      var P = K.phone(w, 636, 20, 0.82);
      P.start("home");
      var t = T.cmd(tl, '<span class="t-ok">~/birch</span> <span class="t-mod">❯</span>', "optics execute birch-tests", 300, 32);
      var C = 50;
      [
        ["Test Suite", 0],
        [treeRow("└── ", "Shopper can buy running shoes", "6.10s", "FAIL", C), 0],
        [treeRow("    ├── ", "Sign In", "1.64s", "PASS", C), 0],
        [treeRow("    └── ", "Add To Cart", "4.46s", "FAIL", C), 1],
        [treeRow("        └── ", "Press Element (Trail Runner 2)", "4.46s", "FAIL", C), 1],
      ].forEach(function (r, i) { T.line(tl, r[0], t + 400 + i * 380 + r[1] * 1400); });
      tl.add(P.modal, "in", t + 1700);
      t += 400 + 5 * 380 + 1400;
      T.line(tl, panel('Total Test Cases: 1 | Passed: 0 | Failed: <span class="t-bad">1</span>'), t);
      // end of run: read the final screen's text
      t += 700;
      P.scan(tl, t);
      var f = K.file(w, { x: 20, y: 292, w: 584, title: "test_data/error_definitions.csv", rows: ['<span class="t-dim">error_code,match_string,description,severity</span>', 'ERR_SESSION,<span class="t-lit">Session expired</span>,The user was signed out,high'] });
      f.el.classList.add("sc-fade", "up");
      tl.show(f.el, t);
      tl.add(f.rows[1], "bad", t + 1100);
      P.lock(tl, [36, 218, 180, 44], "Session expired", t + 1100, "#F56FA1");
      var j = K.file(w, { x: 20, y: 386, w: 584, title: "execution_output/junit_output.xml", rows: [] });
      j.el.classList.add("sc-log", "sc-fade", "up");
      tl.show(j.el, t + 1900);
      j.add(tl, '&lt;testcase name="<span class="t-b">on-screen-error-detection</span>"&gt;', t + 2100);
      j.add(tl, '  &lt;failure type="OnScreenError" message="<span class="t-bad">ERR_SESSION | high | Session expired | The user was signed out</span>"/&gt;', t + 2400);
      tl.end = t + 5200;
    },
  };

  // ------------------------------------------------------------------ data-driven loop
  S.loop = {
    w: 880, h: 500,
    build: function (w, tl) {
      var vals = ["Trail Runner 2", "Pace Knit", "Ridge GTX"];
      var el = K.file(w, { x: 24, y: 28, w: 560, title: "test_data/elements.csv", rows: ['<span class="t-dim">Element_Name,Element_ID</span>', '<span class="t-var">search_bar</span>,Search Birch', '<span class="t-var">terms</span>,<span class="tv"></span>'] });
      var tv = el.rows[2].querySelector(".tv");
      tv.innerHTML = vals.map(function (v, i) { return '<span class="sc-val" data-i="' + i + '">' + v + "</span>"; }).join("|");
      var code = K.file(w, { x: 24, y: 170, w: 560, title: "modules/modules.csv", rows: [
        '<span class="t-mod">Search All</span>,<span class="t-b">Run Loop</span>,Search One,term,<span class="t-var">${terms}</span>',
        '<span class="t-mod">Search One</span>,<span class="t-b">Enter Text</span>,<span class="t-var">${search_bar}</span>,<span class="t-var">${term}</span>',
        '<span class="t-mod">Search One</span>,<span class="t-b">Assert Presence</span>,<span class="t-var">${term}</span>'] });
      var P = K.phone(w, 636, 20, 0.82);
      P.start("home");
      var counter = abs(w, 24, 312, '<div class="sc-chip" style="height:40px;font-size:14px"><span class="n">Run Loop: pass 1 of 3</span></div>');
      pop(tl, counter, 500);
      var marks = abs(w, 24, 370, '<div style="display:flex;gap:10px"></div>');
      var ticks = vals.map(function (v) { return h(marks, '<div class="sc-chip" style="opacity:.45">' + v + "</div>"); });
      var t = 800;
      tl.add(code.rows[0], "hl", 500);
      vals.forEach(function (term, i) {
        var val = tv.querySelector('[data-i="' + i + '"]');
        tl.html(counter.querySelector(".n"), "Run Loop: pass " + (i + 1) + " of 3 · term = " + term, t);
        tl.add(val, "on", t);
        tl.css(ticks[i], { opacity: "1" }, t);
        tl.add(code.rows[1], "hl", t + 200);
        P.filter(tl, null, t + 200);
        var e = P.typeSearch(tl, term, t + 300);
        P.filter(tl, i, e + 200);
        tl.rm(code.rows[1], "hl", e + 300);
        tl.add(code.rows[2], "hl", e + 300);
        P.lock(tl, [14, 280, 111, 34], "Assert Presence", e + 500, "#24C3AB");
        P.unlock(tl, e + 1300);
        tl.rm(code.rows[2], "hl", e + 1300);
        tl.rm(val, "on", e + 1400);
        tl.html(ticks[i], term + ' <span style="color:#1A9E5C">✓</span>', e + 1300);
        t = e + 1700;
      });
      tl.end = t + 1800;
    },
  };

  // ------------------------------------------------------------------ self-heal
  // The value "Sign in" fails both ways after the button was renamed. With ai_self_heal
  // on, the model looks at the screen and runs press_element on "Log in", which goes
  // through the same ways of finding an element. The log lines are the real ones.
  S.selfheal = {
    w: 880, h: 500,
    build: function (w, tl) {
      var P = K.phone(w, 56, 26, 0.8);
      P.start("login2");
      keyChip(w, 300, 26, "Press Element", "Sign in");
      var L = ladder(w, 300, 80, 556, [
        { head: "value 1 · text", rungs: [["Text in the UI tree", "“Sign in”"], ["Text on a screenshot (OCR)", "“Sign in”"]] },
        { head: "every way failed · ai_self_heal: true", rungs: [["AI self-heal", "an AI model reads the screen", "opt"]] },
      ]);
      L.el.classList.add("compact");
      var log = K.file(w, { x: 300, y: 300, w: 556, title: "log", rows: [] });
      log.el.classList.add("sc-log");
      var t = 800;
      t = mark(tl, L.rungs[0], "missed", t, 800) + 200;
      tl.add(L.rungs[1], "trying", t);
      P.scan(tl, t);
      tl.at(t + 1150, function () { L.rungs[1].classList.remove("trying"); L.rungs[1].classList.add("missed"); L.rungs[1].querySelector(".st").textContent = "✕"; });
      t += 1500;
      tl.add(L.rungs[2], "trying", t);
      log.add(tl, "AI self-heal: attempting recovery for 'press_element' on 'Sign in'", t + 200);
      tl.html(L.rungs[2].querySelector("small"), "reading the screen…", t + 200);
      log.add(tl, "AI self-heal step 1/5 for 'press_element': action=keyword keyword=press_element params=['Log in'] reason=The sign-in button is now labelled Log in", t + 1500);
      tl.html(L.rungs[2].querySelector("small"), "press_element 'Log in' → found as text", t + 1500);
      P.lock(tl, [16, 334, 220, 46], "Text · Log in", t + 1900, "#9672F8");
      P.tap(tl, [16, 334, 220, 46], t + 2600);
      tl.at(t + 2700, function () { L.rungs[2].classList.remove("trying"); L.rungs[2].classList.add("found"); L.rungs[2].querySelector(".st").textContent = "✓"; });
      P.unlock(tl, t + 3000);
      P.screen(tl, "home", t + 3100);
      log.add(tl, "AI self-heal: recovered 'press_element' via keyword 'press_element'", t + 3200);
      tl.end = t + 5800;
    },
  };

  // ------------------------------------------------------------------ area of interest
  // aoi_y=75, aoi_height=25: Optics searches only the bottom quarter of the screen, so
  // the same words in the banner at the top can't be chosen.
  S.aoi = {
    w: 880, h: 500,
    build: function (w, tl) {
      var P = K.phone(w, 64, 26, 0.8);
      P.start("product");
      h(P.S.product, '<div class="sc-abs" style="left:18px;right:18px;top:52px;height:30px;border-radius:15px;background:rgba(255,255,255,.85);display:grid;place-items:center;font-size:11px;font-weight:650;color:#1F5B43">Add to cart by 6 pm for next-day delivery</div>');
      var dim = h(P.scr, '<div class="sc-dim" style="bottom:auto;height:406px"></div>');
      var box = h(P.scr, '<div class="sc-aoi"></div>');
      box.style.cssText = "left:2px;top:2px;width:248px;height:538px";
      var code = K.file(w, { x: 330, y: 30, w: 520, title: "modules/modules.csv", rows: [
        '<span class="t-dim">module_name,module_step,param_1,param_2,param_3,param_4,param_5</span>',
        '<span class="t-mod">Add To Cart</span>,<span class="t-b">Press Element</span>,<span class="t-lit">Add to cart</span>,<span class="v"></span>'] });
      code.el.classList.add("sc-log");
      var v = code.rows[1].querySelector(".v");
      var vals = [["aoi_x", "0"], ["aoi_y", "75"], ["aoi_width", "100"], ["aoi_height", "25"]];
      var t = 700;
      vals.forEach(function (r, i) {
        tl.at(t + i * 300, function () { v.innerHTML = vals.slice(0, i + 1).map(function (q) { return '<span class="t-var">' + q[0] + "=" + q[1] + "</span>"; }).join(","); });
        var c = chip(w, 330 + (i % 2) * 260, 156 + Math.floor(i / 2) * 46, '<span style="font-family:var(--mono);color:var(--sc-ink2)">' + r[0] + '</span><b style="font-family:var(--mono)">' + r[1] + "%</b>");
        pop(tl, c, t + i * 300);
      });
      tl.add(box, "in", t + 1500);
      tl.css(box, { left: "2px", top: "406px", width: "248px", height: "134px" }, t + 1800);
      tl.add(dim, "in", t + 2200);
      var note = abs(w, 330, 268, '<div style="width:500px;font:400 15px/1.5 var(--sans);color:var(--sc-ink2)">Optics only searches the bottom quarter of the screen, so the same words in the banner at the top can’t be picked by mistake.</div>');
      fadeIn(tl, note, t + 2400);
      var log = K.file(w, { x: 330, y: 360, w: 520, title: "log", rows: [] });
      log.el.classList.add("sc-log");
      log.add(tl, "Using AOI: x=0.0%, y=75.0%, width=100.0%, height=25.0%", t + 2800);
      P.scan(tl, t + 2900);
      P.lock(tl, "add", "Text · Add to cart", t + 3900, "#24C3AB");
      P.tap(tl, "add", t + 4500);
      P.unlock(tl, t + 4700);
      tl.add(P.toast, "in", t + 4700);
      tl.end = t + 6600;
    },
  };

  // ------------------------------------------------------------------ platforms
  // One test, three devices. Phones and browsers press the element itself. TVs on
  // Tizen and webOS have no touch, so their steps move the focus with remote keys.
  S.platforms = {
    w: 880, h: 500,
    build: function (w, tl) {
      function step(cx, html) {
        return abs(w, cx - 150, 30, '<div style="width:300px;display:flex;justify-content:center"><div class="sc-chip mono" style="height:36px;font-size:12.5px;padding:0 14px">' + html + "</div></div>");
      }
      var kw = function (k, v) { return '<span style="color:var(--sc-ink2)">' + k + '</span>&nbsp;<span class="v" style="color:#B8860B">' + v + "</span>"; };
      step(150, kw("Press Element", "Trail Runner 2"));
      var tvStep = step(450, kw("Press Keycode", "RIGHT"));
      step(745, kw("Press Element", "Trail Runner 2"));
      // phone
      var P = K.phone(w, 66, 88, 0.62);
      P.start("home");
      // tv
      var tv = abs(w, 300, 150, '<div class="sc-tv" style="width:300px;height:184px"><div class="sc-tv-scr"></div></div>');
      var scr = tv.querySelector(".sc-tv-scr");
      h(scr, '<div class="sc-abs" style="left:14px;top:12px;color:#fff;font:700 12px/1 var(--sans);letter-spacing:-.02em;display:flex;gap:6px;align-items:center"><span style="width:11px;height:11px;border-radius:50% 0;background:#2F7A5A"></span>birch tv</div>');
      var tiles = [];
      [["Pace Knit", "#C8643B"], ["Trail Runner 2", "#2F6B4F"], ["Ridge GTX", "#3E4F8C"], ["Tempo Lite", "#B8456A"]].forEach(function (p, i) {
        tiles.push(h(scr, '<div class="sc-tile" style="left:' + (14 + i * 68) + 'px;top:40px;width:60px;height:80px;background:' + p[1] + '"><div style="position:absolute;left:6px;bottom:6px;right:4px;color:#fff;font:650 9px/1.2 var(--sans)">' + p[0] + "</div></div>"));
      });
      h(scr, '<div class="sc-abs" style="left:14px;top:134px;color:rgba(255,255,255,.55);font:500 9.5px/1 var(--sans)">Continue shopping</div>');
      h(scr, '<div class="sc-abs" style="left:14px;top:148px;width:254px;height:16px;border-radius:4px;background:rgba(255,255,255,.08)"></div>');
      var detail = h(scr, '<div class="sc-abs sc-fade" style="inset:0;z-index:3;background:linear-gradient(160deg,#1F5B43,#13162E 75%);display:flex;align-items:center;gap:16px;padding:0 20px"><div style="width:110px">' + K.shoe("#8BC6A2") + '</div><div style="color:#fff;font:700 16px/1.2 var(--sans)">Trail Runner 2<div style="font:500 11px/1.6 var(--sans);color:rgba(255,255,255,.7)">$128 · Add to cart</div></div></div>');
      var remote = abs(w, 410, 384, '<div class="sc-chip mono" style="height:30px"><span style="color:var(--sc-ink2)">remote</span> <b class="k">·</b></div>');
      // browser
      var br = abs(w, 625, 110, '<div class="sc-browser" style="width:240px;height:280px"><div class="sc-url"><i></i><span>birch.shop</span></div></div>');
      var page = h(br, '<div style="position:relative;height:246px;background:#FBFAF6"></div>');
      h(page, '<div class="sc-abs" style="left:14px;top:12px">' + K.logo(13) + "</div>");
      var wc = h(page, '<div class="sc-abs" style="left:14px;top:44px;width:98px"><div class="b-img" style="height:78px;background:#E8EFE9;border-radius:10px">' + K.shoe("#2F6B4F") + '</div><div class="b-nm" style="color:#1C1B19;font-size:10.5px">Trail Runner 2</div><div class="b-pr" style="font-size:10px">$128</div></div>');
      h(page, '<div class="sc-abs" style="left:126px;top:44px;width:98px"><div class="b-img" style="height:78px;background:#F2E9DF;border-radius:10px">' + K.shoe("#C8643B") + '</div><div class="b-nm" style="color:#1C1B19;font-size:10.5px">Pace Knit</div><div class="b-pr" style="font-size:10px">$96</div></div>');
      var cur = abs(w, 830, 370, '<div class="sc-cursor">' + K.cursorSvg() + "</div>");
      [["Appium · Android, iOS", 150, 446], ["Appium · Tizen, webOS TVs", 450, 348], ["Playwright or Selenium · Web", 745, 404]].forEach(function (l) {
        abs(w, l[1] - 150, l[2], '<div class="sc-label" style="width:300px;text-align:center;text-transform:none;letter-spacing:0;font-size:13px">' + l[0] + "</div>");
      });
      var t = 900;
      // phone: find and tap
      P.lock(tl, [14, 178, 111, 136], "Text · Trail Runner 2", t, "#24C3AB");
      P.tap(tl, [14, 178, 111, 136], t + 600);
      P.unlock(tl, t + 1000);
      P.screen(tl, "product", t + 1100);
      // tv: one key per step
      t += 1900;
      tl.add(tiles[0], "focus", 0);
      tl.html(tvStep.querySelector(".sc-chip"), kw("Press Keycode", "RIGHT"), 0);
      pop(tl, remote, t);
      tl.html(remote.querySelector(".k"), "RIGHT", t + 200);
      tl.rm(tiles[0], "focus", t + 400); tl.add(tiles[1], "focus", t + 400);
      tl.html(tvStep.querySelector(".sc-chip"), kw("Press Keycode", "ENTER"), t + 1300);
      tl.html(remote.querySelector(".k"), "ENTER", t + 1500);
      tl.css(tiles[1], { filter: "brightness(1.35)" }, t + 1700);
      tl.show(detail, t + 1900);
      tl.hide(remote, t + 2500);
      // browser: click
      t += 2900;
      tl.css(cur, { left: "700px", top: "200px" }, t);
      tl.css(wc, { outline: "3px solid #24C3AB", outlineOffset: "3px", borderRadius: "10px" }, t + 750);
      tl.css(wc, { transform: "scale(.96)" }, t + 900);
      tl.css(wc, { transform: "" }, t + 1050);
      tl.end = t + 3000;
    },
  };

  // ------------------------------------------------------------------ ci
  S.ci = {
    w: 880, h: 300,
    build: function (w, tl) {
      var steps = ["git push", "Install Optics", "Start emulator", "optics execute", "Publish JUnit"];
      var nodes = steps.map(function (s, i) {
        return abs(w, 24 + i * 172, 80, '<div class="sc-node" style="width:152px;justify-content:flex-start"><span class="dot"></span>' + s + "</div>");
      });
      var wire = K.wire(w, 880, 300);
      var t = 600;
      nodes.forEach(function (n, i) {
        tl.add(n, "run", t);
        tl.at(t + (i === 3 ? 2200 : 800), function () { n.classList.remove("run"); n.classList.add("ok"); });
        if (i < nodes.length - 1) wire.draw(tl, [[24 + i * 172 + 152, 103], [24 + (i + 1) * 172, 103]], t + (i === 3 ? 2200 : 800), "#1A9E5C");
        t += i === 3 ? 2400 : 1000;
      });
      var bar = abs(w, 24 + 3 * 172, 140, '<div style="width:152px;height:6px;border-radius:3px;background:var(--sc-line);overflow:hidden"><div style="height:100%;width:0;background:#3DDC84;transition:width 2s linear"></div></div>');
      tl.css(bar.firstChild, { width: "100%" }, 600 + 3000);
      var check = abs(w, 230, 200, '<div class="sc-chip ok" style="height:44px;font-size:14px;padding:0 18px">✓ Optics / birch-tests — 2 passed, 0 failed</div>');
      pop(tl, check, t + 200);
      tl.end = t + 2400;
    },
  };

  // ------------------------------------------------------------------ production (BLE + camera)
  // The ble driver moves a Bluetooth mouse; camera_screenshot gives Optics the screen.
  // Optics finds the element on the camera frame, converts its pixel position to mouse
  // movement, taps, and parks the pointer back in the corner.
  S.production = {
    w: 880, h: 500,
    build: function (w, tl) {
      var wire = K.wire(w, 880, 500);
      var node = function (x, y, a, b) { return abs(w, x, y, '<div class="sc-node" style="position:relative;height:58px;flex-direction:column;align-items:flex-start;justify-content:center;gap:5px;width:210px"><span>' + a + '</span><span style="font:400 12px/1 var(--sans);color:var(--sc-ink2)">' + b + "</span></div>"); };
      var mac = node(30, 150, "optics execute", "on your machine");
      var dongle = node(30, 330, "BLE dongle", "the ble driver: a Bluetooth mouse");
      var P = K.phone(w, 340, 78, 0.74);
      P.start("home");
      var cam = abs(w, 380, 6, '<div style="width:120px;height:44px;border-radius:12px;background:#1b1d2b;box-shadow:0 10px 20px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;gap:8px"><span style="width:22px;height:22px;border-radius:50%;background:radial-gradient(circle at 40% 40%,#4d67ff,#0b0e2a 70%);box-shadow:0 0 0 3px #2a2d40"></span><span style="width:7px;height:7px;border-radius:50%;background:#FF5577"></span></div>');
      var cl = label(w, 518, 22, "camera_screenshot");
      cl.style.textTransform = "none"; cl.style.letterSpacing = "0"; cl.style.fontFamily = "var(--mono)";
      // the pointer an Android phone shows for a Bluetooth mouse, parked in the corner
      var cur = h(P.scr, '<div class="sc-cursor" style="left:4px;top:4px">' + K.cursorSvg() + "</div>");
      var log = K.file(w, { x: 610, y: 150, w: 250, title: "what Optics does", rows: [] });
      var t = 600;
      wire.draw(tl, [[380, 28], [240, 179]], t, "#F3BE00");
      log.add(tl, '<span class="t-dim">1</span> read a camera frame', t + 300);
      P.scan(tl, t + 600);
      t += 1800;
      P.lock(tl, [14, 280, 111, 34], "OCR · Trail Runner 2", t, "#F3BE00");
      log.add(tl, '<span class="t-dim">2</span> OCR: <span class="t-lit">Trail Runner 2</span>', t);
      log.add(tl, '<span class="t-dim">3</span> at <span class="t-var">(296, 1282)</span> px', t + 500);
      t += 1300;
      wire.draw(tl, [[135, 208], [135, 330]], t, "#7086FF");
      log.add(tl, '<span class="t-dim">4</span> px → mouse moves', t + 200);
      wire.draw(tl, [[240, 359], [340, 359]], t + 500, "#7086FF");
      tl.css(cur, { left: "62px", top: "290px" }, t + 900);
      P.tap(tl, [14, 280, 111, 34], t + 1800);
      log.add(tl, '<span class="t-dim">5</span> tap, pointer back to corner', t + 1800);
      P.unlock(tl, t + 2000);
      P.screen(tl, "product", t + 2200);
      tl.css(cur, { left: "4px", top: "4px" }, t + 2400);
      log.add(tl, '<span class="t-dim">6</span> next frame: <span class="t-ok">product page</span>', t + 3200);
      P.scan(tl, t + 2900);
      tl.end = t + 5400;
    },
  };

  // ------------------------------------------------------------------ four ways in, one suite out
  S.fourways = {
    w: 880, h: 500,
    build: function (w, tl) {
      var ways = [
        ["Write it", "#9672F8", "CSV or YAML by hand"],
        ["Record it", "#24C3AB", "optics live"],
        ["Describe it", "#F3BE00", "plain English, Ctrl+N in optics live"],
        ["Delegate it", "#F56FA1", "your AI agent, through optics mcp"],
      ];
      var cards = ways.map(function (wy, i) {
        return abs(w, 24, 46 + i * 104, '<div class="sc-node" style="width:236px;height:84px;flex-direction:column;align-items:flex-start;justify-content:center;gap:6px"><span style="font-size:16px;display:flex;align-items:center;gap:9px"><i style="width:10px;height:10px;border-radius:3px;background:' + wy[1] + '"></i>' + wy[0] + '</span><span style="font:400 12.5px/1.2 var(--sans);color:var(--sc-ink2);white-space:normal">' + wy[2] + "</span></div>");
      });
      label(w, 300, 128, "One suite, plain text");
      var suite = K.file(w, { x: 300, y: 150, w: 222, title: "birch-tests/", rows: ['<span class="t-dim">config.yaml</span>', '<span class="t-dim">test_cases/test_cases.csv</span>', '<span class="t-dim">modules/modules.csv</span>', '<span class="t-dim">test_data/elements.csv</span>'] });
      label(w, 552, 128, "Every build");
      var T = K.term(w, { x: 552, y: 150, w: 310, h: 210, title: "ci", top: true });
      T.body.style.fontSize = "11px";
      var wire = K.wire(w, 880, 500);
      var t = 500;
      cards.forEach(function (c, i) {
        tl.css(c, { opacity: ".35" }, 0);
        tl.css(c, { opacity: "1", boxShadow: "0 14px 30px -18px " + ways[i][1] }, t);
        wire.draw(tl, [[260, 88 + i * 104], [300, 214]], t + 200, ways[i][1]);
        suite.rows.forEach(function (r) { tl.add(r, "hl", t + 600); tl.rm(r, "hl", t + 1000); });
        tl.css(c, { boxShadow: "" }, t + 1100);
        t += 1100;
      });
      wire.draw(tl, [[522, 214], [552, 214]], t, "#7086FF");
      var e = T.cmd(tl, '<span class="t-mod">❯</span>', "optics execute birch-tests", t + 300, 30);
      var C = 26;
      T.line(tl, "Test Suite", e + 300);
      T.line(tl, treeRow("└── ", "Shopper can buy...", "6.94s", "PASS", C), e + 600);
      T.line(tl, treeRow("    ├── ", "Sign In", "2.37s", "PASS", C), e + 900);
      T.line(tl, treeRow("    └── ", "Add To Cart", "4.57s", "PASS", C), e + 1200);
      T.line(tl, 'Total Test Cases: 2 | Passed: <span class="t-ok">2</span> | Failed: 0', e + 1600);
      tl.end = e + 3600;
    },
  };

  // ------------------------------------------------------------------ terminal-only scenes
  // Each script line: ["$", "command"] typed at a prompt, [text] printed, or [ms] a pause.
  function termScene(title, script, opts) {
    opts = opts || {};
    return {
      w: opts.w || 880, h: opts.h || 460,
      narrow: { w: 440, h: 560 },
      build: function (w, tl, K2, dims) {
        var T = K.term(w, { x: 12, y: 12, w: dims.w - 24, h: dims.h - 24, title: title, top: !opts.bottom });
        T.body.style.whiteSpace = "pre-wrap";
        if (!dims.narrow) { T.win.style.left = "24px"; T.win.style.top = "20px"; T.win.style.width = dims.w - 48 + "px"; T.win.style.height = dims.h - 40 + "px"; }
        var t = 400;
        script.forEach(function (s) {
          if (typeof s === "number") { t += s; return; }
          if (s[0] === "$") { t = T.cmd(tl, s[2] || '<span class="prompt t-dim">$</span>', s[1], t, s[3] || 34) + 120; return; }
          T.line(tl, typeof s[0] === "function" ? s[0](dims) : s[0], t, null, s[2]);
          t += s[1] == null ? 140 : s[1];
        });
        tl.end = t + 600;
      },
      hold: opts.hold || 3600,
    };
  }

  var D = function (t) { return '<span class="t-dim">' + t + "</span>"; };
  var B = function (t) { return '<span class="t-b">' + t + "</span>"; };
  function ask(q, opts, answer) { return B(q) + " " + D(opts) + (answer ? " " + answer : ""); }
  S.quickstart = termScene("~", [
    ["$", "curl -fsSL https://optics-framework.org/install | sh"],
    [B("Optics Framework installer"), 300],
    ['  <span class="t-ok">✓</span> Python 3.12.7 at /usr/local/bin/python3.12', 300],
    ["  " + D("→") + " Creating a virtual environment at /Users/you/.optics/venv", 500],
    ["  " + D("→") + " Installing optics-framework", 1100],
    ['  <span class="t-ok">✓</span> Optics Framework 1.10.5', 300],
    ['  <span class="t-ok">✓</span> Added /Users/you/.optics/bin to your PATH in /Users/you/.zshrc', 400],
    [B("Next:") + " optics quickstart", 100],
    [D("      Builds a project, checks your setup, and runs your first test."), 800],
    ["$", "optics quickstart"],
    [panel("Optics drives real phones and browsers with plain-English test steps — no code required.", { title: "Optics Framework", sub: "v1.10.5", tone: "info" }), 700],
    [ask("What do you want to automate?", "[mobile/web] (mobile):", "web"), 700],
    [ask("Install Playwright, Selenium now?", "[y/n] (y):", "y"), 500],
    [D("# pip installs both, then Playwright downloads Chromium"), 900],
    ["Engine packages installed. Services like the Appium server still need to be started separately.", 600],
    [ask("Start from the 'playwright' example, so you have a test that runs straight away?", "[y/n] (y):", "y"), 600],
    [ask("Project name", "(my-optics-project):"), 400],
    [ask("Where should the project live?", "(/Users/you):"), 500],
    ["Copied template 'playwright' into the project.", 150],
    ["Project ready at: /Users/you/my-optics-project", 500],
    [ask("'playwright' ships its own working config.yaml. Overwrite it with your own answers?", "[y/n] (n):", "n"), 500],
    ["🩺 " + B("optics doctor"), 250],
    ["  ✅ Playwright           " + D("playwright 1.63.0"), 120],
    ["  ✅ playwright browser   " + D("Chromium download found"), 250],
    ["10 ok, 9 warning(s), 0 failure(s)", 120],
    [D("Good enough to start — ⚠️ rows are optional extras you can add later."), 700],
    [ask("Run your first test now?", "[y/n] (y):", "y"), 900],
    ['Running tests <span class="t-ok">━━━━━━━━━━━━━━━━━━━━━━━━</span> 100% 0:00:03', 200],
    ["Test Suite", 200],
    [tr("├── ", "Playwright Suite Setup", "3.54s", "PASS"), 260],
    [tr("│   └── ", "Open Example Page", "3.54s", "PASS"), 160],
    [tr("│       └── ", "Launch App (https://example.com)", "3.54s", "PASS"), 300],
    [tr("├── ", "TC1 Verify Landing", "0.11s", "PASS"), 160],
    [tr("│   └── ", "Verify Example Page", "0.11s", "PASS"), 160],
    [tr("│       └── ", "Validate Element (text=This domain…)", "0.11s", "PASS"), 300],
    [tr("└── ", "Playwright Suite Teardown", "0.12s", "PASS"), 160],
    [tr("    └── ", "Close Browser", "0.12s", "PASS"), 160],
    [tr("        └── ", "Close And Terminate App", "0.12s", "PASS"), 300],
  ].concat(box('Total Test Cases: 3 | Passed: <span class="t-ok">3</span> | Failed: 0')), { h: 480, bottom: true });

  // optics dry_run checks every keyword and ${name} without touching a device. The tree,
  // the failure box and the suggestion are what 1.10.5 prints for a mistyped keyword.
  function tr(prefix, name, time, status) { return function (d) { return treeRow(prefix, name, time, status, d.narrow ? 30 : 52); }; }
  function box(text, title) { return [[panel(text, title ? { title: title, tone: "bad" } : null), 300]]; }
  var LOGIN = "//*[@resource-id='com.birch.shop:id/login']";
  S.dryrun = termScene("~/birch", [
    ["$", "optics dry_run birch-tests"],
    ['Running tests <span class="t-ok">━━━━━━━━━━━━━━━━━━━━━━━━</span> 100% 0:00:00', 200],
    ["Test Suite", 200],
    [tr("├── ", "Suite Setup", "0.00s", "PASS"), 120],
    [tr("│   └── ", "Launch Birch", "0.00s", "PASS"), 120],
    [tr("│       └── ", "Launch App", "0.00s", "PASS"), 200],
    [tr("└── ", "Shopper can buy running shoes", "0.00s", "FAIL"), 120],
    [tr("    ├── ", "Sign In", "0.00s", "FAIL"), 120],
    [tr("    │   ├── ", "Enter Text (//*[@resource-id='com.birch.shop:id/email'], ava@birch.shop)", "0.00s", "PASS"), 120],
    [tr("    │   ├── ", "Enter Text (//*[@resource-id='com.birch.shop:id/password'], correct-horse)", "0.00s", "PASS"), 120],
    [tr("    │   ├── ", "Press Elemnt (" + LOGIN + ")", "0.00s", "FAIL"), 120],
    [tr("    │   └── ", "Assert Presence (Picked for you)", "0.00s", "NOT_RUN"), 120],
    [tr("    └── ", "Add To Cart", "0.00s", "NOT_RUN"), 120],
    [tr("        ├── ", "Press Element (Search Birch)", "0.00s", "NOT_RUN"), 100],
    [tr("        ├── ", "Enter Text Direct (trail runner)", "0.00s", "NOT_RUN"), 100],
    [tr("        ├── ", "Press Element (Trail Runner 2)", "0.00s", "NOT_RUN"), 100],
    [tr("        ├── ", "Press Element (Add to cart)", "0.00s", "NOT_RUN"), 100],
    [tr("        └── ", "Assert Presence (Added to cart)", "0.00s", "NOT_RUN"), 400],
  ].concat(
    box('Total Test Cases: 2 | Passed: 1 | Failed: <span class="t-bad">1</span>'),
    box("Shopper can buy running shoes → step 'Press Elemnt (" + LOGIN + ")' — Keyword not found: Press Elemnt. Did you mean <span class=\"t-ok\">'Press Element'</span>? (run `optics list` to see all keywords)", "Failure details"),
    [[D("# fix the typo in modules.csv, then check again"), 900],
    ["$", "optics dry_run birch-tests"]],
    box('Total Test Cases: 2 | Passed: <span class="t-ok">2</span> | Failed: 0')
  ), { h: 460, bottom: true });

  // ------------------------------------------------------------------ http (optics serve)
  // optics serve keeps running in its own terminal; a second terminal sends requests.
  // Responses are the real 1.10.5 shapes, with the ids shortened.
  S.http = {
    w: 880, h: 500,
    narrow: { w: 440, h: 640 },
    build: function (w, tl, K2, d) {
      var n = d.narrow, pad = n ? 12 : 24, W = d.w - 2 * pad;
      var srv = K.term(w, { x: pad, y: pad, w: W, h: n ? 150 : 118, title: "terminal 1 — optics serve", top: true });
      var cli = K.term(w, { x: pad, y: pad + (n ? 162 : 130), w: W, h: d.h - 2 * pad - (n ? 162 : 130), title: "terminal 2", top: true });
      [srv, cli].forEach(function (T) { T.body.style.whiteSpace = "pre-wrap"; T.body.style.fontSize = n ? "12px" : "12.5px"; });
      var D = function (s) { return '<span class="t-dim">' + s + "</span>"; };
      var L = function (s) { return '<span class="t-lit">' + s + "</span>"; };
      var p = '<span class="t-dim">$</span>';
      var t = srv.cmd(tl, p, "optics serve", 300, 30);
      srv.line(tl, D("INFO | 09:41:07 | pid=4121 | uvicorn.error | ") + "Uvicorn running on http://127.0.0.1:8000 " + D("(Press CTRL+C to quit)"), t + 600, null, "wrap");
      t = cli.cmd(tl, p, "curl -X POST localhost:8000/v1/sessions/start -H 'Content-Type: application/json' -d @session.json", t + 1500, 70);
      cli.line(tl, '{"session_id":"' + L("7f3c…") + '","driver_id":"PLAYWRIGHT_SESSION","status":"<span class="t-ok">created</span>"}', t + 900);
      t = cli.cmd(tl, p, "curl -X POST localhost:8000/v1/sessions/7f3c…/action -H 'Content-Type: application/json' -d '{\"mode\":\"keyword\",\"keyword\":\"Press Element\",\"params\":[\"Sign in\"]}'", t + 1900, 80);
      cli.line(tl, '{"execution_id":"' + L("a91e…") + '","status":"<span class="t-ok">SUCCESS</span>","data":{"result":null}}', t + 900);
      t = cli.cmd(tl, p, "curl localhost:8000/v1/sessions/7f3c…/screenshot | jq -r .data.result | base64 -d > screen.png", t + 1900, 70);
      cli.line(tl, D("# screen.png shows the page after signing in"), t + 600);
      t = cli.cmd(tl, p, "curl -X DELETE localhost:8000/v1/sessions/7f3c…/stop", t + 1700, 50);
      cli.line(tl, '{"status":"<span class="t-ok">terminated</span>"}', t + 600);
      tl.end = t + 1400;
    },
    hold: 3600,
  };

  // ------------------------------------------------------------------ hero (homepage)
  // The homepage's opening proof: each row of modules.csv lights up while Optics does
  // that step on the phone, and is ticked off with its time when the step passes. On a
  // narrow screen the file shrinks to the row being run, above a full-size phone.
  S.hero = {
    w: 1100, h: 430, narrow: { w: 400, h: 650 }, hold: 3400,
    build: function (w, tl, _k, o) {
      var V = function (x) { return '<span class="t-var">' + x + "</span>"; };
      var L = function (x) { return '<span class="t-lit">' + x + "</span>"; };
      var R = function (mod, kw, a, b) { return '<span class="t-mod">' + mod + '</span>,<span class="t-b">' + kw + "</span>" + (a ? "," + a : "") + (b ? "," + b : ""); };
      // [row, time, element box, reticle label, action(t) -> end]
      var P;
      var steps = [
        [R("Sign In", "Enter Text", V("${email_field}"), "ava@birch.shop"), "0.52s", "email", "email_field", function (t) { return P.typeField(tl, ".f-email", "ava@birch.shop", t, 30); }],
        [R("Sign In", "Enter Text", V("${password_field}"), V("${password}")), "0.47s", "password", "password_field", function (t) { return P.typeField(tl, ".f-pass", "•••••••••••••", t, 34); }],
        // sign_in has two values: its id no longer matches after a redesign, so Optics
        // falls back to the button's text.
        [R("Sign In", "Press Element", V("${sign_in}")), "0.55s [Text]", "signin", "", function (t) {
          P.lock(tl, "signin", "XPath: no match", t, "#FF7096");
          P.lock(tl, "signin", "Text: Sign in", t + 900, "#7086FF");
          P.tap(tl, "signin", t + 1450);
          P.unlock(tl, t + 1700);
          return P.screen(tl, "home", t + 1800) + 300;
        }],
        [R("Add To Cart", "Press Element", V("${search_bar}")), "0.61s", "search", "search_bar", function (t) { return P.tap(tl, "search", t); }],
        [R("Add To Cart", "Enter Text Direct", L("trail runner")), "0.70s", "search", "", function (t) { var e = P.typeSearch(tl, "trail runner", t); P.filter(tl, 0, e + 250); return e + 650; }],
        [R("Add To Cart", "Press Element", L("Trail Runner 2")), "1.12s", "card0", "Trail Runner 2", function (t) { P.tap(tl, "card0", t); P.unlock(tl, t + 300); return P.screen(tl, "product", t + 400) + 300; }],
        [R("Add To Cart", "Press Element", L("Add to cart")), "0.48s", "add", "Add to cart", function (t) { P.tap(tl, "add", t); return tl.add(P.toast, "in", t + 300) + 200; }],
        [R("Add To Cart", "Assert Presence", L("Added to cart")), "0.66s", [18, 46, 216, 44], "Added to cart", function (t) { return t + 500; }],
      ];
      var done = function (time) { return '<span class="sc-done">✓ ' + time + "</span>"; };
      var t = 500, rows, wire, ticker, PX = 862, PY = 13, PS = 0.72;
      if (o.narrow) {
        var f = K.file(w, { x: 12, y: 12, w: 376, title: "modules/modules.csv", rows: [steps[0][0] + done(steps[0][1])] });
        f.el.classList.add("sc-ticker");
        ticker = f.rows[0];
        P = K.phone(w, 70, 98, 0.96);
      } else {
        var file = K.file(w, { x: 40, y: 14, w: 640, title: "modules/modules.csv", rows: ['<span class="t-dim">module_name,module_step,param_1,param_2</span>'].concat(steps.map(function (s) { return s[0] + done(s[1]); })) });
        rows = file.rows.slice(1);
        var T = K.term(w, { x: 40, y: 294, w: 640, h: 124, title: "~/birch", top: true });
        T.body.style.fontSize = "11.5px";
        t = T.cmd(tl, '<span class="t-ok">~/birch</span> <span class="t-mod">❯</span>', "optics execute birch-tests", 300, 34);
        T.line(tl, 'Running tests <span class="sc-bar-fill" style="width:0"></span> <span class="pc">0%</span>', t + 150, "prog");
        P = K.phone(w, PX, PY, PS);
        wire = K.wire(w, 1100, 430);
      }
      P.start("login");
      // Where a row's wire lands: the left edge of the element on the phone's screen.
      var land = function (box) { var b = K.BOX[box] || box; return [PX + (9 + b[0]) * PS, PY + (9 + b[1] + b[3] / 2) * PS]; };
      t += 500;
      steps.forEach(function (s, i) {
        var y = 14 + 32 + 27 * (i + 1) + 13.5;
        if (o.narrow) { if (i) tl.html(ticker, s[0] + done(s[1]), t); tl.rm(ticker, "done", t); tl.add(ticker, "hl", t); }
        else { tl.add(rows[i], "hl", t); wire.draw(tl, [[680, y], land(s[2])], t + 80); }
        var a = t + 420;
        if (s[3]) a = P.lock(tl, s[2], s[3], a, "#7086FF");
        var e = s[4](a + 80);
        if (s[3]) P.unlock(tl, e + 120);
        t = e + 260;
        if (o.narrow) { tl.rm(ticker, "hl", t); tl.add(ticker, "done", t); }
        else {
          tl.rm(rows[i], "hl", t); tl.add(rows[i], "done", t); wire.clear(tl, t);
          var pct = Math.round((i + 1) / steps.length * 100);
          tl.at(t, function () { var b = w.querySelector(".sc-bar-fill"), pc = w.querySelector(".pc"); if (b) { b.style.width = pct * 1.6 + "px"; pc.textContent = pct + "%"; } });
        }
        t += 380;
      });
      if (o.narrow) tl.html(ticker, '<span class="t-ok">Total Test Cases: 1 | Passed: 1 | Failed: 0</span>', t + 600);
      else T.line(tl, panel('Total Test Cases: 1 | Passed: <span class="t-ok">1</span> | Failed: 0'), t + 300);
      tl.end = t + 600;
    },
  };

  window.OPTICS_TERM_SCENE = termScene;
  S.terminal = termScene;
})();
