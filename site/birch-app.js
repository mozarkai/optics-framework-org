// Birch as a real web app, the one the Optics run on /run tests. Only the current screen is
// in the DOM, so a check for text on another screen cannot pass by accident.
(function () {
  var B = window.BIRCH;
  var root = document.getElementById("app");
  var release = new URLSearchParams(location.search).get("release") || "2.1";
  var state = { screen: "login", product: 0, size: "9", cart: [], query: "", chip: "New", signedIn: false };
  var TAGS = [["Running", "Trail"], ["Running", "Sale"], ["Trail"], ["Running", "Sale"]];
  var toastTimer;

  var ICON = {
    bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/></svg>',
    search: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="6.5"/><path d="M13.5 13.5L18 18"/></svg>',
    back: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4L6.5 10l6 6"/></svg>',
    tick: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>',
    x: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  };
  var LOGO = '<div class="logo"><i></i>birch</div>';
  var esc = B.esc;

  function cartButton() {
    var n = state.cart.length;
    return '<button class="cart" type="button" data-go="cart" aria-label="Cart">' + ICON.bag + (n ? "<b>" + n + "</b>" : "") + "</button>";
  }
  function cards() {
    var q = state.query.trim().toLowerCase();
    var chip = state.chip === "New" ? null : state.chip;
    var hits = B.PRODUCTS.map(function (p, i) { return { p: p, i: i }; }).filter(function (x) {
      return (!q || x.p.name.toLowerCase().indexOf(q) > -1) && (!chip || TAGS[x.i].indexOf(chip) > -1);
    });
    return hits.map(function (x) {
      return '<button class="card" type="button" data-product="' + x.i + '">' + img(x.p, "img") + '<span class="nm">' + x.p.name + '</span><span class="pr">' + x.p.price + "</span></button>";
    }).join("") || '<p class="none">' + (state.query.trim() ? "No shoes match “" + esc(state.query) + "”." : "No shoes in " + state.chip + ".") + "</p>";
  }
  function pick(btn) {
    Array.prototype.forEach.call(btn.parentNode.children, function (b) { b.classList.toggle("on", b === btn); });
  }
  function img(p, cls) { return '<span class="' + cls + '" style="background:' + p.bg + '">' + B.shoe(p.ink) + "</span>"; }

  var SCREENS = {
    login: function () {
      return '<form class="screen login" novalidate>' + LOGO +
        '<h1>Welcome back</h1><p class="sub">Sign in to continue shopping</p>' +
        '<label class="field"><span>Email</span><input id="email" name="email" type="email" autocomplete="username"></label>' +
        '<label class="field"><span>Password</span><input id="password" name="password" type="password" autocomplete="current-password"></label>' +
        '<p class="err" hidden>Enter your email and password.</p>' +
        '<button class="btn" type="submit">Sign in</button>' +
        '<button class="link" type="button">Forgot password?</button></form>';
    },
    home: function () {
      return '<div class="screen home"><div class="top">' + LOGO + cartButton() + "</div>" +
        '<label class="search">' + ICON.search + '<input id="search" type="search" placeholder="Search Birch" aria-label="Search Birch" value="' + esc(state.query) + '"></label>' +
        '<canvas class="promo" width="404" height="116" role="img" aria-label="Spring offer"></canvas>' +
        "<h2>Picked for you</h2>" +
        '<div class="chips">' + ["New", "Running", "Trail", "Sale"].map(function (c) { return '<button type="button" data-chip="' + c + '"' + (c === state.chip ? ' class="on"' : "") + ">" + c + "</button>"; }).join("") + "</div>" +
        '<div class="grid">' + cards() + "</div></div>";
    },
    product: function () {
      var p = B.PRODUCTS[state.product];
      return '<div class="screen product"><button class="back" type="button" data-go="home" aria-label="Back">' + ICON.back + "</button>" + cartButton() +
        img(p, "pimg") + '<div class="pinfo"><h1>' + p.name + '</h1><p class="meta">' + p.price + " · Ships in 2 days</p>" +
        '<div class="sizes">' + ["8", "9", "10", "11"].map(function (s) { return '<button type="button" data-size="' + s + '"' + (s === state.size ? ' class="on"' : "") + ">" + s + "</button>"; }).join("") + "</div>" +
        '<p class="desc">Grippy, light and built for long miles on mixed terrain.</p>' +
        '<button class="btn" type="button" data-add>Add to cart</button></div></div>';
    },
    cart: function () {
      var total = 0;
      var lines = state.cart.map(function (item, n) {
        var p = B.PRODUCTS[item.i];
        total += Number(p.price.slice(1));
        return '<div class="line">' + img(p, "img") + "<div><b>" + p.name + "</b><span>Size " + item.size + " · " + p.price + '</span></div><button class="remove" type="button" data-remove="' + n + '" aria-label="Remove ' + p.name + ", size " + item.size + '">' + ICON.x + "</button></div>";
      }).join("");
      return '<div class="screen cart-page"><div class="top"><button class="cart" type="button" data-go="home" aria-label="Back">' + ICON.back.replace("<svg", '<svg style="stroke-width:2.4"') + "</button></div>" +
        "<h1>Your cart</h1>" + (lines || '<p class="empty">Your cart is empty.</p>') +
        (lines ? '<div class="total"><span>Total</span><span>$' + total + '</span></div><button class="btn" type="button" data-checkout>Check out</button>' : "") + "</div>";
    },
    done: function () {
      return '<div class="screen done"><span class="tick">' + ICON.tick + "</span><h1>Order placed</h1><p>We sent the receipt to your email.</p>" +
        '<button class="btn" type="button" data-go="home">Keep shopping</button></div>';
    },
  };

  function show(name, how) {
    var t = document.querySelector(".toast");
    if (t) t.remove();
    state.screen = name;
    var entry = { screen: name, product: state.product };
    if (how === "replace") history.replaceState(entry, "");
    else if (how !== "pop") history.pushState(entry, "");
    root.innerHTML = SCREENS[name]();
    if (name === "home") paintPromo(root.querySelector(".promo"));
    window.scrollTo(0, 0);
  }

  // The offer is drawn, not written, so its words exist only as pixels.
  function paintPromo(c) {
    var dpr = Math.max(2, window.devicePixelRatio || 1);
    c.width = 404 * dpr;
    c.height = 116 * dpr;
    var g = c.getContext("2d");
    g.scale(dpr, dpr);
    function draw() {
      var grad = g.createLinearGradient(0, 0, 404, 116);
      grad.addColorStop(0, "#1F5B43");
      grad.addColorStop(1, "#2F7A5A");
      g.fillStyle = grad;
      g.fillRect(0, 0, 404, 116);
      g.fillStyle = "#F3BE00";
      g.beginPath();
      g.arc(362, 22, 64, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#FBFAF6";
      g.font = "760 25px 'Mona Sans', system-ui, sans-serif";
      g.fillText("Free returns", 22, 52);
      g.font = "560 16px 'Mona Sans', system-ui, sans-serif";
      g.fillText("on every pair, all spring", 22, 80);
    }
    if (document.fonts && document.fonts.load) document.fonts.load("760 25px 'Mona Sans'").then(draw, draw);
    else draw();
  }

  function toast(text) {
    clearTimeout(toastTimer);
    var old = document.querySelector(".toast");
    if (old) old.remove();
    var t = document.createElement("div");
    t.className = "toast";
    t.setAttribute("role", "status");
    t.innerHTML = "<i>" + ICON.tick + "</i><span>" + text + "</span>";
    document.body.appendChild(t);
    toastTimer = setTimeout(function () { t.remove(); }, 5000);
  }

  function signOut() {
    var m = document.querySelector(".modal");
    if (m) m.remove();
    root.inert = false;
    state.cart = [];
    state.signedIn = false;
    show("login", "replace");
    root.querySelector("#email").focus();
  }

  function sessionExpired() {
    if (document.querySelector(".modal")) return;
    root.inert = true;
    var m = document.createElement("div");
    m.className = "modal";
    m.setAttribute("role", "alertdialog");
    m.setAttribute("aria-labelledby", "expired");
    m.innerHTML = '<div><h2 id="expired">Session expired</h2><p>Please sign in again to keep shopping.</p><button type="button">OK</button></div>';
    document.body.appendChild(m);
    m.querySelector("button").focus();
    m.querySelector("button").addEventListener("click", signOut);
    m.addEventListener("keydown", function (e) {
      if (e.key === "Escape") signOut();
      else if (e.key === "Tab") { e.preventDefault(); m.querySelector("button").focus(); }
    });
  }

  window.addEventListener("popstate", function (e) {
    if (document.querySelector(".modal")) return signOut();
    var to = e.state || { screen: "login" };
    if (!state.signedIn && to.screen !== "login") return show("login", "replace");
    state.product = to.product || 0;
    show(to.screen, "pop");
  });

  root.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target;
    if (!f.email.value.trim() || !f.password.value) {
      f.querySelector(".err").hidden = false;
      return;
    }
    state.signedIn = true;
    show("home", "replace");
  });

  root.addEventListener("input", function (e) {
    if (e.target.id !== "search") return;
    state.query = e.target.value;
    root.querySelector(".grid").innerHTML = cards();
  });

  root.addEventListener("click", function (e) {
    var t = e.target.closest("button");
    if (!t) return;
    var d = t.dataset;
    if (d.go) show(d.go);
    else if (d.product != null) { state.product = Number(d.product); state.size = "9"; show("product"); }
    else if (d.chip) { state.chip = d.chip; pick(t); root.querySelector(".grid").innerHTML = cards(); }
    else if (d.remove != null) { state.cart.splice(Number(d.remove), 1); show("cart", "replace"); }
    else if (t.classList.contains("link")) toast("We sent a reset link to your email");
    else if (d.size) { state.size = d.size; pick(t); }
    else if (d.add != null) {
      state.cart.push({ i: state.product, size: state.size });
      root.querySelector(".cart").outerHTML = cartButton();
      toast("Added to cart");
    }
    else if (d.checkout != null) {
      if (release === "2.2") sessionExpired();
      else { state.cart = []; show("done"); }
    }
  });

  show("login", "replace");
})();
