(function (root) {
  var ELEMENTS = [
    { name: "email_field", kw: "enter_text", id: "email", heal: true, labels: ["Email", "Email address", "Your email"] },
    { name: "password_field", kw: "enter_text", id: "password", heal: true, labels: ["Password", "Your password"] },
    { name: "sign_in", kw: "press_element", id: "login", image: true, heal: true, gone: "the sign-in button", labels: ["Sign in", "Log in", "Continue"] },
    { name: "search_bar", kw: "enter_text", id: "search", heal: true, labels: ["Search Birch", "Search", "Find shoes"] },
    { name: "Trail Runner 2", literal: true, kw: "press_element", heal: true, picture: true, gone: "the Trail Runner 2 card", labels: ["Trail Runner 2", "Trail Runner II"] },
    { name: "add_to_cart", kw: "press_element", id: "add", image: true, heal: true, gone: "the Add to cart button", labels: ["Add to cart", "Add to bag", "Add to basket"] },
    { name: "added_toast", kw: "assert_presence", id: "toast", heal: false, picture: true, labels: ["Added to cart", "Added to bag", "In your cart"] },
  ];
  var FAULTS = [
    { key: "id", odds: 15, name: "Rename an id" },
    { key: "word", odds: 10, name: "Reword a label" },
    { key: "style", odds: 5, name: "Restyle the buttons" },
    { key: "pic", odds: 5, name: "Draw text into a picture" },
    { key: "gone", odds: 5, name: "Delete a button", bug: true },
    { key: "out", odds: 5, name: "Sign the shopper out", bug: true },
    { key: "blip", odds: 5, name: "Flash a server error", bug: true },
  ];
  var KEYS = FAULTS.map(function (f) { return f.key; });
  var STRATEGIES = ["one", "every", "ai"];
  var SIZES = [25, 50, 100];
  var RUNGS = ["XPath", "Text", "OCR", "Image", "AI"];
  var VALUE_OF = [0, 1, 1, 2];
  var ID_FORMS = [function (b) { return b; }, function (b) { return "btn_" + b; }, function (b) { return b + "_button"; }, function (b) { return "cta_" + b; }];

  function defaults() {
    var odds = {};
    FAULTS.forEach(function (f) { odds[f.key] = f.odds; });
    return { seed: "birch", releases: 50, strategy: "ai", defs: true, odds: odds };
  }
  function hash(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function stream(seed) {
    var a = hash(seed);
    return function () {
      a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function idName(e, v) { return v < ID_FORMS.length ? ID_FORMS[v](e.id) : e.id + "_v" + v; }
  function shown(i, app) { return ELEMENTS[i].labels[app.el[i].label]; }
  function look(text, style) { return text + "@" + style; }
  function pick(test, u) {
    var list = [];
    ELEMENTS.forEach(function (e, i) { if (test(e)) list.push(i); });
    return list[Math.floor(u * list.length)];
  }
  function any() { return true; }

  // Three draws per fault per release, used or not, so one slider never reshuffles the others.
  function draws(cfg) {
    var rng = stream(cfg.seed), out = [];
    for (var r = 0; r < cfg.releases; r++) {
      out.push(FAULTS.map(function (f) { var u = rng(), a = rng(), b = rng(); return { key: f.key, hit: u * 100 < cfg.odds[f.key], a: a, b: b }; }));
    }
    return out;
  }

  var CHANGE = {
    id: function (app, d) {
      var i = pick(function (e) { return e.id; }, d.a), s = app.el[i];
      s.idV++;
      return { key: "id", el: i, from: idName(ELEMENTS[i], s.idV - 1), to: idName(ELEMENTS[i], s.idV) };
    },
    word: function (app, d) {
      var i = pick(any, d.a), n = ELEMENTS[i].labels.length, from = shown(i, app);
      app.el[i].label = (app.el[i].label + 1 + Math.floor(d.b * (n - 1))) % n;
      return { key: "word", el: i, from: from, to: shown(i, app) };
    },
    style: function (app) { app.style++; return { key: "style" }; },
    pic: function (app, d) {
      var i = pick(function (e) { return e.picture; }, d.a);
      app.el[i].pic = !app.el[i].pic;
      return { key: "pic", el: i, on: app.el[i].pic, text: shown(i, app) };
    },
    gone: function (app, d) { return { key: "gone", el: pick(function (e) { return e.gone; }, d.a), bug: true }; },
    out: function (app, d) { return { key: "out", after: 2 + Math.floor(d.a * 5), bug: true }; },
    blip: function (app, d) { return { key: "blip", after: Math.floor(d.a * ELEMENTS.length), bug: true }; },
  };

  function snapshot(app) {
    return { style: app.style, el: app.el.map(function (s) { return { idV: s.idV, label: s.label, pic: s.pic }; }) };
  }
  function values(i, app, strategy) {
    var e = ELEMENTS[i], text = shown(i, app);
    if (strategy === "one") return e.id ? { id: idName(e, app.el[i].idV) } : { text: text };
    return { id: e.id ? idName(e, app.el[i].idV) : null, text: text, img: e.image ? look(text, app.style) : null };
  }

  // Each value in elements.csv order, each with the methods that fit its kind.
  function locate(i, app, known, on) {
    var s = app.el[i], text = shown(i, app);
    return [
      known.id ? on && known.id === idName(ELEMENTS[i], s.idV) : null,
      known.text ? on && !s.pic && known.text === text : null,
      known.text ? on && known.text === text : null,
      known.img ? on && known.img === look(text, app.style) : null,
    ];
  }
  function step(i, app, world, strategy) {
    var covered = world.out != null && i > world.out, on = !world.gone[i] && !covered;
    var t = locate(i, app, world.known[i], on), found = t.indexOf(true), first = t.findIndex(function (x) { return x !== null; });
    var heal = strategy === "ai" && ELEMENTS[i].heal;
    if (found < 0 && heal && on) found = 4;
    t.push(heal ? found === 4 || (found < 0 ? false : null) : null);
    var trace = t.map(function (x, k) { return found >= 0 && k > found ? null : x; });
    if (found < 0) return { st: "fail", trace: trace, cause: world.gone[i] ? "gone" : covered ? "out" : "false" };
    return { st: found === 4 ? "healed" : VALUE_OF[found] > VALUE_OF[first] ? "fallback" : "first", trace: trace, rung: found, first: first };
  }

  function arrive(world, shipped) {
    shipped.forEach(function (c) {
      if (c.key === "gone") world.gone[c.el] = true;
      if (c.key === "out" && world.out == null) world.out = c.after;
    });
  }
  function judge(world, steps, stop, defs, shipped) {
    var signedOut = world.out != null && (stop < 0 || stop > world.out);
    var end = signedOut ? (defs ? "match" : "unseen") : "clear";
    var caught = [], unseen = [];
    Object.keys(world.gone).forEach(function (k) { (stop === +k ? caught : unseen).push({ key: "gone", el: +k }); });
    if (world.out != null) (end === "match" || (stop >= 0 && steps[stop].cause === "out") ? caught : unseen).push({ key: "out" });
    shipped.forEach(function (c) { if (c.key === "blip") unseen.push({ key: "blip" }); });
    return { end: end, caught: caught, unseen: unseen };
  }
  function verdict(steps, stop, j) {
    if (j.caught.length) return "bug";
    if (stop >= 0) return "false";
    if (j.unseen.length) return "missed";
    if (steps.some(function (s) { return s.st === "healed"; })) return "healed";
    return steps.some(function (s) { return s.st === "fallback"; }) ? "fallback" : "pass";
  }
  function aftermath(world, steps, j, app, strategy) {
    var fixes = [];
    steps.forEach(function (s, i) {
      if (s.st === "healed" || s.st === "fallback" || s.cause === "false") { world.known[i] = values(i, app, strategy); fixes.push(i); }
    });
    j.caught.forEach(function (b) {
      if (b.key === "gone") delete world.gone[b.el];
      else world.out = null;
    });
    return fixes;
  }
  function run(app, shipped, world, strategy, defs) {
    arrive(world, shipped);
    var steps = [], stop = -1;
    ELEMENTS.forEach(function (e, i) {
      if (stop >= 0) return steps.push({ st: "notrun" });
      var r = step(i, app, world, strategy);
      steps.push(r);
      if (r.st === "fail") stop = i;
    });
    var j = judge(world, steps, stop, defs, shipped);
    var out = { verdict: verdict(steps, stop, j), steps: steps, end: j.end, caught: j.caught, unseen: j.unseen };
    out.fixes = aftermath(world, steps, j, app, strategy);
    return out;
  }

  function tally(releases, strategy, upto) {
    var t = { runs: 0, green: 0, false: 0, healed: 0, edits: 0, caught: 0, unseen: 0 };
    releases.slice(0, upto == null ? releases.length : upto).forEach(function (r) {
      var x = r.runs[strategy];
      t.runs++;
      if (x.verdict === "false") t.false++;
      if (/^(pass|fallback|healed)$/.test(x.verdict)) t.green++;
      t.healed += x.steps.filter(function (s) { return s.st === "healed"; }).length;
      t.edits += x.fixes.length;
      t.caught += x.caught.length;
      if (x.unseen.length) t.unseen++;
    });
    return t;
  }

  function simulate(cfg) {
    var app = { style: 0, el: ELEMENTS.map(function () { return { idV: 0, label: 0, pic: false }; }) };
    var first = snapshot(app), worlds = {};
    STRATEGIES.forEach(function (s) {
      worlds[s] = { gone: {}, out: null, known: ELEMENTS.map(function (e, i) { return values(i, first, s); }) };
    });
    var releases = draws(cfg).map(function (row, r) {
      var shipped = row.filter(function (d) { return d.hit; }).map(function (d) { return CHANGE[d.key](app, d); });
      var snap = snapshot(app), runs = {};
      STRATEGIES.forEach(function (s) { runs[s] = run(snap, shipped, worlds[s], s, cfg.defs); });
      return { v: "v3." + (r + 1), shipped: shipped, runs: runs };
    });
    return { cfg: cfg, releases: releases };
  }

  function encode(c) { return [c.seed, c.releases, c.strategy, c.defs ? 1 : 0, KEYS.map(function (k) { return c.odds[k]; }).join("-")].join("."); }
  function decode(s) {
    var m = /^([a-z0-9]{1,12})\.(25|50|100)\.(one|every|ai)\.([01])\.(\d{1,3}(?:-\d{1,3})*)$/.exec(String(s || "")), c = defaults();
    var odds = m ? m[5].split("-").map(Number) : [];
    if (odds.length !== KEYS.length || odds.some(function (n) { return n > 100; })) return c;
    KEYS.forEach(function (k, i) { c.odds[k] = odds[i]; });
    return { seed: m[1], releases: +m[2], strategy: m[3], defs: m[4] === "1", odds: c.odds };
  }

  var SIM = { ELEMENTS: ELEMENTS, FAULTS: FAULTS, STRATEGIES: STRATEGIES, SIZES: SIZES, RUNGS: RUNGS, defaults: defaults, simulate: simulate, tally: tally, encode: encode, decode: decode };
  root.OPTICS_SIM = SIM;
  if (typeof document === "undefined") return;
  var host = document.querySelector(".pg.sim");
  if (host) ui(host, SIM);

  function ui(rootEl, S) {
    var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches, narrow = matchMedia("(max-width: 699px)");
    var CHEVRON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg>';
    var NAMES = { one: "One value", every: "Every value", ai: "Every value + AI" };
    var VERDICT = { pass: "Passed", fallback: "Passed on a fallback", healed: "Passed, healed by AI", false: "False failure", bug: "Bug caught", missed: "Passed with a bug unseen" };
    function el(parent, tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; if (parent) parent.appendChild(n); return n; }
    function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
    function track(name) { document.dispatchEvent(new CustomEvent("optics:play", { detail: "sim:" + name })); }
    function stepText(e) { return e.kw + " " + (e.literal ? "“" + e.name + "”" : "${" + e.name + "}"); }
    function slider(f) {
      return '<label class="sim-odd"><span>' + f.name + '</span><input type="range" min="0" max="100" step="5" name="' + f.key + '"><output></output></label>';
    }

    var params = new URLSearchParams(location.search);
    var cfg = params.has("sim") ? S.decode(params.get("sim")) : S.defaults();
    var result = null, shown = 0, sel = -1, gen = 0;

    rootEl.innerHTML =
      '<p class="play-tag label" aria-hidden="true"><span>Simulation, not a measurement.</span> <em>Ship release after release.</em></p>' +
      '<form class="sim-ctl" id="sim-form" aria-label="Simulation settings">' +
        '<fieldset class="sim-set"><legend class="label">Changes · odds per release</legend>' + S.FAULTS.filter(function (f) { return !f.bug; }).map(slider).join("") + "</fieldset>" +
        '<fieldset class="sim-set"><legend class="label">Bugs · odds per release</legend>' + S.FAULTS.filter(function (f) { return f.bug; }).map(slider).join("") + "</fieldset>" +
        '<label class="play-switch sim-defs"><input type="checkbox" name="defs"><code>error_definitions.csv</code></label>' +
        '<div class="sim-row"><label class="sim-seed"><span class="label">Seed</span><input name="seed" maxlength="12" autocomplete="off" autocapitalize="off" spellcheck="false" pattern="[a-z0-9]{1,12}"></label>' +
          '<button type="button" class="btn btn-ghost btn-sm sim-dice">New seed</button></div>' +
        '<div class="sim-row sim-n" role="radiogroup" aria-label="Releases"><span class="label" aria-hidden="true">Releases</span>' + S.SIZES.map(function (n) { return '<label><input type="radio" name="releases" value="' + n + '"><span>' + n + "</span></label>"; }).join("") + "</div>" +
        '<details class="sim-rules"><summary class="label">How the simulation decides</summary><ul>' +
          "<li>Each release ships each change at the odds you set. The same seed and odds always ship the same releases.</li>" +
          "<li>Changes stay in the app. A bug stays until a run catches it. The developers then fix it in the next release.</li>" +
          "<li>Optics tries each value of an element in order: the XPath in the UI tree, the text in the UI tree and then with OCR, then the image.</li>" +
          "<li><b>One value</b> keeps only the first value of each element. <b>Every value</b> keeps all of them.</li>" +
          "<li>AI self-heal starts only when every value fails, and only for actions. Assert Presence does not heal. Here it recovers each action whose element is still on screen. A real model can fail or press the wrong thing.</li>" +
          "<li>Error detection reads the text on the last screen once, at the end of the run. An error that goes away before the end is not seen.</li>" +
          "<li>After a false failure or a healed step, the team updates that element to match the app.</li>" +
          "<li>The suite signs in, searches, opens Trail Runner 2, adds it to the cart and checks for “Added to cart”. The simulation counts outcomes. It has no timings.</li>" +
        "</ul></details>" +
      "</form>" +
      '<div class="sim-main">' +
        '<div class="sim-board"><div class="sim-head">' +
          '<button class="btn btn-sun sim-ship" type="submit" form="sim-form"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z"/></svg><span></span></button>' +
          '<button class="btn btn-sm sim-copy" type="button">Copy link</button>' +
          '<p class="label"><span class="sim-id"></span><span class="sim-prog"></span></p></div>' +
          '<div class="sim-grid" aria-label="Releases"></div>' +
          '<ul class="sim-key label" aria-label="Key">' +
            '<li><i class="c-first"></i>First try</li><li><i class="c-1"></i>Text</li><li><i class="c-2"></i>OCR</li><li><i class="c-3"></i>Image</li><li><i class="c-4"></i>AI self-heal</li>' +
            '<li><i class="c-false"></i>False failure</li><li><i class="c-bug"></i>Bug caught</li><li><i class="c-unseen"></i>Bug unseen</li></ul></div>' +
        '<div class="sim-score"><table><caption class="label">The same releases, three ways</caption><thead><tr><td></td>' +
          S.STRATEGIES.map(function (s) { return '<th scope="col"><button type="button" data-s="' + s + '" aria-pressed="false">' + NAMES[s] + "</button></th>"; }).join("") +
          "</tr></thead><tbody></tbody></table></div>" +
        '<div class="sim-detail"></div>' +
      "</div>" +
      '<p class="sim-live" aria-live="polite"></p>';

    var form = rootEl.querySelector(".sim-ctl"), grid = rootEl.querySelector(".sim-grid"), body = rootEl.querySelector(".sim-score tbody");
    var detailEl = rootEl.querySelector(".sim-detail"), live = rootEl.querySelector(".sim-live"), ship = rootEl.querySelector(".sim-ship span");
    var ROWS = [["green", "Green runs"], ["false", "False failures"], ["healed", "Healed steps"], ["edits", "Test edits"], ["caught", "Bugs caught"], ["unseen", "Runs with a bug unseen"]];
    body.innerHTML = ROWS.map(function (r) { return '<tr data-k="' + r[0] + '"><th scope="row">' + r[1] + "</th>" + S.STRATEGIES.map(function () { return "<td>0</td>"; }).join("") + "</tr>"; }).join("");

    function level(r) {
      r.nextElementSibling.textContent = r.value + "%";
      r.style.setProperty("--p", r.value + "%");
    }
    function fill() {
      form.querySelectorAll('input[type="range"]').forEach(function (r) { r.value = cfg.odds[r.name]; level(r); });
      form.defs.checked = cfg.defs;
      form.seed.value = cfg.seed;
      form.querySelectorAll('[name="releases"]').forEach(function (r) { r.checked = +r.value === cfg.releases; });
      ship.textContent = "Ship " + cfg.releases + " releases";
      rootEl.querySelectorAll(".sim-score [data-s]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.s === cfg.strategy); });
    }
    function read() {
      form.querySelectorAll('input[type="range"]').forEach(function (r) { cfg.odds[r.name] = +r.value; level(r); });
      cfg.defs = form.defs.checked;
      var seed = form.seed.value.trim().toLowerCase();
      if (/^[a-z0-9]{1,12}$/.test(seed)) cfg.seed = seed;
      var n = form.querySelector('[name="releases"]:checked');
      cfg.releases = n ? +n.value : cfg.releases;
    }

    function cellClass(s) {
      if (s.st === "notrun") return "c-none";
      if (s.st === "fail") return s.cause === "false" ? "c-false" : "c-bug";
      return s.rung === s.first ? "c-first" : "c-" + s.rung;
    }
    function endClass(x) { return x.end === "match" ? "c-bug" : x.unseen.length ? "c-unseen" : "c-none"; }
    function column(r, i) {
      var x = r.runs[cfg.strategy];
      return '<button type="button" class="sim-rel v-' + x.verdict + '" data-r="' + i + '" tabindex="-1" aria-pressed="false" aria-label="' + r.v + ": " + VERDICT[x.verdict] + '">' +
        '<i class="cap"></i>' + x.steps.map(function (s) { return '<i class="' + cellClass(s) + '"></i>'; }).join("") + '<i class="' + endClass(x) + '"></i></button>';
    }
    function drawGrid() {
      var n = cfg.releases, size = narrow.matches ? 25 : 50, html = "", rows = S.ELEMENTS.map(function (e) { return e.name; });
      rootEl.style.setProperty("--n", Math.min(n, size));
      for (var c = 0; c < n; c += size) {
        html += '<div class="sim-chunk"><div class="sim-labs" aria-hidden="true"><span>run</span>' + rows.map(function (r) { return "<span>" + esc(r) + "</span>"; }).join("") + "<span>end check</span></div><div class=\"sim-cols\">";
        for (var i = c; i < Math.min(n, c + size); i++) html += result ? column(result.releases[i], i) : '<span class="sim-rel"></span>';
        html += "</div></div>";
      }
      grid.innerHTML = html;
      rootEl.querySelector(".sim-id").textContent = "Seed " + cfg.seed + " · " + cfg.releases + " releases · " + NAMES[cfg.strategy];
      reveal(shown);
      choose(sel, false);
    }
    function reveal(k) {
      shown = k;
      grid.querySelectorAll("button.sim-rel").forEach(function (b, i) { b.classList.toggle("on", i < k); });
      rootEl.querySelector(".sim-prog").textContent = result ? (k < cfg.releases ? "Running " + result.releases[Math.max(0, k - 1)].v : "v3.1 – v3." + cfg.releases) : "Not run";
      score(k);
    }
    function score(k) {
      S.STRATEGIES.forEach(function (s, c) {
        var t = result ? S.tally(result.releases, s, k) : null;
        ROWS.forEach(function (r) {
          var td = body.querySelector('[data-k="' + r[0] + '"]').children[c + 1];
          td.textContent = !t || (r[0] === "healed" && s !== "ai") ? "–" : r[0] === "green" ? t.green + "/" + t.runs : t[r[0]];
          td.classList.toggle("on", s === cfg.strategy);
          td.classList.toggle("hot", !!t && t[r[0]] > 0);
        });
      });
    }

    function shippedText(c) {
      var e = S.ELEMENTS[c.el];
      if (c.key === "id") return "Renamed the id of " + e.name + ": " + c.from + " → " + c.to;
      if (c.key === "word") return "Reworded “" + c.from + "” → “" + c.to + "”";
      if (c.key === "style") return "Restyled the buttons";
      if (c.key === "pic") return c.on ? "Drew “" + c.text + "” into a picture" : "Changed “" + c.text + "” back to text";
      if (c.key === "gone") return "Deleted " + e.gone;
      if (c.key === "out") return "Signs the shopper out after step " + (c.after + 1);
      return "Shows “Something went wrong” for a moment after step " + (c.after + 1);
    }
    function trace(s) {
      if (s.st === "notrun") return '<span class="sim-nr">Not run</span>';
      return s.trace.map(function (t, k) {
        if (t === null) return "";
        return '<span class="t-' + (t ? "ok" : "no") + '">' + S.RUNGS[k] + (t ? " ✓" : " ✕") + "</span>";
      }).join("") + (s.st === "fail" ? '<span class="t-err">' + (s.cause === "false" ? "E0201 · the app works" : s.cause === "gone" ? "E0201 · bug" : "E0201 · signed out") + "</span>" : "");
    }
    function afterText(x) {
      var out = x.fixes.map(function (i) {
        var e = S.ELEMENTS[i];
        return e.literal ? "Team updates the step text in modules.csv." : "Team updates " + e.name + " in elements.csv.";
      });
      x.caught.forEach(function (b) { out.push(b.key === "gone" ? "Developers restore " + S.ELEMENTS[b.el].gone + " in the next release." : "Developers fix the sign-out bug in the next release."); });
      return out;
    }
    function endText(x) {
      if (x.end === "match") return "ERR_SESSION: “Session expired” on the last screen.";
      if (x.end === "unseen") return "“Session expired” on the last screen. No error_definitions.csv, so nothing matched.";
      return "No error on the last screen.";
    }
    function detail(i) {
      if (!result || i < 0) {
        detailEl.innerHTML = '<p class="sim-empty">Set the odds and ship. Then pick a release to see each step.</p>';
        return;
      }
      var r = result.releases[i], x = r.runs[cfg.strategy];
      var unseen = x.unseen.map(function (b) { return b.key === "blip" ? "A server error came and went before the end of the run." : b.key === "gone" ? S.ELEMENTS[b.el].gone[0].toUpperCase() + S.ELEMENTS[b.el].gone.slice(1) + " is missing. The run stopped before it." : "The shopper is signed out. No step or check saw it."; });
      detailEl.innerHTML =
        '<div class="sim-dh"><b>' + r.v + '</b><span class="sim-v v-' + x.verdict + ' label">' + VERDICT[x.verdict] + '</span><span class="sim-navs">' +
          '<button type="button" class="sim-nav" data-d="-1" aria-label="Previous release">' + CHEVRON + '</button><button type="button" class="sim-nav" data-d="1" aria-label="Next release">' + CHEVRON.replace("M10 3L5 8l5 5", "M6 3l5 5-5 5") + "</button></span></div>" +
        '<ul class="sim-shipped">' + (r.shipped.length ? r.shipped.map(function (c) { return '<li class="' + (c.bug ? "bug" : "") + '">' + esc(shippedText(c)) + "</li>"; }).join("") : "<li>No changes</li>") + "</ul>" +
        '<ol class="sim-steps">' + x.steps.map(function (s, k) { return '<li class="s-' + s.st + '"><code>' + esc(stepText(S.ELEMENTS[k])) + '</code><span class="sim-tr">' + trace(s) + "</span></li>"; }).join("") +
          '<li class="s-end"><code>end check</code><span class="sim-tr">' + esc(endText(x)) + "</span></li></ol>" +
        (unseen.length ? '<p class="sim-warn">' + unseen.map(esc).join(" ") + "</p>" : "") +
        (afterText(x).length ? '<p class="sim-after">' + afterText(x).map(esc).join(" ") + "</p>" : "");
    }
    function choose(i, focus) {
      sel = i;
      grid.querySelectorAll("button.sim-rel").forEach(function (b, k) {
        b.setAttribute("aria-pressed", k === i);
        b.tabIndex = k === (i < 0 ? 0 : i) ? 0 : -1;
        if (k === i && focus) b.focus();
      });
      detail(i);
    }

    function compute() { result = S.simulate(JSON.parse(JSON.stringify(cfg))); }
    function play(auto) {
      var g = ++gen;
      compute();
      if (!auto) track("ship");
      sel = -1;
      if (reduced) { shown = cfg.releases; drawGrid(); finish(); return; }
      shown = 0;
      drawGrid();
      rootEl.classList.add("running");
      ship.textContent = "Skip to the end";
      var k = 0, last = 0;
      function tick(t) {
        if (g !== gen) return;
        if (t - last >= 90) { last = t; k++; reveal(k); choose(k - 1, false); }
        if (k < cfg.releases) requestAnimationFrame(tick); else done();
      }
      function done() { rootEl.classList.remove("running"); ship.textContent = "Ship " + cfg.releases + " releases"; sel = -1; finish(); }
      requestAnimationFrame(tick);
    }
    function skip() { gen++; rootEl.classList.remove("running"); ship.textContent = "Ship " + cfg.releases + " releases"; reveal(cfg.releases); sel = -1; finish(); }
    function finish() {
      var first = -1;
      ["bug", "false", "missed", "healed"].some(function (v) {
        first = result.releases.findIndex(function (r) { return r.runs[cfg.strategy].verdict === v; });
        return first > -1;
      });
      choose(sel > -1 ? sel : Math.max(first, 0), false);
      var t = S.tally(result.releases, cfg.strategy);
      live.textContent = cfg.releases + " releases, " + NAMES[cfg.strategy] + ": " + t.green + " green runs, " + t.false + " false failures, " + t.caught + " bugs caught.";
    }
    function refresh() {
      gen++;
      rootEl.classList.remove("running");
      fill();
      if (result) { compute(); shown = cfg.releases; }
      drawGrid();
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (rootEl.classList.contains("running")) { skip(); track("skip"); return; }
      read();
      fill();
      play();
    });
    form.addEventListener("input", function (e) {
      if (e.target.type === "range") { read(); refresh(); }
    });
    form.addEventListener("change", function (e) {
      var t = e.target;
      if (t.type === "range") track("odds:" + t.name);
      else if (t.name === "defs") track("defs:" + (t.checked ? "on" : "off"));
      else if (t.name === "releases") track("releases:" + t.value);
      else if (t.name === "seed") track("seed");
      read();
      refresh();
    });
    rootEl.querySelector(".sim-dice").addEventListener("click", function () {
      var a = "abcdefghjkmnpqrstuvwxyz23456789", s = "";
      for (var i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)];
      form.seed.value = s;
      track("dice");
      read();
      fill();
      play();
    });
    rootEl.querySelector(".sim-copy").addEventListener("click", function (e) {
      var b = e.currentTarget, url = location.origin + location.pathname + "?sim=" + S.encode(cfg) + "#simulator";
      history.replaceState(null, "", url);
      track("share");
      var done = function (ok) { b.textContent = ok ? "Link copied" : "Copy the address bar"; setTimeout(function () { b.textContent = "Copy link"; }, 2200); };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); });
      else done(false);
    });
    rootEl.querySelector(".sim-score thead").addEventListener("click", function (e) {
      var b = e.target.closest("[data-s]");
      if (!b || b.dataset.s === cfg.strategy) return;
      cfg.strategy = b.dataset.s;
      track("strategy:" + cfg.strategy);
      fill();
      drawGrid();
      if (result && shown >= cfg.releases) finish();
    });
    grid.addEventListener("click", function (e) {
      var b = e.target.closest("button.sim-rel");
      if (b && result) { choose(+b.dataset.r, false); track("release"); }
    });
    grid.addEventListener("keydown", function (e) {
      var d = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity }[e.key];
      if (d == null || !result) return;
      e.preventDefault();
      choose(Math.max(0, Math.min(shown - 1, (sel < 0 ? 0 : sel) + d)), true);
    });
    detailEl.addEventListener("click", function (e) {
      var b = e.target.closest(".sim-nav");
      if (b) choose(Math.max(0, Math.min(shown - 1, sel + +b.dataset.d)), false);
    });

    narrow.addEventListener("change", drawGrid);
    fill();
    if (params.has("sim")) { compute(); shown = cfg.releases; drawGrid(); finish(); return; }
    drawGrid();
    if (!("IntersectionObserver" in window)) return play(true);
    var seen = new IntersectionObserver(function (e) {
      if (!e[0].isIntersecting) return;
      seen.disconnect();
      if (!result) play(true);
    }, { threshold: .35 });
    seen.observe(grid);
  }
})(typeof window !== "undefined" ? window : globalThis);
