// Mermaid diagrams in the docs are drawn ahead of time by scripts/diagrams.mjs, because
// the build never goes online and the site loads no third-party script. Each fence maps to
// content/diagrams/<id>.svg by the hash of its source.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

export const DIAGRAM_DIR = "content/diagrams";

export const diagramId = (code) => createHash("sha256").update(code.trim()).digest("hex").slice(0, 12);

export function diagramSvg(code) {
  const file = `${DIAGRAM_DIR}/${diagramId(code)}.svg`;
  if (!existsSync(file)) throw new Error(`${file} is missing: run node scripts/diagrams.mjs`);
  return readFileSync(file, "utf8").trim();
}
