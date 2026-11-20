import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { REAL_INSTALLERS } from "../edge/snapshot.js";
import { collectProof, releaseNotes } from "../lib/proof.mjs";

const read = (f) => readFileSync(`out/${f}`, "utf8");
const proof = () => JSON.parse(readFileSync("content/proof.json", "utf8"));
const grouped = (n) => n.toLocaleString("en-US");

test("release notes keep what a release added and count its fixes, without bots or handles", () => {
  const body = [
    "## What's Changed",
    "* feat: name the report after the project name kept in config.yaml by @someone in https://github.com/o/r/pull/719",
    "* feat(mcp)!: cut agent turns and tokens by @someone in https://github.com/o/r/pull/720",
    "* build(deps): bump soupsieve from 2.9 to 4.0 by @dependabot[bot] in https://github.com/o/r/pull/722",
    "* fix(ios): allow 3 webview connect retries by @someone in https://github.com/o/r/pull/700",
    "* fix: keep original class names by @someone in https://github.com/o/r/pull/702",
    "* docs: shorten the guide by @someone in https://github.com/o/r/pull/701",
    "",
    "**Full Changelog**: https://github.com/o/r/compare/1.11.3...1.11.4",
  ].join("\r\n");
  assert.deepEqual(releaseNotes(body), {
    added: [
      { scope: "", text: "Name the report after the project name kept in config.yaml", pr: "https://github.com/o/r/pull/719" },
      { scope: "mcp", text: "Cut agent turns and tokens", pr: "https://github.com/o/r/pull/720" },
    ],
    fixes: 2,
  });
  assert.deepEqual(releaseNotes(""), { added: [], fixes: 0 });
});

test("collecting reads PyPI by installer and month, and keeps only published releases", async () => {
  const answer = (url, body = "") => {
    if (url.includes("clickhouse")) {
      if (body.includes("min(date)")) return { data: [["2025-04-18", "2026-11-17"]] };
      if (body.includes("GROUP BY installer")) return { data: [["bandersnatch", "40"], ["", "7"], ["pip", "3"]] };
      return { data: [["2026-10", "2"], ["2026-11", "1"]] };
    }
    if (url.endsWith("/releases?per_page=100")) {
      const release = (tag, extra = {}) => ({ tag_name: tag, published_at: "2026-11-17T06:42:21Z", html_url: `https://github.com/o/r/releases/tag/${tag}`, body: "* feat(mcp): cut tokens by @a in https://github.com/o/r/pull/1", ...extra });
      return [release("1.12.0", { draft: true }), release("1.12.0rc1", { prerelease: true }), release("v1.11.4", { body: null })];
    }
    return { stargazers_count: 100, forks_count: 30 };
  };
  const seen = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    seen.push(init.headers ?? {});
    return new Response(JSON.stringify(answer(String(url), init.body)), { status: 200 });
  };
  try {
    const proof = await collectProof({ today: "2026-11-18", agent: "test-agent", token: "t" });
    assert.deepEqual(proof.pypi, {
      retrieved: "2026-11-18",
      from: "2025-04-18",
      to: "2026-11-17",
      installers: { bandersnatch: 40, unknown: 7, pip: 3 },
      months: [["2026-10", 2], ["2026-11", 1]],
    });
    assert.deepEqual(proof.github, {
      retrieved: "2026-11-18",
      stars: 100,
      forks: 30,
      releases: [{ tag: "1.11.4", date: "2026-11-17", url: "https://github.com/o/r/releases/tag/v1.11.4", added: [], fixes: 0 }],
    });
    assert.ok(seen.every((h) => h["user-agent"] === "test-agent"));
    assert.ok(seen.some((h) => h.authorization === "Bearer t"));
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("the homepage shows the committed PyPI, GitHub and release numbers with their dates and sources", () => {
  const { pypi, github } = proof();
  const html = read("index.html");
  const section = html.match(/<section[^>]+id="proof"[\s\S]*?<\/section>/)?.[0];
  assert.ok(section, "the homepage has no proof section");
  const installs = REAL_INSTALLERS.reduce((sum, name) => sum + (pypi.installers[name] ?? 0), 0);
  const all = Object.values(pypi.installers).reduce((a, b) => a + b, 0);
  assert.ok(section.includes(grouped(installs)), `installs ${installs} missing`);
  assert.ok(section.includes(grouped(all)), `all downloads ${all} missing`);
  assert.ok(section.includes(`>${grouped(github.stars)}<`), "stars missing");
  for (const date of [pypi.to, pypi.retrieved, github.retrieved]) assert.ok(section.includes(`datetime="${date}"`), `date ${date} missing`);
  assert.ok(section.includes(`href="${github.releases[0].url}"`), "latest release missing");
  assert.ok(!section.includes(`href="${github.releases[1].url}"`), "older releases belong on /releases");
  assert.match(section, /<a [^>]*href="releases"[^>]*>All releases<\/a>/);
  for (const source of ["https://clickpy.clickhouse.com/dashboard/optics-framework", "https://github.com/mozarkai/optics-framework", "https://github.com/mozarkai/optics-framework/releases"]) {
    assert.ok(section.includes(`href="${source}"`), `source ${source} not linked`);
  }
  assert.doesNotMatch(html, /<!-- proof -->/);
});

test("index.md carries the same numbers for agents", () => {
  const { github } = proof();
  const md = read("index.md");
  assert.match(md, new RegExp(`${grouped(github.stars)} stars`));
  assert.ok(md.includes(github.releases[0].url));
  assert.ok(md.includes("https://optics-framework.org/releases"));
  assert.doesNotMatch(md, /<!-- proof -->/);
});

test("/releases lists every release newest first, each with its notes, in HTML and Markdown", () => {
  const { github } = proof();
  const html = read("releases.html");
  const md = read("releases.md");
  const tags = [...html.matchAll(/<a class="rel-tag" href="([^"]+)">([^<]+)<\/a>/g)];
  assert.deepEqual(tags.map(([, , tag]) => tag), github.releases.map((r) => r.tag));
  assert.deepEqual(tags.map(([url]) => url.match(/href="([^"]+)"/)[1]), github.releases.map((r) => r.url));
  for (const r of github.releases) {
    for (const c of r.added) {
      assert.ok(html.includes(`href="${c.pr}"`), `${r.tag} change ${c.pr} missing`);
      assert.ok(md.includes(c.pr), `${r.tag} change ${c.pr} missing from the twin`);
    }
    assert.ok(md.includes(`[${r.tag}](${r.url})`), `${r.tag} missing from the twin`);
  }
});
