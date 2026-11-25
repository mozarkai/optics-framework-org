// /popups: popups that block Birch, and the popup rules the real Optics guard runs against them.
(function () {
  var B = window.BIRCH;
  var lab = document.querySelector(".eng-lab");
  if (!B || !lab) return;
  var esc = B.esc;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  var SUITE = [
    "Test Cases:",
    "  - Sign in:",
    "      - Sign In",
    "  - Find the trail shoe:",
    "      - Find Shoe",
    "  - Add it to the cart:",
    "      - Add To Cart",
    "",
    "Modules:",
    "  - Sign In:",
    "      - Launch App",
    "      - Enter Text ${email_field} ava@birch.shop",
    "      - Enter Text ${password_field} ${password}",
    "      - Press Element ${sign_in}",
    "  - Find Shoe:",
    '      - Press Element "Trail"',
    '      - Press Element "Trail Runner 2"',
    "  - Add To Cart:",
    '      - Press Element "10"',
    '      - Press Element "Add to cart"',
    '      - Assert Presence "Added to cart" timeout_str=5',
    "  - Sign In Again:",
    '      - Press Element "OK"',
    "      - Enter Text ${email_field} ava@birch.shop",
    "      - Enter Text ${password_field} ${password}",
    "      - Press Element ${sign_in}",
    "",
    "Elements:",
    "  email_field: \"//*[@resource-id='com.birch.shop:id/email']\"",
    "  password_field: \"//*[@resource-id='com.birch.shop:id/password']\"",
    "  sign_in: \"//*[@resource-id='com.birch.shop:id/login']\"",
    "  password: correct-horse",
    "",
  ].join("\n");

  var SLOTS = { launch: "After launch", signin: "After sign-in", trail: "After Trail", card: "On the shoe", size: "After size 10" };
  var ANDROID = "android:id/";
  function dlg(title, msg, buttons) { return { title: title, msg: msg, buttons: buttons }; }

  // Each popup: where it shows, what it looks like, and the rule that answers it.
  var POPUPS = [
    { id: "cookies", name: "Cookie banner", slot: "launch", look: "sheet", text: dlg("We use cookies", "They keep you signed in and help us improve Birch.", ["Accept all", "Reject all"]),
      rule: { name: "cookies", detect: { text_contains: ["We use cookies"] }, action: { type: "tap", target: "Reject all" } } },
    { id: "notify", name: "Notifications", slot: "launch", look: "system", text: dlg("Allow Birch to send you notifications?", "", ["Allow", "Don't allow"]),
      rule: { name: "notifications", detect: { xpath: "//*[@package='com.android.permissioncontroller']" }, action: { type: "tap", target: "Don't allow" } } },
    { id: "rate", name: "Rate us", slot: "signin", look: "rate", text: dlg("Enjoying Birch?", "Tap a star to rate us.", ["Rate", "Not now"]),
      rule: { name: "rate_prompt", detect: { text_contains: ["Enjoying Birch?"] }, action: { type: "tap", target: "Not now" } } },
    { id: "security", name: "Is this you?", slot: "signin", look: "security", text: dlg("Is this you?", "New sign-in on a Pixel 8 near Lisbon.", ["No, lock my account", "Yes, it's me"]),
      rule: { name: "security_check", detect: { text_contains: ["Is this you?"] }, sensitive: true } },
    { id: "session", name: "Session expired", slot: "trail", look: "session", text: dlg("Session expired", "Please sign in again to keep shopping.", ["OK"]),
      rule: { name: "session_expired", detect: { text_contains: ["Session expired"] }, action: { type: "module", target: "Sign In Again" } } },
    { id: "update", name: "Update", slot: "trail", look: "update", text: dlg("Update available", "Birch 4.2 makes checkout faster.", ["Later", "Update"]),
      rule: { name: "update_prompt", detect: { text_contains: ["Update available"] }, action: { type: "tap", target: "Remind me later", fallback: "Later" } } },
    { id: "promo", name: "Flash sale", slot: "card", look: "promo", text: dlg("Flash sale", "40% off for one hour only.", ["Shop now"]),
      rule: { name: "flash_sale", detect: { resource_id: "com.birch.shop:id/promo_interstitial" }, action: { type: "tap", target: "//*[@content-desc='Close']" } } },
    { id: "tour", name: "What's new", slot: "card", look: "tour", text: dlg("What's new", "Swipe a shoe to save it for later.", ["Next"]),
      rule: { name: "whats_new", detect: { text_contains: ["What's new"] }, action: { type: "back" } } },
    { id: "spin", name: "Spin to win", slot: "card", look: "spin", clingy: true, text: dlg("Spin to win!", "One spin. One prize. Every visit.", ["Spin", "No thanks"]),
      rule: { name: "spin_to_win", detect: { text_contains: ["Spin to win"] }, action: { type: "tap", target: "No thanks" }, max_per_step: 2 } },
    { id: "chat", name: "Chat bubble", slot: "size", look: "bubble", text: dlg("Chat with Birch", "Hi! Need a hand?", ["Minimise"]),
      rule: { name: "chat_bubble", check: "before_every_step", detect: { text_contains: ["Chat with Birch"] }, action: { type: "tap", target: "Minimise" } } },
    { id: "club", name: "Birch Club", slot: "card", look: "club", text: dlg("Join Birch Club", "Free shipping on every order.", ["Join for $5/mo", "No thanks"]),
      rule: { name: "birch_club", detect: { text_contains: ["Birch Club"] }, action: { type: "tap", target: "No thanks" } } },
  ];
  POPUPS.forEach(function (p) { p.title = p.text.title; p.msg = p.text.msg; p.buttons = p.text.buttons; });

  var EVERYDAY = ["cookies", "notify", "rate", "session", "update", "promo", "tour", "chat"];
  var PRESETS = {
    handled: { show: EVERYDAY, rules: EVERYDAY },
    "no-rules": { show: EVERYDAY, rules: [] },
    unknown: { show: EVERYDAY.concat("club"), rules: EVERYDAY },
    clingy: { show: ["spin"], rules: ["spin"] },
    "hands-off": { show: ["cookies", "notify", "security"], rules: ["cookies", "notify", "security"] },
  };
  var state = { show: {}, rules: {} };
  function apply(name) {
    var p = PRESETS[name];
    POPUPS.forEach(function (x) { state.show[x.id] = p.show.indexOf(x.id) > -1; state.rules[x.id] = p.rules.indexOf(x.id) > -1; });
  }
  apply("handled");

  function rules() { return POPUPS.filter(function (p) { return state.rules[p.id]; }).map(function (p) { return p.rule; }); }
  function rulesJson() {
    var list = rules();
    return list.length ? "[\n" + list.map(function (r) { return "  " + JSON.stringify(r).replace(/":/g, '": ').replace(/,"/g, ', "'); }).join(",\n") + "\n]\n" : "[]\n";
  }

  // ---------------------------------------------------------------- the deck
  var deck = $(".pp-deck"), files = { rules: $(".pp-rules"), suite: $(".pp-suite") };
  function paintJson(s) {
    return esc(s).replace(/(&quot;[\w ]+&quot;)(: )/g, '<span class="k-var">$1</span>$2').replace(/(: )(&quot;.*?&quot;|true|\d+)/g, '$1<span class="k-lit">$2</span>');
  }
  function paintYaml(s) {
    return s.split("\n").map(function (line) {
      var e = esc(line);
      if (/^(Test Cases|Modules|Elements):/.test(line)) return '<span class="k-mod">' + e + "</span>";
      var head = /^(\s*-\s+)([^"$:]+)(:\s*)$/.exec(e);
      if (head) return head[1] + '<span class="k-ok">' + head[2] + "</span>" + head[3];
      var step = /^(\s*-\s+)([A-Z][a-z]+(?: [A-Z][a-z]+)*)(.*)$/.exec(e);
      if (step) return step[1] + '<span class="k-kw">' + step[2] + "</span>" + step[3].replace(/(\$\{\w+\})|(&quot;[^&]*?&quot;)/g, function (m, v) { return '<span class="' + (v ? "k-var" : "k-lit") + '">' + m + "</span>"; });
      var key = /^(\s+)([\w-]+)(:)(.*)$/.exec(e);
      if (key) return key[1] + '<span class="k-var">' + key[2] + "</span>" + key[3] + '<span class="k-lit">' + key[4] + "</span>";
      return e;
    }).join("\n");
  }
  function what(r) {
    if (r.sensitive) return "sensitive · stop the run";
    var a = r.action || {}, t = a.type === "tap" ? "tap " + (a.target.charAt(0) === "/" ? "XPath" : '"' + a.target + '"') + (a.fallback ? ' or "' + a.fallback + '"' : "") : a.type === "module" ? "run " + a.target : a.type;
    return (r.check === "before_every_step" ? "before each step · " : "") + t;
  }
  deck.innerHTML = POPUPS.map(function (p) {
    return '<li class="pp-row" data-id="' + p.id + '"><i class="pp-dot pp-dot-' + p.look + '" aria-hidden="true"></i>' +
      '<span class="pp-name"><b>' + esc(p.name) + "</b><small>" + esc(SLOTS[p.slot]) + "</small></span>" +
      '<label class="pp-sw"><input type="checkbox" data-k="show"><span>Show</span></label>' +
      '<label class="pp-sw"><input type="checkbox" data-k="rules"><span>Rule</span></label>' +
      '<code class="pp-what">' + esc(what(p.rule)) + "</code></li>";
  }).join("");
  function render() {
    $$(".pp-row", deck).forEach(function (row) {
      var id = row.dataset.id;
      $('[data-k="show"]', row).checked = !!state.show[id];
      $('[data-k="rules"]', row).checked = !!state.rules[id];
      row.classList.toggle("off", !state.show[id]);
    });
    files.rules.innerHTML = paintJson(rulesJson());
    files.suite.innerHTML = paintYaml(SUITE);
  }
  function busy() { return lab.dataset.state === "running" || lab.dataset.state === "loading" || lab.dataset.state === "off"; }
  function press(name) { $$(".pp-presets button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.preset === name)); }); }
  deck.addEventListener("change", function (e) {
    var box = e.target, row = box.closest(".pp-row");
    if (lab.dataset.state === "running") { box.checked = !box.checked; return; }
    state[box.dataset.k][row.dataset.id] = box.checked;
    press(null);
    render();
  });
  $(".pp-presets").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b || lab.dataset.state === "running") return;
    apply(b.dataset.preset);
    press(b.dataset.preset);
    render();
    if (!busy()) $('.eng-btn[data-mode="execute"]').click();
  });
  render();

  // ---------------------------------------------------------------- the score
  var score = { handled: 0, unknown: 0, stopped: 0, fastest: null };
  var board = $(".pp-score");
  function tally() {
    $('[data-s="handled"]', board).textContent = score.handled;
    $('[data-s="unknown"]', board).textContent = score.unknown;
    $('[data-s="stopped"]', board).textContent = score.stopped;
    $('[data-s="fastest"]', board).textContent = score.fastest == null ? "–" : score.fastest + " ms";
  }
  function bump(key) {
    var cell = $('[data-s="' + key + '"]', board).parentNode;
    cell.classList.remove("bump");
    void cell.offsetWidth;
    cell.classList.add("bump");
  }

  // ---------------------------------------------------------------- the popups on the phone
  function node(parent, tag, cls, data, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    Object.keys(data || {}).forEach(function (k) { if (data[k] != null) n.dataset[k] = data[k]; });
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function view(parent, cls, tag, rid) { return node(parent, "div", cls, { tag: tag || "android.widget.LinearLayout", rid: rid }); }
  function label(parent, cls, text, rid) { return node(parent, "p", cls, { tag: "android.widget.TextView", rid: rid, leaf: "1" }, text); }
  function button(parent, cls, text, act, rid, desc) {
    var b = node(parent, "button", cls, { tag: desc ? "android.widget.ImageButton" : "android.widget.Button", rid: rid, leaf: "1", click: "1", act: act, desc: desc }, desc ? null : text);
    b.type = "button";
    b.tabIndex = -1;
    return b;
  }
  function art(parent, cls, html) { var a = node(parent, "div", cls); a.setAttribute("aria-hidden", "true"); a.innerHTML = html; return a; }
  var STAR = '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"/></svg>';

  // The tree each look gives: an AlertDialog hangs from android:id/parentPanel, a sheet from design_bottom_sheet,
  // a permission prompt is the permission controller's window, and the bubble is a view over the app.
  function build(p, host) {
    var pkg = p.look === "system" ? "com.android.permissioncontroller" : null;
    var win = node(host, "div", "pp-pop pp-" + p.look, { tag: "android.widget.FrameLayout", pkg: pkg, pop: p.id });
    var card, acts;
    if (p.look === "bubble") {
      win.dataset.rid = "com.birch.shop:id/chat_bubble";
      art(win, "pp-face", "B");
      card = view(win, "pp-bubble-text");
      label(card, "pp-title", p.title);
      label(card, "pp-msg", p.msg);
      button(win, "pp-min", p.buttons[0], "minimise");
      return win;
    }
    if (p.look === "sheet") card = view(win, "pp-card", "android.widget.FrameLayout", "com.birch.shop:id/design_bottom_sheet");
    else if (p.look === "system") card = view(win, "pp-card", "android.widget.LinearLayout", pkg + ":id/grant_dialog");
    else if (p.look === "promo") card = view(win, "pp-card", "android.widget.FrameLayout", "com.birch.shop:id/promo_interstitial");
    else if (p.look === "tour") card = view(win, "pp-card", "android.widget.LinearLayout", "com.birch.shop:id/coach_mark");
    else card = view(win, "pp-card", "android.widget.LinearLayout", ANDROID + "parentPanel");
    if (p.look === "rate") art(card, "pp-stars", STAR + STAR + STAR + STAR + STAR);
    if (p.look === "spin") art(card, "pp-wheel", "<i></i>");
    if (p.look === "promo") { art(card, "pp-burst", "−40%"); button(card, "pp-x", "", "dismiss", "com.birch.shop:id/close", "Close"); }
    if (p.look === "security") art(card, "pp-shield", '<svg viewBox="0 0 24 24"><path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5z"/></svg>');
    if (p.look === "club") art(card, "pp-badge", "BC");
    label(card, "pp-title", p.title, p.look === "promo" || p.look === "sheet" || p.look === "tour" ? null : p.look === "system" ? pkg + ":id/permission_message" : ANDROID + "alertTitle");
    if (p.msg) label(card, "pp-msg", p.msg, p.look === "system" || p.look === "promo" || p.look === "tour" || p.look === "sheet" ? null : ANDROID + "message");
    acts = node(card, "div", "pp-acts");
    p.buttons.forEach(function (text, i) {
      var last = i === p.buttons.length - 1;
      var rid = p.look === "system" ? pkg + ":id/permission_" + (last ? "deny" : "allow") + "_button" : p.look === "promo" ? "com.birch.shop:id/shop_now" : ANDROID + "button" + (p.buttons.length - i);
      var act = p.id === "session" ? "relogin" : p.id === "spin" && !last ? "spin" : "dismiss";
      button(acts, last ? "pp-main" : "", text, act, rid);
    });
    return win;
  }

  window.OPTICS_LAB = {
    files: function () {
      var f = { "config.yaml": "driver_sources:\n  - birch:\n      enabled: true\nelements_sources:\n  - birch_page_source:\n      enabled: true\nexecution_output_path: ./output\n", "checkout.yaml": SUITE };
      if (rules().length) f["popup_rules.json"] = rulesJson();
      return f;
    },
    layer: function (io) {
      var dev = io.dev, A = dev.app, scr = dev.scr;
      var host = node(scr, "div", "pp-layer");
      host.inert = true;
      var stack = [], fired = {}, back = [], chat = null;

      function show(p) {
        var w = build(p, host);
        stack.push({ p: p, el: w });
        requestAnimationFrame(function () { w.classList.add("in"); });
      }
      function stamp(w, text, tone) {
        var s = node(w.querySelector(".pp-card") || w, "b", "pp-stamp pp-stamp-" + tone, null, text);
        s.setAttribute("aria-hidden", "true");
      }
      function close(item, text) {
        stack.splice(stack.indexOf(item), 1);
        if (item.p.clingy) back.push({ p: item.p, reads: 2 });
        stamp(item.el, text || "Dismissed", "ok");
        item.el.classList.add("out");
        item.el.removeAttribute("data-tag");
        setTimeout(function () { item.el.remove(); }, B.reduced ? 0 : 900);
      }
      function top() {
        for (var i = stack.length - 1; i >= 0; i--) if (stack[i].p.look !== "bubble") return stack[i];
        return null;
      }
      function slotOf(kind, t) {
        if (kind === "launch") return "launch";
        var name = t && t.dataset.el;
        if (name === "signin" && A.screen === "home") return "signin";
        if (name === "chip" && t.textContent.trim() === "Trail") return "trail";
        if (name === "card") return "card";
        if (name === "size" && t.textContent.trim() === "10") return "size";
        return null;
      }
      function overlaps(a, b) {
        var x = dev.act.box(a), y = dev.act.box(b);
        return x.x < y.x + y.w && y.x < x.x + x.w && x.y < y.y + y.h && y.y < x.y + x.h;
      }
      function openChat() {
        var p = { id: "support", look: "sheet", title: "Birch support", msg: "An agent will reply in about 3 minutes.", buttons: ["Close"] };
        show(p);
      }

      return {
        did: function (kind, t) {
          if (kind === "launch") { host.innerHTML = ""; stack = []; back = []; fired = {}; }
          var slot = slotOf(kind, t);
          if (!slot || fired[slot]) return;
          fired[slot] = true;
          var due = POPUPS.filter(function (p) { return p.slot === slot && state.show[p.id]; });
          due.forEach(show);
          if (due.length) io.effect(function () { return io.wait(700); });
        },
        screen: function () {
          back = back.filter(function (b) {
            if (--b.reads > 0) return true;
            show(b.p);
            return false;
          });
          var modal = top();
          return { modal: modal && modal.el, over: stack.filter(function (s) { return s.p.look === "bubble"; }).map(function (s) { return s.el; }) };
        },
        press: function (t) {
          var w = t.closest(".pp-pop"), item = stack.filter(function (s) { return s.el === w; })[0];
          if (item) {
            var act = t.dataset.act;
            if (act === "minimise") { close(item, "Minimised"); return true; }
            if (item.p.look === "bubble") { openChat(); return true; }
            if (act === "relogin") { close(item); A.reset("login"); return true; }
            close(item, act === "spin" ? "Spun" : null);
            return true;
          }
          if (top()) return true;
          chat = stack.filter(function (s) { return s.p.look === "bubble"; })[0];
          if (chat && overlaps(t, chat.el)) { openChat(); return true; }
          return false;
        },
        back: function () {
          var item = top();
          if (!item) return false;
          if (item.p.look === "tour" || item.p.look === "rate" || item.p.look === "update" || item.p.look === "club" || item.p.look === "spin" || item.p.id === "support") close(item, "Back");
          return true;
        },
        event: function (p) {
          var item = top() || stack[stack.length - 1];
          if (p.verdict === "handled") {
            score.handled++;
            bump("handled");
            if (p.dismissed_in_ms != null && (score.fastest == null || p.dismissed_in_ms < score.fastest)) score.fastest = p.dismissed_in_ms;
          } else if (p.verdict === "unknown") {
            score.unknown++;
            bump("unknown");
            if (item) stamp(item.el, "No rule", "bad");
          } else {
            score.stopped++;
            bump("stopped");
            if (item) stamp(item.el, p.code === "E0407" ? "Too clingy" : p.stop_run ? "Hands off" : "Stopped", "bad");
          }
          tally();
        },
        reset: function () {
          host.innerHTML = "";
          stack = []; back = []; fired = {};
          score = { handled: 0, unknown: 0, stopped: 0, fastest: null };
          tally();
        },
      };
    },
  };
})();
