(function () {
  var B = window.BIRCH;
  if (!B) return;
  var el = B.el, esc = B.esc, STOP = B.STOP;
  function quiet(e) { if (e !== STOP) throw e; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function secs(s) { return s.toFixed(2) + "s"; }
  function tok(s) { var out = [], m, re = /"([^"]*)"|(\S+)/g; while ((m = re.exec(s))) out.push(m[1] != null ? m[1] : m[2]); return out; }
  function quote(v) { return /\s/.test(v) || !v ? '"' + v + '"' : v; }
  function paint(cmd) {
    return esc(cmd).replace(/(\$\{\w+\})|(&quot;[^&]*&quot;)/g, function (m, v) { return v ? '<span class="k-var">' + m + "</span>" : '<span class="k-lit">' + m + "</span>"; })
      .replace(/^(\/?[a-z_]+)/i, '<span class="k-kw">$1</span>');
  }
  function csvRow(cells, cls) {
    return '<div class="' + (cls || "") + '">' + cells.map(function (c, i) {
      var s = esc(c);
      if (/^\$\{/.test(c)) s = '<span class="k-var">' + s + "</span>";
      else if (i === 0) s = '<span class="k-mod">' + s + "</span>";
      else if (i === 1) s = '<span class="k-kw">' + s + "</span>";
      else s = '<span class="k-lit">' + s + "</span>";
      return s;
    }).join('<span class="k-dim">,</span>') + "</div>";
  }
  function track(name) { document.dispatchEvent(new CustomEvent("optics:play", { detail: name })); }

  // ------------------------------------------------------------------ 1. optics live
  var ELEMENTS = [
    ["email_field", "//*[@resource-id='com.birch.shop:id/email']"],
    ["password_field", "//*[@resource-id='com.birch.shop:id/password']"],
    ["sign_in", "//*[@resource-id='com.birch.shop:id/login']"],
    ["sign_in", "Sign in"],
    ["search_bar", "Search Birch"],
  ];
  var NAMED = {
    email_field: { el: "email", tag: "XPath", field: "email" },
    password_field: { el: "password", tag: "XPath", field: "password", secret: true },
    sign_in: { el: "signin", tag: "XPath" },
    search_bar: { el: "search", tag: "Text", field: "search" },
  };
  var KEYWORDS = [["launch_app", "Launch App", 0], ["enter_text", "Enter Text", 2], ["press_element", "Press Element", 1], ["assert_presence", "Assert Presence", 1], ["go_back", "Go Back", 0]];
  var SLASH = ["/save", "/elements", "/help", "/quit"];
  var WORDS = KEYWORDS.map(function (k) { return k[0]; }).concat(SLASH, Object.keys(NAMED).map(function (n) { return "${" + n + "}"; }));

  function parse(line) {
    var s = line.trim();
    if (s[0] === "/") { var p = s.split(/\s+/); return { slash: p[0].toLowerCase(), args: p.slice(1) }; }
    for (var i = 0; i < KEYWORDS.length; i++) {
      var m = s.match(new RegExp("^" + KEYWORDS[i][0].replace("_", "[ _]") + "(?=\\s|$)", "i"));
      if (m) return { kw: KEYWORDS[i], args: tok(s.slice(m[0].length)) };
    }
    return { unknown: s.split(/\s+/)[0] };
  }

  // Run one step on a Birch device. Shared by optics live, optics execute and the release game.
  function act(dev, clock, g, step, fast) {
    var A = dev.app, X = dev.act, kw = step.kw[0], args = step.args, k = fast ? .55 : 1;
    function find(v) {
      var named = /^\$\{(\w+)\}$/.exec(v);
      if (named) {
        var def = NAMED[named[1]];
        if (!def) return { err: "${" + named[1] + "} is not defined in the project's elements" };
        var t = A.el(def.el);
        return B.visible(t) && t.closest(".bz-" + A.screen) ? { t: t, tag: def.tag, def: def } : { err: "'" + v + "' is not on the screen." };
      }
      var hit = A.byText(v);
      return hit ? { t: hit, tag: "Text" } : { err: "'" + v + "' is not on the screen." };
    }
    function done(tag, base) { return { ok: true, time: base, tag: tag }; }
    if (kw === "launch_app") {
      X.clear();
      A.reset("login");
      return clock.wait(500 * k, g).then(function () { return done("", 1.21); });
    }
    if (kw === "go_back") {
      return clock.wait(260 * k, g).then(function () { if (A.screen === "product") A.show("home"); return done("", .22); });
    }
    var f = find(args[0]);
    if (f.err) return Promise.resolve({ ok: false, err: "[E0201] " + f.err });
    var base = f.tag === "XPath" ? rnd(.3, .55) : rnd(.4, .75);
    X.lock(f.t, f.tag + ": " + (f.def ? args[0].slice(2, -1) : args[0]), "find");
    return clock.wait(380 * k, g).then(function () {
      var name = f.t.dataset.el;
      if (kw === "assert_presence") {
        X.lock(f.t, "Present", "yes");
        return clock.wait(380 * k, g).then(function () { X.unlock(); return done(f.tag, rnd(.18, .34)); });
      }
      X.tap(f.t);
      if (kw === "enter_text") {
        var field = f.def && f.def.field || ({ email: "email", password: "password", search: "search" })[name];
        X.unlock();
        if (!field) return done(f.tag, base);
        var text = step.secretValue != null ? step.secretValue : args[1];
        return A.type(field, text, clock, g, fast ? 60 : 34).then(function () {
          if (field === "search") A.filter(text);
          return done(f.tag, base + text.length * .012);
        });
      }
      return clock.wait(200 * k, g).then(function () {
        X.unlock();
        A.press(f.t);
        return clock.wait(260 * k, g).then(function () { return done(f.tag, base); });
      });
    });
  }

  function live(root) {
    var stage, world, dev, clock = new B.Clock();
    root.innerHTML =
      '<p class="play-tag label" aria-hidden="true"><span>Not a recording.</span> <em>Tap the phone.</em></p>' +
      '<div class="live-term">' +
        '<div class="live-tabs" role="tablist" aria-label="Session">' +
          '<button type="button" role="tab" aria-selected="true" data-pane="live">optics live</button>' +
          '<button type="button" role="tab" aria-selected="false" tabindex="-1" data-pane="modules">modules.csv</button>' +
          '<button type="button" role="tab" aria-selected="false" tabindex="-1" data-pane="elements">elements.csv</button>' +
          '<button type="button" role="tab" aria-selected="false" tabindex="-1" data-pane="run" hidden>optics execute</button>' +
        "</div>" +
        '<div class="live-pane on" data-pane="live" role="tabpanel" aria-label="optics live">' +
          '<div class="live-hist" role="log" aria-live="polite"></div>' +
          '<form class="live-in"><span class="k-mod" aria-hidden="true">›</span><div class="live-field"><input aria-label="Type a step for optics live" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go"><span class="live-hint" aria-hidden="true"></span></div></form>' +
          '<div class="live-keys"></div>' +
          '<div class="live-status"><span>appium:emulator-5554</span><span class="live-rec">rec <i></i></span><span class="live-help">/help · Tab complete · ↑ recall</span></div>' +
        "</div>" +
        '<div class="live-pane live-csv" data-pane="modules" role="tabpanel" aria-label="modules.csv"></div>' +
        '<div class="live-pane live-csv" data-pane="elements" role="tabpanel" aria-label="elements.csv"></div>' +
        '<div class="live-pane live-run" data-pane="run" role="tabpanel" aria-label="optics execute"></div>' +
      "</div>" +
      '<div class="live-dev"><div class="pg-stage"><div class="pg-world"></div></div></div>';
    var hist = root.querySelector(".live-hist"), input = root.querySelector("input"), hint = root.querySelector(".live-hint");
    var keys = root.querySelector(".live-keys"), runPane = root.querySelector(".live-run");
    stage = root.querySelector(".pg-stage");
    world = root.querySelector(".pg-world");
    dev = B.device(world, "ios");
    B.fit(stage, world, 290, 580, function () { return innerWidth < 900 ? 470 : 580; });
    clock.watch(root);
    var A = dev.app;

    var rec = [], saved = [], past = [], pastAt = 0, busy = false, quitArmed = false, secret = "<redacted>", ran = false;

    function tab(name) {
      root.querySelectorAll(".live-tabs [role=tab]").forEach(function (t) {
        var on = t.dataset.pane === name;
        t.setAttribute("aria-selected", on);
        t.tabIndex = on ? 0 : -1;
        t.classList.remove("ping");
      });
      root.querySelectorAll(".live-pane").forEach(function (p) { p.classList.toggle("on", p.dataset.pane === name); });
    }
    root.querySelector(".live-tabs").addEventListener("keydown", function (e) {
      var all = Array.prototype.slice.call(root.querySelectorAll(".live-tabs [role=tab]:not([hidden])")), d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      var i = all.indexOf(e.target);
      if (!d || i < 0) return;
      e.preventDefault();
      var next = all[(i + d + all.length) % all.length];
      next.focus();
      next.click();
    });
    root.querySelector(".live-tabs").addEventListener("click", function (e) {
      var t = e.target.closest("[role=tab]");
      if (t) { tab(t.dataset.pane); track("live:tab:" + t.dataset.pane); }
    });
    function ping(name) { var t = root.querySelector('.live-tabs [data-pane="' + name + '"]'); t.classList.remove("ping"); void t.offsetWidth; t.classList.add("ping"); }

    function line(html, cls) { var l = el(hist, "div", "live-l " + (cls || ""), html); hist.scrollTop = hist.scrollHeight; return l; }
    function result(l, r) {
      l.classList.remove("wait");
      l.classList.add(r.ok ? "ok" : "bad");
      l.querySelector(".m").textContent = r.ok ? "✓" : "✗";
      el(l, "div", "sub", r.ok ? secs(r.time) + (r.tag ? '  <span class="k-dim">[' + r.tag + "]</span>" : "") : '<span class="k-bad">' + esc(r.err) + "</span>");
      hist.scrollTop = hist.scrollHeight;
    }
    function say(text) { line('<span class="k-info">  • </span>' + text, "note"); }

    function moduleName() {
      var cart = rec.some(function (s) { return /search_bar|Add to cart/.test(s.text) || s.screen !== "login"; });
      var base = cart ? "Add_To_Cart" : "Sign_In", name = base, n = 2;
      while (saved.some(function (m) { return m.name === name; })) name = base + "_" + n++;
      return name;
    }

    function drawFiles() {
      var m = root.querySelector('.live-pane[data-pane="modules"]'), e = root.querySelector('.live-pane[data-pane="elements"]');
      var rows = [];
      saved.forEach(function (mod) {
        mod.steps.forEach(function (s) {
          var p = s.args.slice();
          if (s.secret) p[1] = "${password_field_value}";
          rows.push(csvRow([mod.name, s.kw[1]].concat(p), mod.fresh ? "new" : ""));
        });
        mod.fresh = false;
      });
      m.innerHTML = '<div class="k-dim">module_name,module_step,param_1,param_2</div>' + (rows.join("") || '<div class="k-dim live-empty">/save writes your steps here</div>');
      var er = ELEMENTS.map(function (r) { return '<div><span class="k-mod">' + esc(r[0]) + '</span><span class="k-dim">,</span><span class="k-lit">' + esc(r[1]) + "</span></div>"; });
      if (saved.some(function (mod) { return mod.steps.some(function (s) { return s.secret; }); })) er.push('<div class="secret"><span class="k-mod">password_field_value</span><span class="k-dim">,</span><span class="k-lit v">' + esc(secret) + "</span></div>");
      e.innerHTML = '<div class="k-dim">Element_Name,Element_ID</div>' + er.join("");
    }

    function nextMove() {
      if (busy) return null;
      if (A.screen === "login") {
        if (!A.el("email").querySelector(".v").textContent) return { t: A.el("email"), cmd: "enter_text ${email_field} ava@birch.shop" };
        if (!A.el("password").querySelector(".v").textContent) return { t: A.el("password"), cmd: 'enter_text ${password_field} "correct horse"' };
        return { t: A.el("signin"), cmd: 'press_element "Sign in"' };
      }
      if (A.screen === "home") {
        if (!A.el("search").querySelector(".q.typed")) return { t: A.el("search"), cmd: 'enter_text ${search_bar} "trail runner"' };
        return { t: A.el("card"), cmd: 'press_element "' + B.PRODUCTS[A.el("card").dataset.i].name + '"' };
      }
      if (rec.some(function (s) { return s.kw[0] === "assert_presence"; })) return null;
      if (A.toastOn) return { t: A.el("toast"), cmd: 'assert_presence "Added to cart"' };
      return { t: A.el("add"), cmd: 'press_element "Add to cart"' };
    }
    function hints() {
      root.querySelectorAll(".hint").forEach(function (h) { h.classList.remove("hint"); });
      keys.innerHTML = "";
      if (busy) return;
      var n = nextMove(), list = [];
      if (n) { n.t.classList.add("hint"); list.push(n.cmd); }
      if (rec.length > 1) list.push("/save Checkout " + moduleName());
      if (saved.length) list.push("optics execute");
      if (list.length < 3) list.push("/help");
      list.forEach(function (c, i) {
        var b = el(keys, "button", "live-key" + (c === "optics execute" ? " go" : "") + (!i && c[0] === "/" || /^\/save/.test(c) && !n ? " hint-key" : ""), paint(c));
        b.type = "button";
        b.dataset.cmd = c;
      });
    }
    keys.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cmd]");
      if (!b) return;
      track("live:key:" + b.dataset.cmd.split(" ")[0]);
      if (b.dataset.cmd === "optics execute") execute(); else send(b.dataset.cmd, true);
    });

    function typeIn(cmd, g) {
      input.value = "";
      var i = 0;
      function next() {
        input.value = cmd.slice(0, ++i);
        if (i >= cmd.length) return clock.wait(140, g);
        return clock.wait(B.reduced ? 0 : 1000 / 60, g).then(next);
      }
      return next();
    }

    function send(cmd, typed) {
      if (busy) return Promise.resolve();
      busy = true;
      input.readOnly = true;
      hints();
      var g = clock.begin();
      return (typed ? typeIn(cmd, g) : Promise.resolve()).then(function () {
        input.value = "";
        hint.textContent = "";
        if (cmd.trim()) { past.push(cmd); pastAt = past.length; }
        return run(cmd.trim(), g);
      }).catch(quiet).then(function () {
        busy = false;
        input.readOnly = false;
        hints();
      });
    }

    function run(cmd, g) {
      if (!cmd) return Promise.resolve();
      var p = parse(cmd);
      if (p.slash) return slash(p, g);
      if (p.unknown) {
        var l = line('<span class="m"></span> ' + paint(cmd), "wait");
        result(l, { ok: false, err: "Unknown keyword or module: '" + p.unknown + "'" });
        return Promise.resolve();
      }
      quitArmed = false;
      var l2 = line('<span class="m"></span> ' + paint(cmd), "wait");
      if (p.args.length < p.kw[2]) { result(l2, { ok: false, err: p.kw[0] + " needs " + p.kw[2] + " value" + (p.kw[2] > 1 ? "s" : "") }); return Promise.resolve(); }
      var screen = A.screen, secret = p.kw[0] === "enter_text" && p.args[0] === "${password_field}";
      var told = tell(l2, cmd, p.kw[0], p.args.slice(0, p.kw[2]), secret);
      return act(dev, clock, g, { kw: p.kw, args: p.args }, false).then(function (r) {
        result(l2, r);
        if (r.ok) rec.push({ kw: p.kw, args: p.args.slice(0, p.kw[2]), text: cmd, screen: screen, secret: secret });
        told(r);
      });
    }

    function tell(l, cmd, kw, args, secret) {
      var named = {};
      args.forEach(function (a) {
        var m = /^\$\{(\w+)\}$/.exec(a);
        if (m) named[m[1]] = ELEMENTS.filter(function (r) { return r[0] === m[1]; }).map(function (r) { return r[1]; });
      });
      if (Object.keys(named).some(function (n) { return !named[n].length; })) return function () {};
      var d = { line: l, cmd: cmd, kw: kw, args: args, named: named, secret: secret, module: moduleName(), app: A };
      document.dispatchEvent(new CustomEvent("optics:step", { detail: d }));
      return function (r) {
        d.result = r;
        d.module = moduleName();
        document.dispatchEvent(new CustomEvent("optics:step", { detail: d }));
      };
    }

    function slash(p, g) {
      line('<span class="m k-mod">›</span> ' + paint(p.slash + (p.args.length ? " " + p.args.join(" ") : "")), "cmd");
      if (p.slash !== "/quit") quitArmed = false;
      if (p.slash === "/help") {
        say("Keywords: launch_app, enter_text, press_element, assert_presence, go_back");
        say("Commands: /save &lt;test_case&gt; &lt;module&gt;, /elements, /help, /quit");
        say("Tap the phone and the step is typed here for you.");
      } else if (p.slash === "/elements") {
        Object.keys(NAMED).forEach(function (n) {
          var vals = ELEMENTS.filter(function (r) { return r[0] === n; }).map(function (r) { return r[1]; });
          say('<span class="k-var">' + n + "</span> " + esc(vals.join(" · ")));
        });
      } else if (p.slash === "/save") {
        if (p.args.length !== 2) say(p.args.length > 2 ? "Names in /save can't contain spaces. Use underscores." : "Usage: /save &lt;test_case&gt; &lt;module&gt;");
        else if (!rec.length) say("Nothing to save yet. Run a step first.");
        else {
          var mod = { name: p.args[1], tc: p.args[0], steps: rec, fresh: true };
          saved.push(mod);
          say("Saved " + rec.length + " step(s) → module '" + esc(mod.name) + "' in modules/modules.csv, test case '" + esc(mod.tc) + "' in test_cases/test_cases.csv");
          rec = [];
          document.dispatchEvent(new CustomEvent("optics:save", { detail: { module: mod.name, tc: mod.tc } }));
          drawFiles();
          ping("modules");
          if (mod.steps.some(function (s) { return s.secret; })) ping("elements");
        }
      } else if (p.slash === "/quit") {
        if (rec.length && !quitArmed) { quitArmed = true; say("You have " + rec.length + " unsaved step(s). /quit again to discard them."); }
        else return restart(g);
      } else say("Unknown command: " + esc(p.slash) + ". Type /help.");
      return Promise.resolve();
    }

    function restart(g) {
      quitArmed = false;
      rec = [];
      hist.innerHTML = "";
      var l = line('<span class="m"></span> ' + paint("launch_app"), "wait"), told = tell(l, "launch_app", "launch_app", [], false);
      return act(dev, clock, g, { kw: KEYWORDS[0], args: [] }).then(function (r) { result(l, r); told(r); rec.push({ kw: KEYWORDS[0], args: [], text: "launch_app", screen: "login" }); });
    }

    function execute() {
      if (busy || !saved.length) return;
      busy = true;
      input.readOnly = true;
      hints();
      track("live:execute");
      var g = clock.begin(), runTab = root.querySelector('.live-tabs [data-pane="run"]');
      var fix = secret === "<redacted>" && saved.some(function (m) { return m.steps.some(function (s) { return s.secret; }); });
      var flow = Promise.resolve();
      if (fix) flow = flow.then(function () {
        tab("elements");
        var v = root.querySelector(".secret .v");
        v.classList.add("edit");
        return clock.wait(700, g).then(function () {
          var word = "correct horse", i = 0;
          function next() { v.textContent = word.slice(0, ++i); return i < word.length ? clock.wait(45, g).then(next) : clock.wait(500, g); }
          v.textContent = "";
          return next();
        }).then(function () { secret = "correct horse"; v.classList.remove("edit"); });
      });
      return flow.then(function () {
        runTab.hidden = false;
        tab("run");
        runPane.innerHTML = "";
        var out = function (html, cls) { var n = el(runPane, "div", cls || "", html); runPane.scrollTop = runPane.scrollHeight; return n; };
        out('<span class="k-ok">~/birch</span> <span class="k-mod">❯</span> <span class="k-kw">optics execute birch-tests</span>');
        var bar = out('Running tests <span class="live-bar"><i></i></span> <span class="pc">0%</span>');
        var now = out('<span class="k-dim">▸ launch_app</span>', "now");
        var all = [], times = [];
        saved.forEach(function (m) { m.steps.forEach(function (s) { all.push({ m: m, s: s }); }); });
        dev.app.reset("login");
        var i = 0;
        function step() {
          if (i >= all.length) return Promise.resolve();
          var it = all[i];
          now.innerHTML = '<span class="k-dim">▸ ' + esc(it.s.kw[1]) + "</span> " + esc(it.s.args.join(" "));
          var s = { kw: it.s.kw, args: it.s.args, secretValue: it.s.secret ? secret : null };
          return act(dev, clock, g, s, true).then(function (r) {
            times.push(r);
            i++;
            var pc = Math.round(i / all.length * 100);
            bar.querySelector("i").style.width = pc + "%";
            bar.querySelector(".pc").textContent = pc + "%";
            if (!r.ok) throw r;
            return step();
          });
        }
        return step().then(function () { return times; }, function (r) { if (r === STOP) throw r; return times; }).then(function (t) {
          now.remove();
          report(out, all, t);
          ran = true;
        });
      }).catch(quiet).then(function () { busy = false; input.readOnly = false; hints(); });
    }

    function report(out, all, t) {
      var W = 40, fail = t.some(function (r) { return !r.ok; }) || t.length < all.length;
      function row(pre, name, time, ok) {
        var txt = pre + name;
        if (txt.length > W) txt = txt.slice(0, W - 3) + "...";
        while (txt.length < W) txt += " ";
        var p = esc(txt).replace(/^([│├└─\s]+)/, '<span class="k-dim">$1</span>');
        out(p + '<span class="k-dim">| ' + time + " |</span> " + (ok ? '<span class="k-ok">PASS</span>' : '<span class="k-bad">FAIL</span>'));
      }
      function label(s) {
        var v = s.args[0] || "", named = /^\$\{(\w+)\}$/.exec(v);
        if (named) { var r = ELEMENTS.filter(function (e) { return e[0] === named[1]; })[0]; if (r) v = r[1]; }
        return s.kw[1] + (v ? " (" + v + ")" : "");
      }
      var tcs = {};
      all.forEach(function (it, k) { var tc = tcs[it.m.tc] = tcs[it.m.tc] || { mods: [], time: 0, ok: true }; if (tc.mods.indexOf(it.m) < 0) tc.mods.push(it.m); var r = t[k]; tc.time += r ? r.time : 0; if (!r || !r.ok) tc.ok = false; });
      out('<b class="k-kw">Test Suite</b>');
      var names = Object.keys(tcs), k = 0;
      names.forEach(function (n, a) {
        var tc = tcs[n], lastTc = a === names.length - 1;
        row(lastTc ? "└── " : "├── ", n, secs(tc.time), tc.ok);
        tc.mods.forEach(function (m, b) {
          var lastM = b === tc.mods.length - 1, ind = lastTc ? "    " : "│   ";
          var mt = 0, mok = true;
          m.steps.forEach(function (s, c) { var r = t[k + c]; mt += r ? r.time : 0; if (!r || !r.ok) mok = false; });
          row(ind + (lastM ? "└── " : "├── "), m.name.replace(/_/g, " "), secs(mt), mok);
          m.steps.forEach(function (s, c) {
            var r = t[k + c];
            row(ind + (lastM ? "    " : "│   ") + (c === m.steps.length - 1 ? "└── " : "├── "), label(s), r ? secs(r.time) : "--", r && r.ok);
          });
          k += m.steps.length;
        });
      });
      var total = names.length, failed = names.filter(function (n) { return !tcs[n].ok; }).length;
      out("Total Test Cases: " + total + " | Passed: " + '<span class="k-ok">' + (total - failed) + "</span> | Failed: " + failed);
      out((fail ? '<span class="k-bad">FAIL</span>' : '<span class="k-ok">PASS</span>') + '<span class="k-dim"> · exit code ' + (fail ? 1 : 0) + "</span>", "stamp");
    }

    input.addEventListener("keydown", function (e) {
      if (e.key === "Tab" && hint.dataset.full) { e.preventDefault(); input.value = hint.dataset.full; complete(); }
      else if (e.key === "ArrowUp" && past.length) { e.preventDefault(); pastAt = Math.max(0, pastAt - 1); input.value = past[pastAt]; complete(); }
      else if (e.key === "ArrowDown" && past.length) { e.preventDefault(); pastAt = Math.min(past.length, pastAt + 1); input.value = past[pastAt] || ""; complete(); }
    });
    function complete() {
      var v = input.value, m = /(\S*)$/.exec(v)[1];
      hint.textContent = "";
      delete hint.dataset.full;
      if (!m) return;
      var hit = WORDS.filter(function (w) { return w.indexOf(m) === 0 && w !== m; })[0];
      if (hit) {
        hint.innerHTML = '<span class="pre">' + esc(v) + "</span>" + esc(hit.slice(m.length));
        hint.dataset.full = v + hit.slice(m.length) + (hit[0] === "/" || hit[0] === "$" ? "" : " ");
      }
    }
    input.addEventListener("input", complete);
    root.querySelector(".live-in").addEventListener("submit", function (e) {
      e.preventDefault();
      var v = input.value;
      if (!v.trim() || busy) return;
      tab("live");
      track("live:typed");
      if (v.trim() === "optics execute") { input.value = ""; execute(); return; }
      send(v, false);
    });

    var TAPS = {
      email: function () { return "enter_text ${email_field} ava@birch.shop"; },
      password: function () { return 'enter_text ${password_field} "correct horse"'; },
      search: function () { return 'enter_text ${search_bar} "trail runner"'; },
      back: function () { return "go_back"; },
      toast: function () { return 'assert_presence "Added to cart"'; },
    };
    A.root.addEventListener("click", function (e) {
      var t = e.target.closest("[data-el]") || e.target.closest("[data-t]");
      if (!t || busy) return;
      e.preventDefault();
      var name = t.dataset.el, cmd;
      if (TAPS[name]) cmd = TAPS[name]();
      else if (name) cmd = 'press_element "' + (name === "card" ? t.querySelector(".bz-nm").textContent : t.textContent.trim()) + '"';
      else cmd = 'assert_presence "' + t.textContent.trim() + '"';
      tab("live");
      track("live:tap:" + (name || "text"));
      send(cmd, true);
    });

    drawFiles();
    busy = true;
    restart(clock.begin()).catch(quiet).then(function () { busy = false; hints(); });
  }

  // ------------------------------------------------------------------ 2. break the build
  var CHANGES = [
    ["id", "Rename the button’s id"],
    ["word", "Reword it to “Log in”"],
    ["pic", "Draw it as a picture"],
    ["brand", "Paint it in the new brand colour"],
    ["de", "Translate the app into German"],
    ["expired", "Ship a sign-out bug"],
    ["gone", "Delete the sign-in button"],
  ];
  var TEMPLATE = '<span class="tpl">Sign in</span>';

  function breaker(root) {
    var rungs = root.querySelector(".rungs");
    var items = Array.prototype.slice.call(rungs.children);
    items.forEach(function (li) { el(li, "span", "rung-st", ""); });
    var devHost = el(root, "div", "brk-dev", '<div class="pg-stage"><div class="pg-world"></div></div>');
    root.insertBefore(devHost, rungs);
    var rel = el(root, "form", "brk-rel",
      '<fieldset class="brk-list"><legend>Change the app</legend>' + CHANGES.map(function (c) {
        return '<label class="play-switch"><input type="checkbox" name="' + c[0] + '"' + (c[0] === "id" ? " checked" : "") + ">" + c[1] + "</label>";
      }).join("") + "</fieldset>" +
      '<label class="play-switch brk-ai"><input type="checkbox" name="ai"><code>ai_self_heal: <span>false</span></code></label>' +
      '<div class="brk-go"><button class="btn btn-sun brk-ship" type="submit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z"/></svg><span>Ship v2.6</span></button>' +
      '<output class="brk-out" aria-live="polite"></output></div>' +
      '<button class="btn btn-ghost btn-sm brk-fix" type="button" hidden></button>' +
      '<p class="brk-score label" aria-live="polite"></p>');
    var csv = el(root, "figure", "code brk-csv", '<figcaption>test_data/elements.csv</figcaption><pre><code></code></pre>');
    var stage = devHost.querySelector(".pg-stage"), world = devHost.querySelector(".pg-world");
    var dev = B.device(world, "ios"), A = dev.app, X = dev.act;
    dev.el.querySelector(".bz").setAttribute("inert", "");
    B.fit(stage, world, 290, 580, function () { return innerWidth < 900 ? 440 : 560; });
    var clock = new B.Clock();
    clock.watch(root);
    var ver = 6, extra = [], stats = { shipped: 0, passed: 0, bugs: 0, falses: 0 }, busy = false;
    var out = rel.querySelector(".brk-out"), fixBtn = rel.querySelector(".brk-fix"), score = rel.querySelector(".brk-score");

    function opts() { var o = {}; rel.querySelectorAll("input").forEach(function (i) { o[i.name] = i.checked; }); return o; }
    function label(o) { return o.de ? "Anmelden" : o.word ? "Log in" : "Sign in"; }
    function paintApp() {
      var o = opts(), btn = A.el("signin");
      A.words(o.de ? "de" : "en");
      btn.querySelector("span").textContent = label(o);
      btn.classList.toggle("pic", o.pic);
      btn.classList.toggle("brand", o.brand);
      btn.classList.toggle("gone", o.gone);
      rel.querySelector(".brk-ai span").textContent = o.ai ? "true" : "false";
    }
    function drawCsv(fresh) {
      var rows = ['<span class="k-dim">Element_Name,Element_ID,Element_ID_text,Element_ID_image</span>',
        '<span class="k-mod">sign_in</span><span class="k-dim">,</span><span class="k-lit">//*[@resource-id=\'com.birch.shop:id/login\']</span><span class="k-dim">,</span><span class="k-lit">Sign in</span><span class="k-dim">,</span><span class="k-lit">sign_in.png</span>'];
      extra.forEach(function (v, i) { rows.push('<span class="' + (fresh && i === extra.length - 1 ? "new" : "") + '"><span class="k-mod">sign_in</span><span class="k-dim">,</span><span class="k-lit">' + esc(v) + "</span></span>"); });
      csv.querySelector("code").innerHTML = rows.join("\n");
    }
    function scoreText() {
      score.textContent = "Shipped " + stats.shipped + " · Passed " + stats.passed + " · Real bugs caught " + stats.bugs + " · False failures " + stats.falses;
    }
    function st(i, state, text) {
      items[i].dataset.st = state;
      items[i].querySelector(".rung-st").textContent = text || "";
    }
    function clearRungs() { items.forEach(function (li, i) { st(i, "", ""); }); }

    function ladder(o) {
      var lbl = o.gone ? null : label(o), texts = ["Sign in"].concat(extra), has = lbl && texts.some(function (t) { return t.toLowerCase() === lbl.toLowerCase(); });
      return [
        { name: "XPath", ok: !o.id && !o.pic && !o.gone, no: o.gone ? "no node with that id" : o.pic ? "a picture has no id" : "the id is now btn_primary", t: rnd(.28, .4) },
        { name: "Text", ok: !o.pic && has, no: o.gone ? "no “Sign in” in the UI tree" : o.pic ? "only pixels, no UI text" : "the UI tree says “" + lbl + "”", t: rnd(.45, .7) },
        { name: "OCR", ok: !!has, no: o.gone ? "no “Sign in” on screen" : "the screen says “" + lbl + "”", t: rnd(1.2, 1.7) },
        { name: "Image", ok: !o.gone && !o.brand && lbl === "Sign in", no: o.gone ? "no match for sign_in.png" : o.brand ? "new colour, no match" : "new label, no match", t: rnd(.8, 1.1) },
      ];
    }

    function ship() {
      if (busy) return;
      busy = true;
      root.classList.add("running");
      fixBtn.hidden = true;
      var g = clock.begin(), o = opts(), btn = A.el("signin"), plan = ladder(o), v = "v2." + ver;
      track("break:ship");
      stats.shipped++;
      clearRungs();
      X.clear();
      A.reset("login");
      paintApp();
      out.className = "brk-out";
      out.textContent = "Running " + v + "…";
      var found = null, i = 0;
      function tryRung() {
        if (i >= plan.length) return Promise.resolve();
        var r = plan[i], idx = i;
        st(idx, "try", "trying…");
        if (r.name === "OCR") X.scan();
        if (r.name === "Image") X.ghost(btn, TEMPLATE);
        X.lock(btn, r.name + ": " + (r.name === "XPath" ? "id=login" : r.name === "Image" ? "sign_in.png" : extra.length && label(o) !== "Sign in" && r.ok ? label(o) : "Sign in"), "find");
        return clock.wait(r.name === "OCR" ? 1100 : 750, g).then(function () {
          if (r.ok) { found = r; st(idx, "yes", "✓ found · " + secs(r.t)); X.lock(btn, r.name + " ✓", "yes"); return; }
          st(idx, "no", "✕ " + r.no);
          X.lock(btn, r.name + ": no match", "no");
          i++;
          return clock.wait(280, g).then(tryRung);
        });
      }
      return tryRung().then(function () {
        if (found) { st(4, "skip", "not needed"); return; }
        if (!o.ai) { st(4, "skip", "off · ai_self_heal: false"); return; }
        st(4, "try", "reading the screen…");
        X.scan();
        X.lock(btn, "AI: looking for sign-in", "find");
        return clock.wait(1500, g).then(function () {
          if (o.gone) { st(4, "no", "✕ nothing to press"); X.lock(btn, "AI: nothing found", "no"); return; }
          found = { name: "AI", healed: true };
          st(4, "yes", "✓ healed: pressed “" + label(o) + "”");
          X.lock(btn, "AI: “" + label(o) + "”", "yes");
        });
      }).then(function () {
        if (!found) return clock.wait(400, g).then(function () {
          X.unlock();
          if (o.gone) return finish("bug", "FAILED · E0201. The button is gone: a real bug, caught.");
          fixBtn.textContent = "Add “" + label(o) + "” to elements.csv";
          fixBtn.hidden = false;
          return finish("false", "FAILED · E0201. The app works, but no value matches.");
        });
        return clock.wait(450, g).then(function () {
          X.unlock();
          X.tap(btn);
          return clock.wait(250, g);
        }).then(function () {
          A.show("home");
          if (!o.expired) return clock.wait(500, g).then(function () {
            finish("pass", found.healed ? "PASSED · healed by AI. Read the log, then fix sign_in." : "PASSED · found by " + found.name + ".");
          });
          return clock.wait(900, g).then(function () {
            A.modal(true);
            return clock.wait(700, g);
          }).then(function () {
            X.scan();
            X.lock(A.root.querySelector(".bz-modal b"), "ERR_SESSION", "no");
            return clock.wait(1100, g);
          }).then(function () { X.unlock(); finish("bug", "FAILED · “Session expired” on the last screen: a real bug, caught."); });
        });
      }).catch(quiet).then(function () {
        busy = false;
        root.classList.remove("running");
      });
      function finish(kind, text) {
        if (kind === "pass") stats.passed++;
        if (kind === "bug") stats.bugs++;
        if (kind === "false") stats.falses++;
        out.className = "brk-out is-" + kind;
        out.textContent = text;
        scoreText();
        ver++;
        rel.querySelector(".brk-ship span").textContent = "Ship v2." + ver;
      }
    }

    rel.addEventListener("change", function (e) {
      if (busy) return;
      X.clear();
      clearRungs();
      A.reset("login");
      paintApp();
      fixBtn.hidden = true;
      out.textContent = "";
      track("break:" + e.target.name + ":" + (e.target.checked ? "on" : "off"));
    });
    rel.addEventListener("submit", function (e) { e.preventDefault(); ship(); });
    fixBtn.addEventListener("click", function () {
      var o = opts();
      extra.push(label(o));
      drawCsv(true);
      track("break:fix");
      ver--;
      stats.shipped--;
      stats.falses--;
      ship();
    });
    drawCsv();
    paintApp();
    scoreText();
  }

  // ------------------------------------------------------------------ 3. every screen
  var DEVICES = [
    { id: "android", name: "Android", driver: "appium · UiAutomator2", how: "Press Element taps the element.", sees: ["XPath", "Text", "Text", "Text"], pace: [.45, .8] },
    { id: "ios", name: "iOS", driver: "appium · XCUITest", how: "Press Element taps the element.", sees: ["XPath", "Text", "Text", "Text"], pace: [.5, .9] },
    { id: "web", name: "Web", driver: "playwright · chromium", how: "Press Element clicks the element.", sees: ["Text", "Text", "Text", "Text"], pace: [.08, .25] },
    { id: "tv", name: "TV", driver: "appium · TizenTV", how: "Press Element presses the arrow keys until the element has focus, then ENTER.", sees: ["Text", "Text", "Text", "Text"], pace: [1.2, 1.8], speed: 16 },
    { id: "ble", name: "Production", driver: "ble · camera_screenshot", how: "Press Element moves a Bluetooth mouse and clicks.", sees: ["OCR", "OCR", "Image", "OCR"], pace: [1.4, 2.4] },
  ];
  var SUITE = [
    ["Shop", "Launch App", "", ""],
    ["Shop", "Enter Text", "${search_bar}", "trail runner"],
    ["Shop", "Press Element", "Trail Runner 2", ""],
    ["Shop", "Press Element", "Add to cart", ""],
    ["Shop", "Assert Presence", "Added to cart", ""],
  ];

  function screens(root) {
    root.innerHTML =
      '<div class="scr-side"><figure class="code scr-csv"><figcaption>modules/modules.csv</figcaption><div class="scr-rows"></div></figure>' +
      '<dl class="scr-read"><div><dt class="label">Driver</dt><dd class="scr-driver"></dd></div><div><dt class="label">On this screen</dt><dd class="scr-how"></dd></div></dl></div>' +
      '<div class="scr-main"><div class="pg-stage scr-stage"><div class="pg-world"><span class="scr-ff label" hidden></span><div class="scr-remote" aria-hidden="true"></div></div></div>' +
      '<div class="rail" role="slider" tabindex="0" aria-label="Device" aria-valuemin="0" aria-valuemax="4"><div class="rail-track"><i class="rail-fill"></i></div><i class="rail-knob"></i>' +
      DEVICES.map(function (d, i) { return '<button type="button" class="rail-stop" data-i="' + i + '" tabindex="-1">' + d.name + "</button>"; }).join("") + "</div></div>";
    var stage = root.querySelector(".scr-stage"), world = stage.querySelector(".pg-world");
    var dev = B.device(world, "android"), A = dev.app, X = dev.act;
    dev.el.querySelector(".bz").setAttribute("inert", "");
    B.fit(stage, world, 840, 560);
    var rowsEl = root.querySelector(".scr-rows"), ff = world.querySelector(".scr-ff"), remote = world.querySelector(".scr-remote");
    var rail = root.querySelector(".rail"), knob = rail.querySelector(".rail-knob"), fill = rail.querySelector(".rail-fill");
    rowsEl.innerHTML = '<div class="k-dim">module_name,module_step,param_1,param_2</div>' + SUITE.map(function (r) {
      return '<div class="scr-row">' + csvRow(r.filter(function (c, i) { return i < 2 || c; })).replace(/^<div class="">|<\/div>$/g, "") + '<span class="scr-st"></span></div>';
    }).join("");
    var rows = Array.prototype.slice.call(rowsEl.querySelectorAll(".scr-row"));
    var clock = new B.Clock();
    clock.watch(root);
    var cur = 0;

    function pos(i, x) {
      var p = x != null ? x : i / (DEVICES.length - 1);
      knob.style.left = p * 100 + "%";
      fill.style.width = p * 100 + "%";
    }
    function choose(i, from) {
      i = Math.max(0, Math.min(DEVICES.length - 1, i));
      pos(i);
      rail.setAttribute("aria-valuenow", i);
      rail.setAttribute("aria-valuetext", DEVICES[i].name);
      rail.querySelectorAll(".rail-stop").forEach(function (b, k) { b.classList.toggle("on", k === i); });
      if (i === cur && from !== "init") return;
      cur = i;
      if (from !== "init") track("screens:" + DEVICES[i].id);
      var d = DEVICES[i];
      root.querySelector(".scr-driver").textContent = d.driver;
      root.querySelector(".scr-how").textContent = d.how;
      clock.stop();
      dev.el.classList.add("morph");
      X.clear();
      remote.textContent = "";
      setTimeout(function () { dev.set(d.id); }, 120);
      setTimeout(function () { dev.el.classList.remove("morph"); loop(); }, B.reduced ? 0 : 760);
    }

    function stamp(k, html) { rows[k].querySelector(".scr-st").innerHTML = html; }
    function press(key, g) {
      remote.textContent = key;
      remote.classList.remove("go");
      void remote.offsetWidth;
      remote.classList.add("go");
      return clock.wait(110, g);
    }
    function focusPath(from, to, g) {
      var a = X.box(from), b = X.box(to), n = 0, keys = [];
      var dy = Math.round((b.y - a.y) / Math.max(40, b.h)), dx = Math.round((b.x - a.x) / Math.max(60, b.w));
      for (var y = 0; y < Math.abs(dy); y++) keys.push(dy > 0 ? "↓" : "↑");
      for (var x = 0; x < Math.abs(dx); x++) keys.push(dx > 0 ? "→" : "←");
      if (!keys.length) keys.push("↓");
      function next() {
        if (n >= keys.length) return Promise.resolve(keys.length);
        var k = keys[n++];
        return press(k, g).then(function () {
          if (n === keys.length) X.focus(to);
          else {
            var t = n / keys.length;
            X.focus({ getBoundingClientRect: function () { var r1 = from.getBoundingClientRect(), r2 = to.getBoundingClientRect(); return { left: r1.left + (r2.left - r1.left) * t, top: r1.top + (r2.top - r1.top) * t, width: r1.width + (r2.width - r1.width) * t, height: r1.height + (r2.height - r1.height) * t }; } });
          }
          return clock.wait(70, g).then(next);
        });
      }
      return next();
    }
    function tvType(text, g) {
      A.keyboard(true);
      var at = A.key("a"), i = 0;
      X.focus(at);
      function next() {
        if (i >= text.length) { A.keyboard(false); X.focus(A.el("search")); return Promise.resolve(); }
        var ch = text[i], key = A.key(ch);
        return focusPath(at, key, g).then(function () { return press("ENTER", g); }).then(function () {
          A.write("search", text.slice(0, ++i));
          at = key;
          return clock.wait(40, g).then(next);
        });
      }
      return clock.wait(200, g).then(next);
    }

    function step(k, g) {
      var d = DEVICES[cur], r = SUITE[k], kw = r[1], tag = d.sees[Math.max(0, k - 1)];
      var t = rnd(d.pace[0], d.pace[1]);
      rows.forEach(function (row, n) { row.classList.toggle("hl", n === k); });
      stamp(k, '<span class="k-dim">…</span>');
      if (kw === "Launch App") {
        X.clear();
        A.reset("home");
        A.keyboard(false);
        if (d.id === "tv") X.focus(A.el("search"));
        return clock.wait(600, g).then(function () { return 1.21; });
      }
      var target = kw === "Enter Text" ? A.el("search") : A.byText(r[2]);
      if (kw === "Assert Presence") {
        X.scan();
        X.lock(target, tag + ": " + r[2], "yes");
        return clock.wait(900, g).then(function () { X.unlock(); return t * .6; });
      }
      if (d.id === "tv") {
        var from = A.root.querySelector(".bz-" + A.screen + " .bz-search, .bz-" + A.screen + " .bz-back") || target;
        if (kw === "Enter Text") return tvType(r[3], g).then(function () { A.filter(r[3]); return r[3].length * 3.2 * t; });
        return focusPath(kw === "Press Element" && A.screen === "home" ? A.el("search") : from, target, g).then(function (n) {
          return press("ENTER", g).then(function () {
            act2(target);
            return clock.wait(500, g).then(function () { return (n + 1) * t; });
          });
        });
      }
      if (d.id === "ble") X.scan();
      X.lock(target, tag + ": " + (kw === "Enter Text" ? "search_bar" : r[2]), "find");
      var reach = d.id === "web" || d.id === "ble" ? (X.point(target), clock.wait(d.id === "ble" ? 900 : 550, g)) : clock.wait(450, g);
      return reach.then(function () {
        if (d.id === "web" || d.id === "ble") X.click(); else X.tap(target);
        X.unlock();
        if (kw === "Enter Text") return A.type("search", r[3], clock, g, d.id === "web" ? 60 : 30).then(function () { A.filter(r[3]); return t + .1; });
        act2(target);
        return clock.wait(550, g).then(function () { return t; });
      });
    }
    function act2(t) {
      var n = t.dataset.el;
      if (n === "card") A.open(+t.dataset.i);
      else if (n === "add") A.toast(true);
    }

    function loop() {
      var g = clock.begin(), d = DEVICES[cur], k = 0;
      rows.forEach(function (row) { row.classList.remove("hl"); row.querySelector(".scr-st").innerHTML = ""; });
      ff.hidden = !d.speed;
      ff.textContent = d.speed ? "Fast-forward ×" + d.speed : "";
      function next() {
        if (k >= SUITE.length) return Promise.resolve();
        var n = k;
        return step(n, g).then(function (time) {
          var tag = n ? d.sees[n - 1] : "";
          stamp(n, '<span class="k-ok">✓</span> ' + secs(time) + (tag ? ' <span class="k-dim">[' + tag + "]</span>" : ""));
          k++;
          return clock.wait(250, g).then(next);
        });
      }
      next().then(function () {
        rows.forEach(function (row) { row.classList.remove("hl"); });
        if (B.reduced) return;
        return clock.wait(2600, g).then(loop);
      }).catch(quiet);
    }

    function fromX(x) {
      var r = rail.querySelector(".rail-track").getBoundingClientRect();
      return Math.max(0, Math.min(1, (x - r.left) / r.width));
    }
    var drag = false;
    rail.addEventListener("pointerdown", function (e) {
      drag = true;
      rail.setPointerCapture(e.pointerId);
      rail.classList.add("drag");
      var p = fromX(e.clientX);
      pos(0, p);
    });
    rail.addEventListener("pointermove", function (e) {
      if (!drag) return;
      var p = fromX(e.clientX);
      pos(0, p);
      var i = Math.round(p * (DEVICES.length - 1));
      if (i !== cur) choose(i);
      pos(0, p);
    });
    function end(e) {
      if (!drag) return;
      drag = false;
      rail.classList.remove("drag");
      choose(Math.round(fromX(e.clientX) * (DEVICES.length - 1)));
      pos(cur);
    }
    rail.addEventListener("pointerup", end);
    rail.addEventListener("pointercancel", end);
    rail.addEventListener("keydown", function (e) {
      var k = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
      if (e.key === "Home") k = -cur;
      if (e.key === "End") k = DEVICES.length - 1 - cur;
      if (k == null) return;
      e.preventDefault();
      choose(cur + k);
    });
    choose(0, "init");
  }

  var p1 = document.querySelector(".pg.live"), p2 = document.querySelector(".pg.brk"), p3 = document.querySelector(".pg.scr");
  if (p1) live(p1);
  if (p2) breaker(p2);
  if (p3) screens(p3);
})();
