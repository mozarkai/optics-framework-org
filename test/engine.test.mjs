import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const manifest = JSON.parse(readFileSync("out/playground.html", "utf8").match(/id="engine-manifest">([^<]*)</)[1]);
const lock = JSON.parse(readFileSync("lib/engine-lock.json", "utf8"));

const CONFIG = "driver_sources:\n  - birch:\n      enabled: true\nelements_sources:\n  - birch_page_source:\n      enabled: true\nexecution_output_path: ./output\n";
const suite = (keyword) => `Test Cases:\n  - Shopper signs in:\n      - Sign In\n\nModules:\n  - Sign In:\n      - Launch App\n      - ${keyword} "Sign in"\n`;
const events = [];
let engine;

function load() {
  engine ??= (async () => {
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
    globalThis.opticsPage = { step: () => {}, before: async () => {}, after: async () => {}, event: (json) => events.push(JSON.parse(json)) };
    return py.pyimport("optics_page");
  })();
  return engine;
}

// A phone with a dialog over Sign in; a tap inside the bounds of the dialog's button closes it.
function phone(title, button) {
  const screen = { dialog: true, taps: [] };
  const node = (tag, attrs) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(" ")}/>`;
  const dialog = `<hierarchy><android.widget.FrameLayout package="com.birch.shop" bounds="[0,0][300,600]"><android.widget.LinearLayout resource-id="android:id/parentPanel" bounds="[20,200][280,380]">` +
    node("android.widget.TextView", { "node-id": "t", "resource-id": "android:id/alertTitle", text: title, bounds: "[40,220][260,250]" }) +
    node("android.widget.Button", { "node-id": "b", "resource-id": "android:id/button2", text: button, clickable: "true", bounds: "[40,300][140,340]" }) +
    "</android.widget.LinearLayout></android.widget.FrameLayout></hierarchy>";
  const login = `<hierarchy><android.widget.FrameLayout package="com.birch.shop" bounds="[0,0][300,600]">${node("android.widget.Button", { "node-id": "s", text: "Sign in", clickable: "true", bounds: "[20,400][280,440]" })}</android.widget.FrameLayout></hierarchy>`;
  globalThis.opticsBirch = {
    width: 300, height: 600,
    source: () => (screen.dialog ? dialog : login),
    tapAt: (x, y) => { screen.taps.push([x, y]); if (x >= 40 && x <= 140 && y >= 300 && y <= 340) screen.dialog = false; },
    tap: (id) => screen.taps.push(id),
    launch() {}, found() {}, missed() {}, back() {}, close() {},
  };
  return screen;
}

test("the playground ships every engine file it loads, from this site", () => {
  const core = `out/${manifest.core}`;
  const coreSize = lock.pyodide.files.reduce((n, f) => n + statSync(core + f).size, 0);
  assert.equal(manifest.coreSize, coreSize);
  for (const w of manifest.wheels) assert.equal(statSync(`out/engine/wheels/${w.file}`).size, w.size, w.file);
  assert.ok(manifest.wheels.some((w) => w.file === manifest.optics));
  for (const f of manifest.python) assert.ok(existsSync(`out/engine/${f.path}`), f.path);
  assert.doesNotMatch(manifest.core, /^(?:https?:)?\/\//);
});

test("the shipped engine runs a real dry run of a suite, and a run stops when the visitor asks", { timeout: 120000 }, async () => {
  const page = await load();
  assert.equal(JSON.parse(page.about()).optics, manifest.optics.split("-")[1]);
  const dryRun = async (keyword) => {
    events.length = 0;
    return JSON.parse(await page.run("dry_run", JSON.stringify({ "config.yaml": CONFIG, "checkout.yaml": suite(keyword) })));
  };
  const passed = await dryRun("Press Element");
  assert.deepEqual(passed.results.map((r) => r.status), ["PASS"]);
  await dryRun("Pres Element");
  assert.ok(events.some((e) => e.code === "E0402" && /Press Element/.test(e.message)), JSON.stringify(events));
  globalThis.opticsPage.stopped = true;
  const stopped = JSON.parse(await page.run("execute", JSON.stringify({ "config.yaml": CONFIG, "checkout.yaml": suite("Press Element") })));
  assert.deepEqual(stopped, { stopped: true });
  globalThis.opticsPage.stopped = false;
});

test("the popup guard reads Birch as an Android screen: a rule taps the dialog away, a dialog with no rule fails the step", { timeout: 120000 }, async () => {
  const page = await load();
  const rules = JSON.stringify([{ name: "rate_prompt", detect: { text_contains: ["Enjoying Birch?"] }, action: { type: "tap", target: "Not now" } }]);
  const execute = async () => {
    events.length = 0;
    return JSON.parse(await page.run("execute", JSON.stringify({ "config.yaml": CONFIG, "checkout.yaml": suite("Press Element"), "popup_rules.json": rules })));
  };
  const popups = () => events.filter((e) => e.entity_type === "popup" && e.args.verdict !== "none").map((e) => [e.args.rule, e.args.verdict, e.args.action, e.code]);

  const rate = phone("Enjoying Birch?", "Not now");
  const handled = await execute();
  assert.deepEqual(handled.results.map((r) => r.status), ["PASS"]);
  assert.deepEqual(popups(), [["rate_prompt", "handled", "tap Not now", null]]);
  assert.deepEqual(rate.taps, [[90, 320], "s"]);

  const club = phone("Join Birch Club", "No thanks");
  const unknown = await execute();
  assert.deepEqual(unknown.results.map((r) => r.status), ["FAIL"]);
  assert.deepEqual(popups(), [[null, "unknown", "", "E0206"]]);
  assert.deepEqual(club.taps, []);
});
