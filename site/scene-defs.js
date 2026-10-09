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

  // ------------------------------------------------------------------ ladder
  // Press Element tries each value of an element, and each value the ways it can be found.
  S.ladder = {
    w: 880, h: 500,
    build: function (w, tl) {
      var P = K.phone(w, 64, 26, 0.8);
      P.start("login2");
      var step = abs(w, 330, 34, '<div class="sc-chip mono" style="height:40px;font-size:14px;padding:0 16px"><span style="color:var(--sc-ink2)">Press Element</span>&nbsp;<span class="v" style="color:#B8860B">${sign_in}</span></div>');
      var rungs = abs(w, 330, 100, '<div class="sc-rungs" style="width:500px"></div>');
      var R = [
        ["1", "XPath", "//*[@resource-id='login']"],
        ["2", "Text in the UI tree", "“Sign in”"],
        ["3", "Text on a screenshot (OCR)", "“Sign in”"],
        ["4", "Image match", "sign_in.png"],
        ["5", "AI self-heal, if switched on", "an LLM reads the screen"],
      ].map(function (r, i) {
        return h(rungs, '<div class="sc-rung' + (i === 4 ? " opt" : "") + '"><span class="n">' + r[0] + '</span><span class="k">' + r[1] + "<small>" + r[2] + '</small></span><span class="st"></span></div>');
      });
      function mark(r, cls, t, glyph) {
        tl.add(r, "try", t);
        tl.at(t + 700, function () { r.classList.remove("try"); r.classList.add(cls); r.querySelector(".st").textContent = glyph; });
        return t + 700;
      }
      function resetAll(t) { R.forEach(function (r) { tl.at(t, function () { r.className = r.className.replace(/ (try|miss|hit)/g, ""); r.querySelector(".st").textContent = ""; }); }); }
      // Pass 1: the redesign changed the button's id, so XPath misses and text finds it.
      var t = 900;
      t = mark(R[0], "miss", t, "✕") + 300;
      t = mark(R[1], "hit", t, "✓");
      P.lock(tl, "signin", "Text · Sign in", t, "#24C3AB");
      P.tap(tl, "signin", t + 650);
      P.screen(tl, "home", t + 1400);
      P.unlock(tl, t + 1300);
      // Pass 2: a product name drawn inside an image is not in the UI tree; OCR reads it.
      t += 2600;
      resetAll(t);
      tl.at(t, function () { step.querySelector(".v").textContent = "Trail Runner 2"; });
      tl.html(R[0].querySelector("small"), "(not an XPath, skipped)", t);
      tl.html(R[1].querySelector("small"), "“Trail Runner 2”", t);
      tl.html(R[2].querySelector("small"), "“Trail Runner 2”", t);
      tl.html(R[3].querySelector("small"), "(not an image, skipped)", t);
      tl.css(R[0], { opacity: ".4" }, t); tl.css(R[3], { opacity: ".4" }, t);
      t += 600;
      t = mark(R[1], "miss", t, "✕") + 200;
      tl.add(R[2], "try", t);
      P.scan(tl, t);
      tl.at(t + 1150, function () { R[2].classList.remove("try"); R[2].classList.add("hit"); R[2].querySelector(".st").textContent = "✓"; });
      P.lock(tl, [14, 280, 111, 34], "OCR · Trail Runner 2", t + 1150, "#F3BE00");
      P.tap(tl, [14, 178, 111, 136], t + 1900);
      P.unlock(tl, t + 2400);
      P.screen(tl, "product", t + 2500);
      tl.css(R[0], { opacity: "" }, t + 4200); tl.css(R[3], { opacity: "" }, t + 4200);
      tl.end = t + 3800;
    },
  };

  // ------------------------------------------------------------------ anatomy
  // A test case names modules; a module is keyword steps; ${names} come from elements.
  S.anatomy = {
    w: 880, h: 500,
    build: function (w, tl) {
      label(w, 30, 14, "test_cases.csv");
      label(w, 30, 172, "modules.csv");
      label(w, 30, 342, "elements.csv");
      var tc = K.file(w, { x: 30, y: 34, w: 300, title: "test_cases", rows: ['<span class="t-dim">test_case,test_step</span>', '<span class="t-mod">Checkout</span>,Sign In', '<span class="t-mod">Checkout</span>,Add To Cart'] });
      var md = K.file(w, { x: 30, y: 192, w: 560, title: "modules", rows: [
        '<span class="t-dim">module_name,module_step,param_1,param_2</span>',
        '<span class="t-mod">Sign In</span>,<span class="t-b">Enter Text</span>,<span class="t-var">${email_field}</span>,ava@birch.shop',
        '<span class="t-mod">Sign In</span>,<span class="t-b">Press Element</span>,<span class="t-var">${sign_in}</span>',
        '<span class="t-mod">Add To Cart</span>,<span class="t-b">Press Element</span>,<span class="t-lit">Add to cart</span>'] });
      var el = K.file(w, { x: 30, y: 362, w: 560, title: "elements", rows: [
        '<span class="t-dim">Element_Name,Element_ID</span>',
        '<span class="t-var">email_field</span>,//*[@resource-id=\'email\']',
        '<span class="t-var">sign_in</span>,//*[@resource-id=\'login\']'] });
      var P = K.phone(w, 640, 30, 0.78);
      P.start("login");
      var wire = K.wire(w, 880, 500);
      var t = 700;
      tl.add(tc.rows[1], "hl", t);
      wire.draw(tl, [[330, 93], [350, 93], [350, 250], [592, 250]], t + 300, "#7086FF");
      tl.add(md.rows[1], "hl", t + 800); tl.add(md.rows[2], "hl", t + 800);
      t += 1700;
      // step 1: Enter Text ${email_field}
      tl.add(el.rows[1], "hl", t);
      wire.draw(tl, [[606, 246], [618, 246], [618, 435], [592, 435]], t, "#F3BE00");
      P.lock(tl, "email", "email_field", t + 500, "#F3BE00");
      var e = P.typeField(tl, ".f-email", "ava@birch.shop", t + 1000, 30);
      P.unlock(tl, e + 200);
      tl.rm(el.rows[1], "hl", e + 300);
      wire.clear(tl, e + 300);
      // step 2: Press Element ${sign_in}
      t = e + 600;
      tl.add(el.rows[2], "hl", t);
      wire.draw(tl, [[606, 273], [624, 273], [624, 462], [592, 462]], t, "#F3BE00");
      P.lock(tl, "signin", "sign_in", t + 500, "#9672F8");
      P.tap(tl, "signin", t + 1100);
      P.unlock(tl, t + 1500);
      P.screen(tl, "home", t + 1600);
      tl.rm(md.rows[1], "hl", t + 1700); tl.rm(md.rows[2], "hl", t + 1700); tl.rm(el.rows[2], "hl", t + 1700);
      wire.clear(tl, t + 1700);
      // next test step
      t += 2300;
      tl.rm(tc.rows[1], "hl", t); tl.add(tc.rows[2], "hl", t); tl.add(md.rows[3], "hl", t + 400);
      P.tap(tl, "card0", t + 1200);
      P.screen(tl, "product", t + 1500);
      P.lock(tl, "add", "Text · Add to cart", t + 2300, "#24C3AB");
      P.tap(tl, "add", t + 2900);
      tl.add(P.toast, "in", t + 3100);
      tl.end = t + 4200;
    },
  };

  // ------------------------------------------------------------------ record (optics live)
  S.record = {
    w: 880, h: 500,
    build: function (w, tl) {
      var T = K.term(w, { x: 24, y: 30, w: 540, h: 420, title: "optics live checkout", status: '<b>appium:emulator-5554</b> · <span class="sc-rec">rec ●</span> · /help · Tab complete · Ctrl-N AI mode' });
      var P = K.phone(w, 610, 20, 0.82);
      P.start("login");
      var t = 300;
      T.line(tl, '<span class="t-ok">  ✓</span> launch_app', t);
      T.line(tl, '<span class="t-dim">     1.21s</span>', t);
      t = T.cmd(tl, '<span class="t-mod">›</span>', "enter_text ${email_field} ava@birch.shop", t + 700, 34);
      var e = P.typeField(tl, ".f-email", "ava@birch.shop", t, 32);
      T.line(tl, '<span class="t-ok">  ✓</span> enter_text ${email_field} ava@birch.shop', e);
      T.line(tl, '<span class="t-dim">     0.48s  [XPath]</span>', e);
      t = T.cmd(tl, '<span class="t-mod">›</span>', "enter_text ${password_field} ${password}", e + 500, 34);
      e = P.typeField(tl, ".f-pass", "••••••••", t, 30);
      T.line(tl, '<span class="t-ok">  ✓</span> enter_text ${password_field} ${password}', e);
      T.line(tl, '<span class="t-dim">     0.41s  [XPath]</span>', e);
      t = T.cmd(tl, '<span class="t-mod">›</span>', 'press_element "Sign in"', e + 500, 34);
      P.lock(tl, "signin", "Text · Sign in", t, "#24C3AB");
      P.tap(tl, "signin", t + 500);
      P.unlock(tl, t + 900);
      P.screen(tl, "home", t + 900);
      T.line(tl, '<span class="t-ok">  ✓</span> press_element "Sign in"', t + 700);
      T.line(tl, '<span class="t-dim">     0.31s  [Text]</span>', t + 700);
      t = T.cmd(tl, '<span class="t-mod">›</span>', "/save Checkout Sign_In", t + 1700, 30);
      T.line(tl, '<span class="t-info">  •</span> <span class="t-ok">Saved 3 step(s) → module \'Sign_In\'</span>', t + 200);
      var f = K.file(w, { x: 120, y: 160, w: 560, title: "modules/modules.csv", rows: ['<span class="t-dim">module_name,module_step,param_1,param_2</span>'] });
      pop(tl, f.el, t + 700);
      ["Launch App", "Enter Text,${email_field},ava@birch.shop", "Enter Text,${password_field},${password}", "Press Element,Sign in"].forEach(function (r, i) {
        var parts = r.split(",");
        f.add(tl, '<span class="t-mod">Sign_In</span>,<span class="t-b">' + parts[0] + "</span>" + (parts.length > 1 ? "," + parts.slice(1).join(",").replace(/(\$\{[^}]+\})/g, '<span class="t-var">$1</span>') : ""), t + 1100 + i * 260, "add");
      });
      tl.end = t + 4300;
    },
  };

  // ------------------------------------------------------------------ describe (AI mode)
  S.describe = {
    w: 880, h: 500,
    build: function (w, tl) {
      var T = K.term(w, { x: 24, y: 30, w: 540, h: 420, title: "optics live checkout", status: '<b>appium:emulator-5554</b> · <span class="m">rec ●</span> · /help · Ctrl-N AI mode · Ctrl-X stop' });
      var mode = T.status.querySelector(".m");
      mode.className = "sc-rec";
      var P = K.phone(w, 610, 20, 0.82);
      P.start("home");
      var key = abs(w, 330, 200, '<div class="sc-chip" style="height:44px;font-size:15px;gap:6px"><kbd>Ctrl</kbd>+<kbd>N</kbd><span style="color:#B8860B;margin-left:6px">AI mode</span></div>');
      pop(tl, key, 500);
      tl.hide(key, 1600);
      tl.at(1200, function () { mode.className = "sc-aion"; mode.textContent = "AI ●"; });
      T.line(tl, '<span class="t-info">  •</span> <span class="t-dim">Natural-language mode ON — describe an action in English.</span>', 1200);
      var t = T.cmd(tl, '<span class="t-ai">ai ›</span>', "add trail runners to the cart", 1900, 30);
      tl.at(t, function () { mode.textContent = "AI …"; });
      T.line(tl, '<span class="t-ai">  ⋯</span> [ai] add trail runners to the cart', t);
      T.line(tl, '<span class="t-ghost">     thinking: open search and look for the shoes</span>', t + 900);
      T.line(tl, '<span class="t-ok">    ✓</span> press_element "Search Birch"  <span class="t-dim">[Text]</span>', t + 1700);
      P.tap(tl, "search", t + 1500);
      var e = P.typeSearch(tl, "trail runner", t + 2300);
      T.line(tl, '<span class="t-ok">    ✓</span> enter_text "Search Birch" "trail runner"', e);
      T.line(tl, '<span class="t-ghost">     thinking: Trail Runner 2 is the first result</span>', e + 600);
      P.lock(tl, [14, 280, 111, 34], "OCR · Trail Runner 2", e + 1200, "#F3BE00");
      P.tap(tl, "card0", e + 1700);
      P.unlock(tl, e + 1900);
      P.screen(tl, "product", e + 2000);
      T.line(tl, '<span class="t-ok">    ✓</span> press_element "Trail Runner 2"  <span class="t-dim">[OCR]</span>', e + 1900);
      P.tap(tl, "add", e + 3000);
      tl.add(P.toast, "in", e + 3200);
      T.line(tl, '<span class="t-ok">    ✓</span> press_element "Add to cart"  <span class="t-dim">[Text]</span>', e + 3200);
      T.line(tl, '<span class="t-ok">  ✓</span> [ai] add trail runners to the cart', e + 4000);
      T.line(tl, '<span class="t-dim">     done · 4 step(s) · 9.4s · recorded 4 (/save to keep)</span>', e + 4000);
      tl.at(e + 4000, function () { mode.textContent = "AI ●"; });
      tl.end = e + 6200;
    },
  };

  // ------------------------------------------------------------------ agent (MCP)
  S.agent = {
    w: 880, h: 500,
    build: function (w, tl) {
      var T = K.term(w, { x: 24, y: 30, w: 560, h: 440, title: "your agent", top: true });
      var P = K.phone(w, 620, 20, 0.82);
      P.start("login2");
      var pink = '<span class="t-pink">⏺</span> ';
      var t = T.cmd(tl, '<span class="t-pink">›</span>', "Write a checkout test for the Birch app", 300, 36);
      function call(name, args, at, ok) {
        T.line(tl, pink + '<span class="t-b">optics</span><span class="t-dim"> · </span>' + name + '<span class="t-dim">(' + args + ")</span>" + (ok ? ' <span class="t-ok">✓</span>' : ""), at);
      }
      call("start_session", 'driver="appium"', t + 300, true);
      call("screenshot", "", t + 1100, true);
      tl.add(P.scr, "x", t + 1100);
      T.line(tl, pink + 'Read <span class="t-b">optics://session/…/elements</span>', t + 1700);
      call("press_element", 'element="Log in"', t + 2500);
      P.lock(tl, [16, 334, 220, 46], "Text · Log in", t + 2500, "#F56FA1");
      P.tap(tl, [16, 334, 220, 46], t + 3000);
      P.unlock(tl, t + 3300);
      P.screen(tl, "home", t + 3400);
      T.swap(tl, pink + '<span class="t-b">optics</span><span class="t-dim"> · </span>press_element<span class="t-dim">(element="Log in")</span> <span class="t-ok">✓</span>', t + 3200);
      call("press_element", 'element="Trail Runner 2"', t + 3900, true);
      P.tap(tl, "card0", t + 4100);
      P.screen(tl, "product", t + 4400);
      call("press_element", 'element="Add to cart"', t + 5000, true);
      P.tap(tl, "add", t + 5200);
      tl.add(P.toast, "in", t + 5400);
      T.line(tl, pink + 'Read <span class="t-b">optics://project-format</span>', t + 6000);
      T.line(tl, pink + 'Write <span class="t-b">checkout/modules/modules.csv</span> <span class="t-ok">+9</span>', t + 6600);
      T.line(tl, pink + 'Write <span class="t-b">checkout/test_data/elements.csv</span> <span class="t-ok">+4</span>', t + 7000);
      T.line(tl, pink + 'Bash <span class="t-b">optics dry_run checkout</span> <span class="t-ok">✓</span>', t + 7600);
      T.line(tl, "", t + 7900);
      T.line(tl, '<span class="t-ok">●</span> Suite ready: 1 test case, 3 modules, 9 steps.', t + 8100);
      T.line(tl, '  <span class="t-dim">Run it with</span> <span class="t-pink">optics execute checkout</span>', t + 8300);
      tl.end = t + 10200;
    },
  };

  // ------------------------------------------------------------------ run (optics execute)
  S.run = {
    w: 880, h: 500,
    build: function (w, tl) {
      var T = K.term(w, { x: 24, y: 26, w: 560, h: 448, title: "~/birch", top: true });
      var t = T.cmd(tl, '<span class="t-ok">~/birch</span> <span class="t-mod">❯</span>', "optics execute checkout", 300, 32);
      T.line(tl, 'Running tests <span class="sc-bar-fill" style="width:0"></span> <span class="pc">0%</span>', t + 200);
      var bar, pc;
      tl.at(t + 210, function () { bar = T.body.querySelector(".sc-bar-fill"); pc = T.body.querySelector(".pc"); });
      var rows = [
        ["<b class='t-b'>Test Suite</b>", ""],
        ['<span class="t-dim">├──</span> Suite Setup                    ', "PASS"],
        ['<span class="t-dim">│   └──</span> Launch App          <span class="t-dim">1.21s</span>', "PASS"],
        ['<span class="t-dim">├──</span> Sign In                        ', "PASS"],
        ['<span class="t-dim">│   ├──</span> Enter Text          <span class="t-dim">0.52s</span>', "PASS"],
        ['<span class="t-dim">│   └──</span> Press Element       <span class="t-dim">0.31s</span>', "PASS"],
        ['<span class="t-dim">├──</span> Add To Cart                    ', "PASS"],
        ['<span class="t-dim">│   └──</span> Press Element       <span class="t-dim">0.29s</span>', "PASS"],
        ['<span class="t-dim">└──</span> Checkout                       ', "PASS"],
        ['<span class="t-dim">    └──</span> Assert Presence     <span class="t-dim">0.83s</span>', "PASS"],
      ];
      rows.forEach(function (r, i) {
        var at = t + 500 + i * 330;
        T.line(tl, r[0] + (r[1] ? '  <span class="t-ok">' + r[1] + "</span>" : ""), at);
        tl.at(at, function () { if (bar) { var p = Math.round((i + 1) / rows.length * 100); bar.style.width = p * 1.4 + "px"; pc.textContent = p + "%"; } });
      });
      var end = t + 500 + rows.length * 330;
      T.line(tl, "", end);
      T.line(tl, 'Total Test Cases: 3 | Passed: <span class="t-ok">3</span> | Failed: 0', end + 100);
      label(w, 620, 40, "execution_output/");
      var files = [
        ["junit_output.xml", "results your CI reads"],
        ["Launch App_pre_…png", "screen before each step"],
        ["Press Element_annotated_…png", "where the element was found"],
        ["end_of_run_…png", "the last screen"],
        ["logs.json", "events, if json_log is on"],
      ];
      files.forEach(function (f, i) {
        var n = abs(w, 620, 70 + i * 74, '<div class="sc-node" style="width:236px;flex-direction:column;align-items:flex-start;justify-content:center;gap:4px;height:62px"><span style="font:500 12.5px/1 var(--mono)">' + f[0] + '</span><span style="font:400 12px/1 var(--sans);color:var(--sc-ink2)">' + f[1] + "</span></div>");
        fadeIn(tl, n, (i === 0 ? t + 700 : t + 1400 + i * 650));
        n.classList.add("up");
      });
      tl.end = end + 2600;
    },
  };

  // ------------------------------------------------------------------ results (annotated screenshot)
  S.results = {
    w: 880, h: 500,
    build: function (w, tl) {
      label(w, 40, 26, "Press Element_pre_…png");
      label(w, 470, 26, "Press Element_annotated_…png");
      var A = K.phone(w, 70, 54, 0.78);
      A.start("login");
      var B = K.phone(w, 500, 54, 0.78);
      B.start("login");
      tl.at(0, function () {
        [A, B].forEach(function (P) { P.S.login.querySelector(".f-email .v").textContent = "ava@birch.shop"; P.S.login.querySelector(".f-pass .v").textContent = "••••••••"; });
      });
      B.lock(tl, "signin", "Text · Sign in", 900, "#24C3AB");
      var note = abs(w, 300, 440, '<div class="sc-chip" style="height:36px"><i style="--c:#24C3AB"></i>The box shows what Optics found and which way found it</div>');
      fadeIn(tl, note, 1500);
      tl.end = 4200;
    },
  };

  // ------------------------------------------------------------------ errors (on-screen error detection)
  S.errors = {
    w: 880, h: 500,
    build: function (w, tl) {
      var T = K.term(w, { x: 24, y: 26, w: 520, h: 448, title: "~/birch", top: true });
      var P = K.phone(w, 600, 20, 0.82);
      P.start("home");
      var t = T.cmd(tl, '<span class="t-ok">~/birch</span> <span class="t-mod">❯</span>', "optics execute checkout", 300, 32);
      ["<b class='t-b'>Test Suite</b>", '<span class="t-dim">├──</span> Sign In              <span class="t-ok">PASS</span>', '<span class="t-dim">├──</span> Add To Cart          <span class="t-ok">PASS</span>', '<span class="t-dim">└──</span> Checkout             <span class="t-ok">PASS</span>'].forEach(function (r, i) {
        T.line(tl, r, t + 400 + i * 380);
      });
      t += 400 + 4 * 380;
      tl.add(P.modal, "in", t);
      T.line(tl, "", t + 500);
      T.line(tl, '<span class="t-dim">end of run: checking the last screen…</span>', t + 600);
      P.scan(tl, t + 900);
      var f = K.file(w, { x: 250, y: 300, w: 400, title: "test_data/error_definitions.csv", rows: ['<span class="t-dim">error_code,match_string,severity</span>', 'ERR_SESSION,<span class="t-lit">Session expired</span>,high', 'ERR_CRASH,<span class="t-lit">has stopped</span>,critical'] });
      pop(tl, f.el, t + 900);
      tl.add(f.rows[1], "bad", t + 1900);
      P.lock(tl, [26, 222, 200, 70], "Session expired", t + 1900, "#F56FA1");
      T.line(tl, '<span class="t-bad">ON-SCREEN ERROR DETECTED — code: ERR_SESSION</span>', t + 2300);
      T.line(tl, '<span class="t-dim">  match_string: \'Session expired\' | severity: high</span>', t + 2300);
      T.line(tl, "", t + 2500);
      T.line(tl, '<span class="t-dim">junit_output.xml</span>', t + 2900);
      T.line(tl, '  <span class="t-bad">✗ on-screen-error-detection</span>  <span class="t-dim">OnScreenError</span>', t + 3100);
      tl.end = t + 5600;
    },
  };

  // ------------------------------------------------------------------ self-heal
  S.selfheal = {
    w: 880, h: 500,
    build: function (w, tl) {
      var P = K.phone(w, 64, 26, 0.8);
      P.start("login2");
      abs(w, 330, 34, '<div class="sc-chip mono" style="height:40px;font-size:14px;padding:0 16px"><span style="color:var(--sc-ink2)">Press Element</span>&nbsp;<span style="color:#B8860B">${sign_in}</span></div>');
      var rungs = abs(w, 330, 100, '<div class="sc-rungs" style="width:500px"></div>');
      var R = [
        ["1", "XPath", "//*[@resource-id='login']"],
        ["2", "Text in the UI tree", "“Sign in”"],
        ["3", "Text on a screenshot (OCR)", "“Sign in”"],
        ["4", "Image match", "sign_in.png"],
        ["5", "AI self-heal", "an LLM reads the screen"],
      ].map(function (r, i) {
        return h(rungs, '<div class="sc-rung' + (i === 4 ? " opt" : "") + '"><span class="n">' + r[0] + '</span><span class="k">' + r[1] + "<small>" + r[2] + '</small></span><span class="st"></span></div>');
      });
      var t = 800;
      [0, 1, 2, 3].forEach(function (i) {
        tl.add(R[i], "try", t);
        if (i === 2) P.scan(tl, t - 100);
        tl.at(t + 550, function () { R[i].classList.remove("try"); R[i].classList.add("miss"); R[i].querySelector(".st").textContent = "✕"; });
        t += 750;
      });
      tl.add(R[4], "try", t);
      tl.html(R[4].querySelector("small"), "reading the screen…", t);
      var think = abs(w, 330, 440, '<div class="sc-chip" style="height:38px;max-width:500px"><i style="--c:#9672F8"></i><span class="tx">The button now says “Log in”.</span></div>');
      fadeIn(tl, think, t + 900);
      tl.html(R[4].querySelector("small"), "press_element “Log in”", t + 1900);
      P.lock(tl, [16, 334, 220, 46], "AI · Log in", t + 1900, "#9672F8");
      P.tap(tl, [16, 334, 220, 46], t + 2600);
      tl.at(t + 2700, function () { R[4].classList.remove("try"); R[4].classList.add("hit"); R[4].querySelector(".st").textContent = "✓"; });
      P.unlock(tl, t + 3000);
      P.screen(tl, "home", t + 3100);
      tl.html(think.querySelector(".tx"), "Recovered. Logged so you can update the element.", t + 3200);
      tl.end = t + 5600;
    },
  };

  // ------------------------------------------------------------------ area of interest
  S.aoi = {
    w: 880, h: 500,
    build: function (w, tl) {
      var P = K.phone(w, 80, 26, 0.8);
      P.start("product");
      var box = h(P.scr, '<div class="sc-aoi"></div>');
      box.style.cssText = "left:2px;top:2px;width:248px;height:538px";
      var dim = h(P.scr, '<div class="sc-dim"></div>');
      var code = abs(w, 380, 60, '<div class="sc-file" style="position:relative;width:440px"><div class="sc-file-h">modules.csv</div><div class="sc-row"><span class="t-b">Press Element</span>,<span class="t-lit">Add to cart</span>,<span class="v"></span></div></div>');
      var v = code.querySelector(".v");
      var rows = [["aoi_x", "0"], ["aoi_y", "75"], ["aoi_width", "100"], ["aoi_height", "25"]];
      var t = 800;
      rows.forEach(function (r, i) {
        var c = chip(w, 380 + (i % 2) * 220, 150 + Math.floor(i / 2) * 46, '<span style="font-family:var(--mono);color:var(--sc-ink2)">' + r[0] + '</span><b style="font-family:var(--mono)">' + r[1] + "%</b>");
        pop(tl, c, t + i * 260);
      });
      tl.html(v, '<span class="t-dim">aoi_x=0,aoi_y=75,aoi_width=100,aoi_height=25</span>', t);
      tl.add(box, "in", t + 1300);
      tl.css(box, { left: "2px", top: "404px", width: "248px", height: "136px" }, t + 1600);
      var note = abs(w, 380, 270, '<div style="width:440px;font:400 15px/1.5 var(--sans);color:var(--sc-ink2)">Optics only reads the bottom quarter of the screen, so a matching word in the description above can’t be picked by mistake, and the search is faster.</div>');
      fadeIn(tl, note, t + 2200);
      P.scan(tl, t + 2600);
      P.lock(tl, "add", "OCR · Add to cart", t + 3500, "#F3BE00");
      P.tap(tl, "add", t + 4200);
      tl.add(P.toast, "in", t + 4400);
      tl.end = t + 6200;
    },
  };

  // ------------------------------------------------------------------ platforms
  S.platforms = {
    w: 880, h: 500,
    build: function (w, tl) {
      var kw = abs(w, 0, 30, '<div style="width:880px;display:flex;justify-content:center"><div class="sc-chip mono" style="height:42px;font-size:15px;padding:0 18px"><span style="color:var(--sc-ink2)">Press Element</span>&nbsp;<span class="v" style="color:#B8860B">Trail Runner 2</span></div></div>');
      var P = K.phone(w, 40, 100, 0.66);
      P.start("home");
      var tv = abs(w, 252, 150, '<div class="sc-tv" style="width:370px;height:216px"><div class="sc-tv-scr"></div></div>');
      var scr = tv.querySelector(".sc-tv-scr");
      h(scr, '<div class="sc-abs" style="left:18px;top:14px;color:#fff;font:700 13px/1 var(--sans);letter-spacing:-.02em;display:flex;gap:6px;align-items:center"><span style="width:12px;height:12px;border-radius:50% 0;background:#2F7A5A"></span>birch tv</div>');
      var tiles = [];
      var colors = ["#2F6B4F", "#C8643B", "#3E4F8C", "#B8456A"];
      ["Trail Runner 2", "Pace Knit", "Ridge GTX", "Tempo Lite"].forEach(function (n, i) {
        tiles.push(h(scr, '<div class="sc-tile" style="left:' + (18 + i * 86) + 'px;top:48px;width:76px;height:96px;background:' + colors[i] + '"><div style="position:absolute;left:8px;bottom:8px;right:6px;color:#fff;font:650 10px/1.2 var(--sans)">' + n + "</div></div>"));
      });
      h(scr, '<div class="sc-abs" style="left:18px;top:158px;color:rgba(255,255,255,.55);font:500 10.5px/1 var(--sans)">Continue watching</div>');
      h(scr, '<div class="sc-abs" style="left:18px;top:176px;width:330px;height:22px;border-radius:5px;background:rgba(255,255,255,.08)"></div>');
      var br = abs(w, 650, 120, '<div class="sc-browser" style="width:210px;height:280px"><div class="sc-url"><i></i><span>birch.shop</span></div></div>');
      var page = h(br, '<div style="position:relative;height:246px;background:#FBFAF6"></div>');
      h(page, '<div class="sc-abs" style="left:12px;top:12px">' + K.logo(13) + "</div>");
      var wc = h(page, '<div class="sc-abs" style="left:12px;top:44px;width:86px"><div class="b-img" style="height:70px;background:#E8EFE9;border-radius:10px">' + K.shoe("#2F6B4F") + '</div><div class="b-nm" style="color:#1C1B19;font-size:10px">Trail Runner 2</div></div>');
      h(page, '<div class="sc-abs" style="left:110px;top:44px;width:86px"><div class="b-img" style="height:70px;background:#F2E9DF;border-radius:10px">' + K.shoe("#C8643B") + '</div><div class="b-nm" style="color:#1C1B19;font-size:10px">Pace Knit</div></div>');
      var cur = abs(w, 780, 360, '<div class="sc-cursor">' + K.cursorSvg() + "</div>");
      [["Appium · Android, iOS", 40], ["Appium · Android TV, Tizen, webOS", 300], ["Playwright or Selenium · Web", 650]].forEach(function (l, i) {
        var n = label(w, l[1], 448, l[0]);
        n.style.textTransform = "none"; n.style.letterSpacing = "0"; n.style.fontSize = "13px";
      });
      var t = 900;
      // phone: tap
      P.lock(tl, [14, 178, 111, 136], "Trail Runner 2", t, "#24C3AB");
      P.tap(tl, [14, 178, 111, 136], t + 600);
      P.unlock(tl, t + 1000);
      P.screen(tl, "product", t + 1100);
      // tv: d-pad focus walks to the tile, then OK
      t += 1900;
      var keys = abs(w, 400, 380, '<div class="sc-chip mono" style="height:34px"><span class="k">RIGHT</span></div>');
      tl.add(tiles[2], "focus", t);
      pop(tl, keys, t);
      tl.rm(tiles[2], "focus", t + 500); tl.add(tiles[1], "focus", t + 500);
      tl.html(keys.querySelector(".k"), "LEFT", t + 500);
      tl.rm(tiles[1], "focus", t + 1000); tl.add(tiles[0], "focus", t + 1000);
      tl.html(keys.querySelector(".k"), "LEFT", t + 1000);
      tl.html(keys.querySelector(".k"), "ENTER", t + 1600);
      tl.css(tiles[0], { filter: "brightness(1.3)" }, t + 1600);
      tl.hide(keys, t + 2300);
      // browser: click
      t += 2600;
      tl.css(cur, { left: "700px", top: "205px" }, t);
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
      var check = abs(w, 230, 200, '<div class="sc-chip ok" style="height:44px;font-size:14px;padding:0 18px">✓ Optics / checkout — 42 tests passed</div>');
      pop(tl, check, t + 200);
      tl.end = t + 2400;
    },
  };

  // ------------------------------------------------------------------ data-driven loop
  S.loop = {
    w: 880, h: 500,
    build: function (w, tl) {
      var f = K.file(w, { x: 30, y: 40, w: 420, title: "${terms}: three values", rows: ['<span class="t-dim">trail runner|pace knit|ridge gtx</span>', "trail runner", "pace knit", "ridge gtx"] });
      var code = K.file(w, { x: 30, y: 210, w: 520, title: "modules.csv", rows: ['<span class="t-mod">Search All</span>,<span class="t-b">Run Loop</span>,Search One,term,<span class="t-var">${terms}</span>', '<span class="t-mod">Search One</span>,<span class="t-b">Enter Text</span>,${search_bar},<span class="t-var">${term}</span>', '<span class="t-mod">Search One</span>,<span class="t-b">Assert Presence</span>,<span class="t-var">${term}</span>'] });
      var P = K.phone(w, 620, 20, 0.82);
      P.start("home");
      var counter = abs(w, 30, 340, '<div class="sc-chip" style="height:40px;font-size:14px"><span class="n">iteration 1 of 3</span></div>');
      pop(tl, counter, 500);
      var marks = [];
      var t = 800;
      tl.add(code.rows[0], "hl", 500);
      ["trail runner", "pace knit", "ridge gtx"].forEach(function (term, i) {
        tl.html(counter.querySelector(".n"), "iteration " + (i + 1) + " of 3 · term = “" + term + "”", t);
        tl.add(f.rows[i + 1], "hl", t);
        tl.add(code.rows[1], "hl", t + 200);
        var e = P.typeSearch(tl, term, t + 300);
        tl.rm(code.rows[1], "hl", e + 200);
        tl.add(code.rows[2], "hl", e + 200);
        tl.rm(code.rows[2], "hl", e + 900);
        tl.at(e + 900, function () { f.rows[i + 1].innerHTML = term + '  <span class="t-ok">✓</span>'; });
        tl.rm(f.rows[i + 1], "hl", e + 1000);
        t = e + 1400;
      });
      tl.end = t + 1800;
    },
  };

  // ------------------------------------------------------------------ production (BLE + camera)
  S.production = {
    w: 880, h: 500,
    build: function (w, tl) {
      var P = K.phone(w, 360, 60, 0.74);
      P.start("home");
      // camera above the phone
      var cam = abs(w, 400, 4, '<div style="width:120px;height:44px;border-radius:12px;background:#1b1d2b;box-shadow:0 10px 20px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;gap:8px"><span style="width:22px;height:22px;border-radius:50%;background:radial-gradient(circle at 40% 40%,#4d67ff,#0b0e2a 70%);box-shadow:0 0 0 3px #2a2d40"></span><span class="rec" style="width:7px;height:7px;border-radius:50%;background:#FF5577"></span></div>');
      var dongle = abs(w, 60, 210, '<div class="sc-node" style="height:54px;flex-direction:column;align-items:flex-start;justify-content:center;gap:4px;width:200px"><span>BLE dongle</span><span style="font:400 12px/1 var(--sans);color:var(--sc-ink2)">a Bluetooth mouse and keyboard</span></div>');
      var laptop = abs(w, 60, 110, '<div class="sc-node" style="height:54px;flex-direction:column;align-items:flex-start;justify-content:center;gap:4px;width:200px"><span>optics execute</span><span style="font:400 12px/1 var(--sans);color:var(--sc-ink2)">on your machine</span></div>');
      var frames = abs(w, 640, 90, '<div style="width:200px"></div>');
      label(w, 640, 60, "camera frames");
      label(w, 60, 80, "your machine");
      var wire = K.wire(w, 880, 500);
      wire.draw(tl, [[160, 164], [160, 210]], 400, "#7086FF");
      wire.draw(tl, [[260, 237], [360, 237]], 800, "#7086FF");
      wire.draw(tl, [[460, 52], [460, 52], [640, 110]], 1200, "#F3BE00");
      var cur = h(P.scr, '<div class="sc-cursor" style="left:200px;top:440px">' + K.cursorSvg() + "</div>");
      var t = 1600;
      for (var i = 0; i < 3; i++) (function (k) {
        var fr = h(frames, '<div class="sc-fade up" style="margin-bottom:10px;height:64px;border-radius:10px;background:#0D0F2A;border:1px solid rgba(255,255,255,.1);display:flex;align-items:center;gap:10px;padding:0 10px;font:500 11.5px/1.3 var(--mono);color:#DADDFF"><span style="width:34px;height:46px;border-radius:6px;background:linear-gradient(#FBFAF6,#E8EFE9)"></span><span>frame ' + (k + 1) + '<br><span class="t-dim">' + ["searching…", "found “Trail Runner 2”", "tap at 22%, 46%"][k] + "</span></span></div>");
        tl.show(fr, t + k * 900);
      })(i);
      P.scan(tl, t);
      P.lock(tl, [14, 280, 111, 34], "OCR · Trail Runner 2", t + 1200, "#F3BE00");
      tl.css(cur, { left: "60px", top: "250px" }, t + 1900);
      P.tap(tl, [14, 178, 111, 136], t + 2700);
      P.unlock(tl, t + 3000);
      P.screen(tl, "product", t + 3100);
      tl.end = t + 5200;
    },
  };

  // ------------------------------------------------------------------ four ways in, one suite out
  S.fourways = {
    w: 880, h: 500,
    build: function (w, tl) {
      var ways = [
        ["Write it", "#9672F8", "CSV or YAML by hand"],
        ["Record it", "#24C3AB", "optics live"],
        ["Say it", "#F3BE00", "plain English, Ctrl+N"],
        ["Delegate it", "#F56FA1", "your AI agent, optics mcp"],
      ];
      var cards = ways.map(function (wy, i) {
        return abs(w, 30, 46 + i * 104, '<div class="sc-node" style="width:240px;height:84px;flex-direction:column;align-items:flex-start;justify-content:center;gap:6px;border-left:4px solid ' + wy[1] + '"><span style="font-size:16px">' + wy[0] + '</span><span style="font:400 13px/1 var(--sans);color:var(--sc-ink2)">' + wy[2] + "</span></div>");
      });
      var suite = K.file(w, { x: 340, y: 120, w: 220, title: "checkout/", rows: ['<span class="t-dim">test_cases.csv</span>', '<span class="t-dim">modules.csv</span>', '<span class="t-dim">elements.csv</span>'] });
      label(w, 340, 92, "one suite, plain text");
      var T = K.term(w, { x: 610, y: 120, w: 250, h: 230, title: "every build" });
      var wire = K.wire(w, 880, 500);
      var t = 500;
      cards.forEach(function (c, i) {
        tl.css(c, { opacity: ".35" }, 0);
        tl.css(c, { opacity: "1", boxShadow: "0 14px 30px -18px " + ways[i][1] }, t);
        wire.draw(tl, [[270, 88 + i * 104], [340, 190]], t + 200, ways[i][1]);
        tl.add(suite.rows[i % 3], "hl", t + 600);
        tl.rm(suite.rows[i % 3], "hl", t + 1100);
        tl.css(c, { boxShadow: "" }, t + 1100);
        t += 1100;
      });
      wire.draw(tl, [[560, 190], [610, 230]], t, "#7086FF");
      var e = T.cmd(tl, '<span class="t-mod">❯</span>', "optics execute checkout", t + 300, 30);
      T.line(tl, '<span class="t-dim">Sign In</span>      <span class="t-ok">PASS</span>', e + 300);
      T.line(tl, '<span class="t-dim">Add To Cart</span>  <span class="t-ok">PASS</span>', e + 650);
      T.line(tl, '<span class="t-dim">Checkout</span>     <span class="t-ok">PASS</span>', e + 1000);
      T.line(tl, 'Passed: <span class="t-ok">3</span> | Failed: 0', e + 1400);
      tl.end = e + 3400;
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
        if (!dims.narrow) { T.win.style.left = "24px"; T.win.style.top = "20px"; T.win.style.width = dims.w - 48 + "px"; T.win.style.height = dims.h - 40 + "px"; }
        var t = 400;
        script.forEach(function (s) {
          if (typeof s === "number") { t += s; return; }
          if (s[0] === "$") { t = T.cmd(tl, s[2] || '<span class="prompt t-dim">$</span>', s[1], t, s[3] || 34) + 120; return; }
          T.line(tl, s[0], t);
          t += s[1] == null ? 140 : s[1];
        });
        tl.end = t + 600;
      },
      hold: opts.hold || 3600,
    };
  }

  var D = function (t) { return '<span class="t-dim">' + t + "</span>"; };
  var OK = '<span class="t-ok">PASS</span>', BAD = '<span class="t-bad">FAIL</span>';
  S.quickstart = termScene("~", [
    ["$", "curl -fsSL https://optics-framework.org/install | sh"],
    ['<span class="t-b">Optics Framework installer</span>', 300],
    ["  " + D("→") + " Creating a virtual environment at ~/.optics/venv", 500],
    ["  " + D("→") + " Installing optics-framework", 1100],
    ['  <span class="t-ok">✓</span> Optics Framework 1.10.5', 400],
    ['<span class="t-b">Next:</span> optics quickstart', 700],
    ["$", "optics quickstart"],
    ['<span class="t-b">What do you want to automate?</span> ' + D("[mobile/web] (mobile):") + " web", 900],
    ['<span class="t-b">Install Playwright, Selenium now?</span> ' + D("[y/n] (y):") + " y", 700],
    [D("Installing… done"), 900],
    ['<span class="t-b">Start from the \'playwright\' example?</span> ' + D("[y/n] (y):") + " y", 700],
    ['<span class="t-b">Project name</span> ' + D("(my-optics-project):"), 600],
    ["🩺 " + D("optics doctor ·") + " Playwright <span class=\"t-ok\">✅</span>  playwright browser <span class=\"t-ok\">✅</span>", 800],
    ['<span class="t-b">Run your first test now?</span> ' + D("[y/n] (y):") + " y", 900],
    ["Test Suite", 300],
    [D("├──") + " Playwright Suite Setup              " + OK, 500],
    [D("├──") + " TC1 Verify Landing                  " + OK, 500],
    [D("└──") + " Playwright Suite Teardown           " + OK, 500],
    ['Total Test Cases: 3 | Passed: <span class="t-ok">3</span> | Failed: 0', 200],
  ], { h: 470, bottom: true });

  S.dryrun = termScene("~/birch", [
    ["$", "optics dry_run checkout"],
    ["Test Suite", 200],
    [D("└──") + " Shopper can add a backpack          " + BAD, 250],
    [D("    ├──") + " Open the store                  " + OK, 200],
    [D("    ├──") + " Sign in                         " + BAD, 200],
    [D("    │   ├──") + " Enter Text (${username_field}) " + OK, 200],
    [D("    │   └──") + " Press Elemnt (${login_button}) " + BAD, 200],
    [D("    └──") + " Add the backpack to the cart    " + D("NOT_RUN"), 500],
    ['Total Test Cases: 1 | Passed: 0 | Failed: <span class="t-bad">1</span>', 600],
    ['<span class="t-bad">Failure details</span>', 100],
    ["Sign in → step 'Press Elemnt' — Keyword not found: Press Elemnt.", 100],
    ["Did you mean <span class=\"t-ok\">'Press Element'</span>? (run `optics list` to see all keywords)", 1600],
    [D("# no device was touched — fix the typo and check again"), 600],
    ["$", "optics dry_run checkout"],
    ['Total Test Cases: 1 | Passed: <span class="t-ok">1</span> | Failed: 0', 200],
  ], { h: 440 });

  S.http = termScene("~", [
    ["$", "optics serve --port 8000"],
    [D("INFO | Uvicorn running on http://127.0.0.1:8000"), 900],
    ["$", "curl -X POST localhost:8000/v1/sessions/start -d @session.json", 0, 40],
    ['{"session_id": "<span class="t-lit">7f3c…</span>", "status": "<span class="t-ok">created</span>"}', 1000],
    ["$", "curl -X POST localhost:8000/v1/sessions/7f3c…/action -d '{\"mode\":\"keyword\",\"keyword\":\"Press Element\",\"params\":[\"Sign in\"]}'", 0, 55],
    ['{"execution_id": "<span class="t-lit">a91e…</span>", "status": "<span class="t-ok">SUCCESS</span>", "data": {"result": null}}', 1000],
    ["$", "curl localhost:8000/v1/sessions/7f3c…/screenshot | jq -r .data.result | base64 -d > screen.png", 0, 55],
    [D("# screen.png now shows the signed-in home page"), 900],
    ["$", "curl -X DELETE localhost:8000/v1/sessions/7f3c…/stop"],
    ['{"status": "<span class="t-ok">terminated</span>"}', 600],
  ], { h: 420 });

  window.OPTICS_TERM_SCENE = termScene;
  S.terminal = termScene;
})();
