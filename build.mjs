// Static build: copy the hand-written site and the installers into out/, render the text
// pages into the shared layout, and write the sitemap.
// Every URL in site/ is relative, so the same build works at optics-framework.org/
// and under a branch preview path like optics-framework.org/<branch>/.
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { buildDocs } from "./lib/docs.mjs";
import { loadProof, proofBand, proofMarkdown } from "./lib/proof.mjs";
import { loadRun, runBody, runCard, runMarkdown } from "./lib/run.mjs";
import { playTabs } from "./lib/play.mjs";
import { buildEngine } from "./lib/engine.mjs";
import { blogArticle, blogBand, blogFeed, blogJsonLd, blogLlmsLines, blogMarkdown, blogMarkdownBand, blogPage, loadBlog } from "./lib/blog.mjs";
import { explainBody, explainMarkdown, loadCatalogue, loadExamples } from "./lib/explain.mjs";

const ORIGIN = "https://optics-framework.org";

// GitHub Pages serves `/about` from about.html, so each page is published as <path>.html.
const PAGES = [
  { src: "pages/about.html", path: "about", title: "About Optics", description: "What Optics is, how it works and how it is licensed." },
  { src: "pages/contact.html", path: "contact", title: "Contact the Optics team", description: "Where to report bugs, ask questions and disclose security issues." },
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
    head: page.head ?? "",
    root,
    home,
  };
  return layout
    .replace("{{body}}", () => (page.body ?? readFileSync(page.src, "utf8")).trimEnd())
    .replace(/\{\{(\w+)\}\}/g, (_, key) => values[key]);
}

// The last commit to touch a file, so lastmod moves only when the page does.
function lastModified(file) {
  try {
    const date = execFileSync("git", ["log", "-1", "--format=%cs", "--", file], { encoding: "utf8" }).trim();
    if (date) return date;
  } catch {}
  return statSync(file).mtime.toISOString().slice(0, 10);
}

