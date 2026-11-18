// The /run page and its Markdown twin, filled from the data of the last real run
// (site/runs/birch-run.js, written by scripts/birch-run.py).
import { readFileSync, statSync } from "node:fs";

const SUITE = "site/birch-tests";
const FILES = ["config.yaml", "test_cases/test_cases.csv", "modules/modules.csv", "test_data/elements.csv", "test_data/error_definitions.csv", "test_data/cart.png"];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const date = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const kb = (bytes) => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`);

export function loadRun(file = "site/runs/birch-run.js") {
  const text = readFileSync(file, "utf8");
  return JSON.parse(text.slice(text.indexOf("=") + 1).trim().replace(/;$/, ""));
}

export function fetchCommand(origin) {
  return `for f in ${FILES.join(" ")}; do curl -fsSL --create-dirs -o "birch-tests/$f" "${origin}/birch-tests/$f"; done`;
}

function suiteHtml(run) {
  return Object.entries(run.suite)
    .map(([name, text]) => `        <figure class="code"><figcaption><a href="birch-tests/${name}">${esc(name)}</a></figcaption><pre><code>${esc(text.trimEnd())}</code></pre></figure>`)
    .concat(`        <figure class="code run-tpl"><figcaption><a href="birch-tests/test_data/cart.png">test_data/cart.png</a></figcaption><img src="birch-tests/test_data/cart.png" alt="The cart icon that the suite finds by image" width="28" height="26"></figure>`)
    .join("\n");
}

function outputsHtml(run) {
  return run.runs
    .map((r) => {
      const folder = `runs/birch-${r.release}`;
      const rows = r.files.map((f) => `<li><a href="${folder}/${esc(f)}">${esc(f)}</a><span>${kb(statSync(`site/${folder}/${f}`).size)}</span></li>`).join("");
      return `        <div><h3 class="label">Birch ${esc(r.release)} · exit ${r.exit}</h3><ul>${rows}</ul></div>`;
    })
    .join("\n");
}

export function runBody(html, run, origin) {
  const values = {
    origin: esc(origin),
    optics: esc(run.optics),
    date: date(run.runs[0].date),
    fetch: esc(fetchCommand(origin)),
    suite: suiteHtml(run),
    outputs: outputsHtml(run),
  };
  return html.replace(/\{\{run:(\w+)\}\}/g, (_, key) => values[key]);
}

function stepRow(s) {
  const found = s.found_by.find((f) => f.ok);
  return `| ${s.case} | ${s.keyword} | ${s.args.join(", ").replace(/\|/g, "\\|")} | ${found ? found.rung : ""} | ${s.elapsed.toFixed(3)} s | ${s.status} |`;
}

export function runMarkdown(run, origin) {
  const parts = [
    "# A real run",
    `Birch is a real web app at ${origin}/birch/. On ${date(run.runs[0].date)}, Optics ${run.optics} (Playwright ${run.playwright}, Chromium as Pixel 7, ${run.platform}) ran the Birch suite at ${origin}/birch-tests/ against two releases of it. Every step passed both times. Release 2.2 shows "Session expired" at checkout, and on-screen error detection failed the run.`,
    "## Run it yourself",
    [
      "```shell",
      `pip install optics-framework==${run.optics} && optics setup --install playwright easyocr`,
      fetchCommand(origin),
      `BIRCH_URL=${origin}/birch/ optics execute birch-tests`,
      `BIRCH_URL='${origin}/birch/?release=2.2' optics execute birch-tests`,
      "```",
    ].join("\n"),
  ];
  for (const r of run.runs) {
    parts.push(
      `## Birch ${r.release}: exit ${r.exit}`,
      `Command: \`${r.command}\``,
      "| Test case | Keyword | Parameters | Found by | Took | Status |\n|---|---|---|---|---|---|\n" + r.steps.map(stepRow).join("\n"),
      "```terminal\n" + r.tree + "\n```",
    );
    if (r.errors.length) parts.push("Detected errors:\n\n```json\n" + JSON.stringify(r.errors, null, 2) + "\n```");
    parts.push("Files: " + r.files.map((f) => `[${f}](${origin}/runs/birch-${r.release}/${f})`).join(", "));
  }
  return parts.join("\n\n") + "\n";
}
