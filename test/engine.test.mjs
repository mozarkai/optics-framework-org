import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const manifest = JSON.parse(readFileSync("out/playground.html", "utf8").match(/id="engine-manifest">([^<]*)</)[1]);
const lock = JSON.parse(readFileSync("lib/engine-lock.json", "utf8"));

const CONFIG = "driver_sources:\n  - birch:\n      enabled: true\nelements_sources:\n  - birch_page_source:\n      enabled: true\nexecution_output_path: ./output\n";
const suite = (keyword) => `Test Cases:\n  - Shopper signs in:\n      - Sign In\n\nModules:\n  - Sign In:\n      - Launch App\n      - ${keyword} "Sign in"\n`;

test("the playground ships every engine file it loads, from this site", () => {
  const core = `out/${manifest.core}`;
  const coreSize = lock.pyodide.files.reduce((n, f) => n + statSync(core + f).size, 0);
  assert.equal(manifest.coreSize, coreSize);
  for (const w of manifest.wheels) assert.equal(statSync(`out/engine/wheels/${w.file}`).size, w.size, w.file);
  assert.ok(manifest.wheels.some((w) => w.file === manifest.optics));
  for (const f of manifest.python) assert.ok(existsSync(`out/engine/${f.path}`), f.path);
  assert.doesNotMatch(manifest.core, /^(?:https?:)?\/\//);
});

test("the shipped engine runs a real dry run of a suite", { timeout: 120000 }, async () => {
  const base = resolve(`out/${manifest.core}`) + "/";
  const { loadPyodide } = await import(`${base}pyodide.mjs`);
  const py = await loadPyodide({ indexURL: base, stdout: () => {}, stderr: () => {} });
  await py.loadPackage(manifest.wheels.map((w) => resolve(`out/engine/wheels/${w.file}`)), { messageCallback: () => {} });
  const site = py.runPython("import site; site.getsitepackages()[0]");
  for (const f of manifest.python) {
    const dest = `${site}/${f.path}`;
    py.FS.mkdirTree(dest.slice(0, dest.lastIndexOf("/")));
    py.FS.writeFile(dest, readFileSync(`out/engine/${f.path}`));
  }
  const events = [];
  globalThis.opticsPage = { step: () => {}, event: (json) => events.push(JSON.parse(json)) };
  const page = py.pyimport("optics_page");
  assert.equal(JSON.parse(page.about()).optics, manifest.optics.split("-")[1]);
  const dryRun = async (keyword) => {
    events.length = 0;
    return JSON.parse(await page.run("dry_run", JSON.stringify({ "config.yaml": CONFIG, "checkout.yaml": suite(keyword) })));
  };
  const passed = await dryRun("Press Element");
  assert.deepEqual(passed.results.map((r) => r.status), ["PASS"]);
  await dryRun("Pres Element");
  assert.ok(events.some((e) => e.code === "E0402" && /Press Element/.test(e.message)), JSON.stringify(events));
});
