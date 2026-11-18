// Reports that agents send through the Optics MCP server's send_feedback tool, and the
// daily GitHub issue that sums them up. The handler returns before the Markdown and analytics
// path because the free plan gives each request 10 ms of CPU.

export const FEEDBACK_PATH = "/api/feedback";
export const DAILY_CAP = 5000;
export const KINDS = new Set(["broken", "missing", "confusing", "idea", "worked"]);
export const IMPACTS = new Set(["blocked", "worked_around", "friction", "none"]);
const TRANSPORTS = new Set(["stdio", "http"]);
const MAX_BODY = 16384;
const LIMITS = { task: 200, description: 4000, tool: 100, error: 1000, suggestion: 1000, client: 100, platform: 40 };
const VERSION = /^[\w.+-]{1,40}$/;
const MAX_ISSUE_BODY = 60000;
const DIGEST_REPORTS = 40;

const INSERT =
  "INSERT INTO feedback (ts, day, kind, impact, task, description, tool, error, suggestion, version, client, transport, platform, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
// Takes one of the day's places, or returns no row once the day is full.
const TAKE_PLACE =
  "INSERT INTO feedback_days (day, n) VALUES (?, 1) ON CONFLICT (day) DO UPDATE SET n = n + 1 WHERE n < ? RETURNING n";
const TALLY = "SELECT kind, impact, COUNT(*) AS n FROM feedback WHERE day = ? GROUP BY kind, impact";
const TOOLS = "SELECT tool, COUNT(*) AS n FROM feedback WHERE day = ? AND tool IS NOT NULL GROUP BY tool ORDER BY n DESC LIMIT 10";
// The reports that cost an agent most come first.
const TOP =
  "SELECT * FROM feedback WHERE day = ? ORDER BY CASE impact WHEN 'blocked' THEN 0 WHEN 'worked_around' THEN 1 WHEN 'friction' THEN 2 ELSE 3 END, ts LIMIT ?";

// Credentials and personal data an agent may paste by mistake. The Optics client scrubs too;
// this pass covers any other caller.
const SCRUB = [
  [/\b(?:sk|pk|rk)-[A-Za-z0-9_-]{16,}/g, "[key]"],
  [/\b(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}/g, "[key]"],
  [/\bAKIA[0-9A-Z]{16}\b/g, "[key]"],
  [/\bAIza[0-9A-Za-z_-]{35}\b/g, "[key]"],
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, "[token]"],
  [/\b(bearer|token|password|passwd|secret|api[_-]?key)(["'\s:=]+)[^\s"',;]+/gi, "$1$2[redacted]"],
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]"],
  [/(\/\/[^/\s:@]+):[^/\s@]+@/g, "$1:[redacted]@"],
];

export const scrub = (text) => SCRUB.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), text);

const day = (ts) => new Date(ts).toISOString().slice(0, 10);
const reply = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

function json(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const text = (value, max, required = false) =>
  typeof value === "string" && value.trim() && value.length <= max ? scrub(value.trim()) : required ? undefined : null;

// The stored report, or null when the body is not what the Optics client sends.
export function parseReport(body) {
  const r = json(body);
  if (!r || typeof r !== "object" || !KINDS.has(r.kind) || !IMPACTS.has(r.impact)) return null;
  const report = {
    kind: r.kind,
    impact: r.impact,
    task: text(r.task, LIMITS.task, true),
    description: text(r.description, LIMITS.description, true),
    tool: text(r.tool, LIMITS.tool),
    error: text(r.error, LIMITS.error),
    suggestion: text(r.suggestion, LIMITS.suggestion),
    version: typeof r.version === "string" && VERSION.test(r.version) ? r.version : null,
    client: text(r.client, LIMITS.client),
    transport: TRANSPORTS.has(r.transport) ? r.transport : null,
    platform: text(r.platform, LIMITS.platform),
  };
  return report.task && report.description ? report : null;
}

export const isFeedback = (request) => request.method === "POST" && new URL(request.url).pathname === FEEDBACK_PATH;

export async function receive(request, env, now = Date.now()) {
  if (!env?.DB) return reply(503, { error: "Feedback is not stored right now. Do not retry." });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY) return reply(413, { error: "The report is too long." });
  const body = await request.text();
  const report = body.length <= MAX_BODY ? parseReport(body) : null;
  if (!report) return reply(400, { error: "The report does not match the expected fields." });
  const today = day(now);
  const place = await env.DB.prepare(TAKE_PLACE).bind(today, DAILY_CAP).first();
  if (!place) return reply(429, { error: "Today's reports are full. Do not retry; carry on with your task." });
  const row = [now, today, report.kind, report.impact, report.task, report.description, report.tool, report.error,
    report.suggestion, report.version, report.client, report.transport, report.platform, request.cf?.country ?? null];
  const { meta } = await env.DB.prepare(INSERT).bind(...row).run();
  return reply(201, { id: meta.last_row_id, received: true });
}

