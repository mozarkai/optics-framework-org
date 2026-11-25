// The Birch shop as a real little app, the devices it runs on and the things that drive it.
// Shared by the homepage playgrounds in playground.js.
(function () {
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var STOP = { stop: true };

  function el(parent, tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    if (parent) parent.appendChild(n);
    return n;
  }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  // Waits that a newer run cancels, and that hold while the playground is off screen.
  function Clock() { this.gen = 0; this.hidden = false; this.held = []; }
  Clock.prototype.begin = function () { return ++this.gen; };
  Clock.prototype.stop = function () { this.gen++; };
  Clock.prototype.wait = function (ms, g) {
    var self = this;
    return new Promise(function (res, rej) {
      setTimeout(function () {
        if (g !== self.gen) return rej(STOP);
        if (self.hidden) self.held.push(function () { if (g === self.gen) res(); else rej(STOP); });
        else res();
      }, reduced ? 0 : ms);
    });
  };
  Clock.prototype.watch = function (node) {
    var self = this;
    if (!("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (e) {
      self.hidden = !e[0].isIntersecting;
      if (!self.hidden) { var h = self.held; self.held = []; h.forEach(function (f) { f(); }); }
    }).observe(node);
  };

  // Scale a fixed-size world to the width of its stage.
  function fit(stage, world, W, H, maxH) {
    function go() {
      var s = Math.min(stage.clientWidth / W, maxH ? maxH() / H : Infinity, 1.25);
      world.style.transform = "scale(" + s + ")";
      stage.style.height = Math.ceil(H * s) + "px";
    }
    world.style.width = W + "px";
    world.style.height = H + "px";
    go();
    if (window.ResizeObserver) new ResizeObserver(go).observe(stage);
    return go;
  }

  var CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>';
  var PRODUCTS = [
    { name: "Trail Runner 2", price: "$128", bg: "#E8EFE9", ink: "#2F6B4F" },
    { name: "Pace Knit", price: "$96", bg: "#F2E9DF", ink: "#C8643B" },
    { name: "Ridge GTX", price: "$164", bg: "#E6E9F3", ink: "#3E4F8C" },
    { name: "Tempo Lite", price: "$110", bg: "#F3E6EA", ink: "#B8456A" },
  ];
  function shoe(color) {
    return '<svg viewBox="0 0 160 90" aria-hidden="true"><path d="M14 58c0-10 8-16 20-18l22-4 16-16c6-6 14-6 19 0l10 13c14 3 30 8 40 14 6 4 7 9 5 13H18c-3 0-4-1-4-2z" fill="' + color + '"/><path d="M12 64h138c2 0 3 2 2 5-2 6-6 8-12 8H24c-7 0-12-4-12-9z" fill="#fff" stroke="rgba(0,0,0,.08)"/><path d="M60 40l10 8M71 34l10 8M82 29l9 8" stroke="rgba(255,255,255,.75)" stroke-width="3.5" stroke-linecap="round"/></svg>';
  }
  var WORDS = {
    en: { h: "Welcome back", sub: "Sign in to continue shopping", email: "Email", password: "Password", signin: "Sign in", forgot: "Forgot password?", err: "Enter your email and password." },
    de: { h: "Willkommen zurück", sub: "Melde dich an, um weiterzushoppen", email: "E-Mail", password: "Passwort", signin: "Anmelden", forgot: "Passwort vergessen?", err: "Gib deine E-Mail und dein Passwort ein." },
  };
  var KEYS = ["abcdefg", "hijklmn", "opqrstu", "vwxyz _"];

  function app(host) {
    var logo = '<div class="bz-logo"><i></i>birch</div>';
    var cards = PRODUCTS.map(function (p, i) {
      return '<button class="bz-card" type="button" data-el="card" data-i="' + i + '"><span class="bz-img" style="background:' + p.bg + '">' + shoe(p.ink) + '</span><span class="bz-nm" data-t>' + p.name + '</span><span class="bz-pr">' + p.price + "</span></button>";
    }).join("");
    var root = el(host, "div", "bz",
      '<div class="bz-sbar" aria-hidden="true"><span>9:41</span><span class="bz-sig"><i></i><i></i><i></i><b></b></span></div>' +
      '<section class="bz-s bz-login">' + logo +
        '<h5 class="bz-h" data-k="h" data-t>Welcome back</h5><p class="bz-sub" data-k="sub" data-t>Sign in to continue shopping</p>' +
        '<button class="bz-field" type="button" data-el="email"><small data-k="email">Email</small><span class="v"></span></button>' +
        '<button class="bz-field" type="button" data-el="password"><small data-k="password">Password</small><span class="v pw"></span></button>' +
        '<p class="bz-err" data-k="err" data-t>Enter your email and password.</p>' +
        '<button class="bz-btn" type="button" data-el="signin"><span data-k="signin" data-t>Sign in</span></button>' +
        '<button class="bz-link" type="button" data-el="forgot" data-k="forgot" data-t>Forgot password?</button>' +
      "</section>" +
      '<section class="bz-s bz-home"><div class="bz-top">' + logo +
        '<button class="bz-search" type="button" data-el="search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="6.5"/><path d="M13.5 13.5L18 18"/></svg><span class="q" data-t>Search Birch</span></button></div>' +
        '<div class="bz-chips">' + ["New", "Running", "Trail", "Sale"].map(function (c, i) { return '<button type="button" data-el="chip" data-t' + (i ? "" : ' class="on"') + ">" + c + "</button>"; }).join("") + "</div>" +
        '<div class="bz-grid">' + cards + "</div>" +
        '<div class="bz-kb" aria-hidden="true">' + KEYS.map(function (r) { return "<div>" + r.split("").map(function (k) { return '<span data-key="' + k + '">' + (k === " " ? "space" : k === "_" ? "⌫" : k) + "</span>"; }).join("") + "</div>"; }).join("") + "</div>" +
        '<div class="bz-tab" aria-hidden="true"><i></i><i></i><i></i><i></i></div>' +
      "</section>" +
      '<section class="bz-s bz-product">' +
        '<button class="bz-back" type="button" data-el="back" aria-label="Back"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4L6.5 10l6 6"/></svg></button>' +
        '<div class="bz-pimg"></div><div class="bz-pinfo"><h5 class="bz-h bz-pname" data-t></h5><p class="bz-pmeta"></p>' +
        '<div class="bz-sizes">' + ["8", "9", "10", "11"].map(function (s) { return '<button type="button" data-el="size" data-t' + (s === "9" ? ' class="on"' : "") + ">" + s + "</button>"; }).join("") + "</div>" +
        '<p class="bz-desc">Grippy, light and built for long miles on mixed terrain.</p>' +
        '<button class="bz-btn" type="button" data-el="add"><span data-t>Add to cart</span></button></div>' +
      "</section>" +
      '<button class="bz-toast" type="button" data-el="toast">' + CHECK + '<span data-t>Added to cart</span></button>' +
      '<div class="bz-modal" aria-hidden="true"><div><b data-t>Session expired</b><p>Please sign in again to keep shopping.</p><span>OK</span></div></div>');

    function $(s) { return root.querySelector(s); }
    function $$(s) { return Array.prototype.slice.call(root.querySelectorAll(s)); }
    var field = { email: $('[data-el="email"]'), password: $('[data-el="password"]'), search: $('[data-el="search"]') };
    var toastTimer;

    var A = {
      root: root,
      screen: "login",
      product: 0,
      show: function (name) {
        if (A.screen !== name) A.toast(false);
        A.fail(false);
        root.dataset.screen = name;
        A.screen = name;
        $$(".focus").forEach(function (f) { f.classList.remove("focus"); });
      },
      reset: function (screen) {
        A.write("email", "");
        A.write("password", "");
        A.write("search", "");
        A.filter("");
        A.modal(false);
        A.toast(false);
        $$('[data-el="size"]').forEach(function (b) { b.classList.toggle("on", b.textContent === "9"); });
        $$('[data-el="chip"]').forEach(function (b, i) { b.classList.toggle("on", !i); });
        A.show(screen || "login");
      },
      el: function (name) {
        if (name === "card") return $$('[data-el="card"]').filter(visible)[0];
        return $('[data-el="' + name + '"]');
      },
      card: function (i) { return $('[data-el="card"][data-i="' + i + '"]'); },
      // The element a person would read as this text on the current screen.
      byText: function (text) {
        var want = String(text).trim().toLowerCase();
        var pool = $$(".bz-" + A.screen + " [data-t], .bz-" + A.screen + " button").concat(A.toastOn ? [$(".bz-toast [data-t]")] : []).filter(visible);
        var hit = pool.filter(function (n) { return n.textContent.trim().toLowerCase() === want; })[0];
        return hit ? hit.closest("button") || hit : null;
      },
      write: function (name, text) {
        var f = field[name];
        if (name === "search") {
          var q = f.querySelector(".q");
          q.textContent = text || "Search Birch";
          q.classList.toggle("typed", !!text);
          return;
        }
        f.querySelector(".v").textContent = name === "password" ? text.replace(/./g, "•") : text;
      },
      type: function (name, text, clock, g, cps) {
        var f = field[name];
        f.classList.add("focus");
        var i = 0;
        function next() {
          A.write(name, text.slice(0, ++i));
          if (i >= text.length) return Promise.resolve();
          return clock.wait(1000 / (cps || 32), g).then(next);
        }
        return text.length ? next() : Promise.resolve();
      },
      filter: function (q) {
        q = (q || "").trim().toLowerCase();
        $$('[data-el="card"]').forEach(function (c) {
          var hit = !q || PRODUCTS[c.dataset.i].name.toLowerCase().indexOf(q) > -1;
          c.classList.toggle("gone", !hit);
        });
      },
      open: function (i) {
        var p = PRODUCTS[i];
        A.product = i;
        $(".bz-pimg").style.background = p.bg;
        $(".bz-pimg").innerHTML = shoe(p.ink);
        $(".bz-pname").textContent = p.name;
        $(".bz-pmeta").textContent = p.price + " · Free returns";
        A.show("product");
      },
      pick: function (btn) {
        var group = btn.parentNode;
        Array.prototype.forEach.call(group.children, function (b) { b.classList.toggle("on", b === btn); });
      },
      press: function (t) {
        var name = t.dataset.el;
        if (name === "signin") {
          // As in the real app: both fields must be filled in. Any value signs in.
          if (A.filled()) A.show("home");
          else A.fail(true);
        }
        else if (name === "card") A.open(+t.dataset.i);
        else if (name === "chip" || name === "size") A.pick(t);
        else if (name === "add") A.toast(true);
        else if (name === "back") A.show("home");
        else if (name in field) t.classList.add("focus");
      },
      filled: function () { return !!(field.email.querySelector(".v").textContent.trim() && field.password.querySelector(".v").textContent); },
      fail: function (on) { $(".bz-err").classList.toggle("on", on); },
      toastOn: false,
      toast: function (on) {
        clearTimeout(toastTimer);
        A.toastOn = on;
        $(".bz-toast").classList.toggle("in", on);
        if (on) toastTimer = setTimeout(function () { A.toast(false); }, 6000);
      },
      modal: function (on) { $(".bz-modal").classList.toggle("in", on); },
      words: function (lang) {
        var w = WORDS[lang] || WORDS.en;
        $$(".bz-login [data-k]").forEach(function (n) { n.textContent = w[n.dataset.k]; });
      },
      keyboard: function (on) { root.classList.toggle("kb-on", on); },
      key: function (k) { return $('.bz-kb [data-key="' + k + '"]'); },
    };
    A.show("login");
    return A;
  }

  function visible(n) {
    if (!n || n.closest(".gone")) return false;
    return !!(n.offsetWidth || n.offsetHeight);
  }

  // The things that act on a screen: a finger, a mouse, a TV's focus ring, and Optics' own marks.
  function actors(scr) {
    var L = el(scr, "div", "act", '<i class="act-tap"></i><div class="act-ret"><b></b><b></b><b></b><b></b><em></em></div><i class="act-focus"></i><i class="act-scan"></i><div class="act-ghost"></div><svg class="act-cur" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3l14 8.5-6.2 1.4L10 19z"/></svg>');
    var tap = L.querySelector(".act-tap"), ret = L.querySelector(".act-ret"), label = ret.querySelector("em");
    var cur = L.querySelector(".act-cur"), ring = L.querySelector(".act-focus"), scan = L.querySelector(".act-scan"), ghost = L.querySelector(".act-ghost");
    function box(t) {
      var x = 0, y = 0, n = t;
      while (n && n !== scr) {
        x += n.offsetLeft - (n.offsetParent ? n.offsetParent.scrollLeft : 0);
        y += n.offsetTop - (n.offsetParent ? n.offsetParent.scrollTop : 0);
        n = n.offsetParent;
      }
      if (n) return { x: x, y: y, w: t.offsetWidth, h: t.offsetHeight };
      var a = scr.getBoundingClientRect(), b = t.getBoundingClientRect(), s = a.width / scr.offsetWidth || 1;
      return { x: (b.left - a.left) / s, y: (b.top - a.top) / s, w: b.width / s, h: b.height / s };
    }
    function place(n, b, pad) {
      pad = pad || 0;
      n.style.left = b.x - pad + "px";
      n.style.top = b.y - pad + "px";
      n.style.width = b.w + pad * 2 + "px";
      n.style.height = b.h + pad * 2 + "px";
    }
    function replay(n, cls) { n.classList.remove(cls); void n.offsetWidth; n.classList.add(cls); }
    return {
      layer: L,
      box: box,
      tap: function (t) {
        var b = box(t);
        tap.style.left = b.x + b.w / 2 + "px";
        tap.style.top = b.y + b.h / 2 + "px";
        replay(tap, "go");
        t.classList.add("press");
        setTimeout(function () { t.classList.remove("press"); }, 180);
      },
      lock: function (t, text, tone) {
        var b = box(t);
        place(ret, b, 6);
        ret.classList.toggle("below", b.y < 56);
        ret.classList.toggle("left", b.x + 180 > scr.offsetWidth);
        label.textContent = text;
        ret.dataset.tone = tone || "find";
        ret.classList.add("in");
      },
      unlock: function () { ret.classList.remove("in"); },
      point: function (t) {
        var b = box(t);
        cur.style.left = b.x + b.w * .55 + "px";
        cur.style.top = b.y + b.h * .6 + "px";
        cur.classList.add("in");
      },
      click: function () { replay(cur, "down"); },
      park: function () { cur.classList.remove("in"); },
      focus: function (t) {
        if (!t) return ring.classList.remove("in");
        place(ring, box(t), 3);
        ring.classList.add("in");
      },
      scan: function () { replay(scan, "go"); },
      ghost: function (t, html) {
        var b = box(t);
        ghost.innerHTML = html;
        ghost.style.left = b.x + "px";
        ghost.style.top = b.y + "px";
        ghost.style.width = b.w + "px";
        ghost.style.height = b.h + "px";
        replay(ghost, "go");
      },
      clear: function () {
        ret.classList.remove("in");
        ring.classList.remove("in");
        cur.classList.remove("in");
      },
    };
  }

  // One device that changes shape: an Android phone, an iPhone, a browser window, a TV, or a
  // phone driven by a Bluetooth mouse and watched by a camera.
  function device(host, mode) {
    var d = el(host, "div", "dv",
      '<div class="dv-body"><div class="dv-chrome" aria-hidden="true"><i></i><i></i><i></i><span>birch.shop</span></div>' +
      '<div class="dv-scr"><i class="dv-cut" aria-hidden="true"></i></div><i class="dv-stand" aria-hidden="true"></i></div>' +
      '<div class="dv-cam" aria-hidden="true"><b></b><b></b><b></b><b></b><span><i></i>REC</span></div>');
    d.dataset.dev = mode || "ios";
    var scr = d.querySelector(".dv-scr");
    return { el: d, scr: scr, app: app(scr), act: actors(scr), set: function (m) { d.dataset.dev = m; } };
  }

  window.BIRCH = { el: el, esc: esc, Clock: Clock, STOP: STOP, fit: fit, device: device, PRODUCTS: PRODUCTS, CHECK: CHECK, KEYS: KEYS, reduced: reduced, visible: visible, shoe: shoe };
})();
