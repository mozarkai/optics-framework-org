import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCatalogue, loadExamples, loadProject } from "../lib/explain.mjs";
import "../site/suite.js";

const { OpticsSuite } = globalThis;
const catalogue = loadCatalogue();
const goldens = JSON.parse(readFileSync("test/fixtures/explain/goldens.json", "utf8"));
const dirOf = (name) => (name.startsWith("examples/") ? `content/explain/${name}` : `test/fixtures/${name}`);

for (const [name, real] of Object.entries(goldens)) {
  test(`the explainer predicts real optics dry_run on ${name}`, () => {
    const result = OpticsSuite.dryRun(OpticsSuite.load(loadProject(dirOf(name)), catalogue));
    if (real.cases) {
      const predicted = result.cases.map((c) => ({ name: c.name, kind: c.kind, status: c.status, ...(c.failure ? { code: c.failure.code, message: `Code.${c.failure.code}: ${c.failure.message}` } : {}) }));
      assert.deepEqual(predicted, real.cases);
    } else {
      assert.ok(result.abort, "dry_run stopped before running, so the explainer must too");
      assert.ok(real.output.includes(`Cannot start: ${result.abort.code}`));
      for (const line of result.abort.message.split("\n")) assert.ok(real.output.includes(line), line);
    }
  });
}

test("every example suite is in the goldens", () => {
  for (const ex of loadExamples()) assert.ok(goldens[`examples/${ex.slug}`], ex.slug);
});

test("the catalogue matches the keywords optics list prints", () => {
  assert.equal(Object.keys(catalogue.keywords).length, 51);
  assert.equal(catalogue.keywords.press_element.title, "Press Element");
});
