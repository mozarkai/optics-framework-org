// The footer every page shares. root is the path back to the site root; home is the homepage,
// or "" on the homepage itself.
import { esc, time } from "./proof.mjs";

const REPO = "https://github.com/mozarkai/optics-framework";

const columns = (root, home) => [
  ["Product", [["Install", `${home}#install`], ["Playground", `${root}playground`], ["Releases", `${root}releases`], ["Birch demo app", `${root}birch/`]]],
  ["Docs", [["Get started", `${root}docs/get-started/`], ["Guides", `${root}docs/guides/`], ["Keyword reference", `${root}docs/reference/keywords/`], ["Contribute", `${root}docs/contribute/`]]],
  ["Project", [["GitHub", REPO], ["PyPI", "https://pypi.org/project/optics-framework/"], ["Report an issue", `${REPO}/issues`], ["Blog", `${root}blog`], ["RSS feed", `${root}feed.xml`]]],
  ["For agents", [["llms.txt", `${root}llms.txt`], ["Agent setup", `${root}agents.md`], ["MCP server card", `${root}.well-known/mcp/server-card.json`], ["OpenAPI", `${root}openapi.json`]]],
];

export function siteFooter({ root, home, latest, night = false }) {
  const cols = columns(root, home).map(([title, links]) => `<nav class="foot-col" aria-label="${title}">
          <h2 class="label">${title}</h2>
          <ul>${links.map(([text, href]) => `<li><a href="${href}">${text}</a></li>`).join("")}</ul>
        </nav>`);
  return `<footer class="foot" data-hour="9">${night ? `
    <div class="wrap foot-night">
      <p class="foot-line" aria-hidden="true">Run it <span>forever.</span></p>
    </div>` : ""}
    <div class="wrap">
      <div class="foot-cols">
        <div class="foot-lead">
          <a class="brand" href="${home || "#top"}" aria-label="${home ? "Optics home" : "Back to top"}">
            <svg class="mark" viewBox="0 0 600 600" aria-hidden="true"><use href="#logo"/></svg>
            <span>Optics</span>
          </a>
          <a class="foot-rel" href="${root}releases"><b>${esc(latest.tag)}</b><span class="label">Latest, ${time(latest.date)}</span></a>
        </div>
        ${cols.join("\n        ")}
      </div>
      <div class="foot-base label">
        <p>Open source under the Apache 2.0 licence</p>
        <p class="foot-trust"><a href="${root}about">About</a><a href="${root}contact">Contact</a><a href="${root}privacy">Privacy</a></p>
      </div>
    </div>
  </footer>`;
}
