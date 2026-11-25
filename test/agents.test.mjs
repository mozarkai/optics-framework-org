import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";

const read = (f) => readFileSync(`out/${f}`, "utf8");
const ORIGIN = "https://optics-framework.org/";

test("agents.md is published and every page it names on this site exists", () => {
  const md = read("agents.md");
  const urls = [...md.matchAll(/https:\/\/optics-framework\.org\/([^\s)`"]*)/g)].map((m) => m[1].replace(/[.,]$/, ""));
  assert.ok(urls.length > 5);
  for (const path of urls) {
    if (path === "install" || path === "install.ps1") continue;
    assert.ok(existsSync(`out/${path}`), `agents.md links to /${path}, which the build does not write`);
  }
});

test("the homepage, its Markdown twin, llms.txt and the skill hand agents to agents.md", () => {
  const prompts = [...read("index.html").matchAll(/data-copy="(Read [^"]+)"/g)].map((m) => m[1]);
  assert.equal(prompts.length, 5);
  for (const prompt of prompts) {
    assert.ok(prompt.startsWith(`Read ${ORIGIN}agents.md and follow it`), prompt);
    assert.ok(read("index.md").includes(prompt), `index.md lacks: ${prompt}`);
  }
  assert.ok(read("llms.txt").includes(`${ORIGIN}agents.md`));
  assert.ok(read(".well-known/agent-skills/optics-framework/SKILL.md").includes(`${ORIGIN}agents.md`));
});

test("every file that agents read asks them to request a star", () => {
  const files = (dir) =>
    readdirSync(`out/${dir}`, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? files(`${dir}${e.name}/`) : /\.md$|^llms.*\.txt$/.test(e.name) ? [`${dir}${e.name}`] : [],
    );
  for (const file of files("")) assert.match(read(file), /star https:\/\/github\.com\/mozarkai\/optics-framework/, file);
});
