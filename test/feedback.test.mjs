import { test } from "node:test";
import assert from "node:assert/strict";
import { DAILY_CAP, sendDigest } from "../edge/feedback.js";
import { DIGEST_CRON, scheduled, serve } from "../edge/worker.js";

const SITE = "https://optics-framework.org";
const COLUMNS = ["ts", "day", "kind", "impact", "task", "description", "tool", "error", "suggestion", "version", "client", "transport", "platform", "country"];

const IMPACT_ORDER = ["blocked", "worked_around", "friction", "none"];

function group(rows, keys) {
  const groups = new Map();
  for (const row of rows) {
    const key = keys.map((k) => row[k]).join("|");
    groups.set(key, { ...Object.fromEntries(keys.map((k) => [k, row[k]])), n: (groups.get(key)?.n ?? 0) + 1 });
  }
  return [...groups.values()];
}

// Answers the handful of statements feedback.js sends, the way D1 would.
function fakeDb(feedback = []) {
  const hits = [];
  const places = {};
  for (const row of feedback) places[row.day] = (places[row.day] ?? 0) + 1;
  const ofDay = (day) => feedback.filter((row) => row.day === day);
  const prepare = (sql) => ({
    bind: (...args) => ({
      run: async () => {
        if (sql.includes("INTO hits")) return hits.push(args);
        feedback.push(Object.fromEntries(COLUMNS.map((c, i) => [c, args[i]])));
        return { meta: { last_row_id: feedback.length } };
      },
      first: async () => {
        const [day, cap] = args;
        if ((places[day] ?? 0) >= cap) return null;
        places[day] = (places[day] ?? 0) + 1;
        return { n: places[day] };
      },
      all: async () => {
        const rows = ofDay(args[0]);
        if (sql.includes("GROUP BY kind")) return { results: group(rows, ["kind", "impact"]) };
        if (sql.includes("GROUP BY tool")) return { results: group(rows.filter((r) => r.tool), ["tool"]).sort((a, b) => b.n - a.n) };
        const rank = (row) => IMPACT_ORDER.indexOf(row.impact);
        return { results: [...rows].sort((a, b) => rank(a) - rank(b) || a.ts - b.ts).slice(0, args[1]) };
      },
    }),
  });
  return { feedback, hits, prepare };
}

const report = {
  kind: "broken",
  impact: "worked_around",
  task: "sign in to the Birch shop",
  description: "tap on e7 returned ok but the screen did not change; used press_key Enter instead. My key is sk-abcdefghijklmnopqrstuv and mail me at dev@example.com",
  tool: "tap",
  version: "1.11.4",
  client: "claude-code",
  transport: "stdio",
  platform: "darwin",
};

async function post(body, DB = fakeDb(), headers = {}) {
  const pending = [];
  const response = await serve(
    new Request(`${SITE}/api/feedback`, { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "content-type": "application/json", ...headers } }),
    { DB },
    { waitUntil: (p) => pending.push(p) },
    () => assert.fail("a report never reaches GitHub Pages"),
  );
  await Promise.all(pending);
  return { response, DB };
}

test("a report is stored with secrets and email addresses removed, and no page hit is logged", async () => {
  const { response, DB } = await post(report);
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { id: 1, received: true });
  const [row] = DB.feedback;
  assert.equal(row.kind, "broken");
  assert.equal(row.tool, "tap");
  assert.equal(row.client, "claude-code");
  assert.match(row.description, /used press_key Enter instead/);
  assert.doesNotMatch(row.description, /sk-abc|dev@example\.com/);
  assert.equal(DB.hits.length, 0);
});

test("a report that is not what the Optics client sends is refused and not stored", async () => {
  for (const bad of ["not json", { ...report, kind: "rant" }, { ...report, impact: "" }, { ...report, task: "" }, { ...report, description: "x".repeat(4001) }]) {
    const { response, DB } = await post(bad);
    assert.equal(response.status, 400, JSON.stringify(bad).slice(0, 60));
    assert.equal(DB.feedback.length, 0);
  }
  const { response } = await post(report, fakeDb(), { "content-length": "20000" });
  assert.equal(response.status, 413);
});

test("bearer and basic credentials, Stripe and Slack keys, and hidden control characters never reach storage", async () => {
  const description = "token: Bearer abcdef123456 then Authorization: Basic dXNlcjpwYXNz and sk_live_abcdefghijklmnop1234 and xoxb-12345-abcdefghij \u202Egnp.exe\u0000 done";
  const { response, DB } = await post({ ...report, description });
  assert.equal(response.status, 201);
  assert.doesNotMatch(DB.feedback[0].description, /abcdef123456|dXNlcjpwYXNz|sk_live_|xoxb-|\u202E|\u0000/);
  assert.match(DB.feedback[0].description, /done$/);
});

test("when the database fails, the agent is told not to retry instead of getting a crash", async () => {
  const broken = { prepare: () => ({ bind: () => ({ first: async () => { throw new Error("D1 is over its write limit"); }, run: async () => { throw new Error("D1 is over its write limit"); } }) }) };
  const { response } = await post(report, broken);
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /Do not retry/);
});

