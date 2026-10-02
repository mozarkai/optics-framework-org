# optics-framework.org

Static landing page for Optics. No framework, no dependencies.

- `site/` is the page: `index.html`, `styles.css`, `app.js`, `logo.svg`, `fonts/`, `media/`, plus the machine-readable files copied as-is: `index.md` (the homepage as Markdown), `404.md`, `llms.txt`, `robots.txt` and `openapi.json`. Keep `index.md` and `llms.txt` in step with `index.html` when the copy changes.
- `site/openapi.json` is the `optics serve` API, generated rather than hand-written. After an optics-framework release, check out its tag and run `<checkout>/.venv/bin/python scripts/openapi.py <checkout>` to refresh it. The script adds the local `servers` entry and the description saying the API is not hosted here.
- `pages/` holds the text pages (`about`, `contact`, `privacy`, `404`) as body fragments; `build.mjs` wraps each in `pages/_layout.html` and writes `out/<name>.html`, which GitHub Pages serves at `/<name>`. Add a page by adding its fragment and an entry to `PAGES` in `build.mjs`; it lands in `sitemap.xml` automatically, with `lastmod` taken from the fragment's last commit.
- `public/install.sh` and `public/install.ps1` are the installers served at `/install`, `/install.sh` and `/install.ps1`. Their CI lives in `.github/workflows/test-installer.yml`.
- `npm run build` copies both into `out/`; `.github/workflows/deploy.yml` runs `npm test`, then publishes `out/` to GitHub Pages (`main` → `/`, any other branch → `/<branch>/`). The build also fingerprints `styles.css`, `app.js` and every `media/` file linked from each page (`?v=<content hash>`), so link them without a query string.
- Keep every URL in `site/` and `pages/` relative so branch previews work. The one exception is `404.html`: Pages serves it for a missing path at any depth, so its assets use `{{root}}`, the deploy's base path.
- Themes: tokens live under `[data-theme="light"]` and `[data-theme="dark"]` in `styles.css`; the inline script in `<head>` picks one before first paint.
- Local preview: `npm run dev` then open http://localhost:4173. It serves `out/` the way Pages does (`/about` → `about.html`, missing paths → `404.html`) through the edge worker, so `curl -H 'Accept: text/markdown' http://localhost:4173/` shows what agents get.
- Tests: `npm test` (builds, then `node --test`).

## Markdown for agents (`edge/`)

GitHub Pages cannot vary a response on the `Accept` header, so `edge/worker.js` is a Cloudflare Worker meant to sit in front of it on `optics-framework.org/*`. A request preferring `text/markdown` gets the page's `.md` twin (`/` → `/index.md`), or `/404.md` with a 404 for a missing page; a request preferring JSON gets a missing page as an RFC 9457 `application/problem+json` document. Both carry `Vary: Accept`; everything else passes through, with `Vary: Accept` added to HTML. It only takes effect once the domain is proxied through Cloudflare and the worker is deployed (`npx wrangler deploy` from `edge/`). Until then, agents can still fetch `/index.md` and `/llms.txt` directly.
