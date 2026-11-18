// /playground: the real optics-framework wheel on Pyodide, loaded on request, driving Birch in the page.
(function () {
  var B = window.BIRCH, lab = document.querySelector(".eng-lab");
  if (!B || !lab) return;
  var M = JSON.parse(document.getElementById("engine-manifest").textContent);
  var esc = B.esc, el = B.el;
  function $(s, r) { return (r || lab).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || lab).querySelectorAll(s)); }
  function mb(bytes) { return (bytes / 1e6).toFixed(1) + " MB"; }
  function track(name) { document.dispatchEvent(new CustomEvent("optics:play", { detail: name })); }

  var CONFIG = "driver_sources:\n  - birch:\n      enabled: true\nelements_sources:\n  - birch_page_source:\n      enabled: true\nexecution_output_path: ./output\n";
  var SUITE = [
    "Test Cases:",
    "  - Shopper can add trail runners:",
    "      - Sign In",
    "      - Add To Cart",
    "",
    "Modules:",
    "  - Sign In:",
    "      - Launch App",
    "      - Enter Text ${email_field} ava@birch.shop",
    "      - Enter Text ${password_field} ${password}",
    "      - Press Element ${sign_in}",
    '      - Assert Presence "Trail Runner 2"',
    "  - Add To Cart:",
    '      - Press Element "Trail Runner 2"',
    '      - Press Element "Add to cart"',
    '      - Assert Presence "Added to cart" timeout_str=5',
    "",
    "Elements:",
    "  email_field: \"//*[@resource-id='com.birch.shop:id/email']\"",
    "  password_field: \"//*[@resource-id='com.birch.shop:id/password']\"",
    "  sign_in:",
    "    - \"//*[@resource-id='com.birch.shop:id/login']\"",
    "    - Sign in",
    "  password: correct-horse",
    "",
  ].join("\n");
  var STALE = ["id/login']\"\n    - Sign in", "id/sign_in']\"\n    - Sign in"];
  var TRIES = {
    "as-written": { mode: "execute", edits: [] },
    typo: { mode: "dry_run", edits: [['- Press Element "Add to cart"', '- Pres Element "Add to cart"']] },
    moved: { mode: "execute", edits: [STALE] },
    "no-fallback": { mode: "execute", edits: [[STALE[0], "id/sign_in']\""]] },
    never: { mode: "execute", edits: [['"Added to cart" timeout_str=5', '"Sold out" timeout_str=3']] },
  };

  // ---------------------------------------------------------------- the editor
  var edit = $(".eng-edit"), paintEl = $(".eng-paint");
  function paintLine(line) {
    var s = esc(line);
    if (/^\s*#/.test(line)) return '<span class="k-dim">' + s + "</span>";
    if (/^(Test Cases|Modules|Elements):/.test(line)) return '<span class="k-mod">' + s + "</span>";
    var head = /^(\s*-\s+)([^"$:]+)(:\s*)$/.exec(s);
    if (head) return head[1] + '<span class="k-ok">' + head[2] + "</span>" + head[3];
    var key = /^(\s+)([\w-]+)(:)(.*)$/.exec(s);
    if (key) return key[1] + '<span class="k-var">' + key[2] + "</span>" + key[3] + values(key[4]);
    var step = /^(\s*-\s+)(.*)$/.exec(s);
    if (step) {
      var kw = /^([A-Z][a-z]+(?: [A-Z][a-z]+)*)(.*)$/.exec(step[2]);
      return step[1] + (kw ? '<span class="k-kw">' + kw[1] + "</span>" + values(kw[2]) : values(step[2]));
    }
    return s;
  }
  function values(s) {
    return s.replace(/(\$\{\w+\})|(&quot;[^&]*?&quot;)|(\b\w+=)/g, function (m, v, q, n) {
      return '<span class="' + (v ? "k-var" : q ? "k-lit" : "k-dim") + '">' + m + "</span>";
    });
  }
  function repaint() {
    paintEl.innerHTML = edit.value.split("\n").map(paintLine).join("\n") + "\n";
    paintEl.scrollTop = edit.scrollTop;
    paintEl.scrollLeft = edit.scrollLeft;
  }
  edit.value = SUITE;
  edit.addEventListener("input", function () { repaint(); pressTry(null); });
  edit.addEventListener("scroll", function () { paintEl.scrollTop = edit.scrollTop; paintEl.scrollLeft = edit.scrollLeft; });
  repaint();
  $(".eng-config").innerHTML = CONFIG.split("\n").map(paintLine).join("\n");

  function pressTry(name) { $$(".eng-try button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.try === name)); }); }
  $(".eng-try").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b || running) return;
    var t = TRIES[b.dataset.try];
    edit.value = t.edits.reduce(function (s, r) { return s.replace(r[0], r[1]); }, SUITE);
    repaint();
    pressTry(b.dataset.try);
    if (page) run(t.mode);
  });

  $$(".eng-tabs").forEach(function (list) {
    var tabs = $$('[role="tab"]', list);
    function pick(tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
    }
    list.addEventListener("click", function (e) { var t = e.target.closest('[role="tab"]'); if (t) pick(t); });
    list.addEventListener("keydown", function (e) {
      var i = tabs.indexOf(document.activeElement), d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (i < 0 || !d) return;
      var next = tabs[(i + d + tabs.length) % tabs.length];
      pick(next);
      next.focus();
      e.preventDefault();
    });
  });

  // ---------------------------------------------------------------- the device
  var stage = $(".eng-dev .pg-stage"), world = $(".eng-dev .pg-world");
  var dev = B.device(world, "android"), A = dev.app, X = dev.act, clock = new B.Clock(), gen = 0;
  A.root.inert = true;
  B.fit(stage, world, 290, 580, function () { return innerWidth < 900 ? 470 : 580; });
  clock.watch(lab);
  function wait(ms) { return clock.wait(ms, gen); }

  var RID = { email: "email", password: "password", signin: "login", forgot: "forgot_password", search: "search", chip: "category", card: "product", back: "back", size: "size", add: "add_to_cart", toast: "toast" };
  var GROUPS = { "bz-top": "toolbar", "bz-chips": "categories", "bz-grid": "products", "bz-sizes": "sizes", "bz-pinfo": "details" };
  var FIELDS = { email: "email", password: "password", search: "search" };
  var HINT = { email: "Email", password: "Password", search: "Search Birch" };
  var ids = new WeakMap(), byId = {}, boxes = {}, nextId = 0, lastSource = "";

  function idOf(n) {
    if (!ids.has(n)) ids.set(n, "n" + nextId++);
    var id = ids.get(n);
    byId[id] = n;
    return id;
  }
  function attr(name, value) { return value == null ? "" : " " + name + '="' + esc(value) + '"'; }
  function fieldText(n) {
    var name = n.dataset.el, v = (n.querySelector(name === "search" ? ".q.typed" : ".v") || {}).textContent || "";
    return v || HINT[name];
  }
  function ownText(n) {
    return Array.prototype.some.call(n.childNodes, function (c) { return c.nodeType === 3 && c.textContent.trim(); });
  }
  function role(n) {
    var name = n.dataset.el, cls = Array.prototype.find.call(n.classList, function (c) { return c in GROUPS; });
    if (name in FIELDS) return { tag: "android.widget.EditText", text: fieldText(n), click: true, leaf: true };
    if (name === "back") return { tag: "android.widget.ImageButton", desc: n.getAttribute("aria-label"), click: true, leaf: true };
    if (name === "toast") return { tag: "android.widget.TextView", text: n.textContent.trim(), leaf: true };
    if (name === "card") return { tag: "android.view.ViewGroup", click: true };
    if (name || n.tagName === "BUTTON") return { tag: "android.widget.Button", text: n.textContent.trim(), click: true, leaf: true, on: n.classList.contains("on") };
    if (cls) return { tag: "android.view.ViewGroup", rid: GROUPS[cls] };
    if (ownText(n)) return { tag: "android.widget.TextView", text: n.textContent.trim(), leaf: true };
    return null;
  }
  function xml(n, depth) {
    if (n.nodeType !== 1 || n.getAttribute("aria-hidden") === "true" || n.tagName.toLowerCase() === "svg" || !B.visible(n)) return "";
    var r = role(n);
    if (!r) return Array.prototype.map.call(n.children, function (c) { return xml(c, depth); }).join("");
    var id = idOf(n), b = X.box(n), pad = "  ".repeat(depth);
    var rid = r.rid || RID[n.dataset.el];
    boxes[id] = { x: b.x, y: b.y, w: b.w, h: b.h, click: !!r.click };
    var open = pad + "<" + r.tag + attr("node-id", id) + attr("class", r.tag) + attr("text", r.text || "") + attr("resource-id", rid ? "com.birch.shop:id/" + rid : "") +
      attr("content-desc", r.desc || "") + attr("clickable", String(!!r.click)) + attr("enabled", "true") + attr("selected", String(!!r.on)) +
      attr("bounds", "[" + Math.round(b.x) + "," + Math.round(b.y) + "][" + Math.round(b.x + b.w) + "," + Math.round(b.y + b.h) + "]");
    var kids = r.leaf ? "" : Array.prototype.map.call(n.children, function (c) { return xml(c, depth + 1); }).join("");
    return kids ? open + ">\n" + kids + pad + "</" + r.tag + ">\n" : open + "/>\n";
  }
  function source() {
    settle();
    byId = {};
    boxes = {};
    var W = dev.scr.offsetWidth, H = dev.scr.offsetHeight;
    var parts = [$(".bz-" + A.screen, A.root)];
    if (A.toastOn) parts.push($(".bz-toast", A.root));
    var body = parts.map(function (n) { return xml(n, 3); }).join("");
    lastSource = '<?xml version="1.0" encoding="UTF-8"?>\n<hierarchy rotation="0">\n  <android.widget.FrameLayout' + attr("package", "com.birch.shop") + attr("bounds", "[0,0][" + W + "," + H + "]") + ">\n" +
      '    <android.view.ViewGroup resource-id="com.birch.shop:id/' + A.screen + '_screen"' + attr("bounds", "[0,0][" + W + "," + H + "]") + ">\n" + body +
      "    </android.view.ViewGroup>\n  </android.widget.FrameLayout>\n</hierarchy>\n";
    return lastSource;
  }

  // What the driver asks for happens on the phone in order, at a pace a person can follow.
  // source() applies anything still queued first, so Optics always reads the screen it left.
  var queue = [];
  function effect(show, apply) { queue.push({ show: show, apply: apply || function () {} }); }
  function settle() { var q = queue; queue = []; q.forEach(function (e) { e.apply(); }); }
  function play() {
    if (!queue.length) return Promise.resolve();
    var e = queue.shift();
    return e.show().then(function () { e.apply(); return play(); });
  }
  function short(s) { return s.length > 34 ? s.slice(0, 33) + "…" : s; }

  window.opticsBirch = {
    version: "1.0.0",
    get width() { return dev.scr.offsetWidth; },
    get height() { return dev.scr.offsetHeight; },
    source: source,
    launch: function () { effect(function () { return wait(120); }, function () { X.clear(); A.reset("login"); }); },
    found: function (id, element, kind) {
      var t = byId[id];
      effect(function () { X.lock(t, kind + " · " + short(element), "find"); return wait(420); });
    },
    missed: function (element, kind) {
      effect(function () { X.scan(); X.unlock(); note("miss", kind + " · " + short(element)); return wait(520); });
    },
    tap: function (id) {
      // A press on a label lands on the control that holds it, as a touch does.
      var t = byId[id], target = t.closest("[data-el]") || t;
      effect(function () { X.lock(t, "Press", "yes"); X.tap(t); return wait(260); }, function () { X.unlock(); A.press(target); });
    },
    tapAt: function (x, y) {
      var hit = Object.keys(boxes).filter(function (id) {
        var b = boxes[id];
        return b.click && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
      }).sort(function (a, b) { return boxes[a].w * boxes[a].h - boxes[b].w * boxes[b].h; })[0];
      if (hit) window.opticsBirch.tap(hit);
    },
    type: function (id, text) {
      var t = id ? byId[id] : $(".bz-" + A.screen + " .focus", A.root), field = t && FIELDS[t.dataset.el];
      if (!field) return;
      function apply() { A.write(field, text); if (field === "search") A.filter(text); }
      effect(function () {
        X.unlock();
        t.classList.add("focus");
        return A.type(field, text, clock, gen, 34).then(function () { if (field === "search") A.filter(text); });
      }, apply);
    },
    text: function (id) {
      var t = byId[id];
      return !t ? "" : FIELDS[t.dataset.el] ? fieldText(t) : t.textContent.trim();
    },
    selected: function (id) { return !!byId[id] && byId[id].classList.contains("on"); },
    back: function () { effect(function () { return wait(200); }, function () { if (A.screen === "product") A.show("home"); }); },
    close: function () { effect(function () { return wait(120); }, function () { X.clear(); A.reset("login"); }); },
  };

  // ---------------------------------------------------------------- the run
  var log = $(".eng-log"), xmlPanes = $$(".eng-xml"), runBtns = $$(".eng-btn"), page = null, running = false;
  var steps = {}, rows = {}, cases = [];

  function note(kind, text) {
    var active = log.querySelector(".e-kw.run .e-notes");
    if (active) el(active, "div", "e-note " + kind, esc(text));
  }

  // The tree that `optics execute` prints, built from the events Optics publishes.
  function onEvent(e) {
    if (e.entity_type === "test_case") {
      var tc = rows[e.entity_id];
      if (!tc) {
        tc = rows[e.entity_id] = { modules: [], node: el(log, "div", "e-tc") };
        tc.head = el(tc.node, "div", "e-row");
      }
      tc.status = e.status;
      tc.head.innerHTML = glyph(e.status) + "<b>" + esc(e.name) + "</b>";
      if (e.status !== "RUNNING" && cases.indexOf(tc) < 0) cases.push(tc);
    } else if (e.entity_type === "module") {
      var m = rows[e.entity_id];
      if (!m) {
        var parent = rows[e.parent_id];
        m = rows[e.entity_id] = { node: el(parent ? parent.node : log, "div", "e-mod"), name: e.name };
        if (parent) parent.modules.push(m);
        m.head = el(m.node, "div", "e-row");
      }
      m.head.innerHTML = glyph(e.status) + '<span class="k-mod">' + esc(e.name) + "</span>";
    } else if (e.entity_type === "keyword") {
      keywordRow(e.entity_id, e.parent_id, e.name);
      var k = rows[e.entity_id];
      k.node.className = "e-kw " + (e.status === "RUNNING" ? "run" : e.status.toLowerCase());
      k.head.innerHTML = glyph(e.status) + label(e.entity_id, e.name) + time(e.elapsed);
      (e.logs || []).filter(function (l) { return l !== e.message; }).forEach(function (l) { el(k.notes, "div", "e-note", esc(l)); });
      if (e.message && e.status !== "RUNNING") el(k.notes, "div", "e-note why", (e.code ? "<b>" + esc(e.code) + "</b> " : "") + esc(e.message.replace(/^Code\.E\d+: /, "")));
    } else if (e.entity_type === "execution" && e.status !== "RUNNING") {
      summary(e);
    }
    log.scrollTop = log.scrollHeight;
  }
  function keywordRow(id, parentId, name) {
    if (rows[id]) return;
    var parent = rows[parentId];
    var node = el(parent ? parent.node : log, "div", "e-kw");
    rows[id] = { node: node, head: el(node, "div", "e-row", glyph("RUNNING") + label(id, name)), notes: el(node, "div", "e-notes") };
  }
  function label(id, name) {
    var s = steps[id];
    if (!s) return '<span class="e-step"><span class="k-kw">' + esc(name) + "</span></span>";
    var args = s.params.map(function (p) { return /\s/.test(p) || !p ? '"' + p + '"' : p; }).join(" ");
    return '<span class="e-step"><span class="k-kw">' + esc(s.name) + "</span> " + values(esc(args)) + "</span>";
  }
  function glyph(status) {
    return '<i class="st st-' + String(status).toLowerCase() + '" aria-label="' + esc(String(status).toLowerCase().replace("_", " ")) + '"></i>';
  }
  function time(elapsed) { return elapsed == null ? "" : '<span class="e-t">' + Number(elapsed).toFixed(2) + "s</span>"; }
  function summary() {
    var pass = cases.filter(function (c) { return c.status === "PASS"; }).length;
    el(log, "div", "e-sum " + (pass === cases.length ? "ok" : "bad"), pass + " passed · " + (cases.length - pass) + " failed");
  }

  window.opticsPage = {
    step: function (id, name, params) { steps[id] = { name: name, params: JSON.parse(params) }; },
    before: function () { return wait(140); },
    after: function () {
      return play().then(function () {
        xmlPanes[0].textContent = lastSource;
        return wait(240);
      });
    },
    event: function (json) { onEvent(JSON.parse(json)); },
  };

  function busy(on) {
    running = on;
    lab.dataset.state = on ? "running" : "ready";
    runBtns.forEach(function (b) { b.disabled = on; });
    edit.readOnly = on;
  }

  function run(mode) {
    if (running || !page) return;
    busy(true);
    track("engine-" + mode);
    gen = clock.begin();
    steps = {}; rows = {}; cases = [];
    log.innerHTML = '<div class="e-cmd"><span class="k-dim">~/birch-shop $</span> optics ' + mode + " .</div>";
    var files = JSON.stringify({ "config.yaml": CONFIG, "checkout.yaml": edit.value });
    Promise.resolve(page.run(mode, files)).then(function (raw) {
      var out = JSON.parse(raw);
      if (out.error) el(log, "pre", "e-panic", esc(out.error));
      if (out.junit) xmlPanes[1].textContent = out.junit;
      if (lastSource) xmlPanes[0].textContent = lastSource;
    }).catch(function (err) {
      el(log, "pre", "e-panic", esc(String(err && err.message || err)));
    }).then(function () {
      settle();
      X.unlock();
      busy(false);
      log.scrollTop = log.scrollHeight;
    });
  }
  runBtns.forEach(function (b) { b.addEventListener("click", function () { run(b.dataset.mode); }); });

  // ---------------------------------------------------------------- loading Optics
  var wheelBytes = M.wheels.reduce(function (s, w) { return s + w.size; }, 0);
  var optics = M.wheels.filter(function (w) { return w.file === M.optics; })[0];
  var libs = M.wheels.length - 1;
  $(".eng-parts").innerHTML = [
    ["Python 3.14", "Pyodide " + M.core.match(/pyodide-([^/]+)/)[1], M.coreSize],
    ["optics-framework", M.optics.split("-")[1], optics.size],
    ["Libraries", libs + " wheels", wheelBytes - optics.size],
  ].map(function (p) { return '<li><b>' + p[0] + "</b><span>" + esc(p[1]) + "</span><em>" + mb(p[2]) + "</em></li>"; }).join("");
  $(".eng-size").textContent = mb(M.coreSize + wheelBytes);

  // Count the bytes Pyodide fetches from engine/, so the meter shows real progress.
  function counting(realFetch, onBytes) {
    return function (input, init) {
      return realFetch(input, init).then(function (res) {
        if (!res.body || !/\/engine\//.test(res.url)) return res;
        var reader = res.body.getReader();
        var body = new ReadableStream({
          pull: function (c) {
            return reader.read().then(function (r) {
              if (r.done) return c.close();
              onBytes(r.value.length);
              c.enqueue(r.value);
            });
          },
        });
        return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
      });
    };
  }

  function bootLine(html) { return el(log, "div", "e-row", html); }

  function boot() {
    var load = $(".eng-load"), meter = $(".eng-meter"), bar = meter.firstChild, total = M.coreSize + wheelBytes, got = 0, t0 = performance.now();
    load.disabled = true;
    meter.hidden = false;
    lab.dataset.state = "loading";
    track("engine-load");
    var realFetch = window.fetch;
    window.fetch = counting(realFetch, function (n) {
      got += n;
      bar.style.width = Math.min(100, got / total * 100) + "%";
      load.querySelector("span").textContent = mb(got) + " of " + mb(total);
    });
    var base = new URL(M.core, location.href).href, py;
    log.innerHTML = "";
    var importing;
    import(base + "pyodide.mjs").then(function (mod) {
      return mod.loadPyodide({ indexURL: base, stdout: function () {}, stderr: function () {} });
    }).then(function (p) {
      py = p;
      return py.loadPackage(M.wheels.map(function (w) { return new URL("engine/wheels/" + w.file, location.href).href; }), { messageCallback: function () {} });
    }).then(function () {
      window.fetch = realFetch;
      var site = py.runPython("import site; site.getsitepackages()[0]");
      return Promise.all(M.python.map(function (f) {
        return realFetch("engine/" + f.path + "?v=" + f.v).then(function (r) { return r.text(); }).then(function (text) {
          var dest = site + "/" + f.path;
          py.FS.mkdirTree(dest.slice(0, dest.lastIndexOf("/")));
          py.FS.writeFile(dest, text);
        });
      }));
    }).then(function () {
      load.querySelector("span").textContent = "Importing optics_framework";
      importing = bootLine('<span class="k-dim">&gt;&gt;&gt;</span> import optics_framework');
      return new Promise(function (r) { requestAnimationFrame(function () { setTimeout(r, 30); }); });
    }).then(function () {
      page = py.pyimport("optics_page");
      var about = JSON.parse(page.about());
      importing.innerHTML += ' <span class="k-ok">ok</span>';
      bootLine('<span class="k-dim">Python ' + esc(about.python) + " · optics-framework " + esc(about.optics) + " · ready in " + ((performance.now() - t0) / 1000).toFixed(1) + "s</span>");
      busy(false);
    }).catch(function (err) {
      window.fetch = realFetch;
      load.disabled = false;
      lab.dataset.state = "off";
      load.querySelector("span").textContent = "Try again";
      bootLine('<span class="k-bad">' + esc(String(err && err.message || err)) + "</span>");
    });
  }
  $(".eng-load").addEventListener("click", boot);
})();
