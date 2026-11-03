// Content negotiation in front of GitHub Pages, which cannot vary a response on the
// Accept header. A request that prefers text/markdown, or comes from an AI crawler that
// does not ask for HTML, gets the page's Markdown twin (`/` -> `/index.md`, `/about` ->
// `/about.md`) and a missing page gets `/404.md` with a 404; a request that prefers JSON
// gets a missing page as an RFC 9457 problem document, and one that accepts neither HTML
// nor Markdown gets a 406. Markdown responses carry the AEO headers (dualmark.dev/docs/spec).
// Everything else passes through untouched apart from `Vary` (so caches keep the
// representations apart) and discovery `Link` headers on HTML, and the media types of
// the discovery documents.

import { isAiBot } from "./agents.js";
import { collect, isBeacon, recordHit } from "./analytics.js";
import { snapshot } from "./snapshot.js";

export { isAiBot };

const MARKDOWN = "text/markdown; charset=utf-8";
const PROBLEM_JSON = "application/problem+json";
const API_CATALOG = "/.well-known/api-catalog";
// Pages serves .json as application/json and the extensionless catalog as octet-stream;
// these are the types the specs ask for (RFC 9727, MCP Server Card discovery).
const MEDIA_TYPES = {
  [API_CATALOG]: 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
  "/.well-known/ai-catalog.json": "application/ai-catalog+json",
  "/.well-known/mcp/server-card.json": "application/mcp-server-card+json",
};

// Agent discovery (RFC 8288, RFC 9727 section 3) on every HTML page.
export const LINK = [
  `<${API_CATALOG}>; rel="api-catalog"`,
  '</docs/>; rel="service-doc"',
  '</llms.txt>; rel="describedby"; type="text/plain"',
  '</llms-full.txt>; rel="describedby"; type="text/plain"',
  '</ai.txt>; rel="describedby"; type="text/plain"',
].join(", ");

const KINDS = {
  "text/markdown": "markdown",
  "text/x-markdown": "markdown",
  "application/json": "json",
  "application/problem+json": "json",
  "text/html": "html",
  "application/xhtml+xml": "html",
  "*/*": "wildcard",
  "text/*": "wildcard",
  "application/*": "wildcard",
};

function mediaRange(range) {
  const [type, ...params] = range.split(";").map((s) => s.trim());
  const q = params.find((p) => p.startsWith("q="));
  return [type, q ? Number(q.slice(2)) : 1];
}

// The highest q the Accept header gives each kind of response. A missing or unreadable
// header accepts anything.
function weights(accept) {
  const w = { markdown: 0, json: 0, html: 0, wildcard: 0 };
  const ranges = (accept ?? "").toLowerCase().split(",").map(mediaRange).filter(([type, q]) => type && q >= 0 && q <= 1);
  if (!ranges.length) return { ...w, wildcard: 1 };
  for (const [type, q] of ranges) if (KINDS[type]) w[KINDS[type]] = Math.max(w[KINDS[type]], q);
  return w;
}

// A bot gets Markdown on a tie or a wildcard, but an explicit text/html still wins.
const botPrefersMarkdown = ({ markdown, json, html, wildcard }) => Math.max(markdown, wildcard) >= html && markdown >= json;

// "markdown" or "json" when the client ranks that type above HTML, "none" when it accepts
// none of them, otherwise "html". A tie with explicit HTML goes to HTML so browsers are
// never affected; an explicit entry beats a wildcard.
export function negotiate(accept, { bot = false } = {}) {
  const w = weights(accept);
  const { markdown, json, html, wildcard } = w;
  if (Math.max(markdown, json, html, wildcard) === 0) return "none";
  if (bot && botPrefersMarkdown(w)) return "markdown";
  const best = Math.max(markdown, json);
  if (best === 0 || best <= html || best < wildcard) return "html";
  return markdown >= json ? "markdown" : "json";
}

// The Markdown file for a page URL, or null for anything that is not a page (assets, .md).
export function markdownPath(pathname) {
  if (pathname.endsWith("/")) return `${pathname}index.md`;
  if (pathname.endsWith(".html")) return pathname.replace(/\.html$/, ".md");
  if (/\.[^/]*$/.test(pathname)) return null;
  return `${pathname}.md`;
}

// The page a Markdown twin stands for: /index.md -> /, /about.md -> /about.
const pagePath = (twin) => twin.replace(/(^|\/)index\.md$/, "$1").replace(/\.md$/, "");

// The Markdown files that may answer this request, in the order to try them. A section's
// twin lives at <section>/index.md, but agents append .md to the URL they see, so /docs.md
// has to find /docs/index.md.
function twinPaths(pathname, wants) {
  if (pathname.startsWith("/.well-known/")) return [];
  if (pathname.endsWith(".md")) return [pathname, `${pathname.slice(0, -3)}/index.md`];
  const twin = wants === "markdown" && markdownPath(pathname);
  return twin ? [twin] : [];
}

