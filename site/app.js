// Theme toggle, copy buttons, the create-it selector, install tabs and the film player.
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

  // ---- hero loop -----------------------------------------------------------
  var stage = document.querySelector(".stage");
  var loop = stage.querySelector(".loop");
  var loopToggle = stage.querySelector(".loop-toggle");
  var userPaused = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function syncLoop(visible) {
    var run = !userPaused && visible !== false;
    if (run) { var p = loop.play(); if (p && p.catch) p.catch(function () {}); } else loop.pause();
    stage.classList.toggle("paused", userPaused);
    loopToggle.setAttribute("aria-label", userPaused ? "Play the preview" : "Pause the preview");
  }
  loopToggle.addEventListener("click", function () { userPaused = !userPaused; syncLoop(true); });
  // Only spend CPU on the loop while it is on screen.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) { syncLoop(entries[0].isIntersecting); }, { threshold: 0.15 }).observe(stage);
  }
  syncLoop(true);

  // ---- full demo dialog ------------------------------------------------------
  var dialog = document.querySelector(".film-dialog");
  var film = document.getElementById("film-video");
  stage.querySelector(".film-open").addEventListener("click", function () {
    dialog.showModal();
    loop.pause();
    var p = film.play(); if (p && p.catch) p.catch(function () {});
  });
  // Click on the backdrop closes it.
  dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener("close", function () { film.pause(); syncLoop(true); });
})();
