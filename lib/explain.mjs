// Data for /explain: the keyword catalogue generated from optics-framework (scripts/explain.py)
// joined with the keyword reference in docs/, plus the example suites in content/explain/examples.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { slugify } from "./markdown.mjs";

const KEYWORD_PAGES = ["app", "actions", "verification", "flow"];

const plain = (md) =>
  md
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .trim();

function docsSections() {
  const sections = new Map();
  for (const page of KEYWORD_PAGES) {
    const text = readFileSync(`docs/reference/keywords/${page}.md`, "utf8");
    for (const part of text.split(/^### /m).slice(1)) {
      const [heading, ...rest] = part.split("\n");
      const body = rest.join("\n").split(/^## /m)[0];
      const name = heading.replace(/\s*\{#[^}]+\}\s*$/, "").trim();
      sections.set(name.toLowerCase().replace(/\s+/g, "_"), {
        title: name,
        url: `docs/reference/keywords/${page}#${slugify(name)}`,
        summary: plain(body.trim().split(/\n\s*\n/)[0]),
        params: paramRows(body),
      });
    }
  }
  return sections;
}

function paramRows(body) {
  const params = {};
  for (const line of body.split("\n")) {
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length !== 3 || !cells[0].startsWith("`")) continue;
    for (const name of cells[0].match(/`[^`]+`/g)) params[name.slice(1, -1)] = plain(cells[2]);
  }
  return params;
}

export function loadCatalogue() {
  const generated = JSON.parse(readFileSync("content/explain/catalogue.json", "utf8"));
  const docs = docsSections();
  const keywords = {};
  for (const kw of generated.keywords) {
    const doc = docs.get(kw.slug);
    if (!doc) throw new Error(`docs/reference/keywords has no section for ${kw.slug}; the explainer needs one`);
    keywords[kw.slug] = { ...kw, title: doc.title, url: doc.url, summary: doc.summary, docs: doc.params };
  }
  return { version: generated.version, keywords, yamlArity: generated.yamlArity, codes: generated.codes };
}

function walk(dir) {
  return readdirSync(dir).sort().flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

export function loadProject(dir) {
  const order = (p) => [/test_cases/, /modules/, /elements/, /\.ya?ml$/, /error/].findIndex((re) => re.test(p)) >>> 0;
  return walk(dir)
    .map((path) => ({ path: relative(dir, path), text: readFileSync(path, "utf8") }))
    .sort((a, b) => order(a.path) - order(b.path) || a.path.localeCompare(b.path));
}

export function loadExamples() {
  const list = JSON.parse(readFileSync("content/explain/examples.json", "utf8"));
  return list.map((ex) => ({ ...ex, files: loadProject(`content/explain/examples/${ex.slug}`) }));
}
