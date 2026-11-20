// /releases: every published release from content/proof.json, grouped by minor version.
import { SOURCES, date, esc, releaseLead, time } from "./proof.mjs";

const minor = (tag) => tag.split(".").slice(0, 2).join(".");
const fixes = (n) => `${n} ${n === 1 ? "fix" : "fixes"}`;

function notes(r) {
  const items = r.added.map((c) => `<li>${c.scope ? `<span class="rel-scope">${esc(c.scope)}</span>` : ""}<a href="${esc(c.pr)}">${esc(c.text)}</a></li>`);
  if (r.fixes) items.push(`<li class="rel-more">${fixes(r.fixes)}</li>`);
  return items.length ? `<ul class="rel-added">${items.join("")}</ul>` : "";
}

function row(r) {
  return `<li class="rl-row">
          <a class="rel-tag" href="${esc(r.url)}">${esc(r.tag)}</a>
          <span class="label">${time(r.date)}</span>
          ${notes(r)}
        </li>`;
}

function groups(releases) {
  const byMinor = new Map();
  for (const r of releases) byMinor.set(minor(r.tag), [...(byMinor.get(minor(r.tag)) ?? []), r]);
  return [...byMinor].map(([m, list]) => `<section class="rl-group" aria-labelledby="rl-${m}">
      <h2 class="rl-minor label" id="rl-${m}">${m}</h2>
      <ol class="rl-list">
        ${list.map(row).join("\n        ")}
      </ol>
    </section>`);
}

export function releasesBody({ github }, headlines, origin) {
  const [latest, ...rest] = github.releases;
  const link = headlines[latest.tag]?.url?.replace(`${origin}/`, "");
  const lead = esc(releaseLead(latest, headlines));
  return `<h1>Releases</h1>
      <p class="lede">What each Optics release added, newest first.</p>
      <article class="rl-latest" aria-label="Latest release">
        <div>
          <a class="rel-tag" href="${esc(latest.url)}">${esc(latest.tag)}</a>
          <p class="label">Latest, ${time(latest.date)}</p>
        </div>
        <div class="rl-body">
          <p class="rl-lead">${link ? `<a href="${esc(link)}">${lead}</a>` : lead}</p>
          ${notes(latest)}
        </div>
      </article>
      ${groups(rest).join("\n      ")}
      <p class="rl-src label"><a href="${SOURCES.releases}">GitHub releases</a> read ${time(github.retrieved)}</p>`;
}

export function releasesMarkdown({ github }, headlines) {
  const entry = (r) => {
    const added = r.added.map((c) => `  - ${c.scope ? `${c.scope}: ` : ""}${c.text} (${c.pr})`);
    const tail = [headlines[r.tag]?.headline, r.fixes ? `${fixes(r.fixes)}.` : ""].filter(Boolean).join(" ");
    return [`- [${r.tag}](${r.url}), ${date(r.date)}.${tail ? ` ${tail}` : ""}`, ...added].join("\n");
  };
  return `# Releases

What each Optics release added, newest first. Source: ${SOURCES.releases}, read ${date(github.retrieved)}.

${github.releases.map(entry).join("\n")}
`;
}
