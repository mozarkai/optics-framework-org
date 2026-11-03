// Static build: copy the hand-written site and the installers into out/, render the text
// pages into the shared layout, and write the sitemap.
// Every URL in site/ is relative, so the same build works at optics-framework.org/
// and under a branch preview path like optics-framework.org/<branch>/.
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { buildDocs } from "./lib/docs.mjs";
import { blogArticle, blogBand, blogFeed, blogJsonLd, blogLlmsLines, blogMarkdown, blogMarkdownBand, blogPage, loadBlog } from "./lib/blog.mjs";

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

for (const page of PAGES) {
  const head = `<link rel="alternate" type="text/markdown" href="${page.path}.md" title="${page.title}, as Markdown">`;
  writeFileSync(`out/${page.path}.html`, render({ ...page, head }, { root: "", home: "./", canonical: `${ORIGIN}/${page.path}` }));
  writeFileSync(`out/${page.path}.md`, pageMarkdown(readFileSync(page.src, "utf8")));
}
writeFileSync("out/404.html", render(NOT_FOUND, { root: `${base}/`, home: `${base}/` }));

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
// order, then privacy. The articles stay out to keep the file under about 500 KB.
const fullText = (path, file) => `Source: ${ORIGIN}/${path}\n\n${readFileSync(file, "utf8").trim()}\n`;
const llmsFull = [
  `# Optics, full text\n\n> Every page of optics-framework.org in one file: the homepage, about and contact, every docs page in reading order, then privacy. The docs index is ${ORIGIN}/docs/llms.txt and the blog articles are listed at ${ORIGIN}/blog.md.\n`,
  fullText("", "out/index.md"),
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
    ...PAGES.map((page) => ({ loc: `${ORIGIN}/${page.path}`, lastmod: lastModified(page.src) })),
    { loc: `${ORIGIN}/blog`, lastmod: lastModified("content/blog.json") },
    ...articles.map((item) => ({ loc: `${ORIGIN}/blog/${item.slug}`, lastmod: lastModified(articleSrc(item)) })),
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
  const page = readFileSync(file, "utf8").replace(
    /(href|src|poster)="((?:\.\.\/)+|(?:\/[\w.-]+)*\/)?(styles\.css|app\.js|track\.js|docs\.css|scenes\.css|docs\.js|scenes\.js|scene-defs\.js|media\/[^"?#]+)"/g,
    (_, attr, prefix = "", asset) => `${attr}="${prefix}${asset}?v=${hash(asset)}"`,
  );
  writeFileSync(file, page);
}
console.log("built out/");
