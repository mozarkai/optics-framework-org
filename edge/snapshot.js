// The daily cron: PyPI downloads and GitHub numbers for optics-framework, upserted into D1
// so rerunning a day replaces it. GitHub keeps traffic for 14 days and its API needs a
// token with push access, so traffic is collected only when the GITHUB_TOKEN secret is set.

const REPO = "mozarkai/optics-framework";
const UA = "optics-framework.org analytics";
const CLICKHOUSE = "https://sql-clickhouse.clickhouse.com/?user=demo";
const UPSERT_PYPI =
  "INSERT INTO pypi (day, version, installer, type, country, downloads) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (day, version, installer, type, country) DO UPDATE SET downloads = excluded.downloads";
const UPSERT_GITHUB = "INSERT INTO github (day, metric, dim, value) VALUES (?, ?, ?, ?) ON CONFLICT (day, metric, dim) DO UPDATE SET value = excluded.value";

const PYPI_SQL = `SELECT toString(date), version, installer, type, country_code, sum(count)
FROM pypi.pypi_downloads_per_day_by_version_by_installer_by_type_by_country
WHERE project = 'optics-framework' AND date >= today() - 7
GROUP BY ALL FORMAT JSONCompact`;

async function json(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

export async function pypiRows() {
  const { data } = await json(CLICKHOUSE, { method: "POST", body: PYPI_SQL, headers: { "user-agent": UA } });
  return data.map(([day, version, installer, type, country, downloads]) => [day, version, installer || "unknown", type, country || "", Number(downloads)]);
}

export async function githubRows(token, today) {
  const get = (path) => json(`https://api.github.com/repos/${REPO}${path}`, {
    headers: { "user-agent": UA, accept: "application/vnd.github+json", ...(token && { authorization: `Bearer ${token}` }) },
  });
  const [repo, releases] = await Promise.all([get(""), get("/releases?per_page=30")]);
  const rows = [
    [today, "stars", "", repo.stargazers_count],
    [today, "forks", "", repo.forks_count],
    [today, "watchers", "", repo.subscribers_count],
    [today, "open_issues", "", repo.open_issues_count],
    ...releases.flatMap((r) => r.assets.map((a) => [today, "release_downloads", `${r.tag_name}/${a.name}`, a.download_count])),
  ];
  if (!token) return rows;
  const [views, clones, referrers, paths] = await Promise.all([get("/traffic/views"), get("/traffic/clones"), get("/traffic/popular/referrers"), get("/traffic/popular/paths")]);
  const daily = (series, metric) => series.flatMap((d) => [[d.timestamp.slice(0, 10), metric, "", d.count], [d.timestamp.slice(0, 10), `${metric}_unique`, "", d.uniques]]);
  return rows.concat(
    daily(views.views, "views"),
    daily(clones.clones, "clones"),
    referrers.map((r) => [today, "referrer_views_14d", r.referrer, r.count]),
    paths.map((p) => [today, "path_views_14d", p.path, p.count]),
  );
}

// One source failing leaves the other's rows in place.
export async function snapshot(env, now = Date.now()) {
  const today = new Date(now).toISOString().slice(0, 10);
  const write = (sql, rows) => rows.length && env.DB.batch(rows.map((row) => env.DB.prepare(sql).bind(...row)));
  return Promise.allSettled([
    pypiRows().then((rows) => write(UPSERT_PYPI, rows)),
    githubRows(env.GITHUB_TOKEN, today).then((rows) => write(UPSERT_GITHUB, rows)),
  ]);
}
