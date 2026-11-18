(function (G) {
  var C = G.OPTICS_DOORS;
  var DOORS = [["csv", "CSV"], ["python", "Python"], ["robot", "Robot"], ["http", "HTTP"], ["mcp", "MCP"]];
  var MCP_VERB = { launch_app: "launch_app", enter_text: "type_text", press_element: "tap", assert_presence: "check", go_back: "press_key" };
  var HTTP_TEXT = { 200: "OK", 404: "Not Found" };

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function span(cls, s) { return '<span class="' + cls + '">' + esc(s) + "</span>"; }
  function q(s) { return JSON.stringify(s); }

  function json(v, pad) {
    pad = pad || "";
    if (v === null || typeof v === "boolean" || typeof v === "number") return span("k-kw", String(v));
    if (typeof v === "string") return span("k-lit", q(v));
    var inner = pad + "  ";
    if (!Array.isArray(v) && !Object.keys(v).length) return span("k-dim", "{}");
    if (Array.isArray(v) && JSON.stringify(v).length > 40) return span("k-dim", "[") + "\n" + v.map(function (x) { return inner + json(x, inner); }).join(span("k-dim", ",") + "\n") + "\n" + pad + span("k-dim", "]");
    if (Array.isArray(v)) return span("k-dim", "[") + v.map(function (x) { return json(x, pad); }).join(span("k-dim", ", ")) + span("k-dim", "]");
    return span("k-dim", "{") + "\n" + Object.keys(v).map(function (k) {
      return inner + span("k-mod", q(k)) + span("k-dim", ": ") + json(v[k], inner);
    }).join(span("k-dim", ",") + "\n") + "\n" + pad + span("k-dim", "}");
  }

  function values(step, a) {
    var m = /^\$\{(\w+)\}$/.exec(a);
    return m && step.named[m[1]] ? step.named[m[1]] : [a];
  }
  function one(step, a) { var v = values(step, a); return v.length > 1 ? v : v[0]; }
  function kwArgs(step) {
    var name = step.kw;
    if (name === "assert_presence" || name === "press_element") return step.args.slice(0, 1);
    if (name === "enter_text") return step.args.slice(0, 2);
    return [];
  }
  function fill(s, step) {
    var v = values(step, step.args[0] || "");
    return s.split("{target}").join(v[0]).split("{first}").join(v[0]).split("{last}").join(v[v.length - 1]).split("{text}").join(step.args[1] || "");
  }
  function missOf(set, step) {
    var many = values(step, step.args[0] || "").length > 1;
    return (many ? set.miss_list : set.miss)[step.kw];
  }
  function deep(o, step) { return JSON.parse(fill(JSON.stringify(o), step)); }
  function failed(step) { return step.result && !step.result.ok; }

  function csv(step) {
    var row = [step.module, C.keywords[step.kw].robot].concat(kwArgs(step).map(function (a, i) { return step.secret && i === 1 ? "${password_field_value}" : a; }));
    var els = [];
    Object.keys(step.named).forEach(function (n) {
      step.named[n].forEach(function (v) { els.push(span("k-mod", n) + span("k-dim", ",") + span("k-lit", v)); });
    });
    if (step.secret) els.push(span("k-mod", "password_field_value") + span("k-dim", ",") + span("k-lit", "<redacted>"));
    var req = span("k-dim", "module_name,module_step,param_1,param_2") + "\n" + row.map(function (c, i) {
      return span(/^\$\{/.test(c) ? "k-var" : i === 0 ? "k-mod" : i === 1 ? "k-kw" : "k-lit", c);
    }).join(span("k-dim", ","));
    if (els.length) req += "\n\n" + span("k-dim", "Element_Name,Element_ID") + "\n" + els.join("\n");
    var first = step.args[0] ? values(step, step.args[0])[0] : "";
    var line = C.keywords[step.kw].robot + (first ? " (" + first + ")" : "");
    var res = step.result ? esc(line) + span("k-dim", " | " + (step.result.ok ? step.result.time.toFixed(2) + "s" : "--") + " | ") + verdict(step) : "";
    return { req: ["modules.csv", req], res: ["optics execute", res] };
  }

  function verdict(step) { return step.result.ok ? span("k-ok", "PASS") : span("k-bad", "FAIL"); }
  function pyMiss(step) { var m = missOf(C.python, step); return m ? fill(m, step) : ""; }
  function pyValue(v) { return v === null ? "None" : v === true ? "True" : v === false ? "False" : "'" + v + "'"; }

  function python(step) {
    var args = kwArgs(step).map(function (a) { return json(one(step, a)); }).join(span("k-dim", ", "));
    var req = span("k-mod", "optics") + "." + span("k-kw", step.kw) + span("k-dim", "(") + args + span("k-dim", ")");
    var res = "";
    if (failed(step)) res = span("k-bad", pyMiss(step));
    else if (step.result) res = span("k-kw", pyValue(step.kw === "launch_app" ? "…" : C.python.returns[step.kw]));
    return { req: ["test_birch.py", req], res: [failed(step) ? "raises" : "returns", res] };
  }

  function robot(step) {
    var names = Object.keys(step.named), cell = function (x) { return "    " + span("k-lit", x); };
    var vars = names.filter(function (n) { return step.named[n].length === 1; }).map(function (n) { return span("k-var", "${" + n + "}") + cell(step.named[n][0]); });
    var lists = names.filter(function (n) { return step.named[n].length > 1; }).map(function (n) {
      return "    " + span("k-var", "${" + n + "}=") + "    " + span("k-kw", "Create List") + step.named[n].map(cell).join("") + "\n";
    });
    var line = "    " + span("k-kw", C.keywords[step.kw].robot) + kwArgs(step).map(function (a) {
      return "    " + span(/^\$\{/.test(a) ? "k-var" : "k-lit", a);
    }).join("");
    var req = (vars.length ? span("k-mod", "*** Variables ***") + "\n" + vars.join("\n") + "\n\n" : "") + span("k-mod", "*** Test Cases ***") + "\n" + step.tc + "\n" + lists.join("") + line;
    return { req: ["birch.robot", req], res: ["result", step.result ? verdict(step) : ""] };
  }

  function httpReply(step) {
    if (failed(step)) { var m = missOf(C.http.run, step); return m ? deep(m, step) : null; }
    var ok = JSON.parse(JSON.stringify(C.http.run.ok));
    ok.body.data[C.http.result] = step.kw === "launch_app" ? "…" : C.python.returns[step.kw];
    return ok;
  }
  function http(step) {
    var path = C.http.paths.filter(function (p) { return /\/action$/.test(p); })[0];
    var body = { mode: C.http.mode, keyword: C.keywords[step.kw].robot, params: kwArgs(step).map(function (a) { return one(step, a); }) };
    var req = span("k-kw", "POST") + " " + esc(path) + "\n" + span("k-dim", "Host: 127.0.0.1:8000\nContent-Type: application/json") + "\n\n" + json(body);
    var r = step.result && httpReply(step), res = "";
    if (r) res = span(r.status < 300 ? "k-ok" : "k-bad", r.status + " " + HTTP_TEXT[r.status]) + "\n\n" + json(r.body);
    return { req: ["optics serve", req], res: [r ? "HTTP/1.1" : "", res], body: body };
  }

  function mcpTarget(step) {
    var v = values(step, step.args[0])[0];
    return /^\/\//.test(v) ? "xpath=" + v : v;
  }
  function mcpArgs(step) {
    if (step.kw === "enter_text") return { target: mcpTarget(step), text: step.args[1] };
    if (step.kw === "press_element") return { target: mcpTarget(step) };
    if (step.kw === "assert_presence") return { present: [step.args[0]] };
    if (step.kw === "go_back") return { key: "back" };
    return {};
  }

  function row(r) {
    return [r.ref, r.cls, '"' + r.label + '"', r.act.length ? "[" + r.act.join(",") + "]" : "", r.state, r.rid ? "#" + r.rid : ""].filter(Boolean).join(" ");
  }
  function rows(s) { return s.rows.map(row); }
  function diff(a, b) {
    var was = {}, now = {};
    a.rows.forEach(function (r) { was[r.ref] = r; });
    b.rows.forEach(function (r) { now[r.ref] = r; });
    var added = b.rows.filter(function (r) { return !was[r.ref]; }), removed = a.rows.filter(function (r) { return !now[r.ref]; });
    var relabelled = b.rows.filter(function (r) { var o = was[r.ref]; return o && (o.label !== r.label || o.state !== r.state); });
    return { added: added, removed: removed, relabelled: relabelled, was: was, fresh: removed.length * 2 > a.rows.length && added.length * 2 > b.rows.length };
  }
  function screenLines(step) {
    var a = step.before, b = step.after, d = diff(a, b);
    if (d.fresh) return ["screen " + b.digest + " · new screen"].concat(rows(b));
    if (!d.added.length && !d.removed.length && !d.relabelled.length) return ["screen " + b.digest + " · unchanged"];
    return ["screen " + b.digest + " · changed (+" + d.added.length + " -" + d.removed.length + " ~" + d.relabelled.length + ")"]
      .concat(d.relabelled.map(function (r) { var o = d.was[r.ref].label; return "~ " + row(r) + (o !== r.label ? ' (was "' + o + '")' : ""); }))
      .concat(d.added.slice(0, 40).map(function (r) { return "+ " + row(r); }))
      .concat(d.removed.slice(0, 10).map(function (r) { return "- " + r.ref + ' "' + r.label + '"'; }));
  }
  function unchanged(step) { return screenLines(step)[0].slice(-9) === "unchanged"; }
  function allRows(s) { return ["screen " + s.digest + " · " + s.rows.length + " row" + (s.rows.length === 1 ? "" : "s")].concat(rows(s)); }

  function mcpHead(step, verb, args) {
    if (verb === "launch_app") return "launch_app";
    if (verb === "press_key") return "press_key back";
    var hit = step.before.rows.filter(function (r) { return r.label.toLowerCase() === String(args.target).toLowerCase(); })[0];
    return verb + " " + (hit ? hit.ref + ' "' + hit.label + '"' : '"' + args.target + '"');
  }
  function mcpReply(step, verb, args) {
    var miss = C.mcp.replies;
    if (verb === "check") {
      var met = step.result.ok;
      return [(met ? miss.check[0] : miss.check_miss[0]), 'present "' + args.present[0] + '": ' + (met ? "met" : "not met")].concat(met ? [] : allRows(step.after));
    }
    if (!step.result.ok) return (verb === "tap" ? miss.tap_miss : miss.type_miss).map(function (l) { return l.split("{target}").join(args.target); }).concat(allRows(step.after));
    var tag = step.result.tag ? "ok (" + step.result.tag + ")" : "ok";
    return [mcpHead(step, verb, args) + " -> " + tag + " · verified: unknown" + (unchanged(step) ? " (add expect_present/expect_absent to verify)" : "")].concat(screenLines(step));
  }
  function mcp(step) {
    var verb = MCP_VERB[step.kw], args = mcpArgs(step);
    var call = { jsonrpc: "2.0", id: step.n, method: "tools/call", params: { name: verb, arguments: args } };
    var res = step.result && step.after ? mcpReply(step, verb, args).map(function (l, i) {
      if (!i) return span(step.result.ok ? "k-ok" : "k-bad", l);
      var m = /^([~+-] )?(e\d+)?(.*)$/.exec(l);
      return (m[1] ? span({ "~ ": "k-var", "+ ": "k-ok", "- ": "k-bad" }[m[1]], m[1]) : "") + (m[2] ? span("k-mod", m[2]) : "") + esc(m[3]);
    }).join("\n") : "";
    return { req: ["optics mcp", json(call)], res: [step.result ? "content[0].text" : "", res], call: call };
  }

  var API = { csv: csv, python: python, robot: robot, http: http, mcp: mcp, kwArgs: kwArgs };
  G.OpticsDoors = API;
  if (!C || typeof document === "undefined") return;
  var take;
  document.addEventListener("optics:step", function (e) {
    var host = e.detail.line && e.detail.line.closest(".pg.live");
    if (!take && host) take = ui(host);
    if (take) take(e.detail);
  });

  // ------------------------------------------------------------------ the panel
  function ui(host) {
    var B = G.BIRCH, steps = [], cut = 0, at = -1, follow = true, door = "http", refs = new WeakMap(), nextRef = 1;
    var box = document.createElement("div");
    box.className = "doors";
    box.innerHTML =
      '<div class="doors-bar">' +
        '<div class="doors-step"><button type="button" class="doors-nav" data-go="-1" aria-label="Previous step">‹</button><code class="doors-cmd"></code><button type="button" class="doors-nav" data-go="1" aria-label="Next step">›</button></div>' +
        '<div class="doors-tabs" role="tablist" aria-label="Interface">' + DOORS.map(function (d) {
          return '<button type="button" role="tab" id="door-' + d[0] + '" data-door="' + d[0] + '" aria-controls="doors-panel" aria-selected="false" tabindex="-1"><i aria-hidden="true"></i>' + d[1] + "</button>";
        }).join("") + "</div>" +
      "</div>" +
      '<div class="doors-body" id="doors-panel" role="tabpanel" tabindex="0"><section class="doors-req"><h4 class="label"></h4><pre></pre></section><section class="doors-res"><h4 class="label"></h4><pre></pre></section></div>';
    host.appendChild(box);
    var cmd = box.querySelector(".doors-cmd"), tabs = box.querySelectorAll("[role=tab]");
    var panes = { req: box.querySelector(".doors-req"), res: box.querySelector(".doors-res") };
    var hist = host.querySelector(".live-hist");

    function label(r) {
      var el = r.dataset.el, small = r.querySelector("small");
      if (small) return small.textContent;
      if (el === "search") return "Search Birch";
      if (el === "card") return r.querySelector(".bz-nm").textContent;
      return (r.getAttribute("aria-label") || r.textContent).trim();
    }
    function state(r) {
      var v = r.dataset.el === "search" ? r.querySelector(".q.typed") : r.querySelector(".v");
      if (!v || !v.textContent) return "";
      return r.dataset.el === "password" ? "(filled)" : "= " + q(v.textContent);
    }
    function read(app) {
      var scope = app.root.querySelector(".bz-" + app.screen), nodes = Array.prototype.slice.call(scope.querySelectorAll("[data-el], h5, p"));
      if (app.toastOn) nodes.push(app.root.querySelector(".bz-toast"));
      return nodes.filter(function (n) { return B.visible(n) && (n.textContent.trim() || n.dataset.el === "back"); }).map(function (n) {
        if (!refs.has(n)) refs.set(n, "e" + nextRef++);
        var field = /^(email|password|search)$/.test(n.dataset.el || "");
        return { ref: refs.get(n), cls: field ? "EditText" : n.dataset.el ? "Button" : "TextView", label: n.dataset.el ? label(n) : n.textContent.trim(), act: field ? ["tap", "input"] : n.dataset.el ? ["tap"] : [], state: field ? state(n) : "", rid: { email: "email", password: "password", signin: "login" }[n.dataset.el] || "" };
      });
    }
    function digest(s) {
      var lines = s.rows.map(function (r) { return r.cls + "|" + r.label + "|" + r.act.join(",") + "|False|" + r.state; }).sort().join("\n");
      s.digest = "······";
      if (!G.crypto || !crypto.subtle) return Promise.resolve();
      return crypto.subtle.digest("SHA-1", new TextEncoder().encode(lines)).then(function (h) {
        s.digest = Array.prototype.map.call(new Uint8Array(h).slice(0, 3), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
      });
    }

    function paint() {
      var step = steps[at];
      box.classList.toggle("on", !!step);
      tabs.forEach(function (t) {
        var on = t.dataset.door === door;
        t.setAttribute("aria-selected", on);
        t.tabIndex = on ? 0 : -1;
      });
      box.querySelector('[data-go="-1"]').disabled = at <= 0;
      box.querySelector('[data-go="1"]').disabled = at >= steps.length - 1;
      hist.querySelectorAll(".live-l.door-on").forEach(function (l) { l.classList.remove("door-on"); });
      if (!step) return;
      if (step.line) step.line.classList.add("door-on");
      cmd.textContent = step.cmd;
      var out = API[door](step);
      ["req", "res"].forEach(function (k) {
        panes[k].querySelector("h4").textContent = out[k][0];
        panes[k].querySelector("pre").innerHTML = out[k][1] || '<span class="doors-wait"></span>';
      });
    }
    function lamp(step) {
      tabs.forEach(function (t, i) {
        var lit = t.querySelector("i");
        lit.className = "";
        if (!step.result) return void (lit.className = "wait");
        setTimeout(function () { lit.className = step.result.ok ? "ok" : "bad"; }, B.reduced ? 0 : i * 70);
      });
    }
    function show(i, byHand) {
      at = Math.max(0, Math.min(steps.length - 1, i));
      if (byHand) follow = at === steps.length - 1;
      paint();
      lamp(steps[at]);
    }

    function take(d) {
      if (!d.result) {
        if (steps.length && !steps[0].line.isConnected) steps = [], cut = 0;
        var step = { n: steps.length + 1, cmd: d.cmd, kw: d.kw, args: d.args, named: d.named, secret: d.secret, module: d.module, tc: "Checkout", line: d.line, before: { rows: read(d.app) } };
        d.door = step;
        if (d.line) d.line.dataset.step = steps.length;
        steps.push(step);
        digest(step.before);
        if (follow) show(steps.length - 1);
        return;
      }
      var s = d.door;
      s.result = d.result;
      s.module = d.module;
      s.after = { rows: read(d.app) };
      digest(s.after).then(function () {
        if (steps[at] !== s) return;
        paint();
        lamp(s);
      });
    }
    document.addEventListener("optics:save", function (e) {
      steps.slice(cut).forEach(function (s) { s.module = e.detail.module; s.tc = e.detail.tc; });
      cut = steps.length;
      paint();
    });
    box.querySelector(".doors-step").addEventListener("click", function (e) {
      var b = e.target.closest("[data-go]");
      if (b) show(at + +b.dataset.go, true);
    });
    hist.addEventListener("click", function (e) {
      var l = e.target.closest(".live-l[data-step]");
      if (l && steps[+l.dataset.step]) show(+l.dataset.step, true);
    });
    function pick(t) {
      var again = door === t.dataset.door && box.classList.contains("open");
      box.classList.toggle("open", !(again && G.matchMedia("(max-width: 900px)").matches));
      door = t.dataset.door;
      paint();
      document.dispatchEvent(new CustomEvent("optics:play", { detail: "live:door:" + door }));
    }
    box.querySelector(".doors-tabs").addEventListener("click", function (e) {
      var t = e.target.closest("[role=tab]");
      if (t) pick(t);
    });
    box.querySelector(".doors-tabs").addEventListener("keydown", function (e) {
      var k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!k) return;
      e.preventDefault();
      var i = (DOORS.map(function (d) { return d[0]; }).indexOf(door) + k + DOORS.length) % DOORS.length;
      pick(tabs[i]);
      tabs[i].focus();
    });
    return take;
  }
})(typeof window === "undefined" ? globalThis : window);
