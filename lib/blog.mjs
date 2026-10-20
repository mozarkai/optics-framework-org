// The blog: articles, videos and posts about Optics, from any author. An item with a
// `slug` is hosted here at /blog/<slug>, its body in content/blog/<slug>.md, and is the
// canonical copy; any other item links out to the site it lives on (Medium, YouTube,
// LinkedIn, X, Instagram). content/blog.json is the list;
// this turns it into the /blog page body, the homepage band, an RSS feed, a Markdown
// twin, and a page plus Markdown twin per hosted article. Thumbnails are files under site/media/blog/, never hot-linked, because the site
// promises to load nothing from third-party servers.
import { existsSync, readFileSync } from "node:fs";
import { render, toPlainMarkdown } from "./markdown.mjs";

const TYPES = {
  article: { label: "Article", plural: "Articles", verb: "Read", schema: "BlogPosting" },
  video: { label: "Video", plural: "Videos", verb: "Watch", schema: "VideoObject" },
  post: { label: "Post", plural: "Posts", verb: "Read", schema: "SocialMediaPosting" },
};

// Platform marks, 24x24, filled with currentColor.
const PLATFORMS = {
  medium: { name: "Medium", path: "M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12zm7.42 0c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" },
  youtube: { name: "YouTube", path: "M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.87.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z" },
  linkedin: { name: "LinkedIn", path: "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" },
  x: { name: "X", path: "M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.4l-5.8-7.59-6.64 7.59H.47l8.6-9.83L0 1.15h7.6l5.24 6.93 6.06-6.93zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41z" },
  instagram: { name: "Instagram", path: "M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 100-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 01-2.88 0 1.44 1.44 0 012.88 0z" },
  github: { name: "GitHub", path: "M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .32.21.7.82.58A12 12 0 0 0 12 .3" },
};

const ARROW = `<svg class="arr" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8.5 7H17v8.5"/></svg>`;
const PLAY = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>`;
const RSS = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5a14.5 14.5 0 0 1 14.5 14.5M5 10.5a8.5 8.5 0 0 1 8.5 8.5"/><circle cx="6" cy="18" r="1.6"/></svg>`;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const mark = (platform, cls = "pf") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${PLATFORMS[platform].path}"/></svg>`;
// Where an item lives: hosted items under /blog/, the rest on their own site.
const href = (item) => (item.slug ? `blog/${item.slug}` : item.url);
export const itemUrl = (item, origin) => (item.slug ? `${origin}/blog/${item.slug}` : item.url);
const longDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// Read and check content/blog.json. A bad entry fails the build with the reason.
export function loadBlog(file = "content/blog.json") {
  const data = JSON.parse(readFileSync(file, "utf8"));
  const fail = (i, why) => { throw new Error(`${file}: item ${i + 1}: ${why}`); };
  data.items.forEach((item, i) => {
    if (!TYPES[item.type]) fail(i, `type must be one of ${Object.keys(TYPES).join(", ")}`);
    if (item.slug) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)) fail(i, "slug must be lowercase words joined by hyphens");
      if (!existsSync(`content/blog/${item.slug}.md`)) fail(i, `content/blog/${item.slug}.md does not exist`);
    } else {
      if (!PLATFORMS[item.platform]) fail(i, `platform must be one of ${Object.keys(PLATFORMS).join(", ")} (add a mark to lib/blog.mjs for a new one)`);
      if (!/^https:\/\//.test(item.url ?? "")) fail(i, "url must start with https://");
    }
    for (const key of ["title", "summary", "date"]) if (!item[key]) fail(i, `${key} is missing`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) fail(i, "date must be YYYY-MM-DD");
    if (item.type !== "post" && !item.image) fail(i, `a ${item.type} needs an image`);
    if (item.image && !/^media\/blog\/[\w.-]+$/.test(item.image)) fail(i, "image must be a file in site/media/blog/");
    if (item.image && !existsSync(`site/${item.image}`)) fail(i, `site/${item.image} does not exist`);
  });
  data.channels?.forEach((c) => {
    if (!PLATFORMS[c.platform]) throw new Error(`${file}: channel ${c.label}: unknown platform ${c.platform}`);
  });
  data.items.sort((a, b) => b.date.localeCompare(a.date));
  return data;
}

