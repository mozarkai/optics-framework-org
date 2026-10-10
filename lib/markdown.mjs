// A small Markdown renderer for the docs, written for this site so the build keeps
// no dependencies. It covers what the pages use: headings, paragraphs, lists, tables,
// blockquotes, fenced code with a title and highlighting, and a few directives:
//
//   :::note[Title] / :::tip / :::warning / :::mistake   callouts
//   :::steps        each ### heading inside becomes a numbered step
//   :::tabs{group="os"} with ::tab[Label] lines         tab sets, synced by group
//   :::cards{cols="3"}  a list of "[Title](url): text {Badge}" items
//   :::details[Summary] a collapsed section
//   ::scene{name="ladder" caption="…"}                  an animated figure (docs.js)
//
// A container closes with a line of the same number of colons it opened with, so a
// directive can sit inside another one by using more colons on the outer one.

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const attrEsc = (s) => esc(s).replace(/"/g, "&quot;");

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/`/g, "")
    .replace(/&[a-z]+;/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export function parseAttrs(text = "") {
  const attrs = {};
  for (const [, key, quoted, bare] of text.matchAll(/([\w-]+)=(?:"([^"]*)"|(\S+))/g)) attrs[key] = quoted ?? bare;
  return attrs;
}

export function splitFrontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { front: {}, body: src };
  const front = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) front[kv[1]] = kv[2].replace(/^"(.*)"$/, "$1");
  }
  return { front, body: src.slice(m[0].length) };
}

// ---------------------------------------------------------------- inline

const INLINE_TAGS = /^<\/?(kbd|br|span|abbr|sup|sub|small|code)(\s[^>]*)?\/?>/;

export function inline(text, ctx) {
  const out = [];
  let i = 0;
  let buf = "";
  const flush = () => { if (buf) { out.push(emphasis(esc(buf))); buf = ""; } };
  while (i < text.length) {
    const c = text[i];
    if (c === "\\" && /[\\`*_{}\[\]()#+\-.!|<>~]/.test(text[i + 1] ?? "")) { buf += text[i + 1]; i += 2; continue; }
    if (c === "`") {
      const run = text.slice(i).match(/^`+/)[0];
      const end = text.indexOf(run, i + run.length);
      if (end > -1) {
        flush();
        const code = text.slice(i + run.length, end).replace(/^ (.*) $/, "$1");
        out.push(`<code class="ic">${esc(code)}</code>`);
        i = end + run.length;
        continue;
      }
    }
    if (c === "[" && text[i + 1] === "[") {
      const end = text.indexOf("]]", i);
      if (end > -1) { flush(); out.push(`<kbd>${esc(text.slice(i + 2, end))}</kbd>`); i = end + 2; continue; }
    }
    if (c === "!" && text[i + 1] === "[") {
      const m = text.slice(i).match(/^!\[([^\]]*)\]\(([^)\s]+)\)/);
      if (m) { flush(); out.push(`<img src="${attrEsc(ctx.link(m[2]))}" alt="${attrEsc(m[1])}" loading="lazy">`); i += m[0].length; continue; }
    }
    if (c === "[") {
      const m = matchLink(text, i);
      if (m) {
        flush();
        const href = ctx.link(m.url);
        const ext = /^https?:/.test(href) ? ' rel="noopener"' : "";
        out.push(`<a href="${attrEsc(href)}"${ext}>${inline(m.label, ctx)}</a>`);
        i = m.end;
        continue;
      }
    }
    if (c === "<") {
      const m = text.slice(i).match(INLINE_TAGS);
      if (m) { flush(); out.push(m[0]); i += m[0].length; continue; }
    }
    buf += c;
    i++;
  }
  flush();
  return out.join("");
}

function matchLink(text, start) {
  let depth = 0;
  for (let j = start; j < text.length; j++) {
    if (text[j] === "`") { const k = text.indexOf("`", j + 1); if (k < 0) return null; j = k; continue; }
    if (text[j] === "[") depth++;
    else if (text[j] === "]" && --depth === 0) {
      const m = text.slice(j + 1).match(/^\(([^)\s]+)\)/);
      if (!m) return null;
      return { label: text.slice(start + 1, j), url: m[1], end: j + 1 + m[0].length };
    }
  }
  return null;
}

function emphasis(s) {
  return s
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*(?=\S)([^*]*?\S)\*(?!\w)/g, "$1<em>$2</em>")
    .replace(/ -- /g, " – ");
}

// ---------------------------------------------------------------- highlighting

const span = (cls, s) => `<span class="${cls}">${s}</span>`;
const vars = (s) => s.replace(/\$\{[^}]+\}/g, (m) => span("c-var", m));

const HL = {
  csv(code) {
    return code.split("\n").map((line, n) => {
      if (n === 0 && /^[A-Za-z_ ]+(,[A-Za-z_0-9 ]+)+$/.test(line)) return span("c-dim", esc(line));
      if (!line.trim()) return "";
      const cells = splitCsv(line).map(esc);
      return cells.map((cell, j) => (j === 0 ? span("c-mod", vars(cell)) : j === 1 ? `<b>${vars(cell)}</b>` : vars(cell))).join(span("c-dim", ","));
    }).join("\n");
  },
  yaml(code) {
    return code.split("\n").map((raw) => {
      let line = esc(raw);
      const hash = line.search(/(^|\s)#/);
      let comment = "";
      if (hash > -1) { comment = span("c-dim", line.slice(hash)); line = line.slice(0, hash); }
      line = line.replace(/^(\s*(?:- )?)([^:'"]+?)(:)(\s|$)/, (_, a, k, c, s) => `${a}${span("c-mod", k)}${span("c-dim", c)}${s}`);
      line = line.replace(/("[^"]*"|'[^']*')/g, (m) => span("c-lit", m));
      line = line.replace(/(:\s+)(true|false|null|\d+(?:\.\d+)?)\s*$/, (_, a, v) => a + span("c-info", v));
      return vars(line) + comment;
    }).join("\n");
  },
  shell(code) {
    return code.split("\n").map((raw) => {
      const line = esc(raw);
      const p = line.match(/^(\$|&gt;|PS&gt;) (.*)$/);
      if (p) return `${span("prompt", p[1])} ${shellCmd(p[2])}`;
      if (/^\s*#/.test(line)) return span("c-dim", line);
      return outputLine(line);
    }).join("\n");
  },
  terminal(code) {
    return code.split("\n").map((raw) => {
      const line = esc(raw);
      const p = line.match(/^(\$|❯|›|ai ›) (.*)$/);
      if (p) return `${span(p[1] === "ai ›" ? "c-run" : "prompt", p[1])} <b>${p[2]}</b>`;
      return outputLine(line);
    }).join("\n");
  },
  json(code) {
    return esc(code)
      .replace(/("(?:[^"\\]|\\.)*")(\s*:)/g, (_, k, c) => span("c-mod", k) + c)
      .replace(/(:\s*|\[\s*|,\s*)("(?:[^"\\]|\\.)*")/g, (_, a, v) => a + span("c-lit", v))
      .replace(/(:\s*)(true|false|null|-?\d+(?:\.\d+)?)/g, (_, a, v) => a + span("c-info", v));
  },
  python(code) {
    return code.split("\n").map((raw) => {
      let line = esc(raw);
      let comment = "";
      const hash = line.indexOf("#");
      if (hash > -1 && !/["']/.test(line.slice(0, hash).replace(/(["'])(?:(?!\1).)*\1/g, ""))) { comment = span("c-dim", line.slice(hash)); line = line.slice(0, hash); }
      line = line.replace(/("[^"]*"|'[^']*')|\b(from|import|as|def|class|return|with|for|in|if|else|elif|try|except|finally|None|True|False|await|async|not|and|or)\b/g,
        (m, str, kw) => (str ? span("c-lit", str) : span("c-info", kw)));
      return line + comment;
    }).join("\n");
  },
  robot(code) {
    return code.split("\n").map((raw) => {
      const line = esc(raw);
      if (/^\*\*\*/.test(line)) return span("c-mod", line);
      if (/^\s*#/.test(line)) return span("c-dim", line);
      if (/^\S/.test(line)) return `<b>${line}</b>`;
      return vars(line.replace(/^(\s+)(\S+(?: \S+)*)/, (_, a, k) => a + span("c-info", k)));
    }).join("\n");
  },
  xml(code) {
    return esc(code).replace(/(&lt;\/?[\w:-]+)([^&]*?)(\/?&gt;)/g, (_, a, b, c) => span("c-mod", a) + b.replace(/("[^"]*")/g, (m) => span("c-lit", m)) + span("c-mod", c));
  },
  tree(code) {
    return esc(code).split("\n").map((line) => {
      const m = line.match(/^([\s│├└─]*)(.*?)(\s+#.*)?$/);
      const name = m[2].endsWith("/") ? span("c-mod", m[2]) : m[2];
      return span("c-dim", m[1]) + name + (m[3] ? span("c-dim", m[3]) : "");
    }).join("\n");
  },
  diff(code) {
    return code.split("\n").map((raw) => {
      const line = esc(raw);
      if (line.startsWith("+")) return span("d-add", line);
      if (line.startsWith("-")) return span("d-del", line);
      return span("d-ctx", line);
    }).join("\n");
  },
};
HL.bash = HL.sh = HL.console = HL.powershell = HL.shell;
HL.yml = HL.yaml;
HL.py = HL.python;
HL.text = HL.output = (code) => code.split("\n").map((l) => outputLine(esc(l))).join("\n");

function shellCmd(s) {
  return s.replace(/(\s#.*)$/, (m) => span("c-dim", m)).replace(/^(\S+)/, "<b>$1</b>").replace(/(\s)(--?[\w-]+)/g, (_, a, f) => a + span("c-info", f));
}

function outputLine(line) {
  return line
    .replace(/(✓|PASS(?:ED)?\b|Passed)/g, (m) => span("c-pass", m))
    .replace(/(✗|FAIL(?:ED)?\b|ERROR\b|Failed: [1-9]\d*)/g, (m) => span("c-fail", m))
    .replace(/(•|ℹ)/g, (m) => span("c-info", m))
    .replace(/(\[(?:XPath|Text|OCR|Image|AI)\])/g, (m) => span("c-dim", m));
}

function splitCsv(line) {
  const cells = [];
  let cur = "", q = false;
  for (const ch of line) {
    if (ch === '"') { q = !q; cur += ch; } else if (ch === "," && !q) { cells.push(cur); cur = ""; } else cur += ch;
  }
  cells.push(cur);
  return cells;
}

export function highlight(code, lang) {
  const fn = HL[lang];
  return fn ? fn(code) : esc(code);
}

// The text a Copy button puts on the clipboard: commands without their prompts.
function copyText(code, lang) {
  if (HL[lang] === HL.shell) {
    const cmds = code.split("\n").filter((l) => /^(\$|>|PS>) /.test(l)).map((l) => l.replace(/^(\$|>|PS>) /, ""));
    if (cmds.length) return cmds.join("\n");
  }
  return code;
}

// ---------------------------------------------------------------- blocks

const HTML_BLOCK = /^<(div|figure|section|table|details|aside|p|ul|ol|dl|svg|pre|video|iframe|nav|!--)/;

export function render(src, ctx) {
  const lines = src.replace(/\r\n?/g, "\n").replace(/\t/g, "    ").split("\n");
  return blocks(lines, ctx);
}

function blocks(lines, ctx) {
  const out = [];
  let i = 0;
  const isBlank = (l) => !l || !l.trim();

  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) { i++; continue; }

    // fenced code
    const fence = line.match(/^(\s*)(```+|~~~+)\s*([\w+-]*)\s*(.*)$/);
    if (fence) {
      const [, indent, marker, lang, info] = fence;
      const body = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(marker)) body.push(lines[i++].slice(indent.length));
      i++;
      out.push(codeBlock(body.join("\n"), lang || "text", parseAttrs(info)));
      continue;
    }

    // container directive
    const open = line.match(/^(:{3,})(\w[\w-]*)(?:\[([^\]]*)\])?(?:\{(.*)\})?\s*$/);
    if (open) {
      const [, colons, name, label, attrs] = open;
      const body = [];
      i++;
      let depth = 0;
      while (i < lines.length) {
        const l = lines[i];
        if (new RegExp(`^${colons}\\w`).test(l)) depth++;
        if (l.trim() === colons) { if (depth === 0) break; depth--; }
        body.push(l);
        i++;
      }
      i++;
      out.push(directive(name, label, parseAttrs(attrs), body, ctx));
      continue;
    }

    // leaf directive
    const leaf = line.match(/^::(\w[\w-]*)(?:\[([^\]]*)\])?(?:\{(.*)\})?\s*$/);
    if (leaf) {
      out.push(leafDirective(leaf[1], leaf[2], parseAttrs(leaf[3]), ctx));
      i++;
      continue;
    }

    // heading
    const h = line.match(/^(#{1,4})\s+(.*?)\s*(?:\{#([\w-]+)\})?$/);
    if (h) {
      const level = h[1].length;
      const html = inline(h[2], ctx);
      const id = h[3] ?? ctx.uniqueId(slugify(html));
      // A step is written as ###, but steps that come before any ## are
      // section headings in the outline, so they render as h2.
      const step = level === 3 && ctx.inSteps;
      const tag = step && !ctx.seenH2 ? 2 : level;
      if (level === 2) ctx.seenH2 = true;
      if (tag === 2 || tag === 3) ctx.toc.push({ level: tag, id, text: html.replace(/<[^>]+>/g, "") });
      if (step) {
        ctx.stepCount++;
        out.push(`</div></li><li class="step-item"><div class="step-head"><span class="step-num" aria-hidden="true">${ctx.stepCount}</span><h${tag} id="${id}">${html}<a class="anchor" href="#${id}" aria-label="Link to this section">#</a></h${tag}></div><div class="step-body">`);
      } else {
        out.push(`<h${level} id="${id}">${html}${level > 1 ? `<a class="anchor" href="#${id}" aria-label="Link to this section">#</a>` : ""}</h${level}>`);
      }
      i++;
      continue;
    }

    // horizontal rule
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) { out.push("<hr>"); i++; continue; }

    // table
    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1])) {
      const rows = [];
      while (i < lines.length && lines[i].includes("|")) rows.push(lines[i++]);
      out.push(table(rows, ctx));
      continue;
    }

    // blockquote
    if (line.startsWith(">")) {
      const body = [];
      while (i < lines.length && lines[i].startsWith(">")) body.push(lines[i++].replace(/^> ?/, ""));
      out.push(`<blockquote>${blocks(body, ctx)}</blockquote>`);
      continue;
    }

    // list
    const li = line.match(/^(\s*)([-*]|\d+[.)])\s+/);
    if (li) {
      const res = list(lines, i, ctx);
      out.push(res.html);
      i = res.next;
      continue;
    }

    // raw HTML block
    if (HTML_BLOCK.test(line)) {
      const body = [];
      while (i < lines.length && !isBlank(lines[i])) body.push(lines[i++]);
      out.push(body.join("\n").replace(/(href|src)="(\/docs\/[^"]*)"/g, (_, a, u) => `${a}="${ctx.link(u)}"`));
      continue;
    }

    // paragraph
    const para = [];
    while (i < lines.length && !isBlank(lines[i]) && !startsBlock(lines[i], lines[i + 1])) para.push(lines[i++].trim());
    if (!para.length) para.push(lines[i++].trim());
    out.push(`<p>${inline(para.join(" ").replace(/ {2,}$/, ""), ctx).replace(/ {2}\n/g, "<br>")}</p>`);
  }
  return out.join("\n");
}

