import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { itemUrl, loadBlog } from "../lib/blog.mjs";

const ORIGIN = "https://optics-framework.org";
const TRUST_PAGES = ["about", "contact", "privacy"];

const read = (f) => readFileSync(`out/${f}`, "utf8");

// Every docs page in nav order, with its URL path and its built file.
const docsPages = () => {
  const nav = JSON.parse(readFileSync("docs/nav.json", "utf8"));
  const ids = ["index", ...nav.sections.flatMap((s) => s.groups.flatMap((g) => g.pages))];
  return ids.map((id) => ({
    id,
    url: `docs/${id === "index" ? "" : id.replace(/(^|\/)index$/, "$1")}`,
    file: `docs/${id}.html`,
  }));
};
const visibleText = (html) =>
  html
    .match(/<main[^>]*>([\s\S]*?)<\/main>/)[1]
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const jsonLd = (html) =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

test("the homepage carries all four metadata signals", () => {
  const html = read("index.html");
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/optics-framework\.org\/">/);
  assert.match(html, /<meta property="og:image" content="https:\/\/optics-framework\.org\/media\/[^"]+">/);
  assert.match(html, /<meta property="og:type" content="website">/);
  assert.match(html, /<link rel="alternate" type="text\/markdown" href="index\.md"/);
});

test("the homepage JSON-LD describes the software", () => {
  const [app] = jsonLd(read("index.html"));
  assert.equal(app["@context"], "https://schema.org");
  assert.equal(app["@type"], "SoftwareApplication");
  assert.equal(app.name, "Optics");
  assert.equal(app.url, `${ORIGIN}/`);
  assert.ok(app.description.length > 50);
  assert.equal(app.offers.price, "0");
  assert.equal(app.author, undefined);
  assert.equal(app.publisher, undefined);
});

test("the homepage JSON-LD names a contact for the project", () => {
  const org = jsonLd(read("index.html")).find((d) => d["@type"] === "Organization");
  assert.equal(org.name, "Optics");
  assert.equal(org.contactPoint.email, "chinmayajha@gmail.com");
  assert.ok(org.contactPoint.contactType);
});

