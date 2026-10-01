// Static build: copy the hand-written site and the installers into out/, and render the
// text pages into the shared layout.
// Every URL in site/ is relative, so the same build works at optics-framework.org/
// and under a branch preview path like optics-framework.org/<branch>/.
import { cpSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const ORIGIN = "https://optics-framework.org";

// GitHub Pages serves `/about` from about.html, so each page is published as <path>.html.
const PAGES = [
  { src: "pages/about.html", path: "about", title: "About Optics", description: "What Optics is, who builds it and how it is licensed." },
  { src: "pages/contact.html", path: "contact", title: "Contact the Optics team", description: "Where to report bugs, ask questions, disclose security issues and reach Mozark." },
  { src: "pages/privacy.html", path: "privacy", title: "Privacy at Optics", description: "What optics-framework.org, the install scripts and the framework collect: no cookies, no analytics, no telemetry." },
];

// GitHub Pages answers every missing path with the root 404.html, at any depth, so its
// asset URLs are absolute from the deploy's base path rather than relative.
const NOT_FOUND = { src: "pages/404.html", title: "Page not found · Optics", description: "This page does not exist on optics-framework.org." };

function render(page, { root, home, canonical }) {
  const layout = readFileSync("pages/_layout.html", "utf8");
  const values = {
    title: page.title,
    description: page.description,
    canonical: canonical ? `<link rel="canonical" href="${canonical}">` : "",
    root,
    home,
  };
  return layout
    .replace("{{body}}", () => readFileSync(page.src, "utf8").trimEnd())
    .replace(/\{\{(\w+)\}\}/g, (_, key) => values[key]);
}

const base = process.env.PAGES_BASE_PATH ?? "";

rmSync("out", { recursive: true, force: true });
cpSync("site", "out", { recursive: true });
cpSync("public", "out", { recursive: true });

for (const page of PAGES) {
  writeFileSync(`out/${page.path}.html`, render(page, { root: "", home: "./", canonical: `${ORIGIN}/${page.path}` }));
}
writeFileSync("out/404.html", render(NOT_FOUND, { root: `${base}/`, home: `${base}/` }));

// Fingerprint every local asset a page links to (stylesheet, script, media) so a deploy
// never pairs new HTML with a cached old file.
const hash = (f) => createHash("sha256").update(readFileSync(`out/${f}`)).digest("hex").slice(0, 10);
for (const name of readdirSync("out").filter((f) => f.endsWith(".html"))) {
  const page = readFileSync(`out/${name}`, "utf8").replace(
    /(href|src|poster)="((?:\/[\w.-]+)*\/)?(styles\.css|app\.js|media\/[^"?#]+)"/g,
    (_, attr, prefix = "", file) => `${attr}="${prefix}${file}?v=${hash(file)}"`,
  );
  writeFileSync(`out/${name}`, page);
}
console.log("built out/");