function startsBlock(line, next) {
  return /^(```|~~~|:::|::\w|#{1,4}\s|>|\s*([-*]|\d+[.)])\s+)/.test(line) || /^(-{3,})\s*$/.test(line) ||
    (line.includes("|") && next && /^\s*\|?\s*:?-{2,}/.test(next));
}

function list(lines, start, ctx) {
  const first = lines[start].match(/^(\s*)([-*]|\d+[.)])\s+/);
  const indent = first[1].length;
  const ordered = /\d/.test(first[2]);
  const startNum = ordered ? parseInt(first[2], 10) : 1;
  const items = [];
  let i = start;
  let loose = false;
  while (i < lines.length) {
    const m = lines[i].match(/^(\s*)([-*]|\d+[.)])\s+(.*)$/);
    if (!m || m[1].length !== indent || /\d/.test(m[2]) !== ordered) break;
    const content = [m[3]];
    const contentIndent = indent + m[0].length - m[3].length;
    i++;
    while (i < lines.length) {
      const l = lines[i];
      if (!l.trim()) {
        const nextLine = lines.slice(i + 1).find((x) => x.trim());
        if (nextLine && (nextLine.match(/^\s*/)[0].length >= contentIndent)) { content.push(""); i++; loose = true; continue; }
        break;
      }
      const lead = l.match(/^\s*/)[0].length;
      if (lead >= contentIndent || (lead > indent && /^\s*([-*]|\d+[.)])\s+/.test(l))) { content.push(l.slice(Math.min(lead, contentIndent))); i++; continue; }
      if (lead > indent && !/^\s*([-*]|\d+[.)])\s+/.test(l)) { content.push(l.trim()); i++; continue; }
      if (lead === 0 && !startsBlock(l) && content[content.length - 1] !== "") { content.push(l.trim()); i++; continue; }
      break;
    }
    items.push(content);
    if (i < lines.length && !lines[i].trim()) {
      const nextLine = lines.slice(i).find((x) => x.trim());
      const nm = nextLine && nextLine.match(/^(\s*)([-*]|\d+[.)])\s+/);
      if (nm && nm[1].length === indent) { while (!lines[i].trim()) i++; loose = true; }
    }
  }
  const tag = ordered ? "ol" : "ul";
  const startAttr = ordered && startNum !== 1 ? ` start="${startNum}"` : "";
  let tasks = false;
  const html = items.map((c) => {
    const task = c[0].match(/^\[( |x)\]\s+/);
    if (task) { c = [c[0].slice(task[0].length), ...c.slice(1)]; tasks = true; }
    const inner = blocks(c, ctx);
    const content = loose ? inner : inner.replace(/^<p>([\s\S]*?)<\/p>/, "$1");
    if (task) return `<li class="task"><label><input type="checkbox"${task[1] === "x" ? " checked" : ""}><span class="task-box" aria-hidden="true"></span></label><div class="task-body">${content}</div></li>`;
    return `<li>${content}</li>`;
  }).join("");
  return { html: `<${tag}${startAttr}${tasks ? ' class="tasks"' : ""}>${html}</${tag}>`, next: i };
}

function table(rows, ctx) {
  const cells = (r) => r.trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
  const align = cells(rows[1]).map((c) => (c.startsWith(":") && c.endsWith(":") ? "center" : c.endsWith(":") ? "right" : ""));
  const th = cells(rows[0]).map((c, j) => `<th${align[j] ? ` style="text-align:${align[j]}"` : ""}>${inline(c, ctx)}</th>`).join("");
  const body = rows.slice(2).map((r) => `<tr>${cells(r).map((c, j) => `<td${align[j] ? ` style="text-align:${align[j]}"` : ""}>${inline(c, ctx)}</td>`).join("")}</tr>`).join("");
  return `<div class="table-wrap"><table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function codeBlock(code, lang, attrs) {
  const title = attrs.title ? `<figcaption><span>${esc(attrs.title)}</span></figcaption>` : "";
  const copy = attrs.copy === "false" ? "" : `<button class="copy" type="button" aria-label="Copy code" data-copy="${attrEsc(copyText(code, lang))}">Copy</button>`;
  const cls = ["code", "doc-code", title ? "has-title" : "", lang === "diff" ? "diff" : ""].filter(Boolean).join(" ");
  return `<figure class="${cls}" data-lang="${lang}">${title}${copy}<pre><code>${highlight(code, lang)}</code></pre></figure>`;
}

const CALLOUTS = { note: "Note", tip: "Tip", warning: "Warning", mistake: "Common mistake", important: "Important" };

function directive(name, label, attrs, body, ctx) {
  if (CALLOUTS[name]) {
    const title = label || CALLOUTS[name];
    return `<aside class="callout callout-${name}"><p class="callout-title">${inline(title, ctx)}</p>${blocks(body, ctx)}</aside>`;
  }
  if (name === "steps") {
    const prev = [ctx.inSteps, ctx.stepCount];
    ctx.inSteps = true;
    ctx.stepCount = 0;
    const html = blocks(body, ctx);
    ctx.inSteps = prev[0];
    ctx.stepCount = prev[1];
    // Each step heading closes the previous item, so open a first item for any text
    // before the first heading and drop it when it is empty.
    return `<ol class="doc-steps"><li class="step-intro"><div>${html}</div></li></ol>`.replace(/<li class="step-intro"><div>\s*<\/div><\/li>/, "");
  }
  if (name === "tabs") {
    const group = attrs.group ?? "";
    const panes = [];
    for (const l of body) {
      const t = l.match(/^::tab\[([^\]]+)\]\s*$/);
      if (t) panes.push({ label: t[1], lines: [] });
      else if (panes.length) panes[panes.length - 1].lines.push(l);
    }
    const id = ctx.uniqueId(`tabs-${group || "set"}`);
    const tabs = panes.map((p, j) => `<button class="os-tab" role="tab" id="${id}-t${j}" aria-controls="${id}-p${j}" aria-selected="${j === 0}" ${j ? 'tabindex="-1"' : ""} data-tab="${attrEsc(p.label)}">${inline(p.label, ctx)}</button>`).join("");
    const content = panes.map((p, j) => `<div class="tab-pane" role="tabpanel" id="${id}-p${j}" aria-labelledby="${id}-t${j}"${j ? " hidden" : ""}>${blocks(p.lines, ctx)}</div>`).join("");
    return `<div class="doc-tabs" data-group="${attrEsc(group)}"><div class="os" role="tablist">${tabs}</div>${content}</div>`;
  }
  if (name === "cards") {
    const cols = attrs.cols ?? "2";
    const items = body.join("\n").split(/\n(?=- )/).map((s) => s.replace(/^- /, "").trim()).filter(Boolean);
    const cards = items.map((item) => {
      const m = item.match(/^\[([^\]]+)\]\(([^)]+)\)(?::\s*([\s\S]*?))?\s*(?:\{([^}]+)\})?$/);
      if (!m) throw new Error(`bad card: ${item}`);
      const [, title, url, text = "", badge] = m;
      const b = badge ? `<span class="badge">${esc(badge)}</span>` : "";
      return `<a class="card" href="${attrEsc(ctx.link(url))}"><span class="card-title">${inline(title, ctx)}${b}</span>${text ? `<span class="card-text">${inline(text, ctx)}</span>` : ""}</a>`;
    }).join("");
    return `<div class="cards cols-${cols}">${cards}</div>`;
  }
  if (name === "details") {
    return `<details class="doc-details"><summary>${inline(label || "Details", ctx)}</summary><div class="details-body">${blocks(body, ctx)}</div></details>`;
  }
  if (name === "lead") return `<div class="lead-block">${blocks(body, ctx)}</div>`;
  throw new Error(`unknown directive :::${name}`);
}

