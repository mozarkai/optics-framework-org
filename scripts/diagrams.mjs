// Draws every ```mermaid fence in docs/ and content/blog/ into content/diagrams/<id>.svg,
// themed with the site's tokens so one file works in light and dark. Run it after you add
// or change a diagram; it skips diagrams already drawn and deletes ones no page uses.
//
//   node scripts/diagrams.mjs            draw new diagrams
//   node scripts/diagrams.mjs --redraw   draw them all again, after a change to the theme
//
// Needs network for npx the first time and a Chromium from `playwright install chromium`
// (or set CHROME to a Chrome binary).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { DIAGRAM_DIR, diagramId } from "../lib/diagrams.mjs";

const MERMAID_CLI = "@mermaid-js/mermaid-cli@11.17.0";

// Mermaid sizes boxes from text it measures before a web font loads, so it measures with an
// installed monospace font of the same advance width (0.6em) as the page's JetBrains Mono.
const FONT = '"JetBrains Mono", Menlo, "DejaVu Sans Mono", monospace';

// Mermaid computes colours, so it draws with these placeholders and the page swaps in tokens.
const TOKENS = {
  "#a00000": "var(--bg)",
  "#a00001": "var(--bg-2)",
  "#a00002": "var(--line-2)",
  "#a00003": "var(--ink)",
  "#a00004": "var(--ink-3)",
  "#a00005": "var(--bg-2)",
  "#a00006": "var(--panel)",
  "#a00007": "var(--line-2)",
  "#a00008": "var(--d-note)",
  "#a00009": "var(--accent)",
};

const [bg, node, border, text, line, second, group, groupLine, note, noteLine] = Object.keys(TOKENS);
const CONFIG = {
  theme: "base",
  fontFamily: FONT,
  themeVariables: {
    fontFamily: FONT, fontSize: "13px", background: bg,
    primaryColor: node, primaryBorderColor: border, primaryTextColor: text, mainBkg: node, nodeBorder: border, nodeTextColor: text, textColor: text, titleColor: text,
    lineColor: line, secondaryColor: second, tertiaryColor: group, clusterBkg: group, clusterBorder: groupLine, edgeLabelBackground: bg,
    actorBkg: node, actorBorder: border, actorTextColor: text, actorLineColor: groupLine, signalColor: line, signalTextColor: text,
    labelBoxBkgColor: group, labelBoxBorderColor: groupLine, labelTextColor: text, loopTextColor: text,
    noteBkgColor: note, noteBorderColor: noteLine, noteTextColor: text, activationBkgColor: group, activationBorderColor: border, sequenceNumberColor: bg,
    stateBkg: node, stateBorder: border, transitionColor: line, transitionLabelColor: text, stateLabelColor: text,
    compositeBackground: group, compositeTitleBackground: group, compositeBorder: groupLine, altBackground: group, innerEndBackground: line, specialStateColor: line,
  },
  flowchart: { curve: "basis", padding: 14, nodeSpacing: 36, rankSpacing: 48, htmlLabels: false },
  sequence: { mirrorActors: false, actorMargin: 36, messageMargin: 30, boxMargin: 8, noteMargin: 10 },
  state: { padding: 10 },
};

const walk = (d) => (existsSync(d) ? readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)])) : []);

function fences() {
  const found = new Map();
  for (const file of [...walk("docs"), ...walk("content/blog")].filter((f) => f.endsWith(".md"))) {
    for (const m of readFileSync(file, "utf8").matchAll(/^```mermaid[^\n]*\n([\s\S]*?)^```\s*$/gm)) found.set(diagramId(m[1]), m[1].trim());
  }
  return found;
}

function chrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const cache = join(homedir(), "Library/Caches/ms-playwright");
  const linux = join(homedir(), ".cache/ms-playwright");
  const root = existsSync(cache) ? cache : linux;
  const dirs = walk(root).filter((f) => /chromium-\d+\/chrome-[^/]+\/(Google Chrome for Testing\.app\/Contents\/MacOS\/Google Chrome for Testing|chrome)$/.test(f));
  if (!dirs.length) throw new Error("no Chromium found: run `playwright install chromium` or set CHROME");
  return dirs.sort().at(-1);
}

// One SVG per diagram, with a unique id so several can share a page, and tokens for colour.
function finish(svg, id) {
  let out = svg.replaceAll("my-svg", `d-${id}`);
  for (const [hex, token] of Object.entries(TOKENS)) out = out.replaceAll(new RegExp(hex, "gi"), token);
  return out.replace(/(&quot;|")JetBrains Mono\1,\s*Menlo,\s*(&quot;|")DejaVu Sans Mono\2,\s*monospace/g, "var(--mono)");
}

const want = fences();
mkdirSync(DIAGRAM_DIR, { recursive: true });
const redraw = process.argv.includes("--redraw");
const missing = [...want].filter(([id]) => redraw || !existsSync(`${DIAGRAM_DIR}/${id}.svg`));
for (const f of readdirSync(DIAGRAM_DIR)) if (!want.has(f.replace(/\.svg$/, ""))) rmSync(join(DIAGRAM_DIR, f));

if (missing.length) {
  const work = mkdtempSync(join(tmpdir(), "diagrams-"));
  writeFileSync(join(work, "config.json"), JSON.stringify(CONFIG));
  writeFileSync(join(work, "puppeteer.json"), JSON.stringify({ executablePath: chrome(), args: ["--allow-file-access-from-files"] }));
  writeFileSync(join(work, "in.md"), missing.map(([, code]) => "```mermaid\n" + code + "\n```\n").join("\n"));
  execFileSync("npx", ["-y", MERMAID_CLI, "-i", "in.md", "-o", "out.md", "-c", "config.json", "-p", "puppeteer.json", "-b", "transparent", "-q"], {
    cwd: work, stdio: "inherit", env: { ...process.env, PUPPETEER_SKIP_DOWNLOAD: "1" },
  });
  missing.forEach(([id], j) => writeFileSync(`${DIAGRAM_DIR}/${id}.svg`, finish(readFileSync(join(work, `out-${j + 1}.svg`), "utf8"), id) + "\n"));
  rmSync(work, { recursive: true });
}
console.log(`${want.size} diagrams, ${missing.length} drawn`);
