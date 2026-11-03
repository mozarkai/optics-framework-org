// First-party analytics in D1. The worker logs every request it answers apart from assets
// that loaded, and site/track.js posts interaction events to /e. Nothing identifies a
// person: no IP address and no cookie, only the country and a visit id that lives in one
// browser tab.

import { classify } from "./agents.js";

// Every event site/track.js sends. The privacy page lists the same names, and a test keeps them in step.
export const EVENTS = new Set([
  "view", "pref", "campaign", "section", "read", "nav", "out", "copy", "tab", "film", "scene", "theme",
  "filter", "search", "result", "helpful", "check", "details", "ui", "vital", "error",
]);
const DEVICES = new Set(["mobile", "tablet", "desktop"]);
const ASSET = /\.(css|js|mjs|map|svg|png|jpe?g|webp|gif|ico|avif|woff2?|ttf|mp4|webm|vtt)$/i;
const MAX_BODY = 16384;
const MAX_EVENTS = 25;

const INSERT_HIT = "INSERT INTO hits (ts, day, path, status, method, served, client, agent, referrer, campaign, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
const INSERT_EVENT = "INSERT INTO events (ts, day, visit, path, name, target, value, client, country, device) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

const day = (ts) => new Date(ts).toISOString().slice(0, 10);
const clip = (value, n) => (value ? String(value).slice(0, n) : null);

// Same-site referrers keep their path, so a report can follow people from page to page.
function referrer(request, url) {
  try {
    const from = new URL(request.headers.get("referer"));
    return clip(from.host === url.host ? from.pathname : from.host + from.pathname.replace(/\/$/, ""), 200);
  } catch {
    return null;
  }
}

// Speculation rules and link prefetch load pages nobody may ever look at.
const prefetched = (request) => /prefetch|prerender/i.test(request.headers.get("sec-purpose") ?? request.headers.get("purpose") ?? "");

function who(request) {
  const found = classify(request.headers.get("user-agent"), request.cf?.verifiedBotCategory);
  return prefetched(request) ? { ...found, client: "prefetch" } : found;
}

const servedType = (response) => (response.headers.get("content-type") ?? "").split(";")[0].trim() || null;
const campaign = (url) => clip(url.searchParams.get("ref") ?? url.searchParams.get("utm_source"), 64);

// The hits row for a request, or null for an asset that loaded.
export function hitRow(request, response, now = Date.now()) {
  const url = new URL(request.url);
  if (response.status < 400 && ASSET.test(url.pathname)) return null;
  const { client, agent } = who(request);
  return [now, day(now), clip(url.pathname, 300), response.status, request.method, servedType(response), client, agent, referrer(request, url), campaign(url), request.cf?.country ?? null];
}

export function recordHit(env, request, response) {
  const row = env?.DB && hitRow(request, response);
  return row ? env.DB.prepare(INSERT_HIT).bind(...row).run().catch(() => {}) : Promise.resolve();
}

export const isBeacon = (request) => request.method === "POST" && new URL(request.url).pathname === "/e";

// Browsers mark their own same-origin requests; anything else is not the site's script.
function sameOrigin(request) {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  return request.headers.get("origin") === new URL(request.url).origin;
}

const validEvent = (e) =>
  Array.isArray(e) && EVENTS.has(e[0]) && typeof e[1] === "string" && e[1].length <= 200 && (e[2] === null || Number.isFinite(e[2]));
const validPage = ({ v, p, d }) => /^[a-z0-9]{1,16}$/.test(v) && typeof p === "string" && p.startsWith("/") && p.length <= 300 && DEVICES.has(d);
const validEvents = (e) => Array.isArray(e) && e.length > 0 && e.length <= MAX_EVENTS && e.every(validEvent);

function json(text) {
  try {
    return JSON.parse(text) ?? {};
  } catch {
    return {};
  }
}

// The batch track.js sends, or null when any part of it is not what track.js would send.
export function parseBatch(text) {
  const batch = json(text);
  return validPage(batch) && validEvents(batch.e) ? { visit: batch.v, path: batch.p, device: batch.d, events: batch.e } : null;
}

const status = (code) => new Response(null, { status: code, headers: { "cache-control": "no-store" } });

async function readBatch(request) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY) return { code: 413 };
  const text = await request.text();
  const batch = text.length <= MAX_BODY ? parseBatch(text) : null;
  return batch ? { batch } : { code: 400 };
}

export async function collect(request, env, now = Date.now()) {
  if (!sameOrigin(request)) return status(403);
  const { batch, code } = await readBatch(request);
  if (!batch || !env?.DB) return status(code ?? 204);
  const { client } = who(request);
  const country = request.cf?.country ?? null;
  const rows = batch.events.map(([name, target, value]) => [now, day(now), batch.visit, batch.path, name, target, value, client, country, batch.device]);
  await env.DB.batch(rows.map((row) => env.DB.prepare(INSERT_EVENT).bind(...row))).catch(() => {});
  return status(204);
}
