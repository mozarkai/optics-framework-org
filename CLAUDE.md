# optics-framework.org

Static landing page and documentation for Optics. No framework, no dependencies.

- `site/` is the page: `index.html`, `styles.css`, `app.js`, `logo.svg`, `fonts/`, `media/`, plus the machine-readable files copied as-is: `index.md` (the homepage as Markdown), `404.md`, `llms.txt`, `robots.txt` and `openapi.json`. Keep `index.md` and `llms.txt` in step with `index.html` when the copy changes.
- `site/openapi.json` is the `optics serve` API, generated rather than hand-written. After an optics-framework release, check out its tag and run `<checkout>/.venv/bin/python scripts/openapi.py <checkout>` to refresh it. The script adds the local `servers` entry and the description saying the API is not hosted here.
- `pages/` holds the text pages (`about`, `contact`, `privacy`, `404`) as body fragments; `build.mjs` wraps each in `pages/_layout.html` and writes `out/<name>.html`, which GitHub Pages serves at `/<name>`. Add a page by adding its fragment and an entry to `PAGES` in `build.mjs`; it lands in `sitemap.xml` automatically, with `lastmod` taken from the fragment's last commit.
- `site/.well-known/` holds the agent discovery files: `api-catalog` (RFC 9727), `ai-catalog.json`, `mcp/server-card.json` (the worker gives all three their media types) and one `agent-skills/<name>/SKILL.md` per skill, copied unchanged from `plugins/<plugin>/skills/<name>/SKILL.md` in github.com/mozarkai/optics-agent-plugins. The build writes `agent-skills/index.json` with each file's digest. Bump the server card's `version` with each optics-framework release, alongside `openapi.json`.
- `public/install.sh` and `public/install.ps1` are the installers served at `/install`, `/install.sh` and `/install.ps1`. Their CI lives in `.github/workflows/test-installer.yml`.
- `npm run build` copies both into `out/` and builds the docs (see below); `.github/workflows/deploy.yml` runs `npm test`, then publishes `out/` to GitHub Pages (`main` → `/`, any other branch → `/<branch>/`). The build also fingerprints `styles.css`, `app.js` and every `media/` file linked from each page (`?v=<content hash>`), including `docs.css`, `docs.js`, `scenes.js` and `scene-defs.js` on docs pages, so link them without a query string.
- Keep every URL in `site/` and `pages/` relative so branch previews work. The one exception is `404.html`: Pages serves it for a missing path at any depth, so its assets use `{{root}}`, the deploy's base path.
- Themes: tokens live under `[data-theme="light"]` and `[data-theme="dark"]` in `styles.css`; the inline script in `<head>` picks one before first paint.
- Local preview: `npm run dev` then open http://localhost:4173. It serves `out/` the way Pages does (`/about` → `about.html`, missing paths → `404.html`) through the edge worker, so `curl -H 'Accept: text/markdown' http://localhost:4173/` shows what agents get.
- Tests: `npm test` (builds, then `node --test`).

## Blog (`content/blog.json`)

`/blog` lists articles, videos and posts published elsewhere (Medium, YouTube, LinkedIn, X, Instagram), from any author; nothing is hosted here and every card links to the original. `lib/blog.mjs` turns `content/blog.json` into `out/blog.html`, its Markdown twin `out/blog.md`, the RSS feed `out/feed.xml`, and the "From the blog" band on the homepage (filled in at the `<!-- blog:latest -->` marker in `site/index.html` and `site/index.md`; the band disappears when there are no items).

- Add an item to `items` (any order; the build sorts by date): `type` (`article`, `video` or `post`), `platform` (`medium`, `youtube`, `linkedin`, `x`, `instagram`, `github`; a new platform needs a mark in `PLATFORMS`), `title`, `summary`, `url`, `date` (YYYY-MM-DD), and optionally `author` and `length` ("5 min read", or "9:42" for a video). Articles and videos need an `image`. Items can be from any account; there are no per-account channels, and `author` records who wrote it.
- Save thumbnails to `site/media/blog/` as WebP, about 1280 px wide (`cwebp -q 82`), and never hot-link them: the privacy page promises the site loads nothing from other servers, and a test enforces it. For a YouTube video, download `https://i.ytimg.com/vi/<id>/maxresdefault.jpg` once and convert it. Videos link out to YouTube; there are no embedded players for the same reason. Posts on LinkedIn, X or Instagram need no image; their summary is shown as a quote.
- The newest item is the wide lead card. Type filters appear on `/blog` once there is more than one type, and `/blog?type=video` opens on a filter. Discovery beyond the feed is via RSS (`/feed.xml`).

## Documentation (`docs/`)

The docs live at `/docs/` and are built from Markdown by `lib/docs.mjs` and `lib/markdown.mjs`, a small renderer written for this site.

- `docs/nav.json` is the table of contents: sections (the tabs across the top) with groups of page ids. A page id is its path under `docs/` without `.md`; `x/index` is the landing page of section `x`. Add a page by writing its `.md` file and listing its id here; it lands in the sidebar, pager, search, `sitemap.xml`, `docs/llms.txt` and the tests automatically.
- Each page starts with front matter: `title`, `summary` (the one-sentence subtitle), and optionally `nav` (shorter sidebar label), `level` (Beginner, Intermediate, Advanced), `time` and `layout: wide`.
- Beyond plain Markdown, pages use directives: `:::note` / `:::tip` / `:::warning` / `:::mistake` / `:::important` callouts, `:::steps` (each `###` is a numbered step), `:::tabs{group="os"}` with `::tab[Label]` lines (synced and remembered per group), `:::cards{cols="2"}` link cards, `:::details[Summary]`, `- [ ]` checklists and `::scene{name="…" caption="…"}` animated figures. See the comment at the top of `lib/markdown.mjs`.
- Link other docs pages as `/docs/section/page` (or `/docs/section/` for a landing page); the build rewrites them to relative URLs and fails on a link to a page that does not exist. Tests also check every link and `#anchor`.
- Every page is also written as `out/docs/<id>.md`, a plain-Markdown twin for agents, and `docs/_layout.html` wraps the HTML.
- `site/docs.css` and `site/docs.js` style the docs and run the sidebar drawer, tabs, copy buttons, "On this page" and search (`out/docs/search.json`). `site/scenes.js` is the animation engine (a timeline, a Birch shop phone, terminals, files and wires), and `site/scene-defs.js` holds the scenes themselves. Scenes play only while visible, loop, pause on request and show their final frame when the visitor prefers reduced motion.
- Write in the voice of the existing pages: second person, short sentences, verb-led task titles, no internals. The docs describe Optics as released; flag version-specific bugs with a `:::mistake` callout that says what to do until the fix ships.

## Markdown for agents (`edge/`)

GitHub Pages cannot vary a response on the `Accept` header, so `edge/worker.js` is a Cloudflare Worker meant to sit in front of it on `optics-framework.org/*`. A request preferring `text/markdown` gets the page's `.md` twin (`/` → `/index.md`), or `/404.md` with a 404 for a missing page; a request preferring JSON gets a missing page as an RFC 9457 `application/problem+json` document. Both carry `Vary: Accept`; everything else passes through, with `Vary: Accept` and the discovery `Link` header added to HTML. It only takes effect once the domain is proxied through Cloudflare and the worker is deployed (`npx wrangler deploy` from `edge/`). Until then, agents can still fetch `/index.md` and `/llms.txt` directly.
