import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";

const ORIGIN = "https://optics-framework.org";
const TRUST_PAGES = ["about", "contact", "privacy"];

const read = (f) => readFileSync(`out/${f}`, "utf8");
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
  for (const page of ["index.html", "404.html", ...TRUST_PAGES.map((p) => `${p}.html`)]) {
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
  assert.deepEqual(
    urls.map(([, loc]) => loc),
    [`${ORIGIN}/`, ...TRUST_PAGES.map((p) => `${ORIGIN}/${p}`)],
  );
  for (const [, loc, lastmod] of urls) {
    assert.match(lastmod, /^\d{4}-\d{2}-\d{2}$/, `${loc} lastmod`);
    const path = loc.slice(ORIGIN.length + 1) || "index";
    assert.ok(existsSync(`out/${path}.html`), `${loc} is not built`);
  }
  assert.equal(urls.length, (xml.match(/<url>/g) ?? []).length);
});

test("robots.txt allows crawling and names the sitemap", () => {
  const robots = read("robots.txt");
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Sitemap: https:\/\/optics-framework\.org\/sitemap\.xml$/m);
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
