// The "Built in the open" band: real numbers from content/proof.json, written by
// scripts/proof.mjs, each shown with the date it was read and a link to its source.
import { readFileSync } from "node:fs";
import { CLICKHOUSE, REAL_INSTALLERS, REPO, json } from "../edge/snapshot.js";

const LINE = /^\*\s+(\w+)(?:\(([^)]*)\))?!?:\s+(.+?)\s+by\s+@\S+\s+in\s+(\S+)\s*$/;
const REPO_URL = `https://github.com/${REPO}`;
const SOURCES = {
  pypi: "https://clickpy.clickhouse.com/dashboard/optics-framework",
  bigquery: "https://docs.pypi.org/api/bigquery/",
  stars: `${REPO_URL}/stargazers`,
  releases: `${REPO_URL}/releases`,
};
const MIRRORS = ["bandersnatch", "Nexus", "devpi", "Artifactory"];
const SHOWN = 3;

export function releaseNotes(body) {
  const changes = body.split(/\r?\n/).map((line) => LINE.exec(line)).filter(Boolean);
  return {
    added: changes
      .filter(([, type]) => type === "feat")
      .map(([, , scope = "", text, pr]) => ({ scope, text: text[0].toUpperCase() + text.slice(1), pr })),
    fixes: changes.filter(([, type]) => type === "fix").length,
  };
}

const TABLE = "pypi.pypi_downloads_per_day_by_version_by_installer_by_type";

async function pypi(agent) {
  const query = (sql) => json(CLICKHOUSE, { method: "POST", body: `${sql} FORMAT JSONCompact`, headers: { "user-agent": agent } }).then((r) => r.data);
  const where = `project = 'optics-framework'`;
  const installers = REAL_INSTALLERS.map((i) => `'${i}'`).join(", ");
  const [[[from, to]], byInstaller, months] = await Promise.all([
    query(`SELECT toString(min(date)), toString(max(date)) FROM ${TABLE} WHERE ${where}`),
    query(`SELECT installer, sum(count) AS n FROM ${TABLE} WHERE ${where} GROUP BY installer ORDER BY n DESC`),
    query(`SELECT formatDateTime(toStartOfMonth(date), '%Y-%m') AS m, sum(count) FROM ${TABLE} WHERE ${where} AND installer IN (${installers}) GROUP BY m ORDER BY m`),
  ]);
  return {
    from,
    to,
    installers: Object.fromEntries(byInstaller.map(([name, n]) => [name || "unknown", Number(n)])),
    months: months.map(([month, n]) => [month, Number(n)]),
  };
}

async function github(agent, token) {
  const auth = token ? { authorization: `Bearer ${token}` } : {};
  const get = (path) => json(`https://api.github.com/repos/${REPO}${path}`, { headers: { "user-agent": agent, accept: "application/vnd.github+json", ...auth } });
  const [repo, list] = await Promise.all([get(""), get("/releases?per_page=30")]);
  const releases = list
    .filter((r) => !r.draft && !r.prerelease)
    .map((r) => ({ tag: r.tag_name.replace(/^v/, ""), date: r.published_at.slice(0, 10), url: r.html_url, ...releaseNotes(r.body || "") }));
  return { stars: repo.stargazers_count, forks: repo.forks_count, releases };
}

export async function collectProof({ today, agent, token }) {
  const [downloads, repo] = await Promise.all([pypi(agent), github(agent, token)]);
  return { pypi: { retrieved: today, ...downloads }, github: { retrieved: today, ...repo } };
}

export function loadProof(file = "content/proof.json") {
  const proof = JSON.parse(readFileSync(file, "utf8"));
  const { pypi, github } = proof;
  const day = /^\d{4}-\d{2}-\d{2}$/;
  if (![pypi.retrieved, pypi.from, pypi.to, github.retrieved].every((d) => day.test(d))) throw new Error(`${file}: every date must be YYYY-MM-DD`);
  if (!github.releases.length) throw new Error(`${file}: no releases`);
  return proof;
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = (n) => n.toLocaleString("en-US");
const date = (iso, opts = { day: "numeric", month: "short", year: "numeric" }) =>
  new Date(`${iso.length === 7 ? `${iso}-01` : iso}T00:00:00Z`).toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });
const time = (iso) => `<time datetime="${iso}">${date(iso)}</time>`;
const share = (part, all) => `${Math.round((100 * part) / all)}%`;
const and = (words) => (words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words.at(-1)}` : words.join(""));
const sum = (list) => list.reduce((a, b) => a + b, 0);

function figures({ pypi, github }) {
  const count = (names) => sum(names.map((n) => pypi.installers[n] ?? 0));
  const all = sum(Object.values(pypi.installers));
  const installs = count(REAL_INSTALLERS);
  const mirrors = count(MIRRORS);
  const browsers = count(["Browser"]);
  const since = new Date(Date.parse(github.retrieved) - 90 * 864e5).toISOString().slice(0, 10);
  const names = and(REAL_INSTALLERS.filter((n) => pypi.installers[n]));
  return {
    all,
    installs,
    names,
    clients: [
      ["installers", names, installs],
      ["mirrors", "Mirrors", mirrors],
      ["browsers", "Browsers", browsers],
      ["unnamed", "No name", all - installs - mirrors - browsers],
    ],
    recent: github.releases.filter((r) => r.date >= since).length,
    latest: github.releases[0],
  };
}

// The first and last months are partial unless the data starts on the 1st and ends on the last day.
function span(month, { from, to }) {
  const start = from.startsWith(month) && !from.endsWith("-01") ? from : null;
  const end = to.startsWith(month) && new Date(Date.parse(to) + 864e5).toISOString().startsWith(month) ? to : null;
  if (!start && !end) return "";
  const day = (iso) => date(iso, { day: "numeric", month: "short" });
  return start ? ` from ${day(start)}` : ` to ${day(end)}`;
}

function bars(pypi, names) {
  const top = Math.max(...pypi.months.map(([, n]) => n));
  const items = pypi.months.map(([month, n]) => {
    const part = span(month, pypi);
    const label = `${date(month, { month: "short", year: "numeric" })}${part}`;
    return `<li${part ? ' class="part"' : ""} style="--v:${(n / top).toFixed(3)}" data-n="${num(n)}"><span class="vh">${label}: ${num(n)}</span></li>`;
  });
  const first = date(pypi.months[0][0], { month: "short", year: "numeric" });
  return `<div class="bars-wrap">
              <ol class="bars" aria-label="Downloads from PyPI by ${names} per month">${items.join("")}</ol>
              <p class="bars-axis label" aria-hidden="true"><span>${first}</span><span>Peak ${num(top)} a month</span><span>${date(pypi.to, { month: "short", year: "numeric" })}</span></p>
            </div>`;
}

function release(r) {
  const more = r.added.length - SHOWN;
  const items = r.added.slice(0, SHOWN).map((c) => `<li>${c.scope ? `<span class="rel-scope">${esc(c.scope)}</span>` : ""}<a href="${esc(c.pr)}">${esc(c.text)}</a></li>`);
  if (more > 0) items.push(`<li class="rel-more">and ${more} more</li>`);
  const fixes = r.fixes ? `<p class="rel-fixes">${r.fixes} ${r.fixes === 1 ? "fix" : "fixes"}</p>` : "";
  return `<li class="rel">
              <p class="rel-head"><a class="rel-tag" href="${esc(r.url)}">${esc(r.tag)}</a> <span class="label">${time(r.date)}</span></p>
              ${items.length ? `<ul class="rel-added">${items.join("")}</ul>` : `<p class="rel-fixes">Fixes only</p>`}
              ${r.added.length ? fixes : ""}
            </li>`;
}

export function proofBand(proof) {
  const { pypi, github } = proof;
  const f = figures(proof);
  return `<section class="band proof" id="proof" data-hour="7" aria-labelledby="proof-h">
      <div class="wrap">
        <div class="head-row">
          <h2 class="h2" id="proof-h">Built in the open</h2>
          <p class="head-note">Public numbers. Each one names its source and the date we read it.</p>
        </div>
        <div class="figs">
          <figure class="fig fig-wide">
            <p class="fig-n">${num(f.installs)}</p>
            <figcaption>
              <p class="fig-what">downloads from PyPI by ${f.names}, since ${time(pypi.from)}</p>
              <p class="fig-note">${num(f.all)} downloads in all. Mirrors, browsers and clients with no name make up the other ${share(f.all - f.installs, f.all)}.</p>
            </figcaption>
            ${bars(pypi, f.names)}
            <p class="fig-src label"><a href="${SOURCES.pypi}">PyPI download logs</a><span>to ${time(pypi.to)}</span></p>
          </figure>
          <figure class="fig">
            <p class="fig-n">${num(github.stars)}</p>
            <figcaption><p class="fig-what">stars on GitHub, and ${num(github.forks)} forks</p></figcaption>
            <p class="fig-src label"><a href="${SOURCES.stars}">GitHub</a><span>read ${time(github.retrieved)}</span></p>
          </figure>
          <figure class="fig">
            <p class="fig-n">${f.recent}</p>
            <figcaption><p class="fig-what">releases in the 90 days to ${time(github.retrieved)}. The latest is <a href="${esc(f.latest.url)}">${esc(f.latest.tag)}</a>.</p></figcaption>
            <p class="fig-src label"><a href="${SOURCES.releases}">GitHub releases</a><span>read ${time(github.retrieved)}</span></p>
          </figure>
        </div>
        <h3 class="h3 rel-h">What the last three releases added</h3>
        <ol class="rels">
            ${github.releases.slice(0, 3).map(release).join("\n            ")}
        </ol>
        <details class="sources">
          <summary class="label">Sources and method</summary>
          <div class="sources-body">
            <div class="mix" role="img" aria-label="${f.clients.map(([, name, n]) => `${name} ${share(n, f.all)}`).join(", ")} of ${num(f.all)} PyPI downloads">
              ${f.clients.map(([key, , n]) => `<i class="mix-${key}" style="flex-grow:${n}"></i>`).join("")}
            </div>
            <ul class="mix-key label">
              ${f.clients.map(([key, name, n]) => `<li><i class="mix-${key}"></i>${name} ${num(n)} <span>${share(n, f.all)}</span></li>`).join("\n              ")}
            </ul>
            <dl class="method">
              <div><dt>Downloads</dt><dd>Daily download counts for the <a href="https://pypi.org/project/optics-framework/">optics-framework</a> package from PyPI's <a href="${SOURCES.bigquery}">public download logs</a>, read through <a href="${SOURCES.pypi}">ClickPy</a>. We count downloads by ${and(REAL_INSTALLERS)}, the tools that fetch a package to use it. We leave out mirrors (${MIRRORS.join(", ")}), browsers and clients that send no name. One person can download many times, for example in CI, so downloads are not people.</dd></div>
              <div><dt>Stars and forks</dt><dd>The counts on the <a href="${REPO_URL}">GitHub repository</a> on the day we read them.</dd></div>
              <div><dt>Releases</dt><dd>Published <a href="${SOURCES.releases}">GitHub releases</a>. Each line is the title of a feature pull request from the release notes; dependency updates are not counted.</dd></div>
              <div><dt>Updates</dt><dd>This page makes no requests to these sources. A script reads them and the result is committed with the site, so the numbers change only when the site is rebuilt.</dd></div>
            </dl>
          </div>
        </details>
      </div>
    </section>`;
}

export function proofMarkdown(proof) {
  const { pypi, github } = proof;
  const f = figures(proof);
  const rel = github.releases.slice(0, 3).map((r) => {
    const added = r.added.map((c) => `  - ${c.text} (${c.pr})`).join("\n");
    return `- [${r.tag}](${r.url}), ${date(r.date)}${r.fixes ? `, ${r.fixes} ${r.fixes === 1 ? "fix" : "fixes"}` : ""}${added ? `:\n${added}` : ""}`;
  });
  return `## Built in the open

- ${num(f.installs)} downloads from PyPI by ${f.names}, ${date(pypi.from)} to ${date(pypi.to)}, out of ${num(f.all)} downloads in all (the rest are mirrors, browsers and unnamed clients). Source: PyPI public download logs via ClickPy, ${SOURCES.pypi}.
- ${num(github.stars)} stars and ${num(github.forks)} forks on GitHub, read ${date(github.retrieved)}. Source: ${SOURCES.stars}.
- ${f.recent} releases in the 90 days to ${date(github.retrieved)}. Source: ${SOURCES.releases}.

What the last three releases added:

${rel.join("\n")}`;
}