// Optics is not a Mozark product: the name may appear only inside URLs and addresses.
test("no page attributes Optics to Mozark", () => {
  const files = readdirSync("out").filter((f) => /\.(html|md|txt|xml|json)$/.test(f));
  for (const file of files) {
    const prose = read(file)
      .replace(/(?:https?:\/\/|mailto:)[^\s"'<>)]+/g, "")
      .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "");
    assert.doesNotMatch(prose, /mozark/i, `${file} mentions Mozark`);
  }
});

test("the trust pages exist with real content and their own canonical URL", () => {
  for (const page of TRUST_PAGES) {
    const html = read(`${page}.html`);
    assert.ok(visibleText(html).length >= 500, `${page} has too little text`);
    assert.match(html, new RegExp(`<link rel="canonical" href="${ORIGIN}/${page}">`));
    assert.match(html, /<html lang="en">/);
    assert.doesNotMatch(html, /\{\{\w+\}\}/, `${page} has an unfilled placeholder`);
  }
});

test("every page links the trust pages from its footer", () => {
  for (const page of ["index.html", "404.html", "blog.html", ...TRUST_PAGES.map((p) => `${p}.html`)]) {
    const footer = read(page).match(/<footer[\s\S]*<\/footer>/)[0];
    for (const trust of TRUST_PAGES) assert.match(footer, new RegExp(`href="/?${trust}"`), `${page} footer lacks ${trust}`);
  }
});

test("relative links on every page resolve to a built file", () => {
  for (const page of readdirSync("out").filter((f) => f.endsWith(".html") && f !== "404.html")) {
    for (const [, url] of read(page).matchAll(/(?:href|src|poster)="([^"#]+)"/g)) {
      if (/^(https?:|mailto:|\/)/.test(url) || url === "./") continue;
      const path = url.split("?")[0];
      assert.ok(existsSync(`out/${path}`) || existsSync(`out/${path}.html`), `${page} links missing ${url}`);
    }
  }
});

test("the HTML 404 points people and agents somewhere useful", () => {
  const html = read("404.html");
  assert.match(html, /href="\/llms\.txt"/);
  assert.match(html, /href="\/sitemap\.xml"/);
  assert.match(html, /href="\/styles\.css\?v=\w{10}"/);
  assert.doesNotMatch(html, /rel="canonical"/);
});

test("the 404 page's assets follow the deploy base path", () => {
  try {
    execFileSync("node", ["build.mjs"], { env: { ...process.env, PAGES_BASE_PATH: "/preview" } });
    const html = read("404.html");
    assert.match(html, /href="\/preview\/styles\.css\?v=\w{10}"/);
    assert.match(html, /src="\/preview\/app\.js\?v=\w{10}"/);
    assert.match(html, /href="\/preview\/llms\.txt"/);
  } finally {
    execFileSync("node", ["build.mjs"], { env: { ...process.env, PAGES_BASE_PATH: "" } });
  }
});

test("the Markdown homepage and 404 are substantial and link back", () => {
  const index = read("index.md");
  assert.match(index, /^# Optics/);
  assert.match(index, /llms\.txt/);
  const notFound = read("404.md");
  assert.match(notFound, /^# 404/);
  assert.ok(notFound.length >= 20);
  assert.match(notFound, /https:\/\/optics-framework\.org\/llms\.txt/);
});

test("sitemap.xml lists every indexable page with a lastmod date", () => {
  const xml = read("sitemap.xml");
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.ok(statSync("out/sitemap.xml").size < 50 * 1024 * 1024);
  const urls = [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>\s*<\/url>/g)];
  const locs = urls.map(([, loc]) => loc);
  const articles = loadBlog().items.filter((i) => i.slug).map((i) => itemUrl(i, ORIGIN));
  const head = [`${ORIGIN}/`, ...TRUST_PAGES.map((p) => `${ORIGIN}/${p}`), `${ORIGIN}/blog`, ...articles];
  assert.deepEqual(locs.slice(0, head.length), head);
  assert.deepEqual(locs.slice(head.length), docsPages().map((p) => `${ORIGIN}/${p.url}`));
  for (const [, loc, lastmod] of urls) {
    assert.match(lastmod, /^\d{4}-\d{2}-\d{2}$/, `${loc} lastmod`);
    const path = loc.slice(ORIGIN.length + 1) || "index";
    assert.ok(existsSync(`out/${path}.html`) || existsSync(`out/${path}index.html`), `${loc} is not built`);
  }
  assert.equal(urls.length, (xml.match(/<url>/g) ?? []).length);
});

test("robots.txt allows crawling and names the sitemap", () => {
  const robots = read("robots.txt");
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Sitemap: https:\/\/optics-framework\.org\/sitemap\.xml$/m);
  for (const signal of ["search", "ai-input", "ai-train"]) assert.match(robots, new RegExp(`^Content-Signal: .*\\b${signal}=yes`, "m"));
});

test("agent discovery documents are published and point at real files", () => {
  const index = JSON.parse(read(".well-known/agent-skills/index.json"));
  assert.equal(index.$schema, "https://schemas.agentskills.io/discovery/0.2.0/schema.json");
  assert.ok(index.skills.length > 0);
  for (const skill of index.skills) {
    const file = readFileSync(`out${skill.url}`);
    assert.equal(skill.digest, `sha256:${createHash("sha256").update(file).digest("hex")}`, skill.name);
  }
  const local = (href) => href.replace(ORIGIN, "out").replace(/\/$/, "/index.html");
  const page = (href) => (existsSync(local(href)) ? local(href) : `${local(href)}.html`);
  const { linkset } = JSON.parse(read(".well-known/api-catalog"));
  for (const href of linkset.flatMap((e) => Object.values(e).flat().filter((l) => l.href).map((l) => l.href))) {
    assert.ok(existsSync(page(href)), href);
  }
  for (const { url } of JSON.parse(read(".well-known/ai-catalog.json")).entries) assert.ok(existsSync(page(url)), url);
  assert.equal(JSON.parse(read(".well-known/mcp/server-card.json")).name, "org.optics-framework/optics");
});

test("llms.txt follows the llmstxt.org layout and says when to use Optics", () => {
  const text = read("llms.txt");
  const lines = text.split("\n");
  assert.match(lines[0], /^# Optics$/);
  assert.equal(lines[1], "");
  assert.match(lines[2], /^> \S/);

  const firstSection = text.indexOf("\n## ");
  assert.doesNotMatch(text.slice(0, firstSection), /\n#/, "no headings before the first H2 section");
  const sections = text.slice(firstSection + 1).split(/^(?=## )/m);
  assert.deepEqual(
    sections.map((s) => s.split("\n")[0]),
    ["## When to use", "## Docs", "## Project", "## Optional"],
  );
  for (const section of sections) {
    for (const line of section.split("\n").slice(1).filter(Boolean)) {
      assert.match(line, /^- \[[^\]]+\]\(https:\/\/[^)]+\)(: .+)?$/, `not a file-list entry: ${line}`);
    }
  }
  for (const [, path] of text.matchAll(/\]\(https:\/\/optics-framework\.org\/([^)]+)\)/g)) {
    assert.ok(existsSync(`out/${path}`) || existsSync(`out/${path}.html`), `llms.txt links missing ${path}`);
  }
});

test("openapi.json describes the local optics serve API and is linked for agents", () => {
  const spec = JSON.parse(read("openapi.json"));
  assert.match(spec.openapi, /^3\.\d+\.\d+$/);
  assert.ok(spec.info.title && spec.info.version && spec.info.description);
  assert.deepEqual(spec.servers.map((s) => s.url), ["http://127.0.0.1:8000"]);

  const operations = Object.values(spec.paths).flatMap((methods) => Object.values(methods));
  assert.ok(operations.length > 0);
  const ids = operations.map((op) => op.operationId);
  assert.equal(new Set(ids).size, ids.length, "operationIds are unique");
  for (const op of operations) {
    assert.ok(op.operationId, "every operation has an operationId");
    assert.ok(op.summary || op.description, `${op.operationId} is described`);
    assert.ok(op.responses && Object.keys(op.responses).length, `${op.operationId} declares responses`);
  }

  assert.match(read("index.html"), /<link rel="service-desc" type="application\/vnd\.oai\.openapi\+json;version=3\.1" href="openapi\.json"/);
  assert.match(read("llms.txt"), /\(https:\/\/optics-framework\.org\/openapi\.json\)/);
});

test("every docs page is built with its Markdown twin, title and canonical URL", () => {
  for (const page of docsPages()) {
    const html = read(page.file);
    assert.match(html, /<html lang="en">/, page.id);
    assert.match(html, new RegExp(`<link rel="canonical" href="${ORIGIN}/${page.url}">`), page.id);
    assert.doesNotMatch(html, /\{\{\w+\}\}/, `${page.id} has an unfilled placeholder`);
    assert.ok(visibleText(html).length >= 300, `${page.id} has too little text`);
    const md = read(page.file.replace(/\.html$/, ".md"));
    assert.match(md, /^# \S/, `${page.id}.md starts with a title`);
    assert.doesNotMatch(md, /^:::|^::scene/m, `${page.id}.md still has directives`);
  }
});

test("links and assets on docs pages resolve to built files", () => {
  for (const page of docsPages()) {
    const dir = page.file.split("/").slice(0, -1).join("/");
    const html = read(page.file);
    for (const [, raw] of html.matchAll(/(?:href|src|poster)="([^"#]*)(?:#([^"]*))?"/g)) {
      if (!raw || /^(https?:|mailto:|\/)/.test(raw)) continue;
      const path = new URL(raw.split("?")[0], `file:///${dir}/`).pathname.slice(1);
      const ok = existsSync(`out/${path}`) && !path.endsWith("/") ? true
        : existsSync(`out/${path}.html`) || existsSync(`out/${path}index.html`) || existsSync(`out/${path}`);
      assert.ok(ok, `${page.id} links missing ${raw}`);
    }
  }
});

test("in-page anchors on docs pages point at real headings", () => {
  const ids = new Map(docsPages().map((p) => [p.file, new Set([...read(p.file).matchAll(/ id="([^"]+)"/g)].map((m) => m[1]))]));
  for (const page of docsPages()) {
    const dir = page.file.split("/").slice(0, -1).join("/");
    for (const [, raw, hash] of read(page.file).matchAll(/href="([^"#]*)#([^"]+)"/g)) {
      if (/^(https?:|mailto:)/.test(raw)) continue;
      let target = page.file;
      if (raw) {
        const path = new URL(raw.split("?")[0], `file:///${dir}/`).pathname.slice(1);
        target = path.endsWith("/") ? `${path}index.html` : `${path}.html`;
      }
      if (!ids.has(target)) continue;
      assert.ok(ids.get(target).has(hash), `${page.id} links to missing #${hash} on ${target}`);
    }
  }
});

test("docs search index and agent index cover every page", () => {
  const index = JSON.parse(read("docs/search.json"));
  assert.equal(index.length, docsPages().length);
  for (const entry of index) assert.ok(entry.t && entry.x.length > 100, `search entry ${entry.u} is empty`);
  const llms = read("docs/llms.txt");
  for (const page of docsPages()) {
    const md = `${ORIGIN}/${page.url}`.replace(/\/$/, "/index") + ".md";
    assert.ok(llms.includes(`(${md})`), `docs/llms.txt lacks ${md}`);
  }
});

test("the homepage and every text page link to the docs", () => {
  for (const page of ["index.html", ...TRUST_PAGES.map((p) => `${p}.html`)]) {
    assert.match(read(page), /href="(\.\/)?docs\/"/, `${page} has no docs link`);
  }
  assert.doesNotMatch(read("index.html"), /mozarkai\.github\.io/);
});

// ---- blog ------------------------------------------------------------------------------

const blog = () => loadBlog();
// Where a card links: hosted articles by relative path, the rest to the original.
const cardHref = (i) => (i.slug ? `blog/${i.slug}` : i.url);
const hosted = () => blog().items.filter((i) => i.slug);

test("the blog page lists every item, newest first, linking to where it lives", () => {
  const html = read("blog.html");
  assert.match(html, new RegExp(`<link rel="canonical" href="${ORIGIN}/blog">`));
  assert.match(html, /<link rel="alternate" type="application\/rss\+xml" href="feed\.xml"/);
  assert.doesNotMatch(html, /\{\{\w+\}\}/);
  const links = [...html.matchAll(/<h[234] class="entry-title"><a href="([^"]+)">/g)].map((m) => m[1].replace(/&amp;/g, "&"));
  assert.deepEqual(links, blog().items.map(cardHref));
  const [page] = jsonLd(html);
  assert.equal(page["@type"], "CollectionPage");
  assert.equal(page.mainEntity.itemListElement.length, blog().items.length);
});

test("blog filters appear only when there is more than one type", () => {
  const types = new Set(blog().items.map((i) => i.type));
  assert.equal(/class="os blog-filters"/.test(read("blog.html")), types.size > 1);
});

test("the homepage shows the latest blog items in HTML and Markdown", () => {
  const { items } = blog();
  const html = read("index.html");
  const md = read("index.md");
  assert.doesNotMatch(html + md, /<!-- blog:latest -->/);
  for (const item of items.slice(0, 4)) {
    assert.ok(html.includes(`href="${cardHref(item)}"`), `homepage lacks ${cardHref(item)}`);
    assert.ok(md.includes(`(${item.slug ? `${itemUrl(item, ORIGIN)}.md` : item.url})`), `index.md lacks ${item.title}`);
  }
  assert.match(html, /href="blog"/);
});

test("the blog has an RSS feed and a Markdown twin", () => {
  const { items } = blog();
  const feed = read("feed.xml");
  assert.match(feed, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<rss version="2\.0"/);
  assert.equal((feed.match(/<item>/g) ?? []).length, items.length);
  const md = read("blog.md");
  assert.match(md, /^# Optics blog/);
  for (const item of items) assert.ok(md.includes(`(${item.slug ? `${itemUrl(item, ORIGIN)}.md` : item.url})`), `blog.md lacks ${item.title}`);
  for (const item of items) assert.ok(feed.includes(`<link>${itemUrl(item, ORIGIN)}</link>`), `feed.xml lacks ${item.title}`);
});

test("a malformed blog item fails the build with the reason", () => {
  const dir = mkdtempSync(join(tmpdir(), "blog-"));
  const bad = (item) => {
    const file = join(dir, "blog.json");
    writeFileSync(file, JSON.stringify({ channels: [], items: [item] }));
    return () => loadBlog(file);
  };
  const ok = { type: "post", platform: "x", title: "t", summary: "s", url: "https://x.com/a", date: "2026-10-12" };
  assert.doesNotThrow(bad(ok));
  assert.throws(bad({ ...ok, type: "podcast" }), /type must be one of/);
  assert.throws(bad({ ...ok, platform: "myspace" }), /platform must be one of/);
  assert.throws(bad({ ...ok, url: "http://x.com/a" }), /https/);
  assert.throws(bad({ ...ok, date: "12/10/2026" }), /YYYY-MM-DD/);
  assert.throws(bad({ ...ok, type: "video" }), /needs an image/);
  assert.throws(bad({ ...ok, image: "https://i.ytimg.com/vi/x/hq.jpg" }), /site\/media\/blog/);
  assert.throws(bad({ ...ok, slug: "Not A Slug" }), /slug must be/);
  assert.throws(bad({ ...ok, slug: "no-such-article" }), /content\/blog\/no-such-article\.md does not exist/);
});

// Hosted articles are the canonical copy: copies on Medium, dev.to and Hashnode point here.
test("every hosted article is a full page with its own canonical URL, schema and twin", () => {
  assert.ok(hosted().length > 0);
  for (const item of hosted()) {
    const html = read(`blog/${item.slug}.html`);
    const url = itemUrl(item, ORIGIN);
    assert.match(html, new RegExp(`<link rel="canonical" href="${url}">`));
    assert.doesNotMatch(html, /\{\{\w+\}\}/, `${item.slug} has an unfilled placeholder`);
    assert.ok(visibleText(html).length >= 2000, `${item.slug} has too little text`);
    const [post] = jsonLd(html);
    assert.equal(post["@type"], "BlogPosting");
    assert.equal(post.mainEntityOfPage, url);
    assert.equal(post.headline, item.title);
    assert.match(post.dateModified, /^\d{4}-\d{2}-\d{2}$/);
    for (const [, raw] of html.matchAll(/(?:href|src|poster)="([^"#]+)"/g)) {
      if (/^(https?:|mailto:|\/)/.test(raw)) continue;
      const path = new URL(raw.split("?")[0], "file:///blog/").pathname.slice(1);
      assert.ok(existsSync(`out/${path}`) || existsSync(`out/${path}.html`) || existsSync(`out/${path}index.html`), `${item.slug} links missing ${raw}`);
    }
    const md = read(`blog/${item.slug}.md`);
    assert.match(md, new RegExp(`^# ${item.title.replace(/[.?*+()]/g, "\\$&")}\n`));
    assert.ok(md.includes(url), `${item.slug}.md lacks its canonical URL`);
    assert.doesNotMatch(md, /\]\(\/|="\.\.\//, `${item.slug}.md has a relative link`);
  }
});

// The privacy page promises the site loads nothing from third-party servers. Links may
// point anywhere; images, scripts, styles and media must come from this site.
test("no page loads an asset from another server", () => {
  const pages = ["index.html", "blog.html", ...hosted().map((i) => `blog/${i.slug}.html`), ...TRUST_PAGES.map((p) => `${p}.html`), ...docsPages().map((p) => p.file)];
  for (const page of pages) {
    const html = read(page);
    for (const [tag] of html.matchAll(/<(?:img|script|source|video|iframe|link)\b[^>]*>/g)) {
      if (/^<link\b/.test(tag) && !/rel="(?:stylesheet|preload|icon)"/.test(tag)) continue;
      const url = tag.match(/\b(?:src|href|poster)="([^"]*)"/)?.[1] ?? "";
      assert.doesNotMatch(url, /^(?:https?:)?\/\//, `${page} loads ${url}`);
    }
  }
});

test("every HTML page has a Markdown twin for agents", () => {
  const html = (dir) => readdirSync(`out/${dir}`, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? html(`${dir}/${e.name}`) : e.name.endsWith(".html") ? [`${dir}/${e.name}`] : []);
  for (const page of html(".")) {
    assert.ok(existsSync(page.replace(/^\./, "out").replace(/\.html$/, ".md")), `${page} has no .md twin`);
  }
  assert.match(read("about.md"), /^# About Optics\n/);
});
