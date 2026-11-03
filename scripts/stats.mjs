// The analytics report: refreshes PyPI and GitHub numbers in D1 (GitHub traffic through
// your own `gh` login), then writes stats/report.html and stats/report.json for the last
// --days days (default 7). Needs the cf CLI signed in: `cf auth login`.
//
//   node scripts/stats.mjs [--days 30] [--no-collect]
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { githubRows, pypiRows } from "../edge/snapshot.js";
import { html, journeys, p75 } from "./report.mjs";

const DB = readFileSync("edge/wrangler.toml", "utf8").match(/database_id = "([^"]+)"/)[1];
const args = process.argv.slice(2);
const days = Number(args[args.indexOf("--days") + 1]) || 7;
const today = new Date().toISOString().slice(0, 10);
const since = new Date(Date.now() - (days - 1) * 864e5).toISOString().slice(0, 10);
const REAL_INSTALLERS = "('pip', 'uv', 'poetry', 'pdm', 'pipenv', 'pipx', 'requests')";
const INSTALL_COPY = "(target LIKE '%optics-framework.org/install%' OR target LIKE '%pip install optics-framework%' OR target LIKE 'manual:%install%')";

function d1(statements) {
  const file = join(tmpdir(), `optics-stats-${process.pid}.json`);
  writeFileSync(file, JSON.stringify(statements));
  return JSON.parse(execFileSync("cf", ["d1", "query", DB, "--batch", `@${file}`], { encoding: "utf8", maxBuffer: 1 << 28 })).map((r) => r.results);
}

function ghToken() {
  try {
    return execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

const chunks = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));
const upsert = (name, rows, sql) =>
  rows
    .then((list) => {
      chunks(list, 50).forEach((part) => d1(part.map((params) => ({ sql, params }))));
      console.log(`collected ${list.length} ${name} rows`);
    })
    .catch((e) => console.error(`${name}: ${e.message}`));

async function collect() {
  const token = ghToken();
  if (!token) console.error("github: no gh login, so traffic is skipped");
  await upsert("pypi", pypiRows(), "INSERT INTO pypi (day, version, installer, type, country, downloads) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (day, version, installer, type, country) DO UPDATE SET downloads = excluded.downloads");
  await upsert("github", githubRows(token, today), "INSERT INTO github (day, metric, dim, value) VALUES (?, ?, ?, ?) ON CONFLICT (day, metric, dim) DO UPDATE SET value = excluded.value");
}

