import { test } from "node:test";
import assert from "node:assert/strict";
import { DAILY_CAP, sendDigest } from "../edge/feedback.js";
import { DIGEST_CRON, scheduled, serve } from "../edge/worker.js";

const SITE = "https://optics-framework.org";
const COLUMNS = ["ts", "day", "kind", "impact", "task", "description", "tool", "error", "suggestion", "version", "client", "transport", "platform", "country"];

function fakeDb(feedback = []) {
  const hits = [];
  const prepare = (sql) => ({
    bind: (...args) => ({
      run: async () => {
        if (sql.includes("INTO hits")) return hits.push(args);
        feedback.push(Object.fromEntries(COLUMNS.map((c, i) => [c, args[i]])));
        return { meta: { last_row_id: feedback.length } };
      },
      first: async () => ({ n: feedback.filter((r) => r.day === args[0]).length }),
      all: async () => ({ results: feedback.filter((r) => r.day === args[0]) }),
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
