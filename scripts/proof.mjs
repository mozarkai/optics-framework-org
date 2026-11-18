// Reads the public numbers the homepage shows (PyPI downloads, GitHub stars, recent
// releases) and writes them to content/proof.json, which the build renders. The build
// itself never goes online, so commit the file after a run.
//
//   node scripts/proof.mjs
import { writeFileSync } from "node:fs";
import { UA } from "../edge/snapshot.js";
import { collectProof } from "../lib/proof.mjs";

const today = new Date().toISOString().slice(0, 10);
const proof = await collectProof({ today, agent: process.env.PROOF_USER_AGENT || UA, token: process.env.GITHUB_TOKEN });
writeFileSync("content/proof.json", `${JSON.stringify(proof, null, 2)}\n`);
console.log(`content/proof.json: ${proof.github.stars} stars, ${proof.github.releases.length} releases, PyPI to ${proof.pypi.to}`);