// Each table in the report: a title and the query that fills it. `people` are browsers
// that ran the site's script, so headless scrapers and crawlers are already left out.
const people = `FROM events WHERE day >= '${since}' AND client = 'browser'`;
const hits = `FROM hits WHERE day >= '${since}'`;
const TABLES = [
  ["Overview", `SELECT COUNT(DISTINCT visit) AS visits, SUM(name = 'view') AS page_views, ROUND(1.0 * SUM(name = 'view') / MAX(COUNT(DISTINCT visit), 1), 1) AS pages_per_visit, COUNT(DISTINCT CASE WHEN name = 'copy' AND ${INSTALL_COPY} THEN visit END) AS visits_copying_install, COUNT(DISTINCT CASE WHEN path LIKE '%/docs/%' AND name = 'view' THEN visit END) AS visits_reading_docs ${people}`],
  ["By day", `SELECT day, COUNT(DISTINCT visit) AS visits, SUM(name = 'view') AS views, SUM(name = 'copy' AND ${INSTALL_COPY}) AS install_copies, SUM(name = 'search') AS searches ${people} GROUP BY day ORDER BY day`],
  ["Requests by client", `SELECT client, COUNT(*) AS requests, COUNT(DISTINCT agent) AS agents ${hits} GROUP BY client ORDER BY requests DESC`],
  ["Funnel (visits)", `SELECT 'visited' AS step, COUNT(DISTINCT visit) AS visits ${people}
    UNION ALL SELECT 'read the docs', COUNT(DISTINCT visit) ${people} AND name = 'view' AND path LIKE '%/docs/%'
    UNION ALL SELECT 'opened an install page', COUNT(DISTINCT visit) ${people} AND name = 'view' AND (path LIKE '%/docs/get-started/install%' OR path LIKE '%/docs/get-started/quickstart%')
    UNION ALL SELECT 'copied an install command', COUNT(DISTINCT visit) ${people} AND name = 'copy' AND ${INSTALL_COPY}
    UNION ALL SELECT 'came back from the installer', COUNT(DISTINCT visit) ${people} AND name = 'campaign' AND target = 'installer'`],
  ["Installer runs", `SELECT path, client, agent, COUNT(*) AS fetches, COUNT(DISTINCT country) AS countries ${hits} AND path IN ('/install', '/install.sh', '/install.ps1') GROUP BY path, client, agent ORDER BY fetches DESC`],
  ["PyPI downloads by installer", `SELECT installer, SUM(downloads) AS downloads, COUNT(DISTINCT country) AS countries FROM pypi WHERE day >= '${since}' GROUP BY installer ORDER BY downloads DESC`],
  ["PyPI real installs by version", `SELECT version, SUM(downloads) AS downloads FROM pypi WHERE day >= '${since}' AND installer IN ${REAL_INSTALLERS} GROUP BY version ORDER BY downloads DESC LIMIT 15`],
  ["PyPI real installs by country", `SELECT country, SUM(downloads) AS downloads FROM pypi WHERE day >= '${since}' AND installer IN ${REAL_INSTALLERS} GROUP BY country ORDER BY downloads DESC LIMIT 15`],
  ["Top pages", `SELECT path, SUM(name = 'view') AS views, COUNT(DISTINCT CASE WHEN name = 'view' THEN visit END) AS visits, ROUND(SUM(CASE WHEN name = 'read' THEN value END) / MAX(SUM(name = 'view'), 1)) AS avg_seconds, COUNT(DISTINCT CASE WHEN name = 'read' AND target IN ('75', '100') THEN visit END) AS read_75pct_visits ${people} GROUP BY path HAVING views > 0 ORDER BY views DESC LIMIT 30`],
  ["Where visits start (referrer)", `SELECT CASE WHEN target = '' THEN '(direct)' ELSE target END AS source, COUNT(*) AS landings ${people} AND name = 'view' AND target NOT LIKE '/%' GROUP BY source ORDER BY landings DESC LIMIT 25`],
  ["Campaigns (?ref=)", `SELECT target AS ref, COUNT(DISTINCT visit) AS visits ${people} AND name = 'campaign' GROUP BY target ORDER BY visits DESC`],
  ["Countries", `SELECT country, COUNT(DISTINCT visit) AS visits ${people} GROUP BY country ORDER BY visits DESC LIMIT 20`],
  ["Devices and preferences", `SELECT 'device' AS kind, device AS value, COUNT(DISTINCT visit) AS visits ${people} GROUP BY device UNION ALL SELECT 'pref', target, COUNT(DISTINCT visit) ${people} AND name = 'pref' GROUP BY target ORDER BY kind, visits DESC`],
  ["Homepage sections reached", `SELECT target AS section, COUNT(DISTINCT visit) AS visits ${people} AND name = 'section' AND path = '/' GROUP BY target ORDER BY visits DESC`],
  ["Copied", `SELECT target, COUNT(*) AS copies, COUNT(DISTINCT visit) AS visits ${people} AND name = 'copy' GROUP BY target ORDER BY copies DESC LIMIT 30`],
  ["Tabs picked", `SELECT target AS tab, COUNT(*) AS picks ${people} AND name = 'tab' GROUP BY target ORDER BY picks DESC`],
  ["Docs searches", `SELECT target AS query, COUNT(*) AS searches, MIN(value) AS results ${people} AND name = 'search' GROUP BY target ORDER BY searches DESC LIMIT 40`],
  ["Searches with no results", `SELECT target AS query, COUNT(*) AS searches ${people} AND name = 'search' AND value = 0 GROUP BY target ORDER BY searches DESC`],
  ["Search results opened", `SELECT target AS page, ROUND(AVG(value), 1) AS avg_rank, COUNT(*) AS opens ${people} AND name = 'result' GROUP BY target ORDER BY opens DESC LIMIT 20`],
  ["Was this page helpful?", `SELECT path, SUM(target = 'yes') AS yes, SUM(target = 'no') AS no ${people} AND name = 'helpful' GROUP BY path ORDER BY no DESC, yes DESC`],
  ["Links followed to other sites", `SELECT target, COUNT(*) AS clicks ${people} AND name = 'out' GROUP BY target ORDER BY clicks DESC LIMIT 25`],
  ["How people move (link regions)", `SELECT substr(target, 1, instr(target, ':') - 1) AS region, COUNT(*) AS clicks ${people} AND name = 'nav' GROUP BY region ORDER BY clicks DESC`],
  ["Demo film and animations", `SELECT name, target, COUNT(*) AS times ${people} AND name IN ('film', 'scene', 'details', 'check', 'theme', 'filter', 'ui') GROUP BY name, target ORDER BY name, times DESC`],
  ["Script errors", `SELECT target AS error, path, COUNT(*) AS times FROM events WHERE day >= '${since}' AND name = 'error' GROUP BY target, path ORDER BY times DESC`],
  ["AI assistants fetching for a person", `SELECT agent, path, COUNT(*) AS fetches ${hits} AND client = 'ai-user' GROUP BY agent, path ORDER BY fetches DESC LIMIT 30`],
  ["Crawlers and agents", `SELECT client, agent, COUNT(*) AS requests, SUM(served = 'text/markdown') AS markdown ${hits} AND client NOT IN ('browser', 'prefetch') GROUP BY client, agent ORDER BY requests DESC LIMIT 40`],
  ["Agent discovery files", `SELECT path, COUNT(*) AS fetches, COUNT(DISTINCT agent) AS agents ${hits} AND (path LIKE '/.well-known/%' OR path IN ('/llms.txt', '/llms-full.txt', '/ai.txt', '/openapi.json', '/robots.txt', '/sitemap.xml', '/feed.xml') OR path LIKE '%.md') GROUP BY path ORDER BY fetches DESC LIMIT 30`],
  ["Not found (404) and their referrers", `SELECT path, referrer, COUNT(*) AS times ${hits} AND status = 404 GROUP BY path, referrer ORDER BY times DESC LIMIT 30`],
  ["Other errors (406, 5xx)", `SELECT status, path, client, COUNT(*) AS times ${hits} AND status >= 400 AND status <> 404 GROUP BY status, path, client ORDER BY times DESC LIMIT 20`],
  ["GitHub", `SELECT metric, dim, value, day FROM github WHERE day = (SELECT MAX(day) FROM github WHERE metric = 'stars') AND metric IN ('stars', 'forks', 'watchers', 'open_issues') ORDER BY metric`],
  ["GitHub traffic by day", `SELECT day, SUM(CASE WHEN metric = 'views' THEN value END) AS views, SUM(CASE WHEN metric = 'views_unique' THEN value END) AS unique_viewers, SUM(CASE WHEN metric = 'clones' THEN value END) AS clones FROM github WHERE day >= '${since}' AND metric IN ('views', 'views_unique', 'clones') GROUP BY day ORDER BY day`],
  ["GitHub referrers (last 14 days)", `SELECT dim AS referrer, value AS views FROM github WHERE metric = 'referrer_views_14d' AND day = (SELECT MAX(day) FROM github WHERE metric = 'referrer_views_14d') ORDER BY value DESC`],
];

