// First-party analytics: what visitors read and do, posted to this domain's /e endpoint.
// No cookies; the visit id lives in this tab's sessionStorage and ends with it. Browsers
// that send Global Privacy Control or Do Not Track send nothing. See /privacy.
(function () {
  if (location.hostname !== "optics-framework.org" || navigator.globalPrivacyControl || navigator.doNotTrack === "1") return;

  var session = function (key, value) {
    try { if (value === undefined) return sessionStorage.getItem(key); sessionStorage.setItem(key, value); } catch (e) {}
    return null;
  };
  var visit = session("optics-visit");
  var landing = !visit;
  if (!visit) { visit = Math.random().toString(36).slice(2, 12); session("optics-visit", visit); }
  var device = innerWidth < 700 ? "mobile" : innerWidth < 1100 ? "tablet" : "desktop";
  var root = document.documentElement;

  // ---- queue -------------------------------------------------------------------
  var queue = [], timer = null;
  function flush() {
    clearTimeout(timer); timer = null;
    while (queue.length) {
      var body = JSON.stringify({ v: visit, p: location.pathname, d: device, e: queue.splice(0, 20) });
      if (!(navigator.sendBeacon && navigator.sendBeacon("/e", body))) fetch("/e", { method: "POST", body: body, keepalive: true }).catch(function () {});
    }
  }
  function track(name, target, value) {
    queue.push([name, target == null ? "" : String(target).slice(0, 200), typeof value === "number" && isFinite(value) ? Math.round(value * 1000) / 1000 : null]);
    if (queue.length >= 20) flush(); else if (!timer) timer = setTimeout(flush, 5000);
  }
  var firstLine = function (text) { return String(text || "").trim().split("\n")[0]; };
  var on = function (el, type, fn, opts) { if (el) el.addEventListener(type, function (e) { try { fn(e); } catch (err) {} }, opts); };

  // ---- the view --------------------------------------------------------------------
  // Same-site referrers keep their path, so a visit reads as a path through the site.
  function from() {
    try {
      var r = new URL(document.referrer);
      return r.host === location.host ? r.pathname : r.host + r.pathname.replace(/\/$/, "");
    } catch (e) { return ""; }
  }
  function view() {
    track("view", from());
    var params = new URLSearchParams(location.search);
    var campaign = params.get("ref") || params.get("utm_source");
    if (campaign) track("campaign", campaign);
    if (landing) {
      track("pref", "theme:" + root.dataset.theme);
      track("pref", "lang:" + (navigator.language || ""));
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) track("pref", "motion:reduce");
    }
  }
  // A prerendered page counts once the visitor actually opens it.
  if (document.prerendering) on(document, "prerenderingchange", view, { once: true }); else view();

  // ---- sections seen and how far they read ------------------------------------------
  if ("IntersectionObserver" in window) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { track("section", e.target.id); seen.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -40% 0px" });
    document.querySelectorAll("main section[id], .prose h2[id]").forEach(function (el) { seen.observe(el); });
  }
  var depth = 0, visibleSince = document.visibilityState === "visible" ? performance.now() : null, seconds = 0;
  function measure() {
    var reached = (scrollY + innerHeight) / Math.max(root.scrollHeight, 1);
    depth = Math.max(depth, reached > 0.98 ? 100 : Math.floor(reached * 4) * 25);
  }
  measure();
  on(window, "scroll", measure, { passive: true });
  on(window, "pageshow", function (e) { if (e.persisted) view(); });

  // ---- web vitals, from the browser's own timings ------------------------------------
  var vitals = { LCP: null, CLS: 0, INP: null };
  function observe(type, fn, extra) {
    try { new PerformanceObserver(function (list) { list.getEntries().forEach(fn); }).observe(Object.assign({ type: type, buffered: true }, extra)); } catch (e) {}
  }
  observe("largest-contentful-paint", function (e) { vitals.LCP = e.startTime; });
  observe("layout-shift", function (e) { if (!e.hadRecentInput) vitals.CLS += e.value; });
  observe("event", function (e) { if (e.interactionId) vitals.INP = Math.max(vitals.INP || 0, e.duration); }, { durationThreshold: 40 });

  var reported = false;
  on(document, "visibilitychange", function () {
    if (document.visibilityState === "visible") { visibleSince = performance.now(); return; }
    if (visibleSince !== null) seconds += (performance.now() - visibleSince) / 1000;
    visibleSince = null;
    track("read", String(depth), seconds);
    seconds = 0;
    if (!reported) {
      reported = true;
      var nav = performance.getEntriesByType("navigation")[0];
      if (nav) track("vital", "TTFB", nav.responseStart);
      Object.keys(vitals).forEach(function (k) { if (vitals[k] !== null) track("vital", k, vitals[k]); });
    }
    flush();
  });
  on(window, "pagehide", flush);

  // ---- docs search: the query once typing pauses, and how many results it found ------
  var search = document.querySelector(".search-dialog");
  var searchInput = search && search.querySelector(".search-input"), searchTimer = null, lastQuery = "";
  function searched() {
    clearTimeout(searchTimer);
    var q = searchInput.value.trim().slice(0, 80);
    if (q && q !== lastQuery) { lastQuery = q; track("search", q, search.querySelectorAll(".search-results a").length); }
  }
  on(searchInput, "input", function () { clearTimeout(searchTimer); searchTimer = setTimeout(searched, 1200); });
  on(search, "close", searched);

  // ---- clicks ------------------------------------------------------------------------
  var REGIONS = [
    ["toc", ".toc"], ["pager", ".pager"], ["search", ".search-results"], ["sidebar", ".sidebar"], ["crumbs", ".crumbs"],
    ["page-actions", ".page-actions"], ["edit", ".doc-edit"], ["helpful", ".helpful"], ["header", "header"],
    ["footer", "footer"], ["cards", ".cards"], ["blog", ".blog-feed"], ["content", "main"],
  ];
  var region = function (el) {
    for (var i = 0; i < REGIONS.length; i++) if (el.closest(REGIONS[i][1])) return REGIONS[i][0];
    return "other";
  };
  var tabGroup = function (el) {
    var set = el.closest(".doc-tabs");
    if (set) return set.dataset.group || "tabs";
    var list = el.closest('[role="tablist"]');
    return list ? list.classList[0] || "tabs" : "tabs";
  };
  function link(a) {
    var url;
    try { url = new URL(a.getAttribute("href"), location.href); } catch (e) { return; }
    if (url.protocol === "mailto:") track("out", "mailto");
    else if (url.host !== location.host) { track("out", url.host + url.pathname.replace(/\/$/, "")); flush(); }
    else track("nav", region(a) + ":" + url.pathname + url.hash);
  }
  function click(e) {
    var el = e.target.closest && e.target.closest('a[href], button, [role="tab"]');
    if (!el) return;
    if (el.matches('[role="tab"]')) track("tab", tabGroup(el) + ":" + (el.dataset.tab || el.dataset.way || el.textContent.trim()));
    else if (el.matches(".page-copy")) track("copy", "page-markdown");
    else if (el.matches(".copy")) track("copy", firstLine(el.dataset.copy || (el.closest(".cmd") || el).dataset.copy));
    else if (el.matches(".search-results a")) {
      searched();
      track("result", el.pathname + el.hash,Array.prototype.indexOf.call(el.closest(".search-results").querySelectorAll("a"), el) + 1);
    }
    else if (el.matches("[data-vote]")) track("helpful", el.dataset.vote);
    else if (el.matches("[data-filter]")) track("filter", el.dataset.filter);
    else if (el.matches(".theme-toggle")) setTimeout(function () { track("theme", root.dataset.theme); });
    else if (el.matches(".sc-restart, .sc-toggle")) {
      var scene = el.closest("[data-scene]");
      var action = el.matches(".sc-restart") ? "replay" : /pause/i.test(el.getAttribute("aria-label")) ? "pause" : "play";
      track("scene", (scene ? scene.dataset.scene : "scene") + ":" + action);
    }
    else if (el.matches(".film-open")) track("film", "open");
    else if (el.matches(".menu-toggle, .search-open")) track("ui", el.classList.contains("menu-toggle") ? "menu" : "search-open");
    if (el.matches("a[href]")) link(el);
  }
  on(document, "click", click, true);
  on(document, "auxclick", function (e) { if (e.button === 1) click(e); }, true);

  // Copying a command by hand counts too; other text only counts as copied.
  on(document, "copy", function () {
    var sel = getSelection();
    var node = sel && sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
    if (node && node.closest("pre, code, .cmd")) track("copy", "manual:" + firstLine(sel.toString()));
    else track("copy", "text", sel ? sel.toString().length : null);
  });

  on(document, "change", function (e) {
    if (e.target.matches(".task input[type=checkbox]")) {
      var item = e.target.closest("li") || e.target.parentElement;
      track("check", item.textContent.trim().slice(0, 80), e.target.checked ? 1 : 0);
    }
  });
  on(document, "toggle", function (e) {
    if (e.target.tagName === "DETAILS" && e.target.open) {
      var summary = e.target.querySelector("summary");
      track("details", summary ? summary.textContent.trim() : "");
    }
  }, true);


  // ---- the demo film ---------------------------------------------------------------
  var film = document.getElementById("film-video");
  if (film) {
    var marks = {};
    on(film, "play", function () { track("film", "play", film.currentTime); });
    on(film, "pause", function () { if (!film.ended) track("film", "pause", film.currentTime); });
    on(film, "ended", function () { track("film", "100"); });
    on(film, "timeupdate", function () {
      var part = Math.floor((film.currentTime / film.duration) * 4) * 25;
      if (part >= 25 && part < 100 && !marks[part]) { marks[part] = true; track("film", String(part)); }
    });
    on(document.querySelector(".film-dialog"), "close", function () { track("film", "close", film.currentTime); });
  }

  // ---- errors in the site's own scripts --------------------------------------------
  var errors = 0;
  function error(message, where) {
    if (errors++ < 5) track("error", String(message).slice(0, 150) + (where ? " @" + where : ""));
  }
  on(window, "error", function (e) { error(e.message, (e.filename || "").split("/").pop().split("?")[0] + ":" + e.lineno); });
  on(window, "unhandledrejection", function (e) { error(e.reason && e.reason.message || e.reason); });
})();
