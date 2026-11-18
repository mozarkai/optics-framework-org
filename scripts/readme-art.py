"""Record the site's playgrounds as looping WebP images for the optics-framework README.

Usage: <checkout>/.venv/bin/python scripts/readme-art.py <checkout> [name ...]
Needs `npm run dev` on http://localhost:4173, Playwright's Chromium and img2webp.
"""

import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://localhost:4173/"
UA = "OpenAI File Downloader, XaiImageApiFetch/1.0"
HOLD_MS = 2400


def typed(page, text, at, gap=70):
    return [(at + i * gap, lambda c=c: page.keyboard.type(c)) for i, c in enumerate(text)]


def live(page):
    page.goto(BASE + "#playground")
    root = page.locator(".pg.live")
    field = root.locator(".live-in input")
    tap = lambda name: lambda: root.locator(f'[data-el="{name}"]').first.dispatch_event("click")
    steps = [(300, field.click)]
    steps += typed(page, "launch_app", 500)
    steps += [(1350, lambda: page.keyboard.press("Enter"))]
    steps += [(3700 + k * 2600, tap(name)) for k, name in enumerate(("email", "password", "signin", "card"))]
    steps += [(14200, field.click)] + typed(page, "/save checkout sign_in", 14300, 55)
    steps += [(15700, lambda: page.keyboard.press("Enter"))]
    return root, steps, 17500


def explain(page):
    page.goto(BASE + "explain")
    root = page.locator(".xp-bench")
    editor = root.locator("textarea").first
    steps = [(300, lambda: editor.click(position={"x": 40, "y": 30}))]
    steps += [(1200 + k * 1100, lambda: page.keyboard.press("ArrowDown")) for k in range(8)]
    return root, steps, 10500


def run(page):
    page.goto(BASE + "run")
    root = page.locator("[data-replay]").first
    root.locator(".rp-play").wait_for()
    return root, [(300, lambda: root.locator("[aria-pressed]").last.click())], 32000


def engine(page):
    page.goto(BASE + "playground")
    page.locator(".eng-load").click()
    page.locator('.eng-btn-main:not([disabled])').wait_for(timeout=240000)
    root = page.locator(".eng-lab")
    return root, [(400, lambda: root.locator(".eng-btn-main").click())], 14000


HERO = """<!doctype html><html data-theme="{theme}"><head><base href="{base}"><link rel="stylesheet" href="styles.css">
<style>
body {{ margin: 0; background: transparent; }}
.hero-card {{ width: 880px; height: 300px; display: grid; grid-template-columns: 196px 1fr; gap: 44px; align-items: center;
  padding: 0 56px; box-sizing: border-box; background: var(--bg); color: var(--ink); border: 1px solid var(--line); }}
[data-theme="dark"] .hero-card {{ background: radial-gradient(120% 140% at 85% 0%, #2A2F63 0%, var(--night) 58%); }}
.hero-card svg {{ width: 196px; height: 196px; }}
.hero-card .star {{ fill: var(--star); stroke: var(--star); }}
.hero-card h1 {{ font: 860 132px/.84 var(--sans); font-stretch: 75%; letter-spacing: -.01em; text-transform: uppercase; margin: 0; }}
.hero-card p {{ font: 500 15px/1.5 var(--mono); letter-spacing: .09em; text-transform: uppercase; margin: 22px 0 0; color: var(--ink-2); }}
.hero-card p b {{ font-weight: 500; }}
</style></head><body><div class="hero-card">
<svg viewBox="0 0 600 600" aria-hidden="true"><g fill="none" stroke-width="83" stroke-linecap="round"><path stroke="#9672F8" d="M216.5 49.5V172Q216.5 216.5 172 216.5H49.5"/><path stroke="#24C3AB" d="M383.5 49.5V172Q383.5 216.5 428 216.5H550.5"/><path stroke="#F3BE00" d="M550.5 383.5H428Q383.5 383.5 383.5 428V550.5"/><path stroke="#F56FA1" d="M49.5 383.5H172Q216.5 383.5 216.5 428V550.5"/></g><path class="star" stroke-width="18" stroke-linejoin="round" d="M300 232C302 280 320 298 368 300C320 302 302 320 300 368C298 320 280 302 232 300C280 298 298 280 300 232Z"/></svg>
<div><h1>Optics</h1><p>Create tests your way. Run them forever.</p>
<p><b style="color: var(--write-t)">Write</b> · <b style="color: var(--record-t)">Record</b> · <b style="color: var(--say-t)">Say</b> · <b style="color: var(--delegate-t)">Delegate</b></p></div>
</div></body></html>"""


def hero(page):
    theme = page.evaluate("matchMedia('(prefers-color-scheme: dark)').matches") and "dark" or "light"
    page.goto(BASE)
    page.set_content(HERO.format(theme=theme, base=BASE), wait_until="networkidle")
    page.evaluate("document.fonts.ready")
    return page.locator(".hero-card"), [], 0


SCENES = {"hero": (hero, 960), "live": (live, 960), "explain": (explain, 1280), "run": (run, 1280), "playground": (engine, 1280)}


def capture(page, root, steps, total):
    page.add_style_tag(content=".nav { display: none !important; }")
    root.scroll_into_view_if_needed()
    page.wait_for_timeout(400)
    frames, t0, i = [], time.monotonic(), 0
    while True:
        now = (time.monotonic() - t0) * 1000
        while i < len(steps) and steps[i][0] <= now:
            steps[i][1]()
            i += 1
        if frames and now > total:
            break
        frames.append((now, root.screenshot(animations="allow")))
    return frames


def encode(frames, out):
    kept = []
    for at, png in frames:
        if kept and kept[-1][1] == png:
            continue
        kept.append((at, png))
    with tempfile.TemporaryDirectory() as tmp:
        args = ["img2webp", "-loop", "0", "-mixed", "-q", "72", "-m", "4"]
        for k, (at, png) in enumerate(kept):
            end = kept[k + 1][0] if k + 1 < len(kept) else at + HOLD_MS
            path = Path(tmp, f"{k:04}.png")
            path.write_bytes(png)
            args += ["-d", str(max(20, round(end - at))), str(path)]
        subprocess.run(args + ["-o", str(out)], check=True, capture_output=True)
    return len(kept)


def main():
    checkout = Path(sys.argv[1])
    names = sys.argv[2:] or list(SCENES)
    out_dir = checkout / ".github" / "assets" / "readme"
    out_dir.mkdir(parents=True, exist_ok=True)
    if not shutil.which("img2webp"):
        sys.exit("img2webp is missing: install libwebp")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for theme in ("light", "dark"):
            for name in names:
                scene, width = SCENES[name]
                ctx = browser.new_context(
                    viewport={"width": width, "height": 1200},
                    device_scale_factor=2,
                    color_scheme=theme,
                    user_agent=UA,
                )
                ctx.add_init_script(f"try {{ localStorage.setItem('optics-theme', '{theme}') }} catch (e) {{}}")
                page = ctx.new_page()
                root, steps, total = scene(page)
                out = out_dir / f"{name}-{theme}.webp"
                count = encode(capture(page, root, steps, total), out)
                print(f"{out.name}: {count} frames, {out.stat().st_size // 1024} KB", flush=True)
                ctx.close()
        browser.close()


if __name__ == "__main__":
    main()