// Computed from raw rows: the first pages of each visit, and p75 of each web vital.
const RAW = [
  ["views", `SELECT visit, path FROM events WHERE day >= '${since}' AND client = 'browser' AND name = 'view' ORDER BY visit, ts`],
  ["vitals", `SELECT target, value FROM events WHERE day >= '${since}' AND client = 'browser' AND name = 'vital'`],
];

if (!args.includes("--no-collect")) await collect();
const results = d1([...TABLES, ...RAW].map(([, sql]) => ({ sql })));
const sections = TABLES.map(([title], i) => [title, results[i]]);
const [views, vitals] = results.slice(TABLES.length);
sections.splice(9, 0, ["Journeys (first pages of each visit)", journeys(views)]);
sections.push(["Web vitals, 75th percentile (ms; CLS unitless)", p75(vitals)]);
mkdirSync("stats", { recursive: true });
writeFileSync("stats/report.json", JSON.stringify({ since, today, days, sections: Object.fromEntries(sections) }, null, 2));
writeFileSync("stats/report.html", html(sections, { since, today, days }));
const overview = sections[0][1][0] ?? {};
console.log(`stats/report.html: ${overview.visits ?? 0} visits, ${overview.page_views ?? 0} page views, ${overview.visits_copying_install ?? 0} copied an install command`);
