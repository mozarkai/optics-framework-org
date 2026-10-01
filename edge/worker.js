// Markdown content negotiation in front of GitHub Pages, which cannot vary a response on
// the Accept header. A request that prefers text/markdown gets the page's Markdown twin
// (`/` -> `/index.md`, `/about` -> `/about.md`); a missing page gets `/404.md` with a 404.
// Everything else passes through untouched apart from `Vary: Accept` on HTML, so caches
// keep the two representations apart.

const MARKDOWN = "text/markdown; charset=utf-8";

// True when the client ranks text/markdown above HTML. A tie between explicit types goes
// to HTML so browsers are never affected; an explicit markdown entry beats a wildcard.
export function prefersMarkdown(accept) {
  if (!accept) return false;
  let markdown = 0, html = 0, wildcard = 0;
  for (const range of accept.toLowerCase().split(",")) {
    const [type, ...params] = range.split(";").map((s) => s.trim());
    const qParam = params.find((p) => p.startsWith("q="));
    const q = qParam ? Number(qParam.slice(2)) : 1;
    if (!(q >= 0 && q <= 1)) continue;
    if (type === "text/markdown" || type === "text/x-markdown") markdown = Math.max(markdown, q);
    else if (type === "text/html" || type === "application/xhtml+xml") html = Math.max(html, q);
    else if (type === "*/*" || type === "text/*") wildcard = Math.max(wildcard, q);
  }
  return markdown > 0 && markdown > html && markdown >= wildcard;
}

// The Markdown file for a page URL, or null for anything that is not a page (assets, .md).
export function markdownPath(pathname) {
  if (pathname.endsWith("/")) return `${pathname}index.md`;
  if (pathname.endsWith(".html")) return pathname.replace(/\.html$/, ".md");
  if (/\.[^/]*$/.test(pathname)) return null;
  return `${pathname}.md`;
}

function withVaryAccept(response) {
  const out = new Response(response.body, response);
  const vary = out.headers.get("vary");
  if (!vary || !/(^|,)\s*accept\s*(,|$)/i.test(vary)) out.headers.set("vary", vary ? `${vary}, Accept` : "Accept");
  return out;
}

function asMarkdown(response, status) {
  const out = new Response(response.body, { status, headers: response.headers });
  out.headers.set("content-type", MARKDOWN);
  out.headers.set("vary", "Accept");
  out.headers.delete("content-length");
  return out;
}

export async function handle(request, upstream = fetch) {
  const url = new URL(request.url);
  const page = markdownPath(url.pathname);
  const negotiable = (request.method === "GET" || request.method === "HEAD") && page !== null;

  if (!negotiable || !prefersMarkdown(request.headers.get("accept"))) {
    const response = await upstream(request);
    const isHtml = (response.headers.get("content-type") ?? "").startsWith("text/html");
    return negotiable && isHtml ? withVaryAccept(response) : response;
  }

  const twin = await upstream(new Request(new URL(page, url), { method: request.method }));
  if (twin.ok) return asMarkdown(twin, 200);

  // No Markdown twin: serve the page itself if it exists, otherwise the Markdown 404.
  const original = await upstream(request);
  if (original.status !== 404) return withVaryAccept(original);
  const notFound = await upstream(new Request(new URL("/404.md", url), { method: request.method }));
  return notFound.ok ? asMarkdown(notFound, 404) : withVaryAccept(original);
}

export default {
  fetch: (request) => handle(request),
};
