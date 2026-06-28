const MAX_PAGES = parseInt(process.env.BULLE_CRAWL_MAX_PAGES ?? "30", 10);
const FETCH_TIMEOUT = parseInt(process.env.BULLE_CRAWL_TIMEOUT_MS ?? "8000", 10);
const USER_AGENT = "BulleBot/1.0 (+https://bulle-chatbot.vercel.app)";

export interface FetchedPage {
  url: string;
  html: string;
}

export async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;

    return await response.text();
  } catch {
    return null;
  }
}

export function normalizeUrl(url: string, base: string): string | null {
  try {
    const parsed = new URL(url, base);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    parsed.hash = "";
    if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function isSameHost(url: string, baseHost: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const base = baseHost.replace(/^www\./, "");
    return host === base || host.endsWith(`.${base}`);
  } catch {
    return false;
  }
}

export function shouldSkipUrl(url: string): boolean {
  const lower = url.toLowerCase();
  const skipExtensions = [
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
    ".zip",
    ".mp4",
    ".mp3",
    ".css",
    ".js",
    ".json",
    ".xml",
  ];
  if (skipExtensions.some((ext) => lower.includes(ext))) return true;
  if (lower.includes("/wp-admin") || lower.includes("/login")) return true;
  return false;
}

export { MAX_PAGES };
