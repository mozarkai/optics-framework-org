import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { classify } from "../edge/agents.js";
import { EVENTS } from "../edge/analytics.js";
import { serve } from "../edge/worker.js";
import { pagesOrigin } from "../pages-origin.mjs";

const SITE = "https://optics-framework.org";
const CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36";

function fakeDb() {
  const rows = { hits: [], events: [] };
  const statement = (sql) => ({
    bind: (...args) => ({ run: async () => rows[sql.match(/INTO (\w+)/)[1]].push(args), sql, args }),
  });
  return { rows, prepare: statement, batch: async (list) => Promise.all(list.map((s) => s.run())) };
}

async function request(path, { headers = {}, method = "GET", body } = {}) {
  const DB = fakeDb();
  const pending = [];
  const response = await serve(
    new Request(SITE + path, { method, headers, body }),
    { DB },
    { waitUntil: (p) => pending.push(p) },
    pagesOrigin("out"),
  );
  await Promise.all(pending);
  return { response, hits: DB.rows.hits, events: DB.rows.events };
}

const column = (row, name) => row[["ts", "day", "path", "status", "method", "served", "client", "agent", "referrer", "campaign", "country"].indexOf(name)];

test("a page request is logged with who asked, where from and which campaign", async () => {
  const { hits } = await request("/docs/get-started/install?ref=readme", {
    headers: { "user-agent": CHROME, referer: "https://news.ycombinator.com/item?id=1" },
  });
  assert.equal(hits.length, 1);
  const [hit] = hits;
  assert.equal(column(hit, "path"), "/docs/get-started/install");
  assert.equal(column(hit, "status"), 200);
  assert.equal(column(hit, "served"), "text/html");
  assert.equal(column(hit, "client"), "browser");
  assert.equal(column(hit, "agent"), "Chrome 156/macOS");
  assert.equal(column(hit, "referrer"), "news.ycombinator.com/item");
  assert.equal(column(hit, "campaign"), "readme");
});

test("installer fetches and missing assets are logged; assets that load are not", async () => {
  assert.equal(column((await request("/install", { headers: { "user-agent": "curl/8.7.1" } })).hits[0], "agent"), "curl/8.7.1");
  assert.equal((await request("/styles.css", { headers: { "user-agent": CHROME } })).hits.length, 0);
  assert.equal(column((await request("/nope.css")).hits[0], "status"), 404);
});

test("prefetched pages are marked so they never count as views", async () => {
  const { hits } = await request("/about", { headers: { "user-agent": CHROME, "sec-purpose": "prefetch;prerender" } });
  assert.equal(column(hits[0], "client"), "prefetch");
});

test("assistants fetching for a person, crawlers, scripts, bots and browsers are told apart", () => {
  const cases = [
    ["Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ChatGPT-User/1.0; +https://openai.com/bot)", "ai-user", "ChatGPT-User"],
    ["Claude-User/1.0", "ai-user", "Claude-User"],
    ["Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)", "ai-crawler", "GPTBot"],
    ["Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", "search", "Googlebot"],
    ["Mozilla/5.0 (Windows NT 10.0; Microsoft Windows 10.0.26100; en-US) PowerShell/7.4.6", "script", "PowerShell/7.4.6"],
    ["Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.1", "script", "WindowsPowerShell/5.1.26100.1"],
    ["python-requests/2.32.3", "script", "python-requests/2.32.3"],
    ["Mozilla/5.0 (compatible; SQLSpider/1.7.0)", "bot", "SQLSpider"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "bot", "Mozilla"],
    ["", "bot", "empty"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1", "browser", "Safari 18/iOS"],
    ["Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0", "browser", "Firefox 133/Linux"],
  ];
  for (const [ua, client, agent] of cases) assert.deepEqual(classify(ua), { client, agent }, ua);
  assert.deepEqual(classify(CHROME, "Monitoring & Analytics"), { client: "bot", agent: "Monitoring & Analytics" });
});

const beacon = (body, headers = { "sec-fetch-site": "same-origin" }) =>
  request("/e", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "user-agent": CHROME, ...headers } });
const batch = { v: "k3x9a0", p: "/docs/", d: "desktop", e: [["view", "/", null], ["copy", "curl -fsSL https://optics-framework.org/install | sh", null], ["read", "75", 42]] };

test("/e stores each event of a same-origin batch with its visit, page and device", async () => {
  const { response, events } = await beacon(batch);
  assert.equal(response.status, 204);
  assert.deepEqual(events.map((e) => e.slice(2)), [
    ["k3x9a0", "/docs/", "view", "/", null, "browser", null, "desktop"],
    ["k3x9a0", "/docs/", "copy", "curl -fsSL https://optics-framework.org/install | sh", null, "browser", null, "desktop"],
    ["k3x9a0", "/docs/", "read", "75", 42, "browser", null, "desktop"],
  ]);
});

test("/e rejects other sites and anything track.js would never send", async () => {
  assert.equal((await beacon(batch, { "sec-fetch-site": "cross-site" })).response.status, 403);
  assert.equal((await beacon(batch, { origin: "https://evil.example" })).response.status, 403);
  for (const bad of [
    "not json",
    { ...batch, e: [["keylog", "x", null]] },
    { ...batch, e: [] },
    { ...batch, v: "<script>" },
    { ...batch, d: "fridge" },
    { ...batch, e: [["view", "x".repeat(201), null]] },
    { ...batch, e: Array(26).fill(["view", "/", null]) },
  ]) {
    const { response, events } = await beacon(bad);
    assert.equal(response.status, 400, JSON.stringify(bad).slice(0, 60));
    assert.equal(events.length, 0);
  }
});

