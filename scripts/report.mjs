// Turns report query results into the visit journeys, web vital percentiles and the HTML page.

export function journeys(rows) {
  const byVisit = new Map();
  for (const { visit, path } of rows) {
    const list = byVisit.get(visit) ?? [];
    if (list.at(-1) !== path) list.push(path);
    byVisit.set(visit, list);
  }
  const counts = new Map();
  for (const list of byVisit.values()) {
    const key = list.slice(0, 4).join("  →  ") + (list.length > 4 ? "  →  …" : "");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([path, visits]) => ({ path, visits }));
}

export function p75(rows) {
  const by = new Map();
  for (const { target, value } of rows) by.set(target, [...(by.get(target) ?? []), value]);
  return [...by].map(([vital, values]) => {
    values.sort((a, b) => a - b);
    return { vital, p75: values[Math.floor(values.length * 0.75)], samples: values.length };
  });
}

const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const numeric = (rows, col) => rows.every((r) => r[col] === null || typeof r[col] === "number");
const cell = (tag, value, isNumber) => `<${tag}${isNumber ? ' class="n"' : ""}>${esc(value)}</${tag}>`;

function table([title, rows]) {
  if (!rows.length) return `<section><h2>${esc(title)}</h2><p class="none">Nothing yet.</p></section>`;
  const cols = Object.keys(rows[0]).map((c) => [c, numeric(rows, c)]);
  const head = cols.map(([c, n]) => cell("th", c.replace(/_/g, " "), n)).join("");
  const body = rows.map((r) => `<tr>${cols.map(([c, n]) => cell("td", r[c], n)).join("")}</tr>`).join("");
  return `<section><h2>${esc(title)}</h2><div class="scroll"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></section>`;
}

export function html(sections, { since, today, days }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Optics analytics</title><style>
:root{--bg:#fbfaf7;--fg:#1d1b18;--mute:#6b665e;--line:#e6e1d8;--head:#f2efe8}
@media (prefers-color-scheme:dark){:root{--bg:#141311;--fg:#ece8e1;--mute:#9a948a;--line:#2c2a26;--head:#1d1c19}}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.45 ui-sans-serif,system-ui,sans-serif}
main{max-width:1100px;margin:0 auto;padding:32px 16px 64px;display:grid;gap:28px;grid-template-columns:repeat(auto-fit,minmax(min(100%,500px),1fr))}
header{grid-column:1/-1}h1{margin:0;font-size:22px}header p,.none{color:var(--mute);margin:4px 0 0}
h2{font-size:14px;margin:0 0 8px}.scroll{overflow-x:auto;border:1px solid var(--line);border-radius:8px}
table{border-collapse:collapse;width:100%}th,td{padding:6px 10px;text-align:left;border-bottom:1px solid var(--line);white-space:nowrap;max-width:420px;overflow:hidden;text-overflow:ellipsis}
th{background:var(--head);font-weight:600;font-size:12px;color:var(--mute)}tr:last-child td{border-bottom:0}.n{text-align:right;font-variant-numeric:tabular-nums}
</style></head><body><main><header><h1>Optics analytics</h1><p>${since} to ${today} (${days} days) · generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC</p></header>${sections.map(table).join("")}</main></body></html>`;
}