test("once the day's cap is reached, reports are refused and the agent is told not to retry", async () => {
  const today = new Date().toISOString().slice(0, 10);
  const DB = fakeDb(Array.from({ length: DAILY_CAP }, () => ({ day: today })));
  const { response } = await post(report, DB);
  assert.equal(response.status, 429);
  assert.match((await response.json()).error, /Do not retry/);
  assert.equal(DB.feedback.length, DAILY_CAP);
});

function github() {
  const filed = [];
  const post = async (url, init) => {
    filed.push({ url, init, issue: JSON.parse(init.body) });
    return new Response(JSON.stringify({ number: filed.length }), { status: 201 });
  };
  return { filed, post };
}

const ENV = { GITHUB_TOKEN: "github_pat_test", FEEDBACK_REPO: "owner/optics-feedback" };

test("the digest files yesterday's reports, and only those, as one issue in the private repository", async () => {
  const now = Date.parse("2026-11-20T04:47:00Z");
  const DB = fakeDb([
    { ...report, day: "2026-11-19", ts: now - 80_000_000, error: null, suggestion: "say when a tap changes nothing" },
    { ...report, day: "2026-11-19", ts: now - 70_000_000, kind: "worked", impact: "none", task: "fill the checkout form", description: "batch filled five fields in one call", error: null, suggestion: null },
    { ...report, day: "2026-11-20", ts: now - 1000, task: "today's report waits for tomorrow" },
  ]);
  const { filed, post } = github();
  await sendDigest({ ...ENV, DB }, now, post);
  assert.equal(filed.length, 1);
  const [{ url, init, issue }] = filed;
  assert.equal(url, "https://api.github.com/repos/owner/optics-feedback/issues");
  assert.equal(init.headers.authorization, "Bearer github_pat_test");
  assert.equal(issue.title, "Optics feedback 2026-11-19: 2 reports");
  assert.deepEqual(issue.labels, ["broken", "worked"]);
  assert.match(issue.body, /Kinds: broken 1, worked 1/);
  assert.match(issue.body, /tap 2/);
  assert.match(issue.body, /### 1\. broken · worked_around/);
  assert.match(issue.body, /Suggestion: say when a tap changes nothing/);
  assert.doesNotMatch(issue.body, /today's report/);
});

test("a report cannot mention people or break out of its block in the issue", async () => {
  const now = Date.parse("2026-11-20T04:47:00Z");
  const sneaky = { ...report, day: "2026-11-19", ts: now - 1000, description: "```\n@octocat look ![x](https://evil.example/p.png)\n````" };
  const { filed, post } = github();
  await sendDigest({ ...ENV, DB: fakeDb([sneaky]) }, now, post);
  const { body } = filed[0].issue;
  const fence = body.match(/^(`{5,})text$/m)?.[1];
  assert.ok(fence, "the block's fence is longer than any backtick run in the report");
  const block = body.slice(body.indexOf(`${fence}text`), body.lastIndexOf(fence));
  assert.match(block, /@octocat/);
  assert.equal(body.split("@octocat").length, 2);
});

test("on a busy day the issue leads with the blocked reports and points to D1 for the rest", async () => {
  const now = Date.parse("2026-11-20T04:47:00Z");
  const rows = Array.from({ length: 1200 }, (_, i) => ({
    ...report, day: "2026-11-19", ts: now - 80_000_000 + i, kind: "worked", impact: "none", description: `run ${i} went fine`, error: null, suggestion: null,
  }));
  rows.push({ ...report, day: "2026-11-19", ts: now - 1000, impact: "blocked", task: "launch the desktop app", error: null, suggestion: null });
  const { filed, post } = github();
  await sendDigest({ ...ENV, DB: fakeDb(rows) }, now, post);
  const { title, body } = filed[0].issue;
  assert.equal(title, "Optics feedback 2026-11-19: 1201 reports");
  assert.match(body, /### 1\. broken · blocked/);
  assert.match(body, /Not shown: \d+ reports/);
  assert.ok(body.length <= 61000);
});

test("no issue is filed on a day without reports, or before the token is set", async () => {
  const { filed, post } = github();
  await sendDigest({ ...ENV, DB: fakeDb() }, Date.now(), post);
  await sendDigest({ DB: fakeDb([{ ...report, day: new Date(Date.now() - 86_400_000).toISOString().slice(0, 10) }]) }, Date.now(), post);
  assert.equal(filed.length, 0);
});

test("the digest cron is the only scheduled job that files an issue", async () => {
  const { filed, post } = github();
  const realFetch = globalThis.fetch;
  globalThis.fetch = post;
  try {
    await scheduled({ cron: DIGEST_CRON }, { ...ENV, DB: fakeDb([{ ...report, day: new Date(Date.now() - 86_400_000).toISOString().slice(0, 10) }]) });
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal(filed.length, 1);
});
