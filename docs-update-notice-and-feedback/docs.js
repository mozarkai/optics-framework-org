// Docs pages: sidebar drawer, synced tabs, copy buttons, "On this page" tracking,
// search, the helpful widget and checklists. Animated figures live in scenes.js.
(function () {
  var body = document.body;
  var docsRoot = body.dataset.docsRoot || "./";
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };

  // ---- sidebar drawer (narrow screens) ---------------------------------------
  var menu = document.querySelector(".menu-toggle");
  var sidebar = document.getElementById("sidebar");
  var scrim = document.querySelector(".scrim");
  function drawer(open) {
    sidebar.classList.toggle("open", open);
    scrim.hidden = !open;
    menu.setAttribute("aria-expanded", open ? "true" : "false");
    menu.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    if (open) { var cur = sidebar.querySelector('[aria-current="page"]'); if (cur) cur.scrollIntoView({ block: "center" }); }
  }
  menu.addEventListener("click", function () { drawer(!sidebar.classList.contains("open")); });
  scrim.addEventListener("click", function () { drawer(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && sidebar.classList.contains("open")) drawer(false); });
  // Keep the current page in view in the desktop sidebar.
  var current = sidebar.querySelector('[aria-current="page"]');
  if (current && current.offsetTop > sidebar.clientHeight * 0.6) current.scrollIntoView({ block: "center" });

  // ---- tabs, synced by group and remembered ---------------------------------
  var sets = Array.prototype.slice.call(document.querySelectorAll(".doc-tabs"));
  function choose(set, label, focus) {
    var tabs = set.querySelectorAll(':scope > .os > [role="tab"]');
    var found = false;
    tabs.forEach(function (t) { if (t.dataset.tab === label) found = true; });
    if (!found) return false;
    tabs.forEach(function (t) {
      var on = t.dataset.tab === label;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      if (on && focus) t.focus();
    });
    return true;
  }
  function chooseGroup(group, label, origin) {
    sets.forEach(function (s) { if (s !== origin && s.dataset.group === group) choose(s, label, false); });
  }
  sets.forEach(function (set) {
    var group = set.dataset.group;
    var saved = group && store.get("optics-tab:" + group);
    if (saved) choose(set, saved, false);
    var tabs = Array.prototype.slice.call(set.querySelectorAll(':scope > .os > [role="tab"]'));
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () {
        var y = t.getBoundingClientRect().top;
        choose(set, t.dataset.tab, false);
        if (group) { store.set("optics-tab:" + group, t.dataset.tab); chooseGroup(group, t.dataset.tab, set); }
        // Keep the clicked tab where it was when other sets above change height.
        window.scrollBy(0, t.getBoundingClientRect().top - y);
      });
      t.addEventListener("keydown", function (e) {
        var j = null, n = tabs.length;
        if (e.key === "ArrowRight") j = (i + 1) % n;
        else if (e.key === "ArrowLeft") j = (i - 1 + n) % n;
        if (j !== null) { e.preventDefault(); tabs[j].click(); tabs[j].focus(); }
      });
    });
  });

  // ---- copy buttons ------------------------------------------------------------
  function copied(btn, label) {
    var span = btn.querySelector("span") || btn;
    var was = span.textContent;
    span.textContent = label || "Copied";
    btn.classList.add("done");
    setTimeout(function () { span.textContent = was; btn.classList.remove("done"); }, 1600);
  }
  function writeClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    ta.remove();
    return Promise.resolve();
  }
  document.querySelectorAll(".doc-code .copy").forEach(function (btn) {
    btn.addEventListener("click", function () { writeClipboard(btn.dataset.copy).then(function () { copied(btn); }); });
  });
  var pageCopy = document.querySelector(".page-copy");
  if (pageCopy) pageCopy.addEventListener("click", function () {
    fetch(pageCopy.dataset.md).then(function (r) { return r.text(); }).then(writeClipboard).then(function () { copied(pageCopy, "Copied as Markdown"); });
  });

  // ---- on this page ------------------------------------------------------------
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".toc a"));
  if (tocLinks.length && "IntersectionObserver" in window) {
    var heads = tocLinks.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); }).filter(Boolean);
    var visible = new Set();
    var mark = function () {
      var active = null;
      for (var i = 0; i < heads.length; i++) { if (heads[i].getBoundingClientRect().top < Math.max(160, innerHeight * .35)) active = heads[i]; }
      if (!active) active = heads[0];
      tocLinks.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + active.id); });
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); });
      mark();
    }, { rootMargin: "-100px 0px -55% 0px" });
    heads.forEach(function (h) { io.observe(h); });
    window.addEventListener("scroll", function () { requestAnimationFrame(mark); }, { passive: true });
    mark();
  }

  // ---- long tables -------------------------------------------------------------
  // Every row stays in the page, so search engines, agents and the Markdown twin keep the whole table.
  var LONG = 12, SHOWN = 8, FILTERED = 15;
  var longTables = [];
  document.querySelectorAll(".prose .table-wrap").forEach(function (wrap, n) {
    var rows = Array.prototype.slice.call(wrap.querySelectorAll("tbody > tr"));
    if (rows.length <= LONG) return;
    var box = document.createElement("div");
    box.className = "long-table clipped";
    wrap.parentNode.insertBefore(box, wrap);
    box.appendChild(wrap);
    wrap.id = wrap.id || "long-table-" + n;
    rows.forEach(function (r, i) { if (i >= SHOWN) r.classList.add("more"); });
    var bar = document.createElement("button");
    bar.type = "button";
    bar.className = "table-more";
    bar.setAttribute("aria-controls", wrap.id);
    box.appendChild(bar);
    var filter = null, live = null;
    function setOpen(open) {
      box.classList.toggle("clipped", !open);
      bar.setAttribute("aria-expanded", open ? "true" : "false");
      bar.textContent = open ? "Show fewer rows" : "Show all " + rows.length + " rows";
    }
    bar.addEventListener("click", function () {
      var open = box.classList.contains("clipped");
      setOpen(open);
      if (!open) box.scrollIntoView({ block: "nearest" });
    });
    if (rows.length > FILTERED) {
      filter = document.createElement("input");
      filter.type = "search";
      filter.className = "table-filter";
      filter.placeholder = "Filter " + rows.length + " rows";
      filter.setAttribute("aria-label", "Filter the rows of this table");
      filter.setAttribute("aria-controls", wrap.id);
      live = document.createElement("p");
      live.className = "sr-only";
      live.setAttribute("aria-live", "polite");
      box.insertBefore(filter, wrap);
      box.appendChild(live);
      filter.addEventListener("input", function () {
        var q = filter.value.trim().toLowerCase();
        var hits = 0;
        rows.forEach(function (r) {
          var on = !q || r.textContent.toLowerCase().indexOf(q) > -1;
          r.hidden = !on;
          if (on) hits++;
        });
        box.classList.toggle("filtering", !!q);
        live.textContent = q ? hits + " of " + rows.length + " rows match" : "";
      });
    }
    setOpen(false);
    longTables.push({ box: box, open: function () { setOpen(true); } });
  });
  function openAllTables() { longTables.forEach(function (t) { t.open(); }); }
  function openTableAt(hash) {
    var target = hash && document.getElementById(decodeURIComponent(hash.slice(1)));
    var box = target && target.closest && target.closest(".long-table");
    if (box) longTables.forEach(function (t) { if (t.box === box) t.open(); });
  }
  if (longTables.length) {
    // The browser's own find cannot see rows that are not shown, so Cmd/Ctrl+F shows them first.
    document.addEventListener("keydown", function (e) { if (e.key.toLowerCase() === "f" && (e.metaKey || e.ctrlKey)) openAllTables(); });
    window.addEventListener("beforeprint", openAllTables);
    window.addEventListener("hashchange", function () { openTableAt(location.hash); });
    openTableAt(location.hash);
  }

  // ---- was this helpful --------------------------------------------------------
  var helpful = document.querySelector(".helpful");
  if (helpful) helpful.querySelectorAll("[data-vote]").forEach(function (b) {
    b.addEventListener("click", function () {
      helpful.querySelector(".helpful-btns").hidden = true;
      var thanks = helpful.querySelector(".helpful-thanks");
      if (b.dataset.vote === "yes") thanks.textContent = "Thanks for telling us.";
      thanks.hidden = false;
    });
  });

  // ---- checklists remember their ticks ----------------------------------------
  document.querySelectorAll(".task input[type=checkbox]").forEach(function (box, i) {
    var key = "optics-check:" + location.pathname + ":" + (box.dataset.key || i);
    box.checked = store.get(key) === "1";
    box.addEventListener("change", function () { store.set(key, box.checked ? "1" : "0"); });
  });

  // ---- search ------------------------------------------------------------------
  var dialog = document.querySelector(".search-dialog");
  var input = dialog.querySelector(".search-input");
  var list = dialog.querySelector(".search-results");
  var empty = dialog.querySelector(".search-empty");
  var index = null, loading = null, selected = 0;

  function load() {
    if (index) return Promise.resolve(index);
    if (!loading) loading = fetch(docsRoot + "search.json").then(function (r) { return r.json(); }).then(function (d) { index = d; return d; });
    return loading;
  }
  function openSearch() {
    if (dialog.open) return;
    dialog.showModal();
    input.select();
    load().then(run);
  }
  document.querySelector(".search-open").addEventListener("click", openSearch);
  dialog.querySelector(".search-close").addEventListener("click", function () { dialog.close(); });
  dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
  document.addEventListener("keydown", function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
    if ((e.key === "/" && !typing) || (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey))) { e.preventDefault(); openSearch(); }
  });

  var escHtml = function (s) { return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  function snippet(text, terms) {
    var lower = text.toLowerCase(), at = -1;
    for (var i = 0; i < terms.length && at < 0; i++) at = lower.indexOf(terms[i]);
    if (at < 0) return escHtml(text.slice(0, 140));
    var start = Math.max(0, at - 50);
    var s = escHtml((start ? "…" : "") + text.slice(start, start + 160));
    terms.forEach(function (t) { if (t.length > 1) s = s.replace(new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig"), "<mark>$1</mark>"); });
    return s;
  }
  function run() {
    if (!index) return;
    var q = input.value.trim().toLowerCase();
    var terms = q.split(/\s+/).filter(Boolean);
    var results;
    if (!terms.length) {
      results = ["get-started/quickstart", "get-started/install", "create/", "reference/keywords/", "reference/cli", "help/troubleshooting"]
        .map(function (u) { return index.filter(function (p) { return p.u === u; })[0]; }).filter(Boolean)
        .map(function (p) { return { p: p, hash: "", text: escHtml(p.d) }; });
    } else {
      results = [];
      index.forEach(function (p) {
        var title = p.t.toLowerCase(), desc = p.d.toLowerCase(), text = p.x.toLowerCase();
        var score = 0, hash = "", all = true;
        terms.forEach(function (t) {
          var s = 0;
          if (title.indexOf(t) > -1) s += title.indexOf(t) === 0 ? 14 : 10;
          if (desc.indexOf(t) > -1) s += 4;
          p.h.forEach(function (h) { if (h[0].toLowerCase().indexOf(t) > -1) { s += 5; if (!hash) hash = h[1]; } });
          var n = text.split(t).length - 1;
          s += Math.min(n, 6) * 0.6;
          if (!s) all = false;
          score += s;
        });
        // A heading that contains the whole query is the best place to land.
        // Link the best heading for the whole query: exact, then starts with it, then contains it; the first wins a tie.
        var best = 0;
        p.h.forEach(function (h) { var l = h[0].toLowerCase(), at = l.indexOf(q); if (at > -1 && terms.length) { var rank = l === q ? 3 : at === 0 ? 2 : 1; score += rank === 3 ? 30 : 12; if (rank > best) { best = rank; hash = h[1]; } } });
        if (title.indexOf(q) > -1) score += 12;
        var nav = (p.n || "").toLowerCase();
        if (nav === q || title === q) { score += 45; hash = ""; }
        else if (nav && nav.indexOf(q) > -1) score += 10;
        if ((" " + title.replace(/[^\w ]/g, " ") + " ").indexOf(" " + q + " ") > -1) { score += 20; hash = ""; }
        if (p.s === "Help") score *= 0.75;
        if (text.indexOf(q) > -1 && terms.length > 1) score += 6;
        if (all && score) results.push({ p: p, score: score, hash: hash, text: snippet(p.x, terms) });
      });
      results.sort(function (a, b) { return b.score - a.score; });
      results = results.slice(0, 12);
    }
    selected = 0;
    list.innerHTML = results.map(function (r, i) {
      return '<li><a role="option" href="' + docsRoot + r.p.u + (r.hash ? "#" + r.hash : "") + '" aria-selected="' + (i === 0) + '"><span class="sr-title"><span class="sr-sec">' + escHtml(r.p.s) + "</span>" + escHtml(r.p.t) + '</span><span class="sr-text">' + r.text + "</span></a></li>";
    }).join("");
    empty.hidden = results.length > 0;
  }
  input.addEventListener("input", function () { load().then(run); });
  input.addEventListener("keydown", function (e) {
    var items = list.querySelectorAll("a");
    if (!items.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      items[selected].setAttribute("aria-selected", "false");
      selected = (selected + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[selected].setAttribute("aria-selected", "true");
      items[selected].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[selected].click();
    }
  });
  list.addEventListener("click", function (e) { if (e.target.closest("a")) dialog.close(); });
})();
