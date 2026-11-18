// No flow too wild: each hard target plays as a small Birch scene beside the suite lines
// that drive it. Scenes mount when first seen, hold while off screen, and show one still
// frame when the visitor prefers reduced motion. A tile opens a larger copy in a dialog.
(function () {
  var B = window.BIRCH, grid = document.querySelector(".wild-grid");
  if (!B || !grid) return;
  var el = B.el, esc = B.esc, STOP = B.STOP;
  function quiet(e) { if (e !== STOP) throw e; }
  function track(name) { document.dispatchEvent(new CustomEvent("optics:play", { detail: name })); }
  var WORLD = { phone: [700, 600], ble: [700, 640], tv: [1000, 540], web: [820, 600] };
  var BT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10-5 4V3l5 4L7 17"/></svg>';
  var BAG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l-1 12H7z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>';
  var BELL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></svg>';

  // Run a list of steps in order. A step is a function that may return a promise.
  function seq(list) {
    var i = 0;
    function next() {
      if (i >= list.length) return Promise.resolve();
      var f = list[i++];
      return Promise.resolve(typeof f === "function" ? f() : f).then(next);
    }
    return next();
  }

  // Colour a suite line by its CSV cells. Values in a | list, and cells named in
  // data-pick, become tokens a scene can light up.
  function csvLine(text, pick) {
    return text.split(",").map(function (c, i) {
      var cls = /^\$\{/.test(c) ? "c-var" : i === 0 ? "c-mod" : i === 1 ? "wk" : "c-lit";
      var inner = c.indexOf("|") > -1
        ? c.split("|").map(function (v) { return '<span class="wv">' + esc(v) + "</span>"; }).join('<span class="c-dim">|</span>')
        : pick.indexOf(String(i)) > -1 ? '<span class="wv">' + esc(c) + "</span>" : esc(c);
      return '<span class="' + cls + '">' + inner + "</span>";
    }).join('<span class="c-dim">,</span><wbr>');
  }
  function paint(code) {
    Array.prototype.forEach.call(code.querySelectorAll(".wl"), function (line) {
      var text = line.textContent;
      line.innerHTML = line.dataset.end || line.classList.contains("wl-cmd")
        ? text.replace(/^([$├└─ ]+)(.*)$/, function (m, a, b) { return '<span class="c-dim">' + esc(a) + "</span>" + esc(b); })
        : csvLine(text, (line.dataset.pick || "").split(" "));
    });
  }
  function paintFile(fig) {
    var code = fig.querySelector("code");
    if (!code) return;
    var lines = code.textContent.split("\n"), csv = /\.csv$/.test(fig.querySelector("figcaption").textContent);
    code.innerHTML = lines.map(function (l, n) {
      if (csv) return n ? csvLine(l, []) : '<span class="c-dim">' + esc(l) + "</span>";
      return esc(l).replace(/^(\s*(?:- )?)(\S+?):( |$)/, '$1<span class="c-dim">$2:</span>$3');
    }).join("\n");
  }

  var fits = [];
  var ro = window.ResizeObserver ? new ResizeObserver(function () { fits.forEach(function (f) { f(); }); }) : null;
  function fit(stage, world, W, H) {
    world.style.width = W + "px";
    world.style.height = H + "px";
    function go() {
      var s = Math.min(stage.clientWidth / W, stage.clientHeight / H);
      world.style.transform = "translate(-50%, -50%) scale(" + s + ")";
      world.style.setProperty("--k", Math.min(2.4, 1 / s));
    }
    go();
    fits.push(go);
    if (ro) ro.observe(stage);
    return go;
  }

  function Scene(name, stage, code) {
    var S = SCENES[name];
    var world = el(stage, "div", "wild-world");
    var dev = B.device(world, S.dev);
    dev.app.root.setAttribute("inert", "");
    var size = WORLD[S.dev === "tv" || S.dev === "web" || S.dev === "ble" ? S.dev : "phone"];
    var go = fit(stage, world, size[0], size[1]);
    var lines = Array.prototype.slice.call(code.querySelectorAll(".wl"));
    var clock = new B.Clock();
    var c = { dev: dev, A: dev.app, X: dev.act, world: world, clock: clock, pass: 0, g: 0 };
    c.layer = el(dev.scr, "div", "wild-layer");
    c.cur = c.X.layer.querySelector(".act-cur");
    c.w = function (ms) { return function () { return clock.wait(ms, c.g); }; };
    c.st = function (i, st) { return function () { lines[i].dataset.st = st; if (st !== "run") lines[i].classList.remove("fill"); }; };
    c.run = function (i) { return c.st(i, "run"); };
    c.ok = function (i) { return c.st(i, "ok"); };
    c.pick = function (i, ks) {
      return function () {
        Array.prototype.forEach.call(lines[i].querySelectorAll(".wv"), function (v, k) { v.classList.toggle("on", ks.indexOf(k) > -1); });
      };
    };
    // A step that waits for its timeout fills its line, like a progress bar.
    c.fill = function (i, ms) {
      return function () {
        lines[i].style.setProperty("--t", ms + "ms");
        lines[i].classList.add("fill");
        return clock.wait(ms, c.g);
      };
    };
    // The BLE pointer starts each move from the corner of the screen.
    c.move = function (t) {
      c.cur.style.transition = "none";
      c.X.point(c.corner);
      void c.cur.offsetWidth;
      c.cur.style.transition = "";
      c.X.point(t);
    };
    c.corner = el(c.layer, "i", "wild-corner");
    S.setup(c);

    function clean() {
      lines.forEach(function (l) {
        l.dataset.st = "";
        l.classList.remove("fill");
        Array.prototype.forEach.call(l.querySelectorAll(".wv"), function (v) { v.classList.remove("on"); });
      });
      c.X.clear();
      c.X.unlock();
      S.reset(c);
    }
    function loop() {
      c.g = clock.begin();
      clean();
      S.play(c).then(function () { return clock.wait(2400, c.g); }).then(function () { c.pass++; loop(); }).catch(quiet);
    }
    return {
      start: function () {
        if (!B.reduced) return loop();
        clean();
        S.still(c);
        var st = S.stillSt || {};
        lines.forEach(function (l, i) { if (!l.dataset.st) l.dataset.st = i in st ? st[i] : "ok"; });
      },
      hold: function (h) {
        clock.hidden = h;
        if (h) return;
        var q = clock.held;
        clock.held = [];
        q.forEach(function (f) { f(); });
      },
      stop: function () {
        clock.stop();
        fits.splice(fits.indexOf(go), 1);
        if (ro) ro.unobserve(stage);
      },
    };
  }

  // ------------------------------------------------------------------ the scenes
  function scan(c) { return function () { c.X.scan(); }; }
  function lock(c, t, label, tone) { return function () { c.X.lock(typeof t === "function" ? t() : t, label, tone); }; }
  function unlock(c) { return function () { c.X.unlock(); }; }
  function tap(c, t) { return function () { c.X.tap(typeof t === "function" ? t() : t); }; }
  function cls(n, name, on) { return function () { n.classList.toggle(name, on); }; }
  function tag(c) { c.tag = el(c.world, "span", "wild-tag label"); }

  var SCENES = {
    ble: {
      dev: "ble",
      setup: function (c) {
        var apps = [["Clock", "#3E4F8C"], ["Photos", "#C8643B"], ["Mail", "#6FA4C8"], ["Notes", "#E4B23A"], ["Maps", "#5E9A72"], ["Music", "#B8456A"], ["Birch", ""], ["Files", "#8A7FB8"]];
        c.home = el(c.layer, "div", "wh-home", '<span class="wh-time">9:41</span><div class="wh-grid">' + apps.map(function (a) {
          return a[1] ? '<span class="wh-app"><i style="background:' + a[1] + '"></i>' + a[0] + "</span>" : '<span class="wh-app wh-birch"><i><b></b></i><em>Birch</em></span>';
        }).join("") + "</div>");
        c.icon = c.home.querySelector(".wh-birch");
        c.label = c.icon.querySelector("em");
        c.aoi = el(c.layer, "div", "wild-aoi", "<span>aoi_y=50 aoi_height=50</span>");
        c.aoi.style.cssText = "top:50%;height:50%";
        c.dongle = el(c.world, "div", "wb-dongle", '<div class="wb-stick"><i></i>' + BT + '</div><span class="wb-waves"><i></i><i></i><i></i></span><span class="label">BLE dongle</span>');
        c.shot = el(c.world, "div", "wb-shot", '<div></div><span class="label">Screenshot</span>');
      },
      reset: function (c) { c.A.reset("login"); c.home.classList.remove("out"); c.aoi.classList.remove("in"); c.X.park(); },
      play: function (c) {
        var A = c.A, X = c.X;
        function pulse() { c.dongle.classList.remove("go"); void c.dongle.offsetWidth; c.dongle.classList.add("go"); X.click(); }
        return seq([
          c.run(0), scan(c), c.w(800), lock(c, c.label, "OCR: Birch"), function () { c.move(c.icon.querySelector("i")); }, c.w(800), pulse, c.w(300),
          cls(c.home, "out", true), unlock(c), c.w(700), c.ok(0),
          c.run(1), scan(c), c.w(700), lock(c, A.el("password"), "OCR: Password"), function () { c.move(A.el("password")); }, c.w(800), pulse, unlock(c),
          cls(c.dongle, "tx", true), function () { return A.type("password", "trailrunner", c.clock, c.g, 14); }, cls(c.dongle, "tx", false), c.w(300), c.ok(1),
          c.run(2), cls(c.aoi, "in", true), c.w(600), scan(c), c.w(700), lock(c, A.el("signin"), "OCR: Sign in"), function () { c.move(A.el("signin")); }, c.w(800), pulse, c.w(250),
          unlock(c), cls(c.aoi, "in", false), function () { A.show("home"); X.park(); }, c.w(800), c.ok(2),
          c.run(3), scan(c), c.w(800), lock(c, function () { return A.card(0).querySelector(".bz-nm"); }, "OCR: Trail Runner 2", "yes"), c.w(1600), unlock(c), c.ok(3),
        ]);
      },
      stillSt: { 2: "run", 3: "" },
      still: function (c) {
        c.home.classList.add("out");
        c.A.write("password", "trailrunner");
        c.aoi.classList.add("in");
        c.X.lock(c.A.el("signin"), "OCR: Sign in");
        c.X.point(c.A.el("signin"));
      },
    },

    tv: {
      dev: "tv",
      setup: function (c) {
        c.remote = el(c.world, "div", "wt-remote", '<div class="wt-pad"><i data-k="UP"></i><i data-k="RIGHT"></i><i data-k="DOWN"></i><i data-k="LEFT"></i><b data-k="ENTER"></b></div><span class="wt-key label"></span>');
        c.key = c.remote.querySelector(".wt-key");
        c.dev.el.style.marginLeft = "-70px";
      },
      reset: function (c) {
        c.A.reset("home");
        c.A.keyboard(false);
        c.at = c.A.card(0);
        c.X.focus(c.at);
      },
      play: function (c) {
        var A = c.A, KEYS = B.KEYS;
        function press(k) {
          return function () {
            c.key.textContent = k;
            Array.prototype.forEach.call(c.remote.querySelectorAll("[data-k]"), function (n) { n.classList.toggle("on", n.dataset.k === k); });
            return c.clock.wait(170, c.g).then(function () {
              var on = c.remote.querySelector(".on");
              if (on) on.classList.remove("on");
              return c.clock.wait(60, c.g);
            });
          };
        }
        function hop(t, k) { return [press(k), function () { c.at = t; c.X.focus(t); }]; }
        function where(ch) { for (var r = 0; r < KEYS.length; r++) if (KEYS[r].indexOf(ch) > -1) return { r: r, c: KEYS[r].indexOf(ch) }; }
        function typeKeys(text) {
          var steps = [], p = { r: 0, c: 0 };
          text.split("").forEach(function (ch, n) {
            var q = where(ch);
            while (p.r !== q.r) { var down = p.r < q.r; p.r += down ? 1 : -1; steps = steps.concat(hop(A.key(KEYS[p.r][p.c]), down ? "DOWN" : "UP")); }
            while (p.c !== q.c) { var right = p.c < q.c; p.c += right ? 1 : -1; steps = steps.concat(hop(A.key(KEYS[p.r][p.c]), right ? "RIGHT" : "LEFT")); }
            steps.push(press("ENTER"), function () { A.write("search", text.slice(0, n + 1)); });
          });
          return steps;
        }
        var chip = A.root.querySelector('.bz-home [data-el="chip"]');
        return seq([
          c.run(0), c.w(500)].concat(hop(chip, "UP"), hop(A.el("search"), "UP"), [press("ENTER"),
          function () { A.keyboard(true); c.X.focus(A.key("a")); }, c.w(300)], typeKeys("trail"), [
          function () { A.filter("trail"); }, c.w(300), c.ok(0),
          c.run(1)], hop(A.key("e"), "UP"), [press("UP"), function () { A.keyboard(false); c.X.focus(A.el("search")); }], hop(chip, "DOWN"), hop(A.card(0), "DOWN"), [press("ENTER"),
          function () { c.X.focus(null); A.open(0); }, c.w(700), c.ok(1),
          c.run(2), lock(c, A.el("add"), "Text: Add to cart", "yes"), c.w(1600), unlock(c), c.ok(2),
        ]));
      },
      stillSt: { 1: "run", 2: "" },
      still: function (c) {
        c.A.write("search", "trail");
        c.A.filter("trail");
        c.X.focus(c.A.card(0));
        c.key.textContent = "DOWN";
      },
    },

    game: {
      dev: "android",
      setup: function (c) {
        c.game = el(c.layer, "div", "wg",
          '<div class="wg-sky"><i class="wg-sun"></i><i class="wg-hill"></i><i class="wg-hill b"></i></div><div class="wg-ground"></div>' +
          '<div class="wg-shoe">' + B.shoe("#C8643B") + '</div><i class="wg-rock"></i>' +
          '<b class="wg-t wg-score">SCORE 0</b><b class="wg-t wg-title">BIRCH<br>DASH</b><b class="wg-t wg-play">PLAY</b><b class="wg-t wg-over">GAME OVER</b>');
        c.score = c.game.querySelector(".wg-score");
      },
      reset: function (c) { c.game.className = "wg"; c.score.textContent = "SCORE 0"; },
      play: function (c) {
        var g = c.game, n = 0;
        function count() {
          if (n >= 18) return Promise.resolve();
          c.score.textContent = "SCORE " + (++n * 20);
          return c.clock.wait(140, c.g).then(count);
        }
        return seq([
          c.run(0), scan(c), cls(g, "ocr", true), c.w(1100), lock(c, g.querySelector(".wg-play"), "OCR: PLAY"), c.w(700), tap(c, g.querySelector(".wg-play")),
          unlock(c), cls(g, "ocr", false), cls(g, "on", true), c.w(200), c.ok(0),
          c.run(1), count, cls(g, "over", true), c.w(500), scan(c), cls(g, "ocr", true), c.w(900), lock(c, g.querySelector(".wg-over"), "OCR: GAME OVER", "yes"), c.w(1600),
          unlock(c), c.ok(1),
        ]);
      },
      still: function (c) {
        c.game.classList.add("on", "over", "ocr");
        c.score.textContent = "SCORE 360";
        c.X.lock(c.game.querySelector(".wg-over"), "OCR: GAME OVER", "yes");
      },
    },

    icon: {
      dev: "ios",
      setup: function (c) {
        c.cart = el(c.A.root.querySelector(".bz-home"), "span", "wi-cart", BAG + "<i>1</i>");
        c.sheet = el(c.A.root, "div", "wi-sheet", '<i class="wi-grab"></i><b class="wi-h">Your cart</b><div class="wi-row"><span class="wi-img">' + B.shoe("#2F6B4F") + '</span><span>Trail Runner 2<small>Size 9</small></span><em>$128</em></div><span class="wi-pay">Checkout</span>');
        c.tpl = el(c.world, "figure", "wi-tpl", '<div>' + BAG + '</div><figcaption class="label">cart_icon.png</figcaption>');
      },
      reset: function (c) { c.A.reset("home"); c.sheet.classList.remove("in"); },
      play: function (c) {
        return seq([
          c.run(0), cls(c.tpl, "go", true), c.w(500), function () { c.X.ghost(c.cart, '<div class="wi-ghost">' + BAG + "</div>"); }, c.w(950),
          cls(c.tpl, "go", false), lock(c, c.cart, "Image: cart_icon.png"), c.w(800), tap(c, c.cart), c.w(200), cls(c.sheet, "in", true), unlock(c), c.w(600), c.ok(0),
          c.run(1), lock(c, c.sheet.querySelector(".wi-h"), "Text: Your cart", "yes"), c.w(1600), unlock(c), c.ok(1),
        ]);
      },
      stillSt: { 1: "" },
      still: function (c) { c.X.lock(c.cart, "Image: cart_icon.png"); c.tpl.classList.add("go"); },
    },

    popup: {
      dev: "android",
      setup: function (c) {
        tag(c);
        c.splash = el(c.layer, "div", "wild-splash", '<div class="bz-logo"><i></i>birch</div>');
        c.pop = el(c.A.root, "div", "wp-pop", '<div><span class="wp-bell">' + BELL + '</span><b>Turn on notifications?</b><span class="wp-btns"><span>Allow</span><span class="wp-no">Not now</span></span></div>');
        c.no = c.pop.querySelector(".wp-no");
      },
      reset: function (c) {
        c.first = c.pass % 2 === 0;
        c.tag.textContent = c.first ? "First launch" : "Next launch";
        c.A.reset("login");
        c.pop.classList.remove("in");
        c.splash.classList.add("in");
      },
      play: function (c) {
        var A = c.A;
        var wait = c.first
          ? [c.w(600), lock(c, c.no, "Text: Not now"), c.w(800), tap(c, c.no), c.w(150), cls(c.pop, "in", false), unlock(c), c.w(500)]
          : [c.fill(1, 2600)];
        return seq([
          c.run(0), c.w(700), cls(c.splash, "in", false), c.w(500), c.first ? cls(c.pop, "in", true) : null, c.w(300), c.ok(0),
          c.run(1)].concat(wait, [c.ok(1),
          c.run(2), lock(c, A.root.querySelector(".bz-login .bz-h"), "Text: Welcome back", "yes"), c.w(1500), unlock(c), c.ok(2),
        ]));
      },
      stillSt: { 1: "run", 2: "" },
      still: function (c) {
        c.tag.textContent = "First launch";
        c.splash.classList.remove("in");
        c.pop.classList.add("in");
        c.X.lock(c.no, "Text: Not now");
      },
    },

    branch: {
      dev: "web",
      setup: function (c) { tag(c); },
      reset: function (c) {
        c.back = c.pass % 2 === 0;
        c.tag.textContent = c.back ? "Returning user" : "New user";
        c.A.reset(c.back ? "home" : "login");
        c.X.park();
      },
      play: function (c) {
        var A = c.A, X = c.X;
        function click(t) { return [function () { X.point(t); }, c.w(650), function () { X.click(); }, c.w(200)]; }
        var check = c.back
          ? [c.w(500), lock(c, A.el("search"), "Text: Search Birch", "yes"), c.w(1000), unlock(c), c.ok(1)]
          : [c.fill(1, 1900), c.st(1, "no")];
        var branch = c.back
          ? click(A.el("search")).concat([function () { return A.type("search", "ridge", c.clock, c.g, 18); }, function () { A.filter("ridge"); }, c.w(900)])
          : click(A.el("email")).concat([function () { return A.type("email", "ava@birch.shop", c.clock, c.g, 30); }], click(A.el("password")),
            [function () { return A.type("password", "trailrunner", c.clock, c.g, 30); }], click(A.el("signin")), [function () { A.show("home"); X.park(); }, c.w(900)]);
        return seq([c.run(0), c.w(400), c.run(1)].concat(check, [c.w(300), c.pick(0, [c.back ? 0 : 1]), c.w(700)], branch, [c.ok(0)]));
      },
      stillSt: { 1: "ok" },
      still: function (c) {
        c.tag.textContent = "Returning user";
        c.A.show("home");
        c.X.lock(c.A.el("search"), "Text: Search Birch", "yes");
        c.pick(0, [0])();
      },
    },

    loop: {
      dev: "android",
      setup: function () {},
      reset: function (c) { c.A.reset("home"); },
      play: function (c) {
        var A = c.A, X = c.X, TERMS = ["trail", "pace", "ridge"];
        function pass(k) {
          var search = A.el("search");
          return function () {
            return seq([
              c.pick(0, [k, k + 3]), c.st(1, ""), c.st(2, ""), c.st(3, ""), c.w(300),
              c.run(1), lock(c, search, "XPath: search_bar"), c.w(600), function () { A.write("search", ""); A.filter(""); }, c.w(300), unlock(c), c.ok(1),
              c.run(2), lock(c, search, "XPath: search_bar"), c.w(500), tap(c, search), unlock(c), function () { return A.type("search", TERMS[k], c.clock, c.g, 14); },
              function () { A.filter(TERMS[k]); }, c.w(400), c.ok(2),
              c.run(3), lock(c, function () { return A.card(k).querySelector(".bz-nm"); }, "Text: " + B.PRODUCTS[k].name, "yes"), c.w(1100), unlock(c), c.ok(3), c.w(400),
            ]);
          };
        }
        return seq([c.run(0), pass(0), pass(1), pass(2), c.pick(0, []), c.ok(0)]);
      },
      stillSt: { 0: "run" },
      still: function (c) {
        c.A.write("search", "pace");
        c.A.filter("pace");
        c.X.lock(c.A.card(1).querySelector(".bz-nm"), "Text: Pace Knit", "yes");
        c.pick(0, [1, 4])();
      },
    },

    crash: {
      dev: "android",
      setup: function (c) {
        c.dlg = el(c.layer, "div", "wc-dlg", '<div><b>Birch has stopped</b><span>App info</span><span>Close app</span></div>');
      },
      reset: function (c) { c.A.reset("home"); c.dlg.classList.remove("in"); },
      play: function (c) {
        var A = c.A;
        return seq([
          c.run(1), c.w(500), c.run(2), tap(c, A.card(0)), c.w(250), function () { A.open(0); }, c.w(900),
          tap(c, A.el("add")), c.w(200), function () { A.toast(true); }, c.w(1100), c.ok(2),
          function () { A.toast(false); }, c.w(300), cls(c.dlg, "in", true), c.w(1000),
          c.run(3), c.run(0), scan(c), c.w(900), lock(c, c.dlg.querySelector("b"), "ERR_CRASH", "no"), c.w(700), c.st(0, "bad"), c.st(3, "bad"), c.st(1, ""), c.w(1600), unlock(c),
        ]);
      },
      stillSt: { 0: "bad", 1: "", 3: "bad" },
      still: function (c) {
        c.A.open(0);
        c.dlg.classList.add("in");
        c.X.lock(c.dlg.querySelector("b"), "ERR_CRASH", "no");
      },
    },

    aoi: {
      dev: "ios",
      setup: function (c) {
        c.ban = el(c.A.root.querySelector(".bz-pimg").parentNode, "div", "wa-ban", "<b>Add to cart</b><span>Get free socks</span>");
        c.aoi = el(c.layer, "div", "wild-aoi", "<span>aoi_y=75 aoi_height=25</span>");
        c.aoi.style.cssText = "top:75%;height:25%";
      },
      reset: function (c) { c.A.reset("home"); c.A.open(0); c.aoi.classList.remove("in"); },
      play: function (c) {
        var A = c.A;
        return seq([
          c.run(0), cls(c.aoi, "in", true), c.w(800), lock(c, c.ban.querySelector("b"), "Outside the area", "no"), c.w(1000),
          lock(c, A.el("add"), "Text: Add to cart"), c.w(800), tap(c, A.el("add")), c.w(200), function () { A.toast(true); }, unlock(c), cls(c.aoi, "in", false), c.w(500), c.ok(0),
          c.run(1), lock(c, A.root.querySelector(".bz-toast [data-t]"), "Text: Added to cart", "yes"), c.w(1500), unlock(c), c.ok(1),
        ]);
      },
      stillSt: { 0: "run", 1: "" },
      still: function (c) {
        c.aoi.classList.add("in");
        c.X.lock(c.A.el("add"), "Text: Add to cart");
      },
    },
  };

  // ------------------------------------------------------------------ tiles and dialog
  var tiles = Array.prototype.slice.call(grid.querySelectorAll(".wild-t"));
  var dlg = document.querySelector(".wild-dlg");
  var modal = false;
  tiles.forEach(function (t) { paint(t.querySelector(".wild-code")); });

  function sync(t) { if (t.scene) t.scene.hold(modal || !t.vis); t.classList.toggle("vis", t.vis && !modal); }
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var t = e.target;
      t.vis = e.isIntersecting;
      if (t.vis && !t.scene) {
        t.scene = Scene(t.dataset.scene, t.querySelector(".wild-stage"), t.querySelector(".wild-code"));
        t.scene.start();
      }
      sync(t);
    });
  }, { rootMargin: "120px 0px" }) : null;
  tiles.forEach(function (t) {
    if (io) return io.observe(t);
    t.vis = true;
    t.scene = Scene(t.dataset.scene, t.querySelector(".wild-stage"), t.querySelector(".wild-code"));
    t.scene.start();
  });

  var big = null;
  function open(t) {
    var a = t.querySelector(".wild-a");
    dlg.innerHTML =
      '<button class="wd-x" type="button" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<div class="wd-show"><div class="wild-stage" aria-hidden="true"></div></div>' +
      '<div class="wd-read"><p class="label wild-how">' + esc(t.querySelector(".wild-how").textContent) + '</p><h3 class="wd-h" id="wild-dlg-h">' + esc(a.textContent) + "</h3></div>";
    var show = dlg.querySelector(".wd-show"), read = dlg.querySelector(".wd-read");
    var code = t.querySelector(".wild-code").cloneNode(true);
    show.appendChild(code);
    read.appendChild(t.querySelector("template").content.cloneNode(true));
    Array.prototype.forEach.call(read.querySelectorAll("figure.code"), paintFile);
    el(read, "a", "btn btn-ghost wd-go", "Read the guide").href = a.getAttribute("href");
    modal = true;
    tiles.forEach(sync);
    dlg.showModal();
    big = Scene(t.dataset.scene, show.querySelector(".wild-stage"), code);
    big.start();
    dlg.querySelector(".wd-x").addEventListener("click", function () { dlg.close(); });
    track("wild:" + t.dataset.scene);
  }
  dlg.addEventListener("close", function () {
    if (big) big.stop();
    big = null;
    dlg.innerHTML = "";
    modal = false;
    tiles.forEach(sync);
  });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  grid.addEventListener("click", function (e) {
    var a = e.target.closest(".wild-a");
    if (!a || !dlg.showModal || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    open(a.closest(".wild-t"));
  });
  tiles.forEach(function (t) { t.querySelector(".wild-a").setAttribute("aria-haspopup", "dialog"); });
})();