const tally = (counts, key) =>
  Object.entries(counts.reduce((sums, row) => ({ ...sums, [row[key]]: (sums[row[key]] ?? 0) + row.n }), {}))
    .sort(([, a], [, b]) => b - a)
    .map(([name, n]) => `${name} ${n}`)
    .join(", ");

// Agent text stays inside a fence, so a report cannot @mention anyone, load an image or add a link.
function fenced(text) {
  const fence = "`".repeat(Math.max(2, ...(text.match(/`+/g) ?? []).map((run) => run.length)) + 1);
  return `${fence}text\n${text}\n${fence}`;
}

const field = (label, value) => (value ? [`${label}: ${value}`] : []);

function entry(row, i) {
  const who = [row.client, row.version && `optics ${row.version}`, row.transport, row.platform, row.country].filter(Boolean).join(" · ");
  const text = [
    `Task: ${row.task}`,
    ...field("Tool", row.tool),
    ...field("From", who),
    "",
    row.description,
    ...(row.error ? ["", `Error: ${row.error}`] : []),
    ...(row.suggestion ? ["", `Suggestion: ${row.suggestion}`] : []),
  ].join("\n");
  return `### ${i + 1}. ${row.kind} · ${row.impact}\n\n${fenced(text)}`;
}

const plural = (n) => `${n} report${n === 1 ? "" : "s"}`;

// The issue for one day, or null when there were no reports: the day's totals, then the
// reports that cost agents most, as many as fit. The rest stay in D1 and the issue says so.
export function digest({ counts, tools }, rows, date) {
  const total = counts.reduce((sum, row) => sum + row.n, 0);
  if (!total) return null;
  const head = [
    `${plural(total)} from agents on ${date} (UTC).`,
    `Kinds: ${tally(counts, "kind")}\nImpact: ${tally(counts, "impact")}`,
    ...(tools.length ? [`Most reported tools:\n\n${fenced(tools.map((t) => `${t.tool} ${t.n}`).join("\n"))}`] : []),
  ].join("\n\n");
  const parts = [head];
  let size = head.length;
  for (const [i, row] of rows.entries()) {
    const part = entry(row, i);
    if (size + part.length > MAX_ISSUE_BODY) break;
    parts.push(part);
    size += part.length + 2;
  }
  const left = total - (parts.length - 1);
  if (left) parts.push(`Not shown: ${plural(left)}. Read them in D1: \`SELECT * FROM feedback WHERE day = '${date}'\``);
  return {
    title: `Optics feedback ${date}: ${plural(total)}`,
    body: parts.join("\n\n"),
    labels: [...new Set(counts.map((row) => row.kind))],
  };
}

const all = async (env, sql, ...args) => (await env.DB.prepare(sql).bind(...args).all()).results;

// Yesterday's reports, filed once a day as an issue in the private repository FEEDBACK_REPO.
export async function sendDigest(env, now = Date.now(), post = fetch) {
  if (!env.DB || !env.GITHUB_TOKEN || !env.FEEDBACK_REPO) return null;
  const date = day(now - 86_400_000);
  const summary = { counts: await all(env, TALLY, date), tools: await all(env, TOOLS, date) };
  const issue = digest(summary, summary.counts.length ? await all(env, TOP, date, DIGEST_REPORTS) : [], date);
  if (!issue) return null;
  const response = await post(`https://api.github.com/repos/${env.FEEDBACK_REPO}/issues`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "optics-framework.org",
    },
    body: JSON.stringify(issue),
  });
  if (!response.ok) throw new Error(`GitHub did not file the feedback digest: ${response.status}`);
  return response.json();
}