function sitemap(entries) {
  const urls = entries
    .map(({ loc, lastmod }) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

// The Markdown twin of a text page. Those pages use only headings, paragraphs, links,
// bold and inline code; any other tag stops the build rather than being dropped from the twin.
// Links become absolute so the text still works inside llms-full.txt.
function pageMarkdown(html) {
  const md = html
    .replace(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, (_, href, text) => `[${text}](${new URL(href, `${ORIGIN}/`).href})`)
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/g, "`$1`")
    .replace(/<strong>([\s\S]*?)<\/strong>/g, "**$1**")
    .replace(/\s*<h([1-6])[^>]*>([\s\S]*?)<\/h\1>\s*/g, (_, level, text) => `\n\n${"#".repeat(level)} ${text}\n\n`)
    .replace(/\s*<p[^>]*>([\s\S]*?)<\/p>\s*/g, "\n\n$1\n\n");
  const leftover = /<\/?[a-z][^>]*>/i.exec(md);
  if (leftover) throw new Error(`pageMarkdown cannot convert ${leftover[0]}`);
  return `${md.replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

const base = process.env.PAGES_BASE_PATH ?? "";

rmSync("out", { recursive: true, force: true });
cpSync("site", "out", { recursive: true });
cpSync("public", "out", { recursive: true });
cpSync("out/install.sh", "out/install");

for (const page of PAGES) {
  const head = `<link rel="alternate" type="text/markdown" href="${page.path}.md" title="${page.title}, as Markdown">`;
  writeFileSync(`out/${page.path}.html`, render({ ...page, head }, { root: "", home: "./", canonical: `${ORIGIN}/${page.path}` }));
  writeFileSync(`out/${page.path}.md`, pageMarkdown(readFileSync(page.src, "utf8")));
}
writeFileSync("out/404.html", render(NOT_FOUND, { root: `${base}/`, home: `${base}/` }));

// A real run of the Birch suite against the real Birch app, replayed from the files Optics wrote.
const run = loadRun();
const RUN_PAGE = {
  path: "run",
  title: "A real Optics run against Birch",
  description: "Optics ran the Birch suite against two releases of the Birch web app. Step through what it saw, how it found each element, how long each step took and why one run failed, then run it yourself.",
  body: playTabs("run") + runBody(readFileSync("pages/run.html", "utf8"), run, ORIGIN),
  head: `<link rel="alternate" type="text/markdown" href="run.md" title="A real Optics run, as Markdown">\n  <link rel="stylesheet" href="replay.css">`,
};
writeFileSync("out/run.html", render(RUN_PAGE, { root: "", home: "./", canonical: `${ORIGIN}/run` }));
writeFileSync("out/run.md", runMarkdown(run, ORIGIN));
// The playground runs the real engine in the page, loaded from out/engine/ when asked.
const PLAYGROUND = {
  src: "pages/playground.html",
  path: "playground",
  title: "Optics playground: run the real engine in your browser",
  description: "Edit a YAML suite and run it with optics-framework 1.11.4 on Python in WebAssembly, against a demo shop app in the page.",
};
const engine = await buildEngine();
writeFileSync(
  "out/playground.html",
  render(
    {
      ...PLAYGROUND,
      body: playTabs("playground") + readFileSync(PLAYGROUND.src, "utf8").replace("{{engine}}", () => JSON.stringify(engine)),
      head: `<link rel="alternate" type="text/markdown" href="playground.md" title="${PLAYGROUND.title}, as Markdown">\n  <link rel="stylesheet" href="playground.css">\n  <link rel="stylesheet" href="engine.css">`,
    },
    { root: "", home: "./", canonical: `${ORIGIN}/playground` },
  ),
);
cpSync("pages/playground.md", "out/playground.md");

// The playgrounds that left the homepage, each a tab beside the engine, the run and /explain.
const PLAY_PAGES = [
  {
    src: "pages/releases.html",
    path: "releases",
    title: "Ship a release: break an Optics test, then ship a hundred",
    description: "Change the sign-in button of a demo shop app and watch Optics climb its locator ladder, then simulate release after release and count the false failures.",
    styles: ["playground.css", "sim.css"],
  },
  {
    src: "pages/hard-targets.html",
    path: "hard-targets",
    title: "Hard targets: locked phones, TVs, games and more with Optics",
    description: "A locked phone through Bluetooth and a camera, a TV through its remote, a game through OCR: each hard flow, with the suite lines that drive it.",
    styles: ["playground.css", "wild.css"],
  },
];
for (const page of PLAY_PAGES) {
  const head = [
    `<link rel="alternate" type="text/markdown" href="${page.path}.md" title="${page.title}, as Markdown">`,
    ...page.styles.map((f) => `<link rel="stylesheet" href="${f}">`),
  ].join("\n  ");
  const body = playTabs(page.path) + readFileSync(page.src, "utf8");
  writeFileSync(`out/${page.path}.html`, render({ ...page, body, head }, { root: "", home: "./", canonical: `${ORIGIN}/${page.path}` }));
  cpSync(page.src.replace(/\.html$/, ".md"), `out/${page.path}.md`);
}

// The blog lists articles, videos and posts, hosted here or elsewhere, from any author:
// /blog, its Markdown twin, an RSS feed, and the latest four on the homepage
// (both the HTML and the Markdown twin).
const blog = loadBlog();
const BLOG_PAGE = {
  path: "blog",
  title: "Optics blog: articles, videos and posts",
  description: "Articles, videos and posts about Optics, the open-source test automation framework. Guides and announcements from the Optics team, plus posts from the community.",
  body: blogPage(blog),
  head: `<link rel="alternate" type="application/rss+xml" href="feed.xml" title="Optics blog">\n  <link rel="alternate" type="text/markdown" href="blog.md" title="Optics blog, as Markdown">\n  <script type="application/ld+json">\n${blogJsonLd(blog, ORIGIN)}\n  </script>`,
};
writeFileSync("out/blog.html", render(BLOG_PAGE, { root: "", home: "./", canonical: `${ORIGIN}/blog` }));
writeFileSync("out/blog.md", blogMarkdown(blog, ORIGIN));
writeFileSync("out/feed.xml", blogFeed(blog, ORIGIN));

// /explain: a suite editor that explains each row and predicts optics dry_run in the browser.
const catalogue = loadCatalogue();
const explainExamples = loadExamples();
const EXPLAIN_PAGE = {
  title: "Explain an Optics suite, row by row",
  description: "Edit an Optics test suite in CSV or YAML and see what each row does, how each element is found and what optics dry_run reports, live in your browser.",
  body: playTabs("explain") + explainBody(catalogue, explainExamples),
  head: `<link rel="stylesheet" href="explain.css">\n  <link rel="alternate" type="text/markdown" href="explain.md" title="Explain a suite, as Markdown">`,
};
writeFileSync("out/explain.html", render(EXPLAIN_PAGE, { root: "", home: "./", canonical: `${ORIGIN}/explain` }));
writeFileSync("out/explain.md", explainMarkdown(catalogue, explainExamples, ORIGIN));

// Articles hosted here: blog/<slug>.html and its Markdown twin, canonical to this site.
const articles = blog.items.filter((item) => item.slug);
const articleSrc = (item) => `content/blog/${item.slug}.md`;
mkdirSync("out/blog", { recursive: true });
for (const item of articles) {
  const { body, head, markdown, description } = blogArticle(item, { origin: ORIGIN, modified: lastModified(articleSrc(item)) });
  const page = { title: `${item.title} · Optics blog`, description, body, head };
  writeFileSync(`out/blog/${item.slug}.html`, render(page, { root: "../", home: "../", canonical: `${ORIGIN}/blog/${item.slug}` }));
  writeFileSync(`out/blog/${item.slug}.md`, markdown);
}
// out/blog/ exists for the articles, so Pages would answer /blog/ with a 404 instead of blog.html.
writeFileSync(
  "out/blog/index.html",
  `<!doctype html>\n<meta charset="utf-8">\n<title>Optics blog</title>\n<link rel="canonical" href="${ORIGIN}/blog">\n<meta name="robots" content="noindex">\n<meta http-equiv="refresh" content="0; url=../blog">\n<a href="../blog">Optics blog</a>\n`,
);
writeFileSync("out/blog/index.md", blogMarkdown(blog, ORIGIN));
const fill = (file, marker, text) => {
  const page = readFileSync(file, "utf8");
  if (!page.includes(marker)) throw new Error(`${file} lost its ${marker} marker`);
  writeFileSync(file, page.replace(marker, () => text));
};
fill("out/index.html", "<!-- blog:latest -->", blogBand(blog));
fill("out/index.md", "<!-- blog:latest -->", blogMarkdownBand(blog, ORIGIN));
const proof = loadProof();
fill("out/index.html", "<!-- proof -->", proofBand(proof));
fill("out/index.html", "<!-- run:card -->", `<div class="run-card">${runCard(run)}</div>`);
const filmChapters = readFileSync("site/media/optics-film-chapters.vtt", "utf8")
  .split(/\n\n+/)
  .map((cue) => cue.match(/(\d+):(\d+):([\d.]+) --> [^\n]+\n(.+)/))
  .filter(Boolean)
  .map(([, h, m, s, title]) => {
    const t = +h * 3600 + +m * 60 + +s;
    const stamp = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
    return `<li><button type="button" data-t="${t}"><span>${stamp}</span>${title.trim()}</button></li>`;
  });
fill("out/index.html", "<!-- film:chapters -->", `<ol aria-label="Chapters">${filmChapters.join("")}</ol>`);

fill("out/index.md", "<!-- proof -->", proofMarkdown(proof));
fill("out/llms.txt", "<!-- blog:articles -->", blogLlmsLines(blog, ORIGIN));
fill("out/ai.txt", "{{lastmod}}", lastModified("site/ai.txt"));

// Agent Skills discovery index (v0.2.0), one entry per <name>/SKILL.md, so each digest
// always matches the file as published.
const SKILLS = ".well-known/agent-skills";
const skills = readdirSync(`site/${SKILLS}`, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map(({ name }) => {
    const file = readFileSync(`site/${SKILLS}/${name}/SKILL.md`);
    const front = file.toString("utf8");
    if (/^name: (.+)$/m.exec(front)?.[1] !== name) throw new Error(`${SKILLS}/${name}/SKILL.md must be named ${name}`);
    return {
      name,
      type: "skill-md",
      description: /^description: (.+)$/m.exec(front)[1],
      url: `/${SKILLS}/${name}/SKILL.md`,
      digest: `sha256:${createHash("sha256").update(file).digest("hex")}`,
    };
  });
writeFileSync(
  `out/${SKILLS}/index.json`,
  JSON.stringify({ $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json", skills }, null, 2) + "\n",
);

// The documentation: docs/*.md rendered into out/docs/, with a Markdown twin per page.
const docs = buildDocs({ lastModified });

// Every page in one file for agents: the homepage, about and contact, the docs in reading
// order (without the Contribute section), then privacy. The articles stay out to keep the
// file under about 500 KB.
const fullText = (path, file) => `Source: ${ORIGIN}/${path}\n\n${readFileSync(file, "utf8").trim()}\n`;
const llmsFull = [
  `# Optics, full text\n\n> Every page of optics-framework.org in one file: the homepage, the hard targets, about and contact, every docs page in reading order except the Contribute section, then privacy. The docs index is ${ORIGIN}/docs/llms.txt and the blog articles are listed at ${ORIGIN}/blog.md.\n`,
  fullText("", "out/index.md"),
  fullText("hard-targets", "out/hard-targets.md"),
  fullText("about", "out/about.md"),
  fullText("contact", "out/contact.md"),
  ...docs.markdown,
  fullText("privacy", "out/privacy.md"),
].join("\n---\n\n");
if (llmsFull.length > 500_000) console.warn(`llms-full.txt is ${llmsFull.length} characters, over the 500,000 budget`);
writeFileSync("out/llms-full.txt", llmsFull);

writeFileSync(
  "out/sitemap.xml",
  sitemap([
    { loc: `${ORIGIN}/`, lastmod: lastModified("site/index.html") },
    ...[...PAGES, PLAYGROUND, ...PLAY_PAGES].map((page) => ({ loc: `${ORIGIN}/${page.path}`, lastmod: lastModified(page.src) })),
    { loc: `${ORIGIN}/blog`, lastmod: lastModified("content/blog.json") },
    ...articles.map((item) => ({ loc: `${ORIGIN}/blog/${item.slug}`, lastmod: lastModified(articleSrc(item)) })),
    { loc: `${ORIGIN}/run`, lastmod: lastModified("site/runs/birch-run.js") },
    { loc: `${ORIGIN}/explain`, lastmod: lastModified("pages/explain.html") },
    ...docs.entries,
  ]),
);

// Fingerprint every local asset a page links to (stylesheets, scripts, media) so a deploy
// never pairs new HTML with a cached old file. Docs pages sit in folders, so their links
// start with "../".
const hash = (f) => createHash("sha256").update(readFileSync(`out/${f}`)).digest("hex").slice(0, 10);
const htmlFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? htmlFiles(`${dir}/${e.name}`) : e.name.endsWith(".html") ? [`${dir}/${e.name}`] : [],
  );
for (const file of htmlFiles("out")) {
  const page = readFileSync(file, "utf8")
    .replace(
      /(href|src|poster)="((?:\.\.\/)+|(?:\/[\w.-]+)*\/)?((?:runs\/)?[\w-]+\.(?:css|js)|media\/[^"?#]+)"/g,
      (_, attr, prefix = "", asset) => `${attr}="${prefix}${asset}?v=${hash(asset)}"`,
    )
    .replace(/<body([^>]*)>/, "<body$1><!--email_off-->")
    .replace("</body>", "<!--/email_off--></body>");
  writeFileSync(file, page);
}
console.log("built out/");
