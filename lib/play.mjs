export const PLAY_TABS = [
  { path: "playground", label: "Browser" },
  { path: "popups", label: "Popups" },
  { path: "run", label: "Real run" },
  { path: "ship", label: "Ship a release" },
  { path: "hard-targets", label: "Hard targets" },
  { path: "explain", label: "Explain a suite" },
];

export const playUrl = (path) => (path === "playground" ? "playground" : `playground/${path}`);

export function playTabs(current) {
  if (!PLAY_TABS.some((t) => t.path === current)) throw new Error(`no playground tab named ${current}`);
  const href = (path) => (current === "playground" ? playUrl(path) : path === "playground" ? "../playground" : path);
  const links = PLAY_TABS.map((t) => `<a href="${href(t.path)}"${t.path === current ? ' aria-current="page"' : ""}>${t.label}</a>`);
  return `<nav class="play-tabs" aria-label="Playground">${links.join("")}</nav>\n`;
}

// A page one folder down: its own relative URLs climb back to the site root.
export function nested(html) {
  return html.replace(/(\s(?:href|src|poster)=")(?!#|[a-z][\w+.-]*:|\/|\.\.\/|\{\{)([^"]*")/g, "$1../$2");
}
