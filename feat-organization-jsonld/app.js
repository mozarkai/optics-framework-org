// Theme toggle, copy buttons, the create-it selector, install tabs and the demo film.

// WebMCP: read-only tools for an agent working in this tab, on every page that loads app.js.
(function () {
  var mc = document.modelContext || navigator.modelContext;
  if (!mc || !mc.registerTool) return;
  var site = new URL(".", document.currentScript.src);
  var text = function (value) { return { content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value) }] }; };
  var markdownUrl = function (url) {
    var path = url.pathname;
    if (/\/$/.test(path)) path += "index.md";
    else if (/\.html$/.test(path)) path = path.replace(/\.html$/, ".md");
    else if (!/\.md$/.test(path)) path += ".md";
    return new URL(path, url);
  };
  var index = null;
  var tools = [
    {
      name: "search_docs",
      description: "Search the Optics documentation. Returns matching pages with their URL, a Markdown URL and a one-line summary.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Words to look for, such as 'run in CI' or 'press element'." },
          limit: { type: "integer", minimum: 1, maximum: 10, description: "How many pages to return. Defaults to 5." },
        },
        required: ["query"],
      },
      annotations: { readOnlyHint: true },
      execute: function (input) {
        var terms = String(input.query || "").toLowerCase().split(/\s+/).filter(Boolean);
        var docs = new URL("docs/", site);
        index = index || fetch(new URL("search.json", docs)).then(function (r) { return r.json(); });
        return index.then(function (pages) {
          var hits = pages.map(function (p) {
            var score = 0, title = p.t.toLowerCase(), summary = (p.d || "").toLowerCase(), body = (p.x || "").toLowerCase();
            terms.forEach(function (t) { score += (title.indexOf(t) >= 0 ? 3 : 0) + (summary.indexOf(t) >= 0 ? 2 : 0) + (body.indexOf(t) >= 0 ? 1 : 0); });
            var url = new URL(p.u, docs);
            return { score: score, title: p.t, url: url.href, markdown: markdownUrl(url).href, summary: p.d };
          }).filter(function (h) { return h.score > 0; });
          hits.sort(function (a, b) { return b.score - a.score; });
          return text(hits.slice(0, input.limit || 5).map(function (h) { delete h.score; return h; }));
        });
      },
    },
    {
      name: "get_page_markdown",
      description: "Read a page of this site as Markdown, such as /docs/run/ci or /docs/reference/keywords/actions.",
      inputSchema: {
        type: "object",
        properties: { path: { type: "string", description: "A path or URL on this site." } },
        required: ["path"],
      },
      annotations: { readOnlyHint: true },
      execute: function (input) {
        var url = new URL(String(input.path || "").replace(/^\//, ""), site);
        if (url.origin !== site.origin) return Promise.resolve(text("Only pages on " + site.origin + " can be read."));
        return fetch(markdownUrl(url)).then(function (r) {
          return r.ok ? r.text().then(text) : text("No page at " + url.pathname + ". Try search_docs.");
        });
      },
    },
  ];
  tools.forEach(function (tool) {
    try { Promise.resolve(mc.registerTool(tool)).catch(function () {}); } catch (e) {}
  });
})();

(function () {
  var root = document.documentElement;

  // ---- theme -------------------------------------------------------------
  var toggle = document.querySelector(".theme-toggle");
  function labelToggle() {
    toggle.setAttribute("aria-label", root.dataset.theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
  }
  labelToggle();
  toggle.addEventListener("click", function () {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem("optics-theme", root.dataset.theme); } catch (e) {}
    labelToggle();
  });
  // Follow the system until the visitor picks a theme themselves.
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function (e) {
    var saved = null;
    try { saved = localStorage.getItem("optics-theme"); } catch (err) {}
    if (!saved) { root.dataset.theme = e.matches ? "dark" : "light"; labelToggle(); }
  });

  // ---- copy buttons --------------------------------------------------------
  document.querySelectorAll(".cmd .copy").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.closest(".cmd").dataset.copy;
      var done = function () {
        btn.textContent = "Copied";
        btn.classList.add("done");
        setTimeout(function () { btn.textContent = "Copy"; btn.classList.remove("done"); }, 1600);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
    });
  });

  // ---- blog type filters ----------------------------------------------------
  // Shown only when there is more than one type; ?type=video opens on that filter.
  var filters = document.querySelector(".blog-filters");
  if (filters) {
    var buttons = Array.prototype.slice.call(filters.querySelectorAll("[data-filter]"));
    var cards = document.querySelectorAll(".blog-feed .entry");
    var status = document.querySelector(".blog-status");
    var show = function (type, push) {
      var shown = 0;
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.filter === type ? "true" : "false"); });
      cards.forEach(function (c) { var on = type === "all" || c.dataset.type === type; c.hidden = !on; if (on) shown++; });
      if (status) status.textContent = "Showing " + shown + (shown === 1 ? " item" : " items");
      if (push) {
        var url = new URL(location.href);
        if (type === "all") url.searchParams.delete("type"); else url.searchParams.set("type", type);
        history.replaceState(null, "", url);
      }
    };
    buttons.forEach(function (b) { b.addEventListener("click", function () { show(b.dataset.filter, true); }); });
    var wanted = new URLSearchParams(location.search).get("type");
    if (wanted && buttons.some(function (b) { return b.dataset.filter === wanted; })) show(wanted, false);
  }

  // The text pages share this script for the theme toggle only.
  if (!document.querySelector(".selector-mark")) return;

  // ---- accessible tabs (roving tabindex, arrow keys) ----------------------
  function tabs(list, onSelect) {
    var items = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    function select(tab, focus) {
      items.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
      if (onSelect) onSelect(tab);
    }
    items.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t, false); });
      t.addEventListener("keydown", function (e) {
        var k = e.key, n = items.length, j = null;
        if (k === "ArrowRight" || k === "ArrowDown") j = (i + 1) % n;
        else if (k === "ArrowLeft" || k === "ArrowUp") j = (i - 1 + n) % n;
        else if (k === "Home") j = 0;
        else if (k === "End") j = n - 1;
        if (j !== null) { e.preventDefault(); select(items[j], true); }
      });
    });
    return { select: select, items: items };
  }

  // the four ways: the logo's brackets and the tab list drive the same state
  var mark = document.querySelector(".selector-mark");
  var star = document.querySelector(".sel-star");
  var ways = tabs(document.querySelector(".ways"), function (tab) {
    mark.dataset.active = tab.dataset.way;
    star.classList.remove("pulse");
    void star.getBBox();
    star.classList.add("pulse");
  });
  mark.dataset.active = "write";
  mark.querySelectorAll(".hit").forEach(function (hit) {
    hit.addEventListener("click", function () {
      var tab = ways.items.filter(function (t) { return t.dataset.way === hit.dataset.way; })[0];
      ways.select(tab, false);
    });
  });

  tabs(document.querySelector(".os:not(.fmt)"));
  tabs(document.querySelector(".fmt"));

  // ---- full demo dialog ------------------------------------------------------
  var dialog = document.querySelector(".film-dialog");
  var film = document.getElementById("film-video");
  document.querySelector(".film-open").addEventListener("click", function () {
    dialog.showModal();
    var p = film.play(); if (p && p.catch) p.catch(function () {});
  });
  // Click on the backdrop closes it.
  dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener("close", function () { film.pause(); });
})();