// One item. `root` prefixes the thumbnail path; `level` is the title's heading level.
function entry(item, { lead = false, level = 3, root = "" }) {
  const type = TYPES[item.type];
  const media = item.image
    ? `<div class="entry-media"><img src="${root}${item.image}" alt="" loading="${lead ? "eager" : "lazy"}" decoding="async">${
        item.type === "video" ? `<span class="entry-play">${PLAY}</span>${item.length ? `<span class="entry-dur">${esc(item.length)}</span>` : ""}` : ""
      }</div>`
    : `<div class="entry-media entry-quote">${mark(item.platform, "pf-lg")}<p>${esc(item.summary)}</p></div>`;
  const meta = [`<time datetime="${item.date}">${longDate(item.date)}</time>`];
  if (item.length && item.type !== "video") meta.push(esc(item.length));
  if (item.author && lead) meta.push(esc(item.author));
  return `<li class="entry${lead ? " entry-lead" : ""}" data-type="${item.type}">
  ${media}
  <div class="entry-body">
    <p class="entry-meta"><span class="entry-type"><i></i>${type.label}</span>${meta.map((m) => `<span>${m}</span>`).join("")}</p>
    <h${level} class="entry-title"><a href="${esc(href(item))}">${esc(item.title)}</a></h${level}>
    ${item.image ? `<p class="entry-summary">${esc(item.summary)}</p>` : ""}
    <p class="entry-cta">${item.slug ? `${type.verb} the ${type.label.toLowerCase()}` : `${mark(item.platform)}${type.verb} on ${PLATFORMS[item.platform].name}`}${ARROW}</p>
  </div>
</li>`;
}

// The newest item is the lead; the rest form a grid. One item is just the lead.
function entries(items, { level, root }) {
  return `<ul class="entries" role="list">
${items.map((item, i) => entry(item, { lead: i === 0, level: i === 0 ? level : level + 1, root })).join("\n")}
</ul>`;
}

// Type filters, once there is more than one type to choose between.
function filters(items) {
  const counts = Object.keys(TYPES).map((t) => [t, items.filter((i) => i.type === t).length]).filter(([, n]) => n);
  if (counts.length < 2) return "";
  const button = (value, label, n, on) =>
    `<button class="os-tab" type="button" data-filter="${value}" aria-pressed="${on}">${label} <span class="n">${n}</span></button>`;
  return `<div class="os blog-filters" role="group" aria-label="Show">
  ${button("all", "All", items.length, true)}
  ${counts.map(([t, n]) => button(t, TYPES[t].plural, n, false)).join("\n  ")}
</div>`;
}

export function blogPage({ items }) {
  return `<header class="blog-head">
        <h1 class="h2">Blog</h1>
        <p class="lede">Articles, videos and posts about Optics Framework, from the team and the community.</p>
        <p class="blog-rss"><a href="feed.xml">${RSS}RSS feed</a></p>
      </header>
      <div class="blog-feed">
      ${filters(items)}
      ${items.length ? entries(items, { level: 2, root: "" }) : `<p class="body-text">The first post is on its way.</p>`}
      <p class="blog-status" role="status"></p>
      </div>`;
}

// The homepage band: the lead plus a row of three, or nothing when there is nothing yet.
export function blogBand({ items }) {
  if (!items.length) return "";
  return `<section class="band blog-band" id="blog" aria-labelledby="blog-h">
      <div class="wrap">
        <div class="head-row">
          <h2 class="h2" id="blog-h">From the blog</h2>
          <p class="head-note">Articles, videos and posts about Optics, from the community.</p>
        </div>
        ${entries(items.slice(0, 4), { level: 3, root: "" })}
        <div class="btn-row learn-cta">
          <a class="btn btn-ghost" href="blog">All posts and videos</a>
        </div>
      </div>
    </section>`;
}

export function blogJsonLd({ items }, origin) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Optics blog",
    url: `${origin}/blog`,
    about: { "@id": `${origin}/#optics` },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": TYPES[item.type].schema,
          [item.type === "video" ? "name" : "headline"]: item.title,
          description: item.summary,
          url: itemUrl(item, origin),
          [item.type === "video" ? "uploadDate" : "datePublished"]: item.date,
          ...(item.image && { [item.type === "video" ? "thumbnailUrl" : "image"]: `${origin}/${item.image}` }),
          ...(item.author && { author: { "@type": "Person", name: item.author } }),
        },
      })),
    },
  }, null, 2);
}

