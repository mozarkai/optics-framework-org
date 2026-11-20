// Data for /explain: the keyword catalogue generated from optics-framework (scripts/explain.py)
// joined with the keyword reference in docs/, plus the example suites in content/explain/examples.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { slugify } from "./markdown.mjs";

const KEYWORD_PAGES = ["app", "actions", "verification", "flow"];

const plain = (md) => md.replace(/\*\*([^*]+)\*\*/g, "$1").trim();

function docsSections() {
  const sections = new Map();
  for (const page of KEYWORD_PAGES) {
    const text = readFileSync(`docs/reference/keywords/${page}.md`, "utf8");
    for (const part of text.split(/^### /m).slice(1)) {
      const [heading, ...rest] = part.split("\n");
      const body = rest.join("\n").split(/^## /m)[0].replace(/\]\(#/g, `](/docs/reference/keywords/${page}#`);
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

// The page body: the fragment with the catalogue and examples inlined, safe inside <script>.
export function explainBody(catalogue, examples) {
  const json = JSON.stringify({ catalogue, examples }).replace(/</g, "\\u003c").replace(/\{\{/g, "{\\u007b");
  return readFileSync("pages/explain.html", "utf8").replace("{{version}}", catalogue.version).replace("{{data}}", () => json);
}

export function explainMarkdown(catalogue, examples, origin) {
  const fence = (f) => `\`\`\`${f.path.split(".").pop()} title="${f.path}"\n${f.text.trimEnd()}\n\`\`\``;
  return [
    "# Explain a suite",
    "",
    `An interactive page at ${origin}/playground/explain. Edit an Optics suite (test cases, modules, elements, API and error definition files, in CSV or YAML) and the page explains the row under the cursor: the keyword and what it does with each value, where each \`\${name}\` gets its value, which kind of locator each value is and how Optics looks for it. It also predicts what \`optics dry_run\` reports, following the rules of optics-framework ${catalogue.version}, and lists the problems that only a run finds. The suite is kept in the URL fragment, so a link shares it.`,
    "",
    "To check a real project, run `optics dry_run <project folder>`. See the CLI reference: " + `${origin}/docs/reference/cli`,
    "",
    "## Examples",
    "",
    ...examples.flatMap((ex) => [`### ${ex.title}`, "", `Open it at ${origin}/playground/explain#${ex.slug}`, "", ...ex.files.flatMap((f) => [fence(f), ""])]),
  ].join("\n");
}
