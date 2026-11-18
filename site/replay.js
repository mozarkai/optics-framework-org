// A real Optics run against the real Birch app, replayed from what Optics wrote: its
// screenshots, the box it drew, the strategy it logged, its timings and its terminal tree.
// The data comes from runs/birch-run.js, which scripts/birch-run.py writes.
(function () {
  var DATA = window.BIRCH_RUN;
  var hosts = document.querySelectorAll("[data-replay]");
  if (!DATA || !hosts.length) return;
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var RUNGS = ["XPath", "Text", "OCR", "Image"];
  var SHOT = { w: 412, h: 839 };
  var ICON = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5.5h3.6v13H7zM13.4 5.5H17v13h-3.6z"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5.5L8.5 12l6.5 6.5"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.5l6.5 6.5L9 18.5"/></svg>',
  };

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function el(parent, tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    if (parent) parent.appendChild(n);
    return n;
  }
  function secs(s) { return s < 0.01 ? "<0.01 s" : s.toFixed(s < 1 ? 3 : 2) + " s"; }
  function date(iso) { return new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }); }

  // The values a step was written with, with each ${name} shown as the value it stands for.
  var ELEMENTS = {};
  DATA.suite["test_data/elements.csv"].trim().split("\n").slice(1).forEach(function (line) {
    var i = line.indexOf(",");
    ELEMENTS[line.slice(0, i)] = line.slice(i + 1);
  });
  function argHtml(a) {
    var m = /^\$\{(\w+)\}$/.exec(a);
    if (!m || !ELEMENTS[m[1]]) return '<span class="rp-lit">' + esc(a) + "</span>";
    return '<span class="rp-var">' + esc(a) + '</span> <span class="rp-dim">=</span> <span class="rp-lit">' + esc(ELEMENTS[m[1]]) + "</span>";
  }

  // Lines of the terminal tree: which ones are keywords (in step order), test cases and the summary.
  function treeLines(tree) {
    var kw = 0;
    return tree.split("\n").map(function (text) {
      var at = text.search(/[├└]── /);
      var line = { text: text, depth: at < 0 ? -1 : at / 4, step: -1 };
      if (line.depth === 2) line.step = kw++;
      if (/FAIL\s*$/.test(text)) line.fail = true;
      return line;
    });
  }

  function mount(host) {
    var runs = DATA.runs;
    var S = { run: runs.length - 1, i: -1, playing: false, real: false, timers: [], seen: false };
    host.innerHTML = "";
    host.classList.add("rp");

    el(host, "p", "play-tag label", "<span>A real run.</span> <em>Step through it.</em>").setAttribute("aria-hidden", "true");

    var bar = el(host, "div", "rp-bar");
    var rel = el(bar, "div", "rp-rel");
    rel.setAttribute("role", "group");
    rel.setAttribute("aria-label", "Birch release");
    var relBtns = runs.map(function (r, n) {
      var b = el(rel, "button", "rp-relb", "Birch " + esc(r.release) + ' <span class="rp-exit' + (r.exit ? " bad" : "") + '">exit ' + r.exit + "</span>");
      b.type = "button";
      b.addEventListener("click", function () { choose(n, true); });
      return b;
    });
    var ctl = el(bar, "div", "rp-ctl");
    var prev = button(ctl, "rp-icon", ICON.prev, "Previous step", function () { stop(); go(Math.max(0, S.i - 1)); });
    var play = button(ctl, "rp-icon rp-play", ICON.play, "Play", function () { S.playing ? stop() : start(); });
    var next = button(ctl, "rp-icon", ICON.next, "Next step", function () { stop(); go(Math.min(steps().length, S.i + 1)); });
    var speed = el(ctl, "label", "rp-speed label", '<input type="checkbox"> Real speed');
    speed.querySelector("input").addEventListener("change", function (e) { S.real = e.target.checked; if (S.playing) { stop(); start(); } });
    var clock = el(ctl, "span", "rp-clock label");

    var main = el(host, "div", "rp-main");
    var dev = el(main, "div", "rp-dev");
    var phone = el(dev, "div", "rp-phone", '<i class="rp-cut" aria-hidden="true"></i>');
    var scr = el(phone, "div", "rp-scr");
    var blank = el(scr, "div", "rp-blank");
    var imgPre = el(scr, "img", "rp-img");
    var imgFound = el(scr, "img", "rp-img rp-found");
    [imgPre, imgFound].forEach(function (im) { im.alt = ""; im.decoding = "async"; im.width = SHOT.w; im.height = SHOT.h; });
    var scan = el(scr, "i", "rp-scan");
    var ret = el(scr, "div", "rp-ret", "<b></b><b></b><b></b><b></b><em></em>");
    var shotCap = el(dev, "p", "rp-shotcap label");

    var step = el(main, "div", "rp-step");
    step.setAttribute("aria-live", "polite");

    var term = el(main, "div", "rp-term");
    var termHead = el(term, "div", "rp-termhead");
    var pre = el(term, "pre", "rp-tree");
    pre.tabIndex = 0;
    pre.setAttribute("aria-label", "Terminal output of the run");

    var time = el(host, "div", "rp-time");
    var track = el(time, "div", "rp-track");
    var cursor = el(time, "i", "rp-cursor");

    var proof = el(host, "div", "rp-proof");

    function button(parent, cls, html, label, fn) {
      var b = el(parent, "button", cls, html);
      b.type = "button";
      b.setAttribute("aria-label", label);
      b.addEventListener("click", fn);
      return b;
    }
    function run() { return runs[S.run]; }
    function steps() { return run().steps; }
    function total() { var s = steps(), l = s[s.length - 1]; return l.at + l.elapsed; }

    function choose(n, user) {
      stop();
      S.run = n;
      relBtns.forEach(function (b, k) { b.setAttribute("aria-pressed", String(k === n)); });
      var r = run();
      termHead.innerHTML = '<span class="rp-dim">~ $</span> ' + esc(r.command);
      S.lines = treeLines(r.tree);
      pre.innerHTML = S.lines.map(function (l, k) {
        return '<span class="rp-ln' + (l.depth === 0 ? " case" : "") + (l.fail ? " fail" : "") + '" data-ln="' + k + '">' + esc(l.text) + "</span>";
      }).join("\n");
      drawTrack();
      drawProof();
      preload();
      go(user ? 0 : -1);
      if (user) start();
    }

    function drawTrack() {
      var s = steps(), t = total();
      track.innerHTML = "";
      var cases = [];
      s.forEach(function (st, n) {
        var seg = el(track, "button", "rp-seg");
        seg.type = "button";
        seg.style.flexGrow = Math.max(st.elapsed, 0.004) / t * 1000;
        var hit = st.found_by.filter(function (f) { return f.ok; })[0];
        seg.dataset.rung = hit ? hit.rung : "none";
        seg.setAttribute("aria-label", "Step " + (n + 1) + ": " + st.keyword + ", " + secs(st.elapsed));
        seg.innerHTML = "<i></i>";
        seg.addEventListener("click", function () { stop(); go(n); });
        var c = cases[cases.length - 1];
        if (!c || c.name !== st.case) cases.push({ name: st.case, from: st.at, to: st.at + st.elapsed });
        else c.to = st.at + st.elapsed;
      });
      var end = el(track, "button", "rp-seg rp-endseg", "<i></i>");
      end.type = "button";
      end.setAttribute("aria-label", "End of run");
      end.addEventListener("click", function () { stop(); go(s.length); });
      time.querySelectorAll(".rp-cases, .rp-ticks, .rp-key").forEach(function (n) { n.remove(); });
      var row = el(time, "div", "rp-cases");
      row.innerHTML = cases.map(function (c) { return '<span style="flex-grow:' + (c.to - c.from) / t * 1000 + '" title="' + esc(c.name) + '">' + esc(c.name) + "</span>"; }).join("") + '<span class="rp-endcase"></span>';
      time.insertBefore(row, track);
      el(time, "div", "rp-ticks label", "<span>0 s</span><span>" + secs(t) + "</span>");
      el(time, "div", "rp-key label", RUNGS.map(function (r) { return '<span><i data-rung="' + r + '"></i>' + r + "</span>"; }).join(""));
    }

    function drawProof() {
      var r = run();
      var files = r.files.map(function (f) { return '<a href="' + base() + "runs/birch-" + esc(r.release) + "/" + esc(f) + '">' + esc(f) + "</a>"; }).join("");
      proof.innerHTML =
        '<div class="rp-cmd"><code>' + esc(r.command) + '</code><button class="copy" type="button">Copy</button></div>' +
        '<p class="rp-meta label"><span>Optics ' + esc(DATA.optics) + "</span><span>Playwright " + esc(DATA.playwright) + ", Chromium as Pixel 7</span><span>" + esc(DATA.platform) + "</span><span>" + date(r.date) + "</span></p>" +
        '<p class="rp-files">' + files + "</p>";
      var copy = proof.querySelector(".copy");
      copy.addEventListener("click", function () {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(r.command).then(function () {
          copy.textContent = "Copied";
          setTimeout(function () { copy.textContent = "Copy"; }, 1600);
        }, function () {});
      });
    }

    function base() { return host.dataset.base || ""; }
    function src(path) { return path ? base() + path : ""; }

    function preload() {
      if (!S.seen) return;
      steps().forEach(function (st) { [st.pre, st.found].forEach(function (p) { if (p) new Image().src = src(p); }); });
      if (run().end) new Image().src = src(run().end);
    }

    // The screen Optics saw at step n: the last screenshot it had taken by then.
    function screenAt(n) {
      var s = steps();
      for (var k = Math.min(n, s.length - 1); k >= 0; k--) if (s[k].found || s[k].pre) return s[k].found || s[k].pre;
      return "";
    }

    function setImg(im, path) {
      var want = src(path);
      if (im.getAttribute("src") !== want) { if (want) im.src = want; else im.removeAttribute("src"); }
      im.hidden = !want;
    }

    function go(n) {
      clearTimers();
      S.i = n;
      var s = steps();
      Array.prototype.forEach.call(track.children, function (seg, k) {
        seg.classList.toggle("on", k === n);
        seg.classList.toggle("done", k < n);
      });
      Array.prototype.forEach.call(pre.children, function (ln) {
        var l = S.lines[ln.dataset.ln];
        var cur = n >= s.length ? l.depth === 0 && l.fail || l.depth === -1 && /│|╰|╭/.test(l.text) : l.step === n;
        ln.classList.toggle("on", !!cur);
        ln.classList.toggle("later", n >= 0 && n < s.length && l.step > n);
      });
      var on = pre.querySelector(".rp-ln.on");
      if (on) pre.scrollTop = Math.max(0, on.offsetTop - pre.clientHeight / 2);
      if (n < 0) return idle();
      if (n >= s.length) return finish();
      show(s[n], n);
    }

    function idle() {
      setClock(0);
      phone.classList.remove("done");
      setImg(imgPre, "");
      setImg(imgFound, "");
      blank.hidden = false;
      blank.textContent = "";
      ret.classList.remove("in");
      shotCap.textContent = "";
      step.innerHTML = '<p class="rp-kicker label">' + steps().length + " steps · " + run().cases.length + " test cases</p>" +
        '<h3 class="rp-kw">Press play</h3><p class="rp-note">Each frame below is a file this run wrote.</p>';
    }

    function setClock(t) { clock.textContent = secs(t) + " / " + secs(total()); }

    function rungOf(st) {
      var hit = st.found_by.filter(function (f) { return f.ok; })[0];
      return hit ? hit.rung : "";
    }

    function show(st, n) {
      var pace = S.real ? Math.max(st.elapsed * 1000, 16) : 2400;
      var shot = st.pre || st.found || screenAt(n - 1);
      setClock(st.at + st.elapsed);
      phone.classList.remove("done");
      blank.hidden = !!shot;
      blank.textContent = st.keyword === "Launch App" ? "Launching Chromium" : "";
      setImg(imgPre, shot);
      setImg(imgFound, st.found || "");
      ret.classList.remove("in", "lock");
      drawStep(st, n);
      view(st, false);
      if (!st.found) return later(function () { go(S.i + 1); }, pace);
      if (!S.playing || S.real || reduced) {
        view(st, true);
        return later(function () { go(S.i + 1); }, pace);
      }
      if (rungOf(st) === "OCR") replay(scan, "go");
      if (st.box) {
        aim([10, 10, SHOT.w - 10, SHOT.h - 10]);
        later(function () { aim(st.box); }, 160);
      }
      later(function () { view(st, true); }, 760);
      later(function () { go(S.i + 1); }, pace);
    }

    // Before: the screenshot Optics took as the step began. Found: the same screen with its box.
    function view(st, found) {
      imgFound.classList.toggle("in", found && !!st.found);
      ret.classList.toggle("lock", found && !!st.box);
      if (found && st.box) aim(st.box);
      ret.querySelector("em").textContent = rungOf(st) + " · " + secs(st.elapsed);
      shotCap.innerHTML = st.found
        ? '<button type="button" aria-pressed="' + !found + '">Before</button><button type="button" aria-pressed="' + found + '">Found</button>'
        : "";
      Array.prototype.forEach.call(shotCap.children, function (b, k) {
        b.addEventListener("click", function () { stop(); view(st, k === 1); });
      });
    }

    function aim(box) {
      ret.style.left = box[0] / SHOT.w * 100 + "%";
      ret.style.top = box[1] / SHOT.h * 100 + "%";
      ret.style.width = (box[2] - box[0]) / SHOT.w * 100 + "%";
      ret.style.height = (box[3] - box[1]) / SHOT.h * 100 + "%";
      ret.classList.toggle("below", box[1] < 60);
      ret.classList.toggle("left", box[0] > SHOT.w * 0.55);
      ret.classList.add("in");
    }

    function later(fn, ms) { S.timers.push(setTimeout(fn, ms)); }
    function clearTimers() { S.timers.forEach(clearTimeout); S.timers = []; }

    function replay(n, cls) { n.classList.remove(cls); void n.offsetWidth; n.classList.add(cls); }

    function drawStep(st, n) {
      var hit = st.found_by.filter(function (f) { return f.ok; })[0];
      var tried = {};
      st.found_by.forEach(function (f) { tried[f.rung] = f.ok ? "hit" : "miss"; });
      var slowest = Math.max.apply(null, steps().map(function (x) { return x.elapsed; }));
      var rungs = st.found_by.length
        ? '<ol class="rp-rungs">' + RUNGS.map(function (r) { return '<li data-st="' + (tried[r] || "") + '">' + r + "</li>"; }).join("") + "</ol>"
        : '<p class="rp-none">No element to find.</p>';
      var logs = st.found_by.map(function (f) {
        return "Trying " + f.strategy + " on '" + f.value + "' ... " + (f.ok ? "SUCCESS" : "FAIL");
      });
      var template = hit && hit.rung === "Image" ? '<img class="rp-tpl" src="' + base() + 'birch-tests/test_data/cart.png" alt="The template image cart.png" width="28" height="26">' : "";
      step.innerHTML =
        '<p class="rp-kicker label">' + (n + 1) + " / " + steps().length + " · " + esc(st.case) + "</p>" +
        '<h3 class="rp-kw">' + esc(st.keyword) + '</h3><p class="rp-args">' + st.args.map(argHtml).join('<span class="rp-dim">, </span>') + "</p>" +
        '<div class="rp-sec"><p class="label">Found by</p>' + rungs + template + "</div>" +
        '<div class="rp-sec"><p class="label">Took <b>' + secs(st.elapsed) + '</b></p><span class="rp-dur"><i style="width:' + Math.max(1.5, st.elapsed / slowest * 100) + '%"></i></span></div>' +
        (logs.length ? '<div class="rp-sec"><p class="label">Logged</p><pre class="rp-log">' + esc(logs.join("\n")) + "</pre></div>" : "");
    }

    function finish() {
      var r = run();
      setClock(total());
      setImg(imgPre, r.end);
      setImg(imgFound, "");
      blank.hidden = true;
      ret.classList.remove("in");
      phone.classList.add("done");
      shotCap.textContent = "end_of_run.jpg";
      var errs = r.errors.map(function (e) {
        return '<pre class="rp-log">' + esc(JSON.stringify(e, null, 2)) + "</pre>";
      }).join("");
      step.innerHTML =
        '<p class="rp-kicker label">End of run</p>' +
        '<p class="rp-stamp' + (r.exit ? " bad" : "") + '">exit ' + r.exit + "</p>" +
        (r.errors.length
          ? '<p class="rp-note">Every step passed. Then Optics read the last screen, found “' + esc(r.errors[0].match_string) + '” from <code>error_definitions.csv</code>, and failed the run.</p><div class="rp-sec"><p class="label">detected_errors.json</p>' + errs + "</div>"
          : '<p class="rp-note">Every step passed, and the last screen matched no error definition.</p>' + (S.run > 0 ? "" : nextRelease()));
      var nb = step.querySelector(".rp-next");
      if (nb) nb.addEventListener("click", function () { choose(S.run + 1, true); });
      stop();
    }

    function nextRelease() {
      var r = runs[S.run + 1];
      return r ? '<button class="btn btn-solid btn-sm rp-next" type="button">' + ICON.play + "Run Birch " + esc(r.release) + "</button>" : "";
    }

    function start() {
      if (S.i < 0 || S.i >= steps().length) go(-1);
      S.playing = true;
      host.classList.add("playing");
      play.innerHTML = ICON.pause;
      play.setAttribute("aria-label", "Pause");
      document.dispatchEvent(new CustomEvent("optics:play", { detail: "replay" }));
      go(S.i + 1);
    }

    function stop() {
      clearTimers();
      S.playing = false;
      host.classList.remove("playing");
      play.innerHTML = ICON.play;
      play.setAttribute("aria-label", "Play");
    }

    host.addEventListener("keydown", function (e) {
      if (e.target.closest("input, a")) return;
      if (e.key === "ArrowRight") { stop(); go(Math.min(steps().length, S.i + 1)); e.preventDefault(); }
      if (e.key === "ArrowLeft") { stop(); go(Math.max(0, S.i - 1)); e.preventDefault(); }
    });

    choose(S.run, false);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) {
        if (!e[0].isIntersecting || S.seen) return;
        S.seen = true;
        preload();
        if (reduced) go(0);
        else start();
      }, { threshold: 0.35 }).observe(host);
    } else {
      S.seen = true;
      preload();
    }
  }

  Array.prototype.forEach.call(hosts, mount);
})();
