export const PLAY_TABS = [
  { path: "playground", label: "Browser" },
  { path: "run", label: "Real run" },
  { path: "releases", label: "Releases" },
  { path: "hard-targets", label: "Hard targets" },
  { path: "explain", label: "Explain a suite" },
];

export function playTabs(current) {
  if (!PLAY_TABS.some((t) => t.path === current)) throw new Error(`no playground tab named ${current}`);
  const links = PLAY_TABS.map((t) => `<a href="${t.path}"${t.path === current ? ' aria-current="page"' : ""}>${t.label}</a>`);
  return `<nav class="play-tabs" aria-label="Playground">${links.join("")}</nav>\n`;
}
