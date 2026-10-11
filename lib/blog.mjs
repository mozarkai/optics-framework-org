// The blog: a list of articles, videos and posts that live on other sites (Medium,
// YouTube, LinkedIn, X). Nothing is hosted here. content/blog.json is the only source;
// this turns it into the /blog page body, the homepage band, an RSS feed and a Markdown
// twin. Thumbnails are files under site/media/blog/, never hot-linked, because the site
// promises to load nothing from third-party servers.
import { existsSync, readFileSync } from "node:fs";

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
  github: { name: "GitHub", path: "M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .32.21.7.82.58A12 12 0 0 0 12 .3" },
};

const ARROW = `<svg class="arr" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8.5 7H17v8.5"/></svg>`;
const PLAY = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>`;
const RSS = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5a14.5 14.5 0 0 1 14.5 14.5M5 10.5a8.5 8.5 0 0 1 8.5 8.5"/><circle cx="6" cy="18" r="1.6"/></svg>`;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const mark = (platform, cls = "pf") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${PLATFORMS[platform].path}"/></svg>`;
const longDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// Read and check content/blog.json. A bad entry fails the build with the reason.
export function loadBlog(file = "content/blog.json") {
  const data = JSON.parse(readFileSync(file, "utf8"));
  const fail = (i, why) => { throw new Error(`${file}: item ${i + 1}: ${why}`); };
  data.items.forEach((item, i) => {
    if (!TYPES[item.type]) fail(i, `type must be one of ${Object.keys(TYPES).join(", ")}`);
    if (!PLATFORMS[item.platform]) fail(i, `platform must be one of ${Object.keys(PLATFORMS).join(", ")} (add a mark to lib/blog.mjs for a new one)`);
    for (const key of ["title", "summary", "url", "date"]) if (!item[key]) fail(i, `${key} is missing`);
    if (!/^https:\/\//.test(item.url)) fail(i, "url must start with https://");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) fail(i, "date must be YYYY-MM-DD");
    if (item.type !== "post" && !item.image) fail(i, `a ${item.type} needs an image`);
    if (item.image && !/^media\/blog\/[\w.-]+$/.test(item.image)) fail(i, "image must be a file in site/media/blog/");
    if (item.image && !existsSync(`site/${item.image}`)) fail(i, `site/${item.image} does not exist`);
  });
  data.channels.forEach((c) => {
    if (!PLATFORMS[c.platform]) throw new Error(`${file}: channel ${c.label}: unknown platform ${c.platform}`);
  });
  data.items.sort((a, b) => b.date.localeCompare(a.date));
  return data;
}

// One item. `root` prefixes the thumbnail path; `level` is the title's heading level.
function entry(item, { lead = false, level = 3, root = "" }) {
  const type = TYPES[item.type];
  const where = PLATFORMS[item.platform].name;
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
    <h${level} class="entry-title"><a href="${esc(item.url)}">${esc(item.title)}</a></h${level}>
    ${item.image ? `<p class="entry-summary">${esc(item.summary)}</p>` : ""}
    <p class="entry-cta">${mark(item.platform)}${type.verb} on ${where}${ARROW}</p>
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

function channels(list) {
  return `<ul class="channels" role="list">
${list
  .map((c) => {
    const inner = `${mark(c.platform, "pf-lg")}<span><b>${esc(c.label)}</b><small>${esc(c.note)}</small></span>`;
    return c.url
      ? `  <li><a class="channel" href="${esc(c.url)}">${inner}${ARROW}</a></li>`
      : `  <li><span class="channel channel-soon">${inner}</span></li>`;
  })
  .join("\n")}
</ul>`;
}

export function blogPage({ items, channels: chans }) {
  return `<header class="blog-head">
        <h1 class="h2">Blog</h1>
        <p class="lede">Articles, videos and posts about Optics. Each one opens on the site where it was published.</p>
        <p class="blog-rss"><a href="feed.xml">${RSS}RSS feed</a></p>
      </header>
      <div class="blog-feed">
      ${filters(items)}
      ${items.length ? entries(items, { level: 2, root: "" }) : `<p class="body-text">The first post is on its way.</p>`}
      <p class="blog-status" role="status"></p>
      </div>
      <section class="follow" aria-labelledby="follow-h">
        <h2 class="h3" id="follow-h">Follow along</h2>
        <p class="body-text">New articles, videos and release notes, wherever you read.</p>
        ${channels(chans)}
      </section>`;
}

// The homepage band: the lead plus a row of three, or nothing when there is nothing yet.
export function blogBand({ items }) {
  if (!items.length) return "";
  return `<section class="band blog-band" id="blog" aria-labelledby="blog-h">
      <div class="wrap">
        <div class="head-row">
          <h2 class="h2" id="blog-h">From the blog</h2>
          <p class="head-note">Articles and videos about Optics, from first steps to the details of how it works.</p>
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
          url: item.url,
          [item.type === "video" ? "uploadDate" : "datePublished"]: item.date,
          ...(item.image && { [item.type === "video" ? "thumbnailUrl" : "image"]: `${origin}/${item.image}` }),
          ...(item.author && { author: { "@type": "Person", name: item.author } }),
        },
      })),
    },
  }, null, 2);
}

const mdLine = (item) =>
  `- [${item.title}](${item.url}): ${TYPES[item.type].label.toLowerCase()} on ${PLATFORMS[item.platform].name}, ${longDate(item.date)}${item.author ? `, by ${item.author}` : ""}. ${item.summary}`;

export function blogMarkdown({ items, channels: chans }, origin) {
  const follow = chans.filter((c) => c.url).map((c) => `- [${c.label}](${c.url}): ${c.note}`);
  return `# Optics blog

Articles, videos and posts about Optics. None are hosted on optics-framework.org; each link opens the original. RSS: ${origin}/feed.xml

${items.map(mdLine).join("\n")}

## Follow along

${follow.join("\n")}
`;
}

// The homepage's Markdown twin gets the same latest four.
export function blogMarkdownBand({ items }, origin) {
  if (!items.length) return "";
  return `## From the blog

${items.slice(0, 4).map(mdLine).join("\n")}

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
      <link>${esc(item.url)}</link>
      <guid isPermaLink="true">${esc(item.url)}</guid>
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
