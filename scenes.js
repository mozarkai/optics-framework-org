// Animated figures for the docs. Each <div class="scene" data-scene="name"> is drawn
// from a scene below: a fixed-size world (scaled to fit) and a timeline of events.
// Scenes play only while on screen, loop, can be paused, and render their final frame
// without motion when the visitor prefers reduced motion.
(function () {
  var stages = document.querySelectorAll(".scene[data-scene]");
  if (!stages.length) return;
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------------------------------------------------------- timeline
  function Timeline() { this.ev = []; this.end = 0; }
  Timeline.prototype.at = function (t, fn) { this.ev.push({ t: t, fn: fn }); if (t > this.end) this.end = t; return t; };
  Timeline.prototype.add = function (el, cls, t) { return this.at(t, function () { el.classList.add(cls); }); };
  Timeline.prototype.rm = function (el, cls, t) { return this.at(t, function () { el.classList.remove(cls); }); };
  Timeline.prototype.css = function (el, style, t) { return this.at(t, function () { for (var k in style) el.style[k] = style[k]; }); };
  Timeline.prototype.html = function (el, html, t) { return this.at(t, function () { el.innerHTML = html; }); };
  Timeline.prototype.show = function (el, t) { return this.add(el, "in", t); };
  Timeline.prototype.hide = function (el, t) { return this.rm(el, "in", t); };
  // Type text into an element, a character at a time. Returns when it finishes.
  Timeline.prototype.type = function (el, text, t, cps, keep) {
    var dt = 1000 / (cps || 28);
    var self = this;
    var base = keep ? null : "";
    this.at(t, function () { if (base !== null) el.textContent = ""; });
    for (var i = 1; i <= text.length; i++) (function (n) {
      self.at(t + n * dt, function () { el.textContent = (keep ? el.dataset.base || "" : "") + text.slice(0, n); });
    })(i);
    return t + text.length * dt;
  };

  // ---------------------------------------------------------------- dom kit
  function h(parent, html) {
    var tpl = document.createElement("template");
    tpl.innerHTML = html.trim();
    var node = tpl.content.firstChild;
    parent.appendChild(node);
    return node;
  }
  function abs(parent, x, y, html, cls) {
    var n = h(parent, html);
    n.classList.add("sc-abs");
    if (cls) cls.split(" ").forEach(function (c) { n.classList.add(c); });
    n.style.left = x + "px";
    n.style.top = y + "px";
    return n;
  }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  // A terminal (or any dark window) whose lines stack from the bottom.
  function term(parent, o) {
    var win = h(parent, '<div class="sc-win"><div class="sc-bar"><i></i><i></i><i></i><span>' + esc(o.title || "") + '</span></div><div class="sc-term' + (o.top ? " top" : "") + '"></div></div>');
    win.style.cssText = "left:" + o.x + "px;top:" + o.y + "px;width:" + o.w + "px;height:" + o.h + "px";
    var body = win.querySelector(".sc-term");
    if (o.status) win.appendChild(h(document.createElement("div"), '<div class="sc-status">' + o.status + "</div>"));
    var T = {
      win: win, body: body,
      status: win.querySelector(".sc-status"),
      ref: {},
      // Print a line. A key keeps a handle on it so set() can rewrite it later, the
      // way a live terminal UI updates a line in place.
      line: function (tl, html, t, key, cls) {
        return tl.at(t, function () { var l = h(body, '<div class="sc-ln enter' + (cls ? " " + cls : "") + '">' + (html || " ") + "</div>"); T.last = l; if (key) T.ref[key] = l; });
      },
      set: function (tl, key, html, t) { return tl.at(t, function () { if (T.ref[key]) T.ref[key].innerHTML = html; }); },
      // A prompt line with typed command; returns the time typing ends.
      cmd: function (tl, prompt, text, t, cps) {
        var ln;
        tl.at(t, function () {
          ln = h(body, '<div class="sc-ln">' + prompt + ' <span class="t-b"></span><span class="sc-caret"></span></div>');
        });
        var dt = 1000 / (cps || 30);
        for (var i = 1; i <= text.length; i++) (function (n) {
          tl.at(t + 120 + n * dt, function () { ln.querySelector(".t-b").textContent = text.slice(0, n); });
        })(i);
        var end = t + 120 + text.length * dt + 260;
        tl.at(end, function () { var c = ln.querySelector(".sc-caret"); if (c) c.remove(); });
        return end;
      },
      clear: function (tl, t) { return tl.at(t, function () { body.innerHTML = ""; }); },
      // Replace the most recent line.
      swap: function (tl, html, t) { return tl.at(t, function () { if (T.last) T.last.innerHTML = html; }); },
    };
    return T;
  }

  // A file panel with rows.
  function file(parent, o) {
    var f = h(parent, '<div class="sc-file"><div class="sc-file-h">' + esc(o.title) + "</div></div>");
    f.style.cssText = "left:" + o.x + "px;top:" + o.y + "px;width:" + o.w + "px" + (o.h ? ";height:" + o.h + "px" : "");
    var rows = (o.rows || []).map(function (r) { return h(f, '<div class="sc-row">' + r + "</div>"); });
    return {
      el: f, rows: rows,
      add: function (tl, html, t, cls) {
        return tl.at(t, function () { var r = h(f, '<div class="sc-row new ' + (cls || "") + '">' + html + "</div>"); rows.push(r); });
      },
    };
  }

  // SVG connector drawn from a to b.
  function wire(parent, W, H) {
    var svg = h(parent, '<svg class="sc-svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '"></svg>');
    return {
      svg: svg,
      draw: function (tl, pts, t, color) {
        var d = "M" + pts[0][0] + " " + pts[0][1];
        if (pts.length === 2) {
          var mx = (pts[0][0] + pts[1][0]) / 2;
          d += " C" + mx + " " + pts[0][1] + " " + mx + " " + pts[1][1] + " " + pts[1][0] + " " + pts[1][1];
        } else for (var i = 1; i < pts.length; i++) d += " L" + pts[i][0] + " " + pts[i][1];
        var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
        p.setAttribute("d", d);
        p.setAttribute("class", "sc-path");
        if (color) p.style.stroke = color;
        tl.at(t, function () {
          svg.appendChild(p);
          var len = p.getTotalLength();
          p.style.strokeDasharray = len;
          p.style.strokeDashoffset = len;
          p.getBoundingClientRect();
          p.style.strokeDashoffset = 0;
        });
        return p;
      },
      clear: function (tl, t) { return tl.at(t, function () { svg.innerHTML = ""; }); },
    };
  }

  // ---------------------------------------------------------------- Birch app
  function shoe(color) {
    return '<svg viewBox="0 0 160 90"><path d="M14 58c0-10 8-16 20-18l22-4 16-16c6-6 14-6 19 0l10 13c14 3 30 8 40 14 6 4 7 9 5 13H18c-3 0-4-1-4-2z" fill="' + color + '"/><path d="M12 64h138c2 0 3 2 2 5-2 6-6 8-12 8H24c-7 0-12-4-12-9z" fill="#fff" stroke="rgba(0,0,0,.08)"/><path d="M60 40l10 8M71 34l10 8M82 29l9 8" stroke="rgba(255,255,255,.75)" stroke-width="3.5" stroke-linecap="round"/></svg>';
  }
  var PRODUCTS = [["Trail Runner 2", "$128", "#E8EFE9", "#2F6B4F"], ["Pace Knit", "$96", "#F2E9DF", "#C8643B"], ["Ridge GTX", "$164", "#E6E9F3", "#3E4F8C"], ["Tempo Lite", "$110", "#F3E6EA", "#B8456A"]];
  function card(p, x, y) {
    return '<div class="b-card" style="left:' + x + "px;top:" + y + 'px"><div class="b-img" style="background:' + p[2] + '">' + shoe(p[3]) + '</div><div class="b-nm">' + p[0] + '</div><div class="b-pr">' + p[1] + "</div></div>";
  }
  var logo = function (s) { return '<div class="b-logo" style="font-size:' + s + 'px"><div class="b-leaf"></div>birch</div>'; };

  // Element boxes in screen coordinates (screen is 252 x 542).
  var BOX = {
    email: [16, 214, 220, 46], password: [16, 270, 220, 46], signin: [16, 334, 220, 46],
    search: [14, 92, 224, 38], card0: [14, 178, 111, 136], card1: [131, 178, 111, 136], card2: [14, 330, 111, 136],
    add: [16, 452, 220, 46], title: [18, 296, 200, 28], tab: [0, 486, 252, 56], banner: [14, 142, 224, 150], bannerText: [26, 162, 168, 32],
  };

  function phone(parent, x, y, scale) {
    var P = h(parent, '<div class="sc-phone"><div class="sc-scr"><div class="sc-island"></div><div class="sc-sbar"><span>9:41</span><span>●●●</span></div></div></div>');
    P.style.left = x + "px"; P.style.top = y + "px";
    if (scale) P.style.transform = "scale(" + scale + ")";
    var scr = P.querySelector(".sc-scr");
    var S = {};
    S.login = h(scr, '<div class="sc-app">' +
      '<div class="sc-abs" style="left:18px;top:74px">' + logo(22) + "</div>" +
      '<div class="sc-abs b-h" style="left:18px;top:118px;font-size:25px">Welcome back</div>' +
      '<div class="sc-abs" style="left:18px;top:154px;font-size:12.5px;color:#8b877d">Sign in to continue shopping</div>' +
      '<div class="b-field f-email" style="top:214px"><small>Email</small><span class="v"></span></div>' +
      '<div class="b-field f-pass" style="top:270px"><small>Password</small><span class="v" style="letter-spacing:2px"></span></div>' +
      '<div class="b-btn b-signin" style="top:334px">Sign in</div>' +
      '<div class="sc-abs" style="left:0;right:0;top:398px;text-align:center;font-size:12px;font-weight:650;color:#1F5B43">Forgot password?</div></div>');
    S.login2 = h(scr, '<div class="sc-app">' +
      '<div class="sc-abs" style="left:0;right:0;top:0;height:190px;background:linear-gradient(160deg,#1F5B43,#2F7A5A 60%,#8BC6A2)"></div>' +
      '<div class="sc-abs" style="left:18px;top:86px;color:#fff;font-size:10.5px;font-weight:700;letter-spacing:.1em;opacity:.85">NEW IN 2.5</div>' +
      '<div class="sc-abs b-h" style="left:18px;top:106px;color:#fff;font-size:24px;line-height:1.1">Your cart,<br>everywhere.</div>' +
      '<div class="b-field" style="top:214px"><small>Email</small>ava@birch.shop</div>' +
      '<div class="b-field" style="top:270px"><small>Password</small><span style="letter-spacing:2px">••••••••</span></div>' +
      '<div class="b-btn b-login2" style="top:334px;background:#E0582B;display:flex;justify-content:space-between;padding:0 18px"><span>Log in</span><span>→</span></div></div>');
    S.home = h(scr, '<div class="sc-app">' +
      '<div class="sc-abs" style="left:16px;top:52px">' + logo(19) + "</div>" +
      '<div class="b-search" style="top:92px"><svg width="14" height="14" viewBox="0 0 20 20"><circle cx="8.5" cy="8.5" r="6.5" stroke="#8b877d" stroke-width="2.4" fill="none"/><path d="M13.5 13.5L18 18" stroke="#8b877d" stroke-width="2.4" stroke-linecap="round"/></svg><span class="q">Search Birch</span></div>' +
      '<div class="b-chips" style="top:140px"><span>New</span><span>Running</span><span>Trail</span><span>Sale</span></div>' +
      card(PRODUCTS[0], 14, 178) + card(PRODUCTS[1], 131, 178) + card(PRODUCTS[2], 14, 330) + card(PRODUCTS[3], 131, 330) +
      '<div class="b-tab"><i></i><i></i><i></i><i></i></div></div>');
    S.product = h(scr, '<div class="sc-app">' +
      '<div class="sc-abs" style="left:0;right:0;top:0;height:270px;background:#E8EFE9;display:grid;place-items:center;padding-top:30px"><div style="width:190px">' + shoe("#2F6B4F") + "</div></div>" +
      '<div class="sc-abs b-h" style="left:18px;top:292px;font-size:21px">Trail Runner 2</div>' +
      '<div class="sc-abs" style="left:18px;top:324px;font-size:13px;color:#6f6b62">$128 · Free returns</div>' +
      '<div class="b-chips" style="top:358px;left:18px"><span style="background:#EFEBE2;color:#1C1B19">8</span><span style="background:#1C1B19;color:#fff">9</span><span>10</span><span>11</span></div>' +
      '<div class="sc-abs" style="left:18px;right:18px;top:398px;font-size:11.5px;line-height:1.5;color:#6f6b62">Grippy, light and built for long miles on mixed terrain.</div>' +
      '<div class="b-btn b-add" style="top:452px">Add to cart</div></div>');
    // A home screen whose banner is a picture: its words are pixels, not UI-tree text.
    S.promo = h(scr, '<div class="sc-app">' +
      '<div class="sc-abs" style="left:16px;top:52px">' + logo(19) + "</div>" +
      '<div class="b-search" style="top:92px"><svg width="14" height="14" viewBox="0 0 20 20"><circle cx="8.5" cy="8.5" r="6.5" stroke="#8b877d" stroke-width="2.4" fill="none"/><path d="M13.5 13.5L18 18" stroke="#8b877d" stroke-width="2.4" stroke-linecap="round"/></svg><span class="q">Search Birch</span></div>' +
      '<svg class="sc-abs" style="left:14px;top:142px" width="224" height="150" viewBox="0 0 224 150"><defs><linearGradient id="bp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1F5B43"/><stop offset="1" stop-color="#5FA57F"/></linearGradient></defs><rect width="224" height="150" rx="16" fill="url(#bp)"/><text x="16" y="44" fill="#fff" font-family="Georgia, serif" font-style="italic" font-weight="700" font-size="23" letter-spacing="-.5">Trail Runner 2</text><text x="17" y="66" fill="rgba(255,255,255,.8)" font-family="sans-serif" font-size="10.5" font-weight="600">NEW COLOURS · SHOP NOW</text><g transform="translate(92 74) scale(.8)">' + shoe("#E8EFE9").replace(/^<svg[^>]*>|<\/svg>$/g, "") + "</g></svg>" +
      card(PRODUCTS[1], 14, 306) + card(PRODUCTS[3], 131, 306) +
      '<div class="b-tab"><i></i><i></i><i></i><i></i></div></div>');
    var toast = h(scr, '<div class="b-toast"><i>✓</i><span>Added to cart</span></div>');
    var modal = h(scr, '<div class="b-modal"><div><b>Session expired</b><p>Please sign in again to keep shopping.</p><span>OK</span></div></div>');
    var tap = h(scr, '<div class="sc-tap"></div>');
    var ret = h(scr, '<div class="sc-ret"><b></b><b></b><b></b><b></b><em></em></div>');
    var scan = h(scr, '<div class="sc-scan"></div>');
    var cur = null;
    var api = {
      el: P, scr: scr, S: S, toast: toast, modal: modal,
      screen: function (tl, name, t) {
        return tl.at(t, function () {
          if (cur && cur !== S[name]) { var old = cur; old.classList.remove("on"); old.classList.add("off"); setTimeout(function () { old.classList.remove("off"); }, 400); }
          S[name].classList.add("on");
          cur = S[name];
        });
      },
      // Immediately show a screen (scene start).
      start: function (name) { S[name].classList.add("on"); cur = S[name]; },
      tap: function (tl, box, t) {
        var bx = BOX[box] || box;
        tl.at(t, function () {
          tap.style.left = bx[0] + bx[2] / 2 + "px"; tap.style.top = bx[1] + bx[3] / 2 + "px";
          tap.classList.remove("go"); void tap.offsetWidth; tap.classList.add("go");
          scr.querySelectorAll(".sc-app.on .b-btn").forEach(function (b) {
            var top = parseFloat(b.style.top);
            if (Math.abs(top - bx[1]) < 4) { b.classList.add("press"); setTimeout(function () { b.classList.remove("press"); }, 160); }
          });
        });
        return t + 250;
      },
      typeField: function (tl, sel, text, t, cps) {
        var field = S.login.querySelector(sel) || scr.querySelector(sel);
        tl.add(field, "focus", t);
        var end = tl.type(field.querySelector(".v") || field.querySelector(".q"), text, t, cps || 24);
        tl.rm(field, "focus", end + 200);
        return end;
      },
      typeSearch: function (tl, text, t) {
        var q = S.home.querySelector(".q");
        tl.at(t, function () { q.innerHTML = "<b></b>"; });
        var dt = 1000 / 24;
        for (var i = 1; i <= text.length; i++) (function (n) { tl.at(t + n * dt, function () { q.firstChild.textContent = text.slice(0, n); }); })(i);
        return t + text.length * dt;
      },
      lock: function (tl, box, label, t, color) {
        var bx = BOX[box] || box, pad = 6;
        tl.at(t, function () {
          ret.style.transition = "none";
          ret.style.left = bx[0] - pad - 30 + "px"; ret.style.top = bx[1] - pad - 24 + "px";
          ret.style.width = bx[2] + 2 * pad + 60 + "px"; ret.style.height = bx[3] + 2 * pad + 48 + "px";
          ret.style.setProperty("--rc", color || "#9672F8");
          ret.querySelector("em").textContent = label;
          void ret.offsetWidth;
          ret.style.transition = "";
          ret.classList.add("in");
          ret.style.left = bx[0] - pad + "px"; ret.style.top = bx[1] - pad + "px";
          ret.style.width = bx[2] + 2 * pad + "px"; ret.style.height = bx[3] + 2 * pad + "px";
        });
        return t + 450;
      },
      unlock: function (tl, t) { return tl.hide(ret, t); },
      // Show search results on the home screen: only the product at index keep, moved
      // to the first slot. filter(tl, null, t) puts the full grid back.
      filter: function (tl, keep, t) {
        var cards = S.home.querySelectorAll(".b-card");
        return tl.at(t, function () {
          cards.forEach(function (c, i) {
            if (!c.dataset.x) { c.dataset.x = c.style.left; c.dataset.y = c.style.top; }
            var show = keep == null || i === keep;
            c.style.opacity = show ? "" : "0";
            c.style.left = keep == null ? c.dataset.x : show ? "14px" : c.dataset.x;
            c.style.top = keep == null ? c.dataset.y : show ? "178px" : c.dataset.y;
          });
        });
      },
      scan: function (tl, t) { return tl.at(t, function () { scan.classList.remove("go"); void scan.offsetWidth; scan.classList.add("go"); }) + 1100; },
    };
    return api;
  }

  function cursorSvg() {
    return '<svg viewBox="0 0 18 22"><path d="M1 1l15 11-7 1-3 7z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  }

  // ---------------------------------------------------------------- scenes
  var KIT = { h: h, abs: abs, esc: esc, term: term, file: file, wire: wire, phone: phone, BOX: BOX, card: card, PRODUCTS: PRODUCTS, logo: logo, shoe: shoe, cursorSvg: cursorSvg };
  var SCENES = (window.OPTICS_SCENES = window.OPTICS_SCENES || {});
  window.OPTICS_KIT = KIT;

  // ---------------------------------------------------------------- player
  function Player(stage) {
    this.stage = stage;
    this.def = SCENES[stage.dataset.scene];
    if (!this.def) return;
    this.world = h(stage, '<div class="sc-world"></div>');
    this.size();
    var ctl = h(stage, '<div class="sc-ctl"><button type="button" class="sc-restart" aria-label="Replay the animation"><svg viewBox="0 0 24 24"><path d="M12 5a7 7 0 1 1-6.6 4.7l1.9.6A5 5 0 1 0 12 7v3L7.5 6 12 2z"/></svg></button><button type="button" class="sc-toggle" aria-label="Pause the animation"><svg class="i-pause" viewBox="0 0 24 24"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg><svg class="i-play" viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></svg></button></div>');
    var self = this;
    this.userPaused = false;
    this.visible = false;
    ctl.querySelector(".sc-toggle").addEventListener("click", function () {
      self.userPaused = !self.userPaused;
      if (reduced && !self.userPaused) { reduced = false; self.reset(); }
      self.sync();
    });
    ctl.querySelector(".sc-restart").addEventListener("click", function () {
      if (reduced) reduced = false;
      self.userPaused = false;
      self.reset();
      self.sync();
    });
    this.fit();
    if (window.ResizeObserver) new ResizeObserver(function () { self.fit(); }).observe(stage);
    this.reset();
    if (reduced) { this.finalFrame(); this.userPaused = true; }
    this.sync();
  }
  // Terminal scenes switch to a narrow, taller world on small screens so their text
  // stays readable instead of shrinking with the stage.
  Player.prototype.size = function () {
    var narrow = !!this.def.narrow && this.stage.clientWidth < 600;
    this.narrow = narrow;
    this.W = narrow ? this.def.narrow.w : this.def.w || 880;
    this.H = narrow ? this.def.narrow.h : this.def.h || 500;
    this.stage.style.setProperty("--ar", this.W / this.H);
    this.world.style.width = this.W + "px";
    this.world.style.height = this.H + "px";
    this.world.classList.toggle("sc-narrow", narrow);
  };
  Player.prototype.fit = function () {
    if (this.events && !!this.def.narrow && (this.stage.clientWidth < 600) !== this.narrow) {
      this.size();
      this.reset();
      if (reduced) this.finalFrame();
    }
    var s = this.stage.clientWidth / this.W;
    this.world.style.transform = "scale(" + s + ")";
  };
  Player.prototype.reset = function () {
    this.world.innerHTML = "";
    this.world.classList.remove("sc-static");
    var tl = new Timeline();
    this.def.build(this.world, tl, KIT, { w: this.W, h: this.H, narrow: this.narrow });
    this.events = tl.ev.sort(function (a, b) { return a.t - b.t; });
    this.dur = tl.end + (this.def.hold || 2600);
    this.t = 0;
    this.i = 0;
  };
  Player.prototype.finalFrame = function () {
    this.world.classList.add("sc-static");
    for (; this.i < this.events.length; this.i++) this.events[this.i].fn();
    this.t = this.dur;
  };
  Player.prototype.tick = function (dt) {
    this.t += dt;
    while (this.i < this.events.length && this.events[this.i].t <= this.t) this.events[this.i++].fn();
    if (this.t >= this.dur) this.reset();
  };
  Player.prototype.running = function () { return this.visible && !this.userPaused && !document.hidden; };
  Player.prototype.sync = function () {
    this.stage.classList.toggle("paused", this.userPaused);
    this.stage.querySelector(".sc-toggle").setAttribute("aria-label", this.userPaused ? "Play the animation" : "Pause the animation");
    if (this.running()) loop();
  };

  var players = [];
  var last = 0, rafOn = false;
  function frame(now) {
    var dt = last ? Math.min(now - last, 100) : 16;
    last = now;
    var any = false;
    players.forEach(function (p) { if (p.running()) { p.tick(dt); any = true; } });
    if (any) requestAnimationFrame(frame); else { rafOn = false; last = 0; }
  }
  function loop() { if (!rafOn) { rafOn = true; last = 0; requestAnimationFrame(frame); } }

  function init() {
    stages.forEach(function (stage) {
      var p = new Player(stage);
      if (!p.def) return;
      players.push(p);
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          p.visible = entries[0].isIntersecting;
          if (p.visible) loop();
        }, { threshold: 0.35 }).observe(stage);
      } else { p.visible = true; loop(); }
    });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) loop(); });
  }
  // Scene definitions register themselves from scene-defs.js, a later deferred script;
  // DOMContentLoaded fires only after every deferred script has run.
  document.addEventListener("DOMContentLoaded", init);
})();