function leafDirective(name, label, attrs, ctx) {
  if (name === "scene") {
    if (!attrs.name) throw new Error("::scene needs a name");
    ctx.scenes.add(attrs.name);
    const caption = attrs.caption ? `<figcaption>${inline(attrs.caption, ctx)}</figcaption>` : "";
    return `<figure class="scene-fig"><div class="scene" data-scene="${attrEsc(attrs.name)}" role="img" aria-label="${attrEsc(attrs.alt ?? attrs.caption ?? "")}"></div>${caption}</figure>`;
  }
  throw new Error(`unknown directive ::${name}`);
}

// ---------------------------------------------------------------- Markdown twin

// The page as plain Markdown for agents: directives become ordinary Markdown and doc
// links become absolute URLs.
export function toPlainMarkdown(front, body, absolute) {
  const lines = body.replace(/\r\n?/g, "\n").split("\n");
  const out = [`# ${front.title}`, ""];
  if (front.summary) out.push(`> ${front.summary}`, "");
  let inFence = false;
  for (let line of lines) {
    if (/^\s*(```|~~~)/.test(line)) {
      if (!inFence) {
        const m = line.match(/^(\s*)(```+|~~~+)\s*([\w+-]*)\s*(.*)$/);
        const a = parseAttrs(m[4]);
        if (a.title) out.push(`${m[1]}\`${a.title}\`:`, "");
        line = `${m[1]}${m[2]}${m[3]}`;
      }
      inFence = !inFence;
      out.push(line);
      continue;
    }
    if (inFence) { out.push(line); continue; }
    const open = line.match(/^:{3,}(\w[\w-]*)(?:\[([^\]]*)\])?/);
    if (open) {
      const [, name, label] = open;
      if (CALLOUTS[name]) out.push(`**${label || CALLOUTS[name]}:**`);
      else if (name === "details" && label) out.push(`**${label}**`);
      continue;
    }
    if (/^:{3,}\s*$/.test(line)) continue;
    const tab = line.match(/^::tab\[([^\]]+)\]/);
    if (tab) { out.push(`**${tab[1]}**`, ""); continue; }
    if (/^::scene/.test(line)) continue;
    line = line
      .replace(/\[\[([^\]]+)\]\]/g, "$1")
      .replace(/\]\((\/docs\/[^)]*)\)/g, (_, u) => `](${absolute(u)})`)
      .replace(/(href|src)="(\/docs\/[^"]*)"/g, (_, a, u) => `${a}="${absolute(u)}"`)
      .replace(/^(- \[[^\]]+\]\([^)]+\)(?::.*?)?)\s*\{([^}]+)\}\s*$/, "$1 ($2)")
      .replace(/^(#{1,4}\s+.*?)\s*\{#[\w-]+\}$/, "$1");
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

export function plainText(html) {
  return html
    .replace(/<figure class="scene-fig">[\s\S]*?<\/figure>/g, " ")
    .replace(/<button[\s\S]*?<\/button>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