function addVary(headers, tokens) {
  const vary = headers.get("vary") ?? "";
  const missing = tokens.filter((t) => !new RegExp(`(^|,)\\s*${t}\\s*(,|$)`, "i").test(vary));
  if (missing.length) headers.set("vary", [vary, ...missing].filter(Boolean).join(", "));
}

// A page's answer depends on the User-Agent too, since AI crawlers get Markdown.
const varyFor = (url) => (url.pathname.endsWith(".md") ? ["Accept"] : ["Accept", "User-Agent"]);

// A page's own Markdown twin is linked only when the page exists, so a 404 never points at one.
function asHtml(response, url) {
  const out = new Response(response.body, response);
  addVary(out.headers, varyFor(url));
  const twin = response.ok && markdownPath(url.pathname);
  out.headers.set("link", twin ? `${LINK}, <${twin}>; rel="alternate"; type="text/markdown"` : LINK);
  return out;
}

// noindex keeps search engines on the HTML page, which the canonical Link names.
async function asMarkdown(response, { url, method, status = 200, canonical }) {
  const body = await response.text();
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("content-type", MARKDOWN);
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-robots-tag", "noindex, follow");
  headers.set("x-markdown-tokens", String(Math.max(1, Math.ceil(body.length / 4))));
  headers.set("x-aeo-version", "1.0");
  if (canonical) headers.set("link", `<${new URL(canonical, url).href}>; rel="canonical"`);
  addVary(headers, varyFor(url));
  return new Response(method === "HEAD" ? null : body, { status, headers });
}

function notFoundProblem(url, method) {
  const at = (path) => new URL(path, url).href;
  const problem = {
    type: "about:blank",
    title: "Not Found",
    status: 404,
    detail: `Nothing exists at ${url.pathname} on ${url.host}.`,
    instance: url.pathname,
    code: "not_found",
    hint: "Check the path against the sitemap. This domain hosts no API: the Optics HTTP API runs on your own machine with `optics serve` and is described by the OpenAPI document.",
    links: {
      home: at("/"),
      llms: at("/llms.txt"),
      sitemap: at("/sitemap.xml"),
      openapi: at("/openapi.json"),
      docs: at("/docs/"),
    },
  };
  return new Response(method === "HEAD" ? null : JSON.stringify(problem, null, 2), {
    status: 404,
    headers: { "content-type": PROBLEM_JSON, vary: "Accept" },
  });
}

function notAcceptable(method) {
  return new Response(method === "HEAD" ? null : "Not Acceptable\n\nSupported types: text/html, text/markdown\n", {
    status: 406,
    headers: { "content-type": "text/plain; charset=utf-8", vary: "Accept" },
  });
}

// Twins are fetched with GET even for HEAD, so the token count is always known.
async function serveTwin(ctx) {
  for (const path of twinPaths(ctx.url.pathname, ctx.wants)) {
    const twin = await ctx.get(path);
    if (twin.ok) return asMarkdown(twin, { ...ctx, canonical: pagePath(path) });
  }
  return null;
}

// A missing .md URL was a request for Markdown whatever the Accept header said.
async function notFound(ctx) {
  if (ctx.wants === "json") return notFoundProblem(ctx.url, ctx.method);
  const page = (ctx.wants === "markdown" || ctx.url.pathname.endsWith(".md")) && (await ctx.get("/404.md"));
  return page?.ok ? asMarkdown(page, { ...ctx, status: 404 }) : null;
}

function present(response, { url, wants, method }) {
  if (MEDIA_TYPES[url.pathname] && response.ok) {
    const out = new Response(response.body, response);
    out.headers.set("content-type", MEDIA_TYPES[url.pathname]);
    return out;
  }
  if (!(response.headers.get("content-type") ?? "").startsWith("text/html")) return response;
  return wants === "none" && response.ok ? notAcceptable(method) : asHtml(response, url);
}

export async function handle(request, upstream = fetch) {
  const { method } = request;
  if (method !== "GET" && method !== "HEAD") return upstream(request);
  const url = new URL(request.url);
  const ctx = {
    url,
    method,
    wants: negotiate(request.headers.get("accept"), { bot: isAiBot(request.headers.get("user-agent")) }),
    get: (path) => upstream(new Request(new URL(path, url))),
  };
  const twin = await serveTwin(ctx);
  if (twin) return twin;
  const response = await upstream(request);
  const missing = response.status === 404 && (await notFound(ctx));
  return missing || present(response, ctx);
}

// Analytics writes run after the response is sent and never fail it.
export async function serve(request, env, ctx, upstream = fetch) {
  if (isBeacon(request)) return collect(request, env);
  const response = await handle(request, upstream);
  ctx?.waitUntil(recordHit(env, request, response));
  return response;
}

export default {
  fetch: (request, env, ctx) => serve(request, env, ctx),
  scheduled: (event, env, ctx) => ctx.waitUntil(snapshot(env)),
};
