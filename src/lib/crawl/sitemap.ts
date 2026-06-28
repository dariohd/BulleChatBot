import { fetchPage, normalizeUrl } from "./fetch";

export async function discoverUrls(baseUrl: string): Promise<string[]> {
  const base = new URL(baseUrl);
  const found = new Set<string>([base.toString()]);

  const sitemapPaths = ["/sitemap.xml", "/sitemap_index.xml", "/sitemap-index.xml"];

  for (const path of sitemapPaths) {
    const sitemapUrl = `${base.origin}${path}`;
    const xml = await fetchPage(sitemapUrl);
    if (!xml) continue;

    const urls = parseSitemap(xml, base.hostname);
    for (const url of urls) {
      found.add(url);
      if (found.size >= 200) break;
    }
    if (urls.length > 0) break;
  }

  return Array.from(found);
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
