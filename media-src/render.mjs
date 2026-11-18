// Renders each shot in media.html to site/media/<data-out>: stills at 2x, then downsized;
// animations frame by frame on a virtual clock, then packed into an animated WebP.
// Needs Playwright and Google Chrome: npm i --no-save --no-package-lock playwright
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const media = join(here, "..", "site", "media");
const page0 = pathToFileURL(join(here, "media.html")).href;
const FPS = 20;
// Each video: where its segments start. Segment frames come from video/<name>-<i>.png; every
// segment but the last shows the recorded panel bodies from recordings/<name>.mp4.
const VIDEOS = { "agent-session": { cuts: [21.07, 27.57], poster: 10 }, "replay-runs": { cuts: [4.47, 8.33, 13.57], poster: 12 } };
const LEFT = [48, 142, 512, 526];
const RIGHT = [591, 142, 642, 526];
const tmp = mkdtempSync(join(tmpdir(), "optics-media-"));
const browser = await chromium.launch({ channel: "chrome" });

async function open(key, scale) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: scale });
  await page.goto(`${page0}?only=${key}`);
  await page.waitForFunction(() => window.SHOTS_READY);
  await page.evaluate(() => document.fonts.ready);
  return page;
}

const list = await open("", 1);
const keys = process.argv.slice(2).length ? process.argv.slice(2) : await list.evaluate(() => window.SHOT_KEYS);
await list.close();

for (const key of keys) {
  const probe = await open(key, 1);
  const isAnim = await probe.evaluate(() => !!document.querySelector(".shot[data-anim]"));
  await probe.close();
  const page = await open(key, isAnim ? 1 : 2);
  const shot = page.locator(".shot");
  const { out, w, h } = await shot.evaluate((e) => ({ out: e.dataset.out, w: e.offsetWidth, h: e.offsetHeight }));
  const dest = join(media, out);
  if (out.endsWith(".png")) {
    const png = join(tmp, key + ".png");
    await shot.screenshot({ path: png });
    mkdirSync(join(tmp, "video"), { recursive: true });
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", png, "-vf", `scale=${w}:${h}:flags=lanczos`, join(tmp, out)]);
  } else if (out.endsWith(".jpg")) {
    const png = join(tmp, key + ".png");
    await shot.screenshot({ path: png });
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", png, "-vf", `scale=${w}:${h}:flags=lanczos`, "-q:v", "2", dest]);
  } else if (!isAnim) {
    const png = join(tmp, key + ".png");
    await shot.screenshot({ path: png });
    execFileSync("cwebp", ["-quiet", "-q", "82", "-resize", String(w), String(h), png, "-o", dest]);
  } else {
    const dir = join(tmp, key);
    mkdirSync(dir);
    const dur = await page.evaluate(() => window.__duration());
    const frames = [];
    for (let i = 0, t = 0; t <= dur; i++, t = (i * 1000) / FPS) {
      await page.evaluate((t) => window.__frame(t), t);
      const png = join(dir, String(i).padStart(4, "0") + ".png");
      await shot.screenshot({ path: png });
      frames.push(png);
    }
    execFileSync("img2webp", ["-loop", "0", "-mixed", "-q", "75", "-m", "4", "-d", String(1000 / FPS), ...frames, "-o", dest]);
  }
  await page.close();
  console.log(out, `${w}x${h}`);
}
await browser.close();

for (const [name, { cuts, poster }] of Object.entries(VIDEOS)) {
  const frames = [...cuts.keys(), cuts.length].map((i) => join(tmp, "video", `${name}-${i}.png`));
  if (!frames.every(existsSync)) continue;
  const src = join(here, "recordings", `${name}.mp4`);
  const total = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src]).toString());
  const edges = [0, ...cuts, total];
  const inputs = frames.flatMap((f, i) => ["-loop", "1", "-framerate", "30", "-t", String(edges[i + 1] - edges[i]), "-i", f]);
  const live = `lt(t\\,${cuts.at(-1)})`;
  const crop = (r) => `crop=${r[2]}:${r[3]}:${r[0]}:${r[1]}`;
  const graph = [
    frames.map((_, i) => `[${i + 1}:v]`).join("") + `concat=n=${frames.length}:v=1:a=0,format=yuv420p[bg]`,
    `[0:v]${crop(LEFT)}[l]`, `[0:v]${crop(RIGHT)}[r]`,
    `[bg][l]overlay=${LEFT[0]}:${LEFT[1]}:enable='${live}'[a]`, `[a][r]overlay=${RIGHT[0]}:${RIGHT[1]}:enable='${live}',format=yuv420p[v]`,
  ].join(";");
  const mp4 = join(media, "blog", `${name}.mp4`);
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", src, ...inputs, "-filter_complex", graph, "-map", "[v]", "-an", "-r", "30", "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-movflags", "+faststart", "-t", String(total), mp4]);
  const still = join(tmp, `${name}-poster.png`);
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-ss", String(poster), "-i", mp4, "-frames:v", "1", still]);
  execFileSync("cwebp", ["-quiet", "-q", "82", still, "-o", join(media, "blog", `${name}-poster.webp`)]);
  console.log(`blog/${name}.mp4`, "and poster");
}
