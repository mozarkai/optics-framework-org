// Pins live in engine-lock.json. Files are fetched once into a cache outside the repo and
// copied into out/engine/, so the page loads nothing from another server.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { gunzipSync } from "node:zlib";

const LOCK = JSON.parse(readFileSync(new URL("./engine-lock.json", import.meta.url), "utf8"));
const CACHE = process.env.ENGINE_CACHE ?? join(process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache"), "optics-framework.org", "engine");

const digest = (algorithm, bytes, encoding = "hex") => createHash(algorithm).update(bytes).digest(encoding);

async function cached(url, check) {
  const file = join(CACHE, basename(new URL(url).pathname));
  if (existsSync(file) && check(readFileSync(file))) return file;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`engine: ${url} answered ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!check(bytes)) throw new Error(`engine: ${url} does not match the digest in lib/engine-lock.json`);
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(file, bytes);
  return file;
}

const sha256 = (expected) => (bytes) => digest("sha256", bytes) === expected;

// The files of an npm tarball, by path inside the package.
function untar(tgz) {
  const tar = gunzipSync(tgz);
  const files = new Map();
  for (let at = 0; at + 512 <= tar.length && tar[at]; ) {
    const field = (from, to) => tar.toString("utf8", at + from, at + to).replace(/\0.*$/s, "");
    const size = parseInt(field(124, 136).trim(), 8);
    const name = [field(345, 500), field(0, 100)].filter(Boolean).join("/");
    files.set(name.replace(/^package\//, ""), tar.subarray(at + 512, at + 512 + size));
    at += 512 + Math.ceil(size / 512) * 512;
  }
  return files;
}

// Copies the engine into out/engine/ and returns what the page needs to load it.
export async function buildEngine(out = "out") {
  const { pyodide } = LOCK;
  const [algorithm, integrity] = pyodide.integrity.split("-");
  const tarball = await cached(pyodide.tarball, (bytes) => digest(algorithm, bytes, "base64") === integrity);
  const packaged = untar(readFileSync(tarball));
  const core = `engine/pyodide-${pyodide.version}/`;
  mkdirSync(join(out, core), { recursive: true });
  for (const name of pyodide.files) writeFileSync(join(out, core, name), packaged.get(name));

  const sources = [
    ...LOCK.wheels.map(({ file, sha256: sum }) => ({ url: pyodide.wheels + file, sum })),
    ...LOCK.pypi.map(({ url, sha256: sum }) => ({ url, sum })),
  ];
  mkdirSync(join(out, "engine/wheels"), { recursive: true });
  const wheels = [];
  for (const { url, sum } of sources) {
    const file = await cached(url, sha256(sum));
    copyFileSync(file, join(out, "engine/wheels", basename(file)));
    wheels.push({ file: basename(file), size: statSync(file).size });
  }

  const python = readdirSync("site/engine", { recursive: true })
    .filter((f) => f.endsWith(".py"))
    .sort()
    .map((path) => ({ path, v: digest("sha256", readFileSync(join("site/engine", path))).slice(0, 10) }));
  return {
    core,
    coreSize: pyodide.files.reduce((sum, name) => sum + packaged.get(name).length, 0),
    wheels,
    python,
    optics: basename(LOCK.pypi.find((p) => p.url.includes("optics_framework")).url),
  };
}
