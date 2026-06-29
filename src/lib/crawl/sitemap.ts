import { fetchPage, normalizeUrl } from "./fetch";

export async function discoverUrls(baseUrl: string): Promise<string[]> {
  const base = new URL(baseUrl);
  const found = new Set<string>([base.toString()]);

  const robotsUrls = await discoverFromRobots(base);
  for (const url of robotsUrls) {
    found.add(url);
    if (found.size >= 300) break;
  }

  const sitemapPaths = [
    "/sitemap.xml",
    "/sitemap_index.xml",
    "/sitemap-index.xml",
    "/wp-sitemap.xml",
  ];

  const sitemapCandidates = new Set<string>(sitemapPaths.map((p) => `${base.origin}${p}`));
  for (const url of robotsUrls) {
    if (url.includes("sitemap")) sitemapCandidates.add(url);
  }

  for (const sitemapUrl of sitemapCandidates) {
    const urls = await parseSitemapRecursive(sitemapUrl, base.hostname, 2);
    for (const url of urls) {
      found.add(url);
      if (found.size >= 300) break;
    }
    if (urls.length > 0 && found.size > 1) break;
  }

  return Array.from(found);
}

async function discoverFromRobots(base: URL): Promise<string[]> {
  const robots = await fetchPage(`${base.origin}/robots.txt`);
  if (!robots) return [];

  const urls: string[] = [];
  const lines = robots.split("\n");
  for (const line of lines) {
    const match = line.match(/^sitemap:\s*(.+)$/i);
    if (match?.[1]) {
      const normalized = normalizeUrl(match[1].trim(), base.origin);
      if (normalized) urls.push(normalized);
    }
  }
  return urls;
}

async function parseSitemapRecursive(
  sitemapUrl: string,
  baseHost: string,
  depth: number
): Promise<string[]> {
  const xml = await fetchPage(sitemapUrl);
  if (!xml) return [];

  const nestedSitemaps = Array.from(
    xml.matchAll(/<sitemap>\s*<loc>\s*([^<]+)\s*<\/loc>/gi)
  )
    .map((match) => match[1]?.trim())
    .filter(Boolean) as string[];

  if (nestedSitemaps.length > 0 && depth > 0) {
    const nested: string[] = [];
    for (const nestedUrl of nestedSitemaps.slice(0, 5)) {
      const child = await parseSitemapRecursive(nestedUrl, baseHost, depth - 1);
      nested.push(...child);
    }
    if (nested.length > 0) return nested;
  }

  return parseSitemap(xml, baseHost);
}

function parseSitemap(xml: string, baseHost: string): string[] {
  const urls: string[] = [];

  const locMatches = xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi);
  for (const match of locMatches) {
    const url = match[1]?.trim();
    if (!url) continue;
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      const base = baseHost.replace(/^www\./, "");
      if (host === base || host.endsWith(`.${base}`)) {
        urls.push(url);
      }
    } catch {
      // ignore invalid URLs
    }
  }

  return urls;
}

export function collectLinksFromPage(
  pageUrl: string,
  links: string[],
  baseHost: string
): string[] {
  const results: string[] = [];
  for (const link of links) {
    const normalized = normalizeUrl(link, pageUrl);
    if (!normalized) continue;
    try {
      const host = new URL(normalized).hostname.replace(/^www\./, "");
      const base = baseHost.replace(/^www\./, "");
      if (host === base || host.endsWith(`.${base}`)) {
        results.push(normalized);
      }
    } catch {
      // ignore
    }
  }
  return results;
}
