# optics-framework.org

Static landing page for Optics. No framework, no dependencies.

- `site/` is the page: `index.html`, `styles.css`, `app.js`, `logo.svg`, `fonts/`, `media/`.
- `public/install.sh` and `public/install.ps1` are the installers served at `/install`, `/install.sh` and `/install.ps1`. Their CI lives in `.github/workflows/test-installer.yml`.
- `npm run build` copies both into `out/`; `.github/workflows/deploy.yml` publishes `out/` to GitHub Pages (`main` → `/`, any other branch → `/<branch>/`). The build also fingerprints `styles.css` and `app.js` in `index.html` (`?v=<content hash>`), so link them from `site/index.html` without a query string.
- Keep every URL in `site/` relative so branch previews work.
- Themes: tokens live under `[data-theme="light"]` and `[data-theme="dark"]` in `styles.css`; the inline script in `<head>` picks one before first paint.
- Local preview: `npm run dev` then open http://localhost:4173.
