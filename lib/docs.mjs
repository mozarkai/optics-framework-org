// Builds the documentation under out/docs/ from docs/*.md.
//
// docs/nav.json is the table of contents: sections (the tabs across the top), each with
// groups of page ids. A page id is its path under docs/ without ".md"; "x/index" is the
// landing page of section x. Every page is written twice: as HTML wrapped in
// docs/_layout.html, and as a plain Markdown twin next to it for agents.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { plainText, render, splitFrontmatter, toPlainMarkdown } from "./markdown.mjs";

const ORIGIN = "https://optics-framework.org";
const REPO = "https://github.com/mozarkai/optics-framework-org";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// "get-started/index" -> "docs/get-started/", "get-started/install" -> "docs/get-started/install"
export const urlPath = (id) => `docs/${id === "index" ? "" : id.replace(/(^|\/)index$/, "$1")}`;
const outFile = (id) => `out/docs/${id}.html`;

// A relative URL from one page to another site path (both without a leading slash).
function relative(fromId, target) {
  const depth = fromId.split("/").length; // docs/<id>.html sits this many folders below out/
  return "../".repeat(depth) + target || "./";
}

export function buildDocs({ lastModified }) {
  const nav = JSON.parse(readFileSync("docs/nav.json", "utf8"));
  const layout = readFileSync("docs/_layout.html", "utf8");

  // Load every page named in the nav, in order.
  const pages = [];
  for (const section of nav.sections) {
    for (const group of section.groups) {
      for (const id of group.pages) {
        const src = `docs/${id}.md`;
        const { front, body } = splitFrontmatter(readFileSync(src, "utf8"));
        if (!front.title) throw new Error(`${src} has no title`);
        pages.push({ id, src, front, body, section, group });
      }
    }
  }
  const home = { id: "index", src: "docs/index.md", ...splitFrontmatter(readFileSync("docs/index.md", "utf8")), section: null, group: null };
  const byId = new Map([home, ...pages].map((p) => [p.id, p]));

  const searchIndex = [];
  const scenes = new Set();

  for (const page of [home, ...pages]) {
    const toc = [];
    const ids = new Set();
    const ctx = {
      toc,
      scenes,
      inSteps: false,
      stepCount: 0,
      uniqueId(base) {
        let id = base || "section";
        for (let n = 2; ids.has(id); n++) id = `${base}-${n}`;
        ids.add(id);
        return id;
      },
      link(url) {
        if (!url.startsWith("/")) return url;
        const [path, hash = ""] = url.split("#");
        if (path.startsWith("/docs") && !/\.\w+$/.test(path)) {
          const id = path.replace(/^\/docs\/?/, "").replace(/\/$/, "/index") || "index";
          if (!byId.has(id)) throw new Error(`${page.src} links to missing doc ${url}`);
          return relative(page.id, urlPath(id)) + (hash ? `#${hash}` : "");
        }
        return relative(page.id, path.slice(1)) + (hash ? `#${hash}` : "");
      },
    };
    const content = render(page.body, ctx);
    page.html = content;
    page.toc = toc;
    page.rel = (target) => relative(page.id, target);

    searchIndex.push({
      t: page.front.title,
      n: page.front.nav ?? "",
      u: urlPath(page.id).replace(/^docs\//, ""),
      s: page.section?.title ?? "Docs",
      h: toc.map((t) => [t.text, t.id]),
      d: page.front.summary ?? "",
      x: plainText(content).slice(0, 4000),
    });
  }

  for (const page of [home, ...pages]) {
    const file = outFile(page.id);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, renderPage(page, { layout, nav, pages, byId }));
    writeFileSync(file.replace(/\.html$/, ".md"), toPlainMarkdown(page.front, page.body, (u) => ORIGIN + u));
  }
  writeFileSync("out/docs/search.json", JSON.stringify(searchIndex));
  writeFileSync("out/docs/llms.txt", llmsIndex(nav, byId));

  return [home, ...pages].map((p) => ({ loc: `${ORIGIN}/${urlPath(p.id)}`, lastmod: lastModified(p.src) }));
}

