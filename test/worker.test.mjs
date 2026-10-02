import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { handle, markdownPath, negotiate } from "../edge/worker.js";
import { pagesOrigin } from "../pages-origin.mjs";

const origin = pagesOrigin("out");
const get = (path, accept, method = "GET") =>
  handle(new Request(`https://optics-framework.org${path}`, { method, headers: accept ? { accept } : {} }), origin);

test("negotiate picks markdown or JSON only when the client ranks it above HTML", () => {
  for (const accept of ["text/markdown", "text/markdown, text/html;q=0.9", "text/markdown, */*", "text/x-markdown", "TEXT/MARKDOWN; charset=utf-8"]) {
    assert.equal(negotiate(accept), "markdown", accept);
  }
  for (const accept of ["application/json", "application/problem+json", "application/json, text/plain, */*", "application/json, text/html;q=0.5"]) {
    assert.equal(negotiate(accept), "json", accept);
  }
  for (const accept of [
    null,
    "*/*",
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "text/html, text/markdown",
    "text/html, application/json",
    "text/markdown;q=0.5, */*",
    "application/json;q=0.5, */*",
    "text/markdown;q=0",
    "text/markdown;q=abc",
  ]) {
    assert.equal(negotiate(accept), "html", String(accept));
  }
  assert.equal(negotiate("text/markdown, application/json;q=0.9"), "markdown");
  assert.equal(negotiate("application/json, text/markdown;q=0.9"), "json");
});

test("markdownPath maps page URLs to their Markdown twin and skips assets", () => {
  assert.equal(markdownPath("/"), "/index.md");
  assert.equal(markdownPath("/about"), "/about.md");
  assert.equal(markdownPath("/about.html"), "/about.md");
  assert.equal(markdownPath("/preview/"), "/preview/index.md");
  assert.equal(markdownPath("/styles.css"), null);
  assert.equal(markdownPath("/index.md"), null);
  assert.equal(markdownPath("/install.sh"), null);
});

test("the homepage answers Accept: text/markdown with Markdown and Vary: Accept", async () => {
  const res = await get("/", "text/markdown");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /^text\/markdown/);
  assert.equal(res.headers.get("vary"), "Accept-Encoding, Accept");
  assert.equal(await res.text(), readFileSync("out/index.md", "utf8"));
});

test("the homepage still serves HTML to browsers, with Vary: Accept", async () => {
  for (const accept of ["text/html", "text/html,application/xhtml+xml,*/*;q=0.8", undefined]) {
    const res = await get("/", accept);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type"), /^text\/html/);
    assert.match(res.headers.get("vary"), /(^|, )Accept($|,)/);
    assert.match(res.headers.get("vary"), /Accept-Encoding/);
    assert.match(await res.text(), /^<!doctype html>/);
  }
});

test("a missing page answers Markdown agents with a Markdown 404", async () => {
  const res = await get("/__ora-404-probe-9s1x6rf4", "text/markdown");
  assert.equal(res.status, 404);
  assert.match(res.headers.get("content-type"), /^text\/markdown/);
  assert.equal(res.headers.get("vary"), "Accept-Encoding, Accept");
  const body = await res.text();
  assert.ok(body.length >= 20);
  assert.match(body, /https:\/\/optics-framework\.org\/llms\.txt/);
  assert.match(body, /https:\/\/optics-framework\.org\/sitemap\.xml/);
});

test("a missing page answers JSON clients with an RFC 9457 problem document", async () => {
  for (const path of ["/__ora-404-probe-9s1x6rf4", "/api/v1/missing", "/missing.json"]) {
    const res = await get(path, "application/json");
    assert.equal(res.status, 404);
    assert.equal(res.headers.get("content-type"), "application/problem+json");
    assert.equal(res.headers.get("vary"), "Accept");
    const problem = await res.json();
    assert.equal(problem.type, "about:blank");
    assert.equal(problem.title, "Not Found");
    assert.equal(problem.status, 404);
    assert.equal(problem.instance, path);
    assert.equal(problem.code, "not_found");
    assert.ok(problem.detail.includes(path));
    assert.ok(problem.hint.length > 20);
    assert.equal(problem.links.llms, "https://optics-framework.org/llms.txt");
    assert.equal(problem.links.openapi, "https://optics-framework.org/openapi.json");
  }
});

test("JSON clients still get existing files and pages as they are", async () => {
  const spec = await get("/openapi.json", "application/json");
  assert.equal(spec.status, 200);
  assert.match(spec.headers.get("content-type"), /^application\/json/);
  const home = await get("/", "application/json");
  assert.equal(home.status, 200);
  assert.match(home.headers.get("content-type"), /^text\/html/);
  assert.match(home.headers.get("vary"), /Accept/);
});

test("HEAD on a missing page returns the JSON 404 headers without a body", async () => {
  const res = await get("/nope", "application/json", "HEAD");
  assert.equal(res.status, 404);
  assert.equal(res.headers.get("content-type"), "application/problem+json");
  assert.equal(await res.text(), "");
});

test("a missing page still answers browsers with the HTML 404", async () => {
  const res = await get("/__ora-404-probe-9s1x6rf4", "text/html");
  assert.equal(res.status, 404);
  assert.match(res.headers.get("content-type"), /^text\/html/);
  assert.match(await res.text(), /Page not found/);
});

test("a page without a Markdown twin falls back to its HTML", async () => {
  const res = await get("/about", "text/markdown");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /^text\/html/);
  assert.match(res.headers.get("vary"), /Accept/);
});

test("HEAD negotiates like GET", async () => {
  const res = await get("/", "text/markdown", "HEAD");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /^text\/markdown/);
});

test("assets and non-GET requests pass through untouched", async () => {
  const css = await get("/styles.css", "text/markdown");
  assert.match(css.headers.get("content-type"), /^text\/css/);
  assert.equal(css.headers.get("vary"), "Accept-Encoding");

  const post = await get("/", "text/markdown", "POST");
  assert.match(post.headers.get("content-type"), /^text\/html/);
  assert.equal(post.headers.get("vary"), "Accept-Encoding");
});
