(function () {
  var K = window.OPTICS_KIT;
  var root = document.querySelector(".play");
  if (!K || !root) return;
  var stage = root.querySelector(".play-stage");
  var runBtn = root.querySelector(".play-run");
  var result = root.querySelector(".play-result");
  var switches = root.querySelectorAll(".play-switch input");
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  var V = function (x) { return '<span class="t-var">' + x + "</span>"; };
  var L = function (x) { return '<span class="t-lit">' + x + "</span>"; };
  var R = function (mod, kw, a) { return '<span class="t-mod">' + mod + '</span>,<span class="t-b">' + kw + "</span>" + (a ? "," + a : ""); };
  var mark = { done: function (s) { return '<span class="sc-done">✓ ' + s + "</span>"; }, fail: '<span class="sc-done">✕ FAIL</span>', skip: '<span class="sc-done">NOT_RUN</span>' };
  var BLUE = "#7086FF", PINK = "#FF7096", TEAL = "#24C3AB";

  function options() {
    var o = {};
    switches.forEach(function (s) { o[s.name] = s.checked; });
    return o;
  }

  function outcome(o) {
    var failed = o.newId && o.noText;
    var cases = o.errorScreen ? 2 : 1;
    var bad = (failed ? 1 : 0) + (o.errorScreen ? 1 : 0);
    return { failed: failed, cases: cases, passed: cases - bad, bad: bad, exit: bad ? 1 : 0 };
  }

  function build(w, tl, o, narrow) {
    var end = outcome(o);
    var P, rows, ticker, T, wire, PX = 862, PY = 13, PS = 0.72;
    var signIn = o.newId
      ? (o.noText ? null : "0.55s [Text]")
      : "0.31s [XPath]";
    var steps = [
      [R("Sign In", "Enter Text", V("${email_field}") + ",ava@birch.shop"), "0.52s", "email", "email_field", function (t) { return P.typeField(tl, ".f-email", "ava@birch.shop", t, 30); }],
      [R("Sign In", "Enter Text", V("${password_field}") + "," + V("${password}")), "0.47s", "password", "password_field", function (t) { return P.typeField(tl, ".f-pass", "•••••••••••••", t, 34); }],
      [R("Sign In", "Press Element", V("${sign_in}")), signIn, "signin", "", function (t) {
        if (!o.newId) {
          P.lock(tl, "signin", "XPath: login", t, TEAL);
        } else {
          P.lock(tl, "signin", "XPath: no match", t, PINK);
          if (o.noText) return t + 900;
          P.lock(tl, "signin", "Text: Sign in", t + 900, BLUE);
          t += 900;
        }
        P.tap(tl, "signin", t + 550);
        P.unlock(tl, t + 800);
        return P.screen(tl, "home", t + 900) + 300;
      }],
      [R("Add To Cart", "Press Element", V("${search_bar}")), "0.61s", "search", "search_bar", function (t) { return P.tap(tl, "search", t); }],
      [R("Add To Cart", "Enter Text Direct", L("trail runner")), "0.70s", "search", "", function (t) { var e = P.typeSearch(tl, "trail runner", t); P.filter(tl, 0, e + 250); return e + 650; }],
      [R("Add To Cart", "Press Element", L("Trail Runner 2")), "1.12s", "card0", "Trail Runner 2", function (t) { P.tap(tl, "card0", t); P.unlock(tl, t + 300); return P.screen(tl, "product", t + 400) + 300; }],
      [R("Add To Cart", "Press Element", L("Add to cart")), "0.48s", "add", "Add to cart", function (t) { P.tap(tl, "add", t); return tl.add(P.toast, "in", t + 300) + 200; }],
      [R("Add To Cart", "Assert Presence", L("Added to cart")), "0.66s", [18, 46, 216, 44], "Added to cart", function (t) { return t + 500; }],
    ];
    var t = 500;
    if (narrow) {
      var f = K.file(w, { x: 12, y: 12, w: 376, title: "modules/modules.csv", rows: [steps[0][0]] });
      f.el.classList.add("sc-ticker");
      ticker = f.rows[0];
      P = K.phone(w, 70, 98, 0.96);
    } else {
      var file = K.file(w, { x: 40, y: 14, w: 640, title: "modules/modules.csv", rows: ['<span class="t-dim">module_name,module_step,param_1,param_2</span>'].concat(steps.map(function (s) { return s[0] + '<span class="sc-done"></span>'; })) });
      rows = file.rows.slice(1);
      T = K.term(w, { x: 40, y: 294, w: 640, h: 162, title: "~/birch", top: true });
      T.body.style.fontSize = "11.5px";
      t = T.cmd(tl, '<span class="t-ok">~/birch</span> <span class="t-mod">❯</span>', "optics execute birch-tests", 300, 34);
      T.line(tl, 'Running tests <span class="sc-bar-fill" style="width:0"></span> <span class="pc">0%</span>', t + 150, "prog");
      P = K.phone(w, PX, PY, PS);
      wire = K.wire(w, 1100, 470);
    }
    P.start("login");
    var land = function (box) { var b = K.BOX[box] || box; return [PX + (9 + b[0]) * PS, PY + (9 + b[1] + b[3] / 2) * PS]; };
    var setRow = function (i, html, cls, at) {
      if (narrow) {
        tl.html(ticker, steps[i][0] + html, at);
        tl.rm(ticker, "hl", at);
        if (cls) tl.add(ticker, cls, at);
      } else {
        tl.rm(rows[i], "hl", at);
        tl.at(at, function () { rows[i].querySelector(".sc-done").outerHTML = html; });
        if (cls) tl.add(rows[i], cls, at);
      }
    };
    t += 500;
    var stopAt = steps.length;
    for (var i = 0; i < steps.length; i++) {
      var s = steps[i];
      var y = 14 + 32 + 27 * (i + 1) + 13.5;
      if (narrow) { tl.html(ticker, s[0], t); tl.rm(ticker, "done", t); tl.add(ticker, "hl", t); }
      else { tl.add(rows[i], "hl", t); wire.draw(tl, [[680, y], land(s[2])], t + 80); }
      var a = t + 420;
      if (s[3]) a = P.lock(tl, s[2], s[3], a, BLUE);
      var e = s[4](a + 80);
      if (s[3]) P.unlock(tl, e + 120);
      t = e + 260;
      if (!narrow) wire.clear(tl, t);
      if (s[1] === null) {
        setRow(i, mark.fail, "failed", t);
        stopAt = i;
        break;
      }
      setRow(i, mark.done(s[1]), "done", t);
      if (!narrow) {
        var pct = Math.round((i + 1) / steps.length * 100);
        (function (p) { tl.at(t, function () { var b = w.querySelector(".sc-bar-fill"), pc = w.querySelector(".pc"); if (b) { b.style.width = p * 1.6 + "px"; pc.textContent = p + "%"; } }); })(pct);
      }
      t += 380;
    }
    if (stopAt < steps.length && !narrow) {
      for (var j = stopAt + 1; j < steps.length; j++) setRow(j, mark.skip, "notrun", t + 200);
    }
    if (!narrow) tl.at(t + 200, function () { var b = w.querySelector(".sc-bar-fill"), pc = w.querySelector(".pc"); if (b) { b.style.width = "160px"; pc.textContent = "100%"; } });
    if (o.errorScreen) {
      t = tl.add(P.modal, "in", t + 300) + 500;
      t = P.scan(tl, t);
    }
    var tree = function (name, time, ok) { return '<span class="t-dim">└── </span>' + name + ' <span class="t-dim">| ' + time + ' |</span> ' + (ok ? '<span class="t-ok">PASS</span>' : '<span class="t-bad">FAIL</span>'); };
    var summary = "Total Test Cases: " + end.cases + " | Passed: " + end.passed + " | Failed: " + end.bad;
    if (narrow) {
      tl.html(ticker, '<span class="' + (end.exit ? "t-bad" : "t-ok") + '">' + summary + "</span>", t + 600);
    } else {
      T.line(tl, tree("Checkout", end.failed ? "2.10s" : o.newId ? "5.11s" : "4.87s", !end.failed), t + 200);
      if (o.errorScreen) T.line(tl, tree("on-screen-error-detection", "0.00s", false), t + 420);
      if (end.failed) T.line(tl, '<span class="t-bad">Failure details:</span> Press Element ${sign_in} failed after fallback attempts', t + 640);
      T.line(tl, summary, t + 860);
    }
    tl.end = t + 1000;
    return end;
  }

  var world, tl, events, i, clock, raf, end;
  function size() { return stage.clientWidth < 600; }
  function fit() {
    if (!world) return;
    var narrow = size();
    if (narrow !== world.classList.contains("sc-narrow")) { play(true); return; }
    world.style.transform = "scale(" + stage.clientWidth / parseFloat(world.style.width) + ")";
  }
  function finish() {
    cancelAnimationFrame(raf);
    raf = null;
    for (; i < events.length; i++) events[i].fn();
    root.classList.remove("running");
    result.hidden = false;
    result.className = "play-result " + (end.exit ? "is-fail" : "is-pass");
    result.textContent = (end.exit ? "FAIL" : "PASS") + " · exit code " + end.exit;
  }
  function frame(now) {
    if (!clock) clock = now;
    var at = now - clock;
    while (i < events.length && events[i].t <= at) events[i++].fn();
    if (at >= tl.end) finish(); else raf = requestAnimationFrame(frame);
  }
  function play(instant) {
    cancelAnimationFrame(raf);
    var narrow = size(), W = narrow ? 400 : 1100, H = narrow ? 650 : 470;
    stage.style.setProperty("--ar", W / H);
    stage.innerHTML = "";
    world = K.h(stage, '<div class="sc-world' + (narrow ? " sc-narrow" : "") + '"></div>');
    world.style.width = W + "px";
    world.style.height = H + "px";
    fit();
    tl = new K.Timeline();
    end = build(world, tl, options(), narrow);
    events = tl.ev.sort(function (a, b) { return a.t - b.t; });
    i = 0;
    clock = 0;
    result.hidden = true;
    if (instant || reduced) { world.classList.add("sc-static"); finish(); return; }
    root.classList.add("running");
    raf = requestAnimationFrame(frame);
  }

  var seen;
  function run() { if (seen) seen.disconnect(); play(false); }
  runBtn.addEventListener("click", run);
  switches.forEach(function (s) { s.addEventListener("change", run); });
  if (window.ResizeObserver) new ResizeObserver(fit).observe(stage);
  play(true);
  if (!reduced && "IntersectionObserver" in window) {
    seen = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) run();
    }, { threshold: 0.5 });
    seen.observe(stage);
  }
})();
