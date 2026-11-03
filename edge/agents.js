// Who sent a request, read from its User-Agent: an AI agent fetching for a person, an AI
// crawler, a search engine, a script (curl, PowerShell, an HTTP library), another bot or a
// browser.

// AI crawlers and agents, matched as case-insensitive substrings of the User-Agent.
const AI_BOTS = [
  "GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Anthropic-ai", "Claude-Web", "Claude-SearchBot",
  "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "cohere-ai",
  "CCBot", "Bytespider", "DeepSeekBot", "Amazonbot", "YouBot", "Diffbot", "ImagesiftBot", "Omgilibot",
  "DuckAssistBot", "meta-externalagent", "meta-externalfetcher", "MistralAI-User",
];
// These fetch a page because a person asked an assistant about it just now.
const AI_USERS = new Set(["ChatGPT-User", "Claude-User", "Perplexity-User", "DuckAssistBot", "meta-externalfetcher", "MistralAI-User"]);
const SEARCH = /Googlebot|Google-InspectionTool|GoogleOther|bingbot|Applebot|DuckDuckBot|YandexBot|Baiduspider|SeznamBot|Qwantbot|Yeti/i;
const SCRIPT = /(?:Windows)?PowerShell\/[\d.]+|^(?:curl|Wget|python-requests|python-urllib|python-httpx|aiohttp|Go-http-client|node-fetch|undici|axios|okhttp|Java|libwww-perl|HTTPie)\b[^\s]*/i;
const BOT = /bot|crawl|spider|slurp|scan|fetch|download|headless|preview|monitor|uptime|lighthouse|archive|saashub/i;
// A User-Agent cut off after the engine is a scraper's, never a browser's.
const TRUNCATED = /^Mozilla\/5\.0 \([^)]*\) AppleWebKit\/537\.36$/;
const BROWSERS = [["Edge", /Edg\/(\d+)/], ["Firefox", /Firefox\/(\d+)/], ["Chrome", /Chrome\/(\d+)/], ["Safari", /Version\/(\d+)[\d.]* (?:Mobile\/\S+ )?Safari/]];
const SYSTEMS = [["iOS", /iPhone|iPad/], ["Android", /Android/], ["Windows", /Windows/], ["macOS", /Mac OS X/], ["ChromeOS", /CrOS/], ["Linux", /Linux/]];

export const aiBot = (ua) => AI_BOTS.find((bot) => (ua ?? "").toLowerCase().includes(bot.toLowerCase())) ?? null;
export const isAiBot = (ua) => aiBot(ua) !== null;

// "Chrome 156/macOS": the major version stays so a report can tell an outdated build,
// which scrapers copy, from one a person keeps up to date.
function browser(ua) {
  const [family, version] = BROWSERS.map(([name, re]) => [name, ua.match(re)?.[1]]).find(([, v]) => v) ?? ["other", ""];
  const system = SYSTEMS.find(([, re]) => re.test(ua))?.[0] ?? "other";
  return `${family}${version ? ` ${version}` : ""}/${system}`;
}

const botName = (ua) => ua.match(/[\w.-]*(?:bot|crawler|spider)[\w.-]*/i)?.[0] ?? (ua.split(/[\s/;(]/)[0] || "unknown");
const matched = (client, re) => (ua) => {
  const found = ua.match(re);
  return found && { client, agent: found[0].slice(0, 60) };
};

// Checked in order; the first that recognises the User-Agent decides.
const RULES = [
  (ua) => {
    const ai = aiBot(ua);
    return ai && { client: AI_USERS.has(ai) ? "ai-user" : "ai-crawler", agent: ai };
  },
  matched("search", SEARCH),
  matched("script", SCRIPT),
  (ua) => !ua && { client: "bot", agent: "empty" },
  (ua) => (BOT.test(ua) || TRUNCATED.test(ua)) && { client: "bot", agent: botName(ua).slice(0, 60) },
  (ua, verified) => verified && { client: "bot", agent: verified },
];

// `verified` is Cloudflare's verified-bot category for the request, when it has one.
export function classify(ua, verified) {
  const text = (ua ?? "").trim();
  for (const rule of RULES) {
    const found = rule(text, verified);
    if (found) return found;
  }
  return { client: "browser", agent: browser(text) };
}