// Hosted articles link to their Markdown twin, which is what an agent reading this wants.
const mdLine = (item, origin) =>
  `- [${item.title}](${item.slug ? `${itemUrl(item, origin)}.md` : item.url}): ${TYPES[item.type].label.toLowerCase()}${item.slug ? "" : ` on ${PLATFORMS[item.platform].name}`}, ${longDate(item.date)}${item.author ? `, by ${item.author}` : ""}. ${item.summary}`;

export function blogMarkdown({ items }, origin) {
  return `# Optics blog

Articles, videos and posts about Optics Framework, from the team and the community. Articles hosted on optics-framework.org link to their Markdown; the rest link to the site they were published on. RSS: ${origin}/feed.xml

${items.map((item) => mdLine(item, origin)).join("\n")}
`;
}

// The homepage's Markdown twin gets the same latest four.
export function blogMarkdownBand({ items }, origin) {
  if (!items.length) return "";
  return `## From the blog

${items.slice(0, 4).map((item) => mdLine(item, origin)).join("\n")}

All posts and videos: ${origin}/blog
`;
}

export function blogFeed({ items }, origin) {
  const rfc822 = (iso) => new Date(`${iso}T00:00:00Z`).toUTCString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Optics blog</title>
    <link>${origin}/blog</link>
    <atom:link href="${origin}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Articles, videos and posts about Optics, the open-source test automation framework.</description>
    <language>en</language>
${items
  .map(
    (item) => `    <item>
      <title>${esc(item.title)}</title>
      <link>${esc(itemUrl(item, origin))}</link>
      <guid isPermaLink="true">${esc(itemUrl(item, origin))}</guid>
      <pubDate>${rfc822(item.date)}</pubDate>
      <category>${TYPES[item.type].label}</category>
      <description>${esc(item.summary)}</description>
    </item>`,
  )
  .join("\n")}
  </channel>
</rss>
`;
}

// A hosted article: the page body, its <head> extras and its Markdown twin. The page sits
// one folder down at blog/<slug>.html, so site paths in the Markdown ("/media/...",
// "/docs/...") become "../media/..." in HTML and absolute URLs in the twin.
export function blogArticle(item, { origin, modified }) {
  const src = readFileSync(`content/blog/${item.slug}.md`, "utf8");
  const ids = new Set();
  const ctx = {
    toc: [],
    scenes: new Set(),
    inSteps: false,
    stepCount: 0,
    uniqueId(base) {
      let id = base || "section";
      for (let n = 2; ids.has(id); n++) id = `${base}-${n}`;
      ids.add(id);
      return id;
    },
    link: (url) => (url.startsWith("/") ? `..${url}` : url),
  };
  const url = itemUrl(item, origin);
  const meta = [`<time datetime="${item.date}">${longDate(item.date)}</time>`, item.author && esc(item.author), item.length && esc(item.length)].filter(Boolean);
  const body = `<article class="post">
        <p class="post-crumbs"><a href="../blog">Blog</a></p>
        <h1 class="h2">${esc(item.title)}</h1>
        <p class="lede">${esc(item.summary)}</p>
        <p class="post-meta">${meta.map((m) => `<span>${m}</span>`).join("")}</p>
        <img class="post-hero" src="../${item.image}" alt="${esc(item.alt ?? "")}" decoding="async">
        <div class="prose">
${render(src, ctx)}
        </div>
      </article>`;
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": TYPES[item.type].schema,
    headline: item.title,
    description: item.summary,
    url,
    mainEntityOfPage: url,
    datePublished: item.date,
    dateModified: modified,
    image: `${origin}/${item.image}`,
    ...(item.author && { author: { "@type": "Person", name: item.author } }),
    about: { "@id": `${origin}/#optics` },
    isPartOf: { "@type": "Blog", name: "Optics blog", url: `${origin}/blog` },
  }, null, 2);
  const head = `<link rel="stylesheet" href="../docs.css">
  <link rel="alternate" type="text/markdown" href="${item.slug}.md" title="${esc(item.title)}, as Markdown">
  <link rel="alternate" type="application/rss+xml" href="../feed.xml" title="Optics blog">
  <script type="application/ld+json">
${jsonLd}
  </script>`;
  const markdown = toPlainMarkdown(
    { title: item.title, summary: item.summary },
    `${[longDate(item.date), item.author].filter(Boolean).join(", ")}. Canonical URL: ${url}\n\n${src.replace(/\]\(\//g, `](${origin}/`).replace(/"\.\.\//g, `"${origin}/`)}`,
    (u) => origin + u,
  );
  return { body, head, markdown, description: esc(item.summary) };
}
