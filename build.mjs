// Static build: copy the hand-written site and the installers into out/.
// Every URL in site/ is relative, so the same build works at optics-framework.org/
// and under a branch preview path like optics-framework.org/<branch>/.
import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

rmSync("out", { recursive: true, force: true });
cpSync("site", "out", { recursive: true });
cpSync("public", "out", { recursive: true });
// Fingerprint every local asset the page links to (stylesheet, script, media) so a deploy
// never pairs new HTML with a cached old file.
const hash = (f) => createHash("sha256").update(readFileSync(`out/${f}`)).digest("hex").slice(0, 10);
const page = readFileSync("out/index.html", "utf8").replace(
  /(href|src|poster)="((?:styles\.css|app\.js|media\/[^"?#]+))"/g,
  (_, attr, file) => `${attr}="${file}?v=${hash(file)}"`,
);
writeFileSync("out/index.html", page);
console.log("built out/");