test("every event track.js sends is accepted by the worker and named on the privacy page", () => {
  const sent = new Set([...readFileSync("site/track.js", "utf8").matchAll(/track\("(\w+)"/g)].map((m) => m[1]));
  assert.deepEqual([...sent].sort(), [...EVENTS].sort());
  const privacy = readFileSync("pages/privacy.html", "utf8");
  for (const name of EVENTS) assert.match(privacy, new RegExp(`<code class="ic">${name}</code>`), name);
});

const htmlFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? htmlFiles(`${dir}/${e.name}`) : e.name.endsWith(".html") ? [`${dir}/${e.name}`] : []));

test("every page loads track.js, fingerprinted", () => {
  for (const file of htmlFiles("out")) {
    const html = readFileSync(file, "utf8");
    if (!html.includes('http-equiv="refresh"')) assert.match(html, /src="[^"]*track\.js\?v=\w{10}"/, file);
  }
});

test("/e refuses a body larger than track.js ever sends", async () => {
  const { response, events } = await beacon({ ...batch, e: [["view", "x".repeat(200), null]], pad: "x".repeat(17000) });
  assert.equal(response.status, 400);
  assert.equal(events.length, 0);
  const big = await request("/e", { method: "POST", body: "{}", headers: { "sec-fetch-site": "same-origin", "content-length": "20000" } });
  assert.equal(big.response.status, 413);
});

test("the daily snapshot upserts PyPI downloads and GitHub numbers, and traffic only with a token", async () => {
  const answers = {
    "sql-clickhouse": { data: [["2026-11-02", "1.11.1", "uv", "bdist_wheel", "IN", "3"], ["2026-11-02", "1.11.1", "", "sdist", "", "1"]] },
    "optics-framework/releases": [{ tag_name: "v1.11.1", assets: [{ name: "optics.whl", download_count: 7 }] }],
    "optics-framework/traffic/views": { views: [{ timestamp: "2026-11-01T00:00:00Z", count: 30, uniques: 9 }] },
    "optics-framework/traffic/clones": { clones: [] },
    "optics-framework/traffic/popular/referrers": [{ referrer: "aocr.org", count: 54 }],
    "optics-framework/traffic/popular/paths": [],
    "optics-framework": { stargazers_count: 65, forks_count: 22, subscribers_count: 4, open_issues_count: 3 },
  };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const key = Object.keys(answers).find((k) => String(url).includes(k) && (k !== "optics-framework" || String(url).endsWith(k)));
    return new Response(JSON.stringify(answers[key]), { status: key ? 200 : 404 });
  };
  try {
    const { snapshot } = await import("../edge/snapshot.js");
    const run = async (env) => {
      const DB = { rows: [], prepare: (sql) => ({ bind: (...args) => ({ table: sql.match(/INTO (\w+)/)[1], args }) }), batch: async (list) => DB.rows.push(...list) };
      await snapshot({ DB, ...env }, Date.parse("2026-11-03T04:17:00Z"));
      return DB.rows;
    };
    const anonymous = await run({});
    assert.deepEqual(anonymous.filter((r) => r.table === "pypi").map((r) => r.args), [
      ["2026-11-02", "1.11.1", "uv", "bdist_wheel", "IN", 3],
      ["2026-11-02", "1.11.1", "unknown", "sdist", "", 1],
    ]);
    const github = anonymous.filter((r) => r.table === "github").map((r) => r.args);
    assert.deepEqual(github.find((r) => r[1] === "stars"), ["2026-11-03", "stars", "", 65]);
    assert.deepEqual(github.find((r) => r[1] === "release_downloads"), ["2026-11-03", "release_downloads", "v1.11.1/optics.whl", 7]);
    assert.equal(github.some((r) => r[1] === "views"), false);
    const traffic = (await run({ GITHUB_TOKEN: "t" })).filter((r) => r.table === "github").map((r) => r.args);
    assert.deepEqual(traffic.find((r) => r[1] === "views_unique"), ["2026-11-01", "views_unique", "", 9]);
    assert.deepEqual(traffic.find((r) => r[1] === "referrer_views_14d"), ["2026-11-03", "referrer_views_14d", "aocr.org", 54]);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("the report follows each visit's first pages and takes the 75th percentile of each vital", async () => {
  const { journeys, p75, html } = await import("../scripts/report.mjs");
  const views = [
    { visit: "a", path: "/" }, { visit: "a", path: "/" }, { visit: "a", path: "/docs/" },
    { visit: "b", path: "/" }, { visit: "b", path: "/docs/" },
    { visit: "c", path: "/blog" },
  ];
  assert.deepEqual(journeys(views), [{ path: "/  →  /docs/", visits: 2 }, { path: "/blog", visits: 1 }]);
  const vitals = [100, 200, 300, 400].map((value) => ({ target: "LCP", value }));
  assert.deepEqual(p75(vitals), [{ vital: "LCP", p75: 400, samples: 4 }]);
  const page = html([["Copied", [{ target: "<b>", copies: 2 }]], ["Searches", []]], { since: "2026-11-01", today: "2026-11-03", days: 3 });
  assert.match(page, /<td>&lt;b&gt;<\/td><td class="n">2<\/td>/);
  assert.match(page, /<h2>Searches<\/h2><p class="none">Nothing yet\.<\/p>/);
});
