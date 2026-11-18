// A stand-in for GitHub Pages serving out/: `/about` resolves to about.html, `/x/` to
// x/index.html, and a missing path gets the root 404.html with a 404 status. Used by the
// worker tests and by `npm run dev`, which serves the site through the edge worker.
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { handle } from "./edge/worker.js";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".log": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".jpg": "image/jpeg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".sh": "application/x-sh",
  ".ps1": "application/octet-stream",
};

async function file(path) {
  try {
    return (await stat(path)).isFile() ? path : null;
  } catch {
    return null;
  }
}

async function lookup(dir, pathname) {
  const root = resolve(dir);
  let local;
  try {
    local = resolve(root, `.${decodeURIComponent(pathname)}`);
  } catch {
    return null;
  }
  if (local !== root && !local.startsWith(root + sep)) return null;
  if (pathname.endsWith("/")) return file(join(local, "index.html"));
  return (await file(local)) ?? (await file(`${local}.html`));
}

export function pagesOrigin(dir) {
  return async (request) => {
    const found = await lookup(dir, new URL(request.url).pathname);
    const path = found ?? join(dir, "404.html");
    const body = request.method === "HEAD" ? null : await readFile(path);
    const type = TYPES[extname(path)] ?? "application/octet-stream";
    const range = found && body && /^bytes=(\d+)-(\d*)$/.exec(request.headers.get("range") ?? "");
    if (range) {
      const start = Number(range[1]), end = Math.min(range[2] ? Number(range[2]) : body.length - 1, body.length - 1);
      return new Response(body.subarray(start, end + 1), { status: 206, headers: { "content-type": type, "content-range": `bytes ${start}-${end}/${body.length}`, "accept-ranges": "bytes" } });
    }
    return new Response(body, { status: found ? 200 : 404, headers: { "content-type": type, "accept-ranges": "bytes", vary: "Accept-Encoding" } });
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const origin = pagesOrigin("out");
  const port = Number(process.env.PORT ?? 4173);
  createServer(async (req, res) => {
    const request = new Request(new URL(req.url, `http://${req.headers.host}`), { method: req.method, headers: { accept: req.headers.accept ?? "*/*", "user-agent": req.headers["user-agent"] ?? "", range: req.headers.range ?? "" } });
    const response = await handle(request, origin);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  }).listen(port, () => console.log(`http://localhost:${port}`));
}