function renderPage(page, { layout, nav, pages, byId }) {
  const { front, section } = page;
  const r = page.rel;
  const isHome = page.id === "index";

  const tabs = nav.sections.map((s) => {
    const first = s.groups[0].pages[0];
    const on = section && s.id === section.id;
    return `<a class="dtab${on ? " on" : ""}" href="${r(urlPath(first))}"${on ? ' aria-current="true"' : ""}>${esc(s.title)}</a>`;
  }).join("");

  const sidebar = nav.sections.map((s) => {
    const open = section && s.id === section.id;
    const groups = s.groups.map((g) => {
      const items = g.pages.map((id) => {
        const p = byId.get(id);
        const cur = id === page.id;
        const label = p.front.nav ?? p.front.title;
        return `<li><a href="${r(urlPath(id))}"${cur ? ' aria-current="page"' : ""}>${esc(label)}</a></li>`;
      }).join("");
      return `${g.title ? `<p class="side-group">${esc(g.title)}</p>` : ""}<ul>${items}</ul>`;
    }).join("");
    return `<div class="side-section${open ? " open" : ""}" data-section="${s.id}"><p class="side-title">${esc(s.title)}</p>${groups}</div>`;
  }).join("");

  // Breadcrumbs: Docs / Section / Group
  const crumbs = [`<a href="${r("docs/")}">Docs</a>`];
  if (section) {
    crumbs.push(`<a href="${r(urlPath(section.groups[0].pages[0]))}">${esc(section.title)}</a>`);
    if (page.group.title) crumbs.push(`<span>${esc(page.group.title)}</span>`);
  }

  const toc = page.toc.length > 1 && front.toc !== "false"
    ? `<nav class="toc" aria-label="On this page"><p class="toc-title">On this page</p><ul>${page.toc.map((t) => `<li class="toc-l${t.level}"><a href="#${t.id}">${t.text}</a></li>`).join("")}</ul></nav>`
    : "";

  // Previous and next in nav order.
  const idx = pages.findIndex((p) => p.id === page.id);
  const pager = idx < 0 ? "" : [pages[idx - 1], pages[idx + 1]].map((p, j) => p
    ? `<a class="pager-${j ? "next" : "prev"}" href="${r(urlPath(p.id))}"><span>${j ? "Next" : "Previous"}</span>${esc(p.front.nav ?? p.front.title)}</a>`
    : "<span></span>").join("");

  const meta = [front.level, front.time && (front.level ? `about ${front.time}` : `About ${front.time}`)].filter(Boolean).join(", ");
  const chips = meta ? esc(meta) : "";

  const mdName = page.id.split("/").pop() + ".md";
  const issue = `https://github.com/mozarkai/optics-framework/issues/new?title=${encodeURIComponent(`Docs: ${front.title}`)}&body=${encodeURIComponent(`Page: ${ORIGIN}/${urlPath(page.id)}\n\nWhat was missing or wrong?\n`)}`;

  const values = {
    title: isHome ? "Optics Framework documentation" : `${front.title} · Optics Framework docs`,
    description: esc(front.description ?? front.summary ?? ""),
    canonical: `${ORIGIN}/${urlPath(page.id)}`,
    root: r(""),
    docsRoot: r("docs/"),
    home: r("") || "./",
    md: mdName,
    tabs,
    sidebar,
    crumbs: crumbs.join('<span class="sep" aria-hidden="true">/</span>'),
    pageTitle: esc(front.title),
    summary: front.summary ? `<p class="doc-summary">${esc(front.summary)}</p>` : "",
    chips: chips ? `<p class="doc-level">${chips}</p>` : "",
    content: page.html,
    toc,
    pager,
    issue: esc(issue),
    edit: `${REPO}/edit/main/${page.src}`,
    bodyClass: [isHome ? "doc-home" : "", front.layout ? `layout-${front.layout}` : "", toc ? "" : "no-toc"].filter(Boolean).join(" "),
  };
  return layout.replace(/\{\{(\w+)\}\}/g, (m, key) => (key in values ? values[key] : m));
}

function llmsIndex(nav, byId) {
  const lines = [
    "# Optics documentation",
    "",
    "> Every page of the Optics docs, as Markdown. Append .md to any docs URL for the same thing.",
    "",
    `- [Docs home](${ORIGIN}/docs/index.md): where to start, by goal and by level.`,
    "",
  ];
  for (const s of nav.sections) {
    lines.push(`## ${s.title}`, "");
    for (const g of s.groups) for (const id of g.pages) {
      const p = byId.get(id);
      const url = `${ORIGIN}/${urlPath(id)}`.replace(/\/$/, "/index");
      lines.push(`- [${p.front.title}](${url}.md)${p.front.summary ? `: ${p.front.summary}` : ""}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
