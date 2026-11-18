import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const sandbox = { window: {} };
runInNewContext(readFileSync("site/sim.js", "utf8"), sandbox);
const S = sandbox.window.OPTICS_SIM;
const SEEDS = ["birch", "k7q2x", "abc12", "zz9", "q1", "m3", "0", "loud"];
const runs = (cfg, s) => S.simulate(cfg).releases.map((r) => r.runs[s]);
const loud = (seed) => ({ ...S.defaults(), seed, odds: { id: 30, word: 30, style: 20, pic: 20, gone: 15, out: 15, blip: 10 } });

test("the same seed and settings give the same releases and outcomes", () => {
  const a = JSON.stringify(S.simulate(loud("k7q2x"))), b = JSON.stringify(S.simulate(loud("k7q2x")));
  assert.equal(a, b);
  assert.notEqual(a, JSON.stringify(S.simulate(loud("k7q2y"))));
});

test("switches change outcomes, never the releases that ship", () => {
  const shipped = (cfg, n) => JSON.stringify(S.simulate(cfg).releases.slice(0, n).map((r) => r.shipped));
  const base = loud("birch");
  assert.equal(shipped(base, 50), shipped({ ...base, defs: false, strategy: "one" }, 50));
  assert.equal(shipped(base, 50), shipped({ ...base, releases: 100 }, 50));
});

test("raising one odds slider keeps every other change in place", () => {
  const keyed = (cfg) => S.simulate(cfg).releases.map((r) => r.shipped.filter((c) => c.key === "gone").map((c) => c.el).join());
  const base = loud("zz9");
  assert.deepEqual(keyed(base), keyed({ ...base, odds: { ...base.odds, word: 90 } }));
});

test("a deleted element fails its step in every strategy, and self-heal never passes it", () => {
  let seen = 0;
  for (const seed of SEEDS) for (const s of S.STRATEGIES) for (const run of runs(loud(seed), s)) {
    for (const bug of run.caught.filter((b) => b.key === "gone")) {
      assert.equal(run.steps[bug.el].st, "fail");
      seen++;
    }
  }
  assert.ok(seen > 0);
});

test("Assert Presence never heals", () => {
  const assertAt = S.ELEMENTS.findIndex((e) => e.kw === "assert_presence");
  for (const seed of SEEDS) for (const run of runs(loud(seed), "ai")) assert.notEqual(run.steps[assertAt].st, "healed");
});

test("only the AI strategy heals, and healing only follows a full miss", () => {
  for (const seed of SEEDS) for (const s of S.STRATEGIES) for (const run of runs(loud(seed), s)) {
    for (const step of run.steps.filter((x) => x.st === "healed")) {
      assert.equal(s, "ai");
      assert.ok(step.trace.slice(0, 4).every((t) => t !== true));
    }
  }
});

test("a sign-out on the last screen is caught by error detection and missed without it", () => {
  const cfg = { ...S.defaults(), seed: "m3", odds: { id: 0, word: 0, style: 0, pic: 0, gone: 0, out: 20, blip: 0 } };
  const end = (defs) => runs({ ...cfg, defs }, "every");
  const withDefs = end(true), without = end(false);
  assert.ok(withDefs.some((r) => r.end === "match" && r.verdict === "bug"));
  assert.ok(without.some((r) => r.end === "unseen" && r.verdict === "missed"));
  assert.ok(without.every((r) => r.end !== "match"));
});

test("a run fails falsely only when the app works", () => {
  for (const seed of SEEDS) for (const s of S.STRATEGIES) for (const run of runs(loud(seed), s)) {
    if (run.verdict === "false") assert.ok(run.steps.some((x) => x.cause === "false"));
    if (run.steps.some((x) => x.cause === "gone" || x.cause === "out")) assert.equal(run.verdict, "bug");
  }
});

test("a shared link restores the settings, and a bad one gives the defaults", () => {
  const cfg = loud("q1");
  cfg.releases = 100;
  cfg.strategy = "one";
  cfg.defs = false;
  const same = (a, b) => assert.equal(JSON.stringify(a), JSON.stringify(b));
  same(S.decode(S.encode(cfg)), cfg);
  same(S.decode("<script>.9999.x.7.1-2"), S.defaults());
});
