const IGNORED = new Set(["md", "html", "index"]);

const words = (path) => path.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !IGNORED.has(w));

function sharedPrefix(a, b) {
  let n = 0;
  while (n < a.length && a[n] === b[n]) n++;
  return n;
}

// "verify" finds "verification" and "test" finds "tests"; words under four letters match exactly.
const alike = (a, b) => a === b || sharedPrefix(a, b) >= Math.max(4, Math.min(a.length, b.length) - 2);

// The pages that share the most words with a missing path. A word that a quarter of
// the pages share, such as "docs", tells them apart from nothing, so it does not count.
export function closest(pathname, pages, limit = 5) {
  const indexed = pages.map((page) => [page, words(page)]);
  const scores = new Map();
  for (const word of new Set(words(pathname))) {
    const hits = indexed.filter(([, own]) => own.some((w) => alike(w, word)));
    if (hits.length > pages.length / 4) continue;
    for (const [page] of hits) scores.set(page, (scores.get(page) ?? 0) + 1);
  }
  return [...scores]
    .sort(([a, x], [b, y]) => y - x || a.length - b.length)
    .slice(0, limit)
    .map(([page]) => page);
}

export const sitemapPaths = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => new URL(loc).pathname);
