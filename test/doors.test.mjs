import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const box = vm.createContext({ JSON });
vm.runInContext(readFileSync("site/doors-contract.js", "utf8").replace(/^window\./, "globalThis."), box);
vm.runInContext(readFileSync("site/doors.js", "utf8"), box);
const C = box.OPTICS_DOORS;
const D = box.OpticsDoors;
const spec = JSON.parse(readFileSync("site/openapi.json", "utf8"));

const XPATH = "//*[@resource-id='com.birch.shop:id/login']";
const rows = { rows: [{ ref: "e4", cls: "Button", label: "Sign in", act: ["tap"], state: "", rid: "login" }], digest: "abc123" };
const step = (kw, args, ok = true, named = {}) => ({
  n: 1, kw, args, named, secret: false, module: "Sign_In", tc: "Checkout", cmd: kw,
  before: rows, after: rows, result: ok ? { ok, tag: "Text", time: 0.4 } : { ok, err: "x" },
});
const STEPS = [
  step("launch_app", []),
  step("enter_text", ["${email_field}", "ava@birch.shop"], true, { email_field: ["//*[@resource-id='com.birch.shop:id/email']"] }),
  step("press_element", ["Sign in"]),
  step("press_element", ["${sign_in}"], false, { sign_in: [XPATH, "Sign in"] }),
  step("assert_presence", ["Added to cart"]),
  step("assert_presence", ["Gone"], false),
  step("enter_text", ["${sign_in}", "abc"], false, { sign_in: [XPATH, "Sign in"] }),
  step("go_back", []),
];

test("the playground's keywords are the ones the release ships, under the same names", () => {
  const src = readFileSync("site/playground.js", "utf8");
  const kws = [...src.match(/var KEYWORDS = (\[.*\]);/)[1].matchAll(/\["(\w+)", "([^"]+)"/g)];
  for (const [, slug, name] of kws) assert.equal(C.keywords[slug]?.robot, name, slug);
});

test("every HTTP request the doors show is a valid ExecuteRequest to a real path", () => {
  const schema = spec.components.schemas.ExecuteRequest;
  for (const s of STEPS) {
    const { body } = D.http(s);
    for (const key of schema.required) assert.ok(key in body, `${s.kw}: ${key}`);
    for (const key of Object.keys(body)) assert.ok(key in schema.properties, `${s.kw}: ${key}`);
    assert.equal(body.mode, C.http.mode);
    for (const p of body.params) assert.ok(typeof p === "string" || p.every((v) => typeof v === "string"));
    assert.ok(C.http.paths.some((p) => spec.paths[p]));
  }
});

test("every MCP call the doors show names a real tool with its own arguments", () => {
  for (const s of STEPS) {
    const { name, arguments: args } = D.mcp(s).call.params;
    const tool = C.mcp.tools[name];
    assert.ok(tool, name);
    for (const key of Object.keys(args)) assert.ok(tool.params.includes(key), `${name}: ${key}`);
    for (const key of tool.required) assert.ok(key in args, `${name} needs ${key}`);
  }
});

test("every Python call fits the method's signature", () => {
  for (const s of STEPS) {
    const params = C.keywords[s.kw].params;
    const given = D.kwArgs(s).length;
    assert.ok(given <= params.length, s.kw);
    assert.ok(params.slice(given).every((p) => p.length === 2), `${s.kw} leaves a required parameter out`);
  }
});

test("a miss shows the reply the release gave, with the step's own value", () => {
  const miss = STEPS[3];
  assert.match(D.python(miss).res[1], /All 2 fallback combinations failed for press_element/);
  assert.match(D.python(miss).res[1], /No valid strategies found for 'Sign in' in 'press_element'/);
  assert.match(D.http(miss).res[1], /404 Not Found/);
  for (const s of STEPS.filter((x) => !x.result.ok)) {
    const all = ["python", "http", "mcp", "robot"].map((d) => D[d](s).res[1]).join("\n");
    assert.doesNotMatch(all, /\{(target|first|last|text)\}/, s.kw);
  }
  assert.match(D.mcp(miss).res[1], new RegExp(`tap "xpath=${XPATH.replace(/[[\]*@/]/g, "\\$&")}" -&gt; FAIL`));
});

test("a step with quotes, backslashes or markup shows in every door as text", () => {
  const nasty = { ...step("press_element", ['Sold"out\\q'], false), tc: "<img src=x onerror=alert(1)>" };
  for (const door of ["csv", "python", "robot", "http", "mcp"]) {
    const shown = D[door](nasty);
    for (const part of [shown.req, shown.res].flat()) assert.doesNotMatch(String(part), /<img/, door);
  }
});
