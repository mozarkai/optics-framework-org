// Content negotiation in front of GitHub Pages, which cannot vary a response on the
// Accept header. A request that prefers text/markdown gets the page's Markdown twin
// (`/` -> `/index.md`, `/about` -> `/about.md`) and a missing page gets `/404.md` with a
// 404; a request that prefers JSON gets a missing page as an RFC 9457 problem document.
// Everything else passes through untouched apart from `Vary: Accept` on HTML, so caches
// keep the representations apart.

const MARKDOWN = "text/markdown; charset=utf-8";
const PROBLEM_JSON = "application/problem+json";

// "markdown" or "json" when the client ranks that type above HTML, otherwise "html". A tie
// with explicit HTML goes to HTML so browsers are never affected; an explicit entry beats
// a wildcard.
export function negotiate(accept) {
  if (!accept) return "html";
  let markdown = 0, json = 0, html = 0, wildcard = 0;
  for (const range of accept.toLowerCase().split(",")) {
    const [type, ...params] = range.split(";").map((s) => s.trim());
    const qParam = params.find((p) => p.startsWith("q="));
    const q = qParam ? Number(qParam.slice(2)) : 1;
    if (!(q >= 0 && q <= 1)) continue;
    if (type === "text/markdown" || type === "text/x-markdown") markdown = Math.max(markdown, q);
    else if (type === "application/json" || type === "application/problem+json") json = Math.max(json, q);
    else if (type === "text/html" || type === "application/xhtml+xml") html = Math.max(html, q);
    else if (type === "*/*" || type === "text/*" || type === "application/*") wildcard = Math.max(wildcard, q);
  }
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

function addVaryAccept(headers) {
  const vary = headers.get("vary");
  if (!vary || !/(^|,)\s*accept\s*(,|$)/i.test(vary)) headers.set("vary", vary ? `${vary}, Accept` : "Accept");
}

function withVaryAccept(response) {
  const out = new Response(response.body, response);
  addVaryAccept(out.headers);
  return out;
}

function asMarkdown(response, status) {
  const out = new Response(response.body, { status, headers: response.headers });
  out.headers.set("content-type", MARKDOWN);
  out.headers.delete("content-length");
  addVaryAccept(out.headers);
  return out;
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
      docs: "https://mozarkai.github.io/optics-framework/",
    },
  };
  return new Response(method === "HEAD" ? null : JSON.stringify(problem, null, 2), {
    status: 404,
    headers: { "content-type": PROBLEM_JSON, vary: "Accept" },
  });
}

export async function handle(request, upstream = fetch) {
  const url = new URL(request.url);
  const { method } = request;
  const readable = method === "GET" || method === "HEAD";
  const wants = readable ? negotiate(request.headers.get("accept")) : "html";
  const page = markdownPath(url.pathname);

  if (wants === "markdown" && page) {
    const twin = await upstream(new Request(new URL(page, url), { method }));
    if (twin.ok) return asMarkdown(twin, 200);
  }

  // No Markdown twin: serve the resource itself if it exists, otherwise the negotiated 404.
  const response = await upstream(request);
  if (response.status === 404 && wants === "json") return notFoundProblem(url, method);
  if (response.status === 404 && wants === "markdown") {
    const notFound = await upstream(new Request(new URL("/404.md", url), { method }));
    if (notFound.ok) return asMarkdown(notFound, 404);
  }
  const isHtml = (response.headers.get("content-type") ?? "").startsWith("text/html");
  return readable && isHtml ? withVaryAccept(response) : response;
}

export default {
  fetch: (request) => handle(request),
};
