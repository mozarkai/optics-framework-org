import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { handle, markdownPath, prefersMarkdown } from "../edge/worker.js";
import { pagesOrigin } from "../pages-origin.mjs";

const origin = pagesOrigin("out");
const get = (path, accept, method = "GET") =>
  handle(new Request(`https://optics-framework.org${path}`, { method, headers: accept ? { accept } : {} }), origin);

test("prefersMarkdown ranks markdown against HTML and wildcards", () => {
  assert.equal(prefersMarkdown("text/markdown"), true);
  assert.equal(prefersMarkdown("text/markdown, text/html;q=0.9"), true);
  assert.equal(prefersMarkdown("text/markdown, */*"), true);
  assert.equal(prefersMarkdown("text/x-markdown"), true);
  assert.equal(prefersMarkdown("TEXT/MARKDOWN; charset=utf-8"), true);

  assert.equal(prefersMarkdown(null), false);
  assert.equal(prefersMarkdown("*/*"), false);
  assert.equal(prefersMarkdown("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"), false);
  assert.equal(prefersMarkdown("text/html, text/markdown"), false);
  assert.equal(prefersMarkdown("text/markdown;q=0.5, */*"), false);
  assert.equal(prefersMarkdown("text/markdown;q=0"), false);
  assert.equal(prefersMarkdown("text/markdown;q=abc"), false);
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
