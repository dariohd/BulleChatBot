import { crawlSite } from "@/lib/crawl/crawler";
import { searchChunks } from "@/lib/index/search";
import { loadIndex, saveIndex } from "@/lib/index/store";
import {
  getSiteByKey,
  getSiteDomains,
  listSites,
  updateSite,
} from "@/lib/sites";
import type { ContentChunk, IndexStatus, SiteIndex } from "@/lib/types";

const STALE_MS = parseInt(process.env.BULLE_INDEX_STALE_HOURS ?? "168", 10) * 3600000;

export function resolveCrawlBaseUrl(
  siteKey: string,
  origin?: string
): string | null {
  const site = getSiteByKey(siteKey);
  if (!site) return null;

  if (site.baseUrl) return site.baseUrl;
  if (process.env.BULLE_SITE_BASE_URL) return process.env.BULLE_SITE_BASE_URL;

  if (origin) {
    try {
      const host = new URL(origin).hostname;
      if (host !== "localhost" && host !== "127.0.0.1") {
        return origin.replace(/\/$/, "");
      }
    } catch {
      // ignore
    }
  }

  const domains = getSiteDomains(site);
  const publicDomain = domains.find(
    (d) => d !== "localhost" && d !== "127.0.0.1"
  );
  if (publicDomain) {
    return `https://${publicDomain}`;
  }

  if (!process.env.VERCEL) {
    if (origin) return origin.replace(/\/$/, "");
    return "http://localhost:3000";
  }

  return null;
}

export async function getIndexStatus(siteKey: string): Promise<IndexStatus> {
  const index = await loadIndex(siteKey);
  if (!index) {
    return { indexed: false, stale: true };
  }

  const age = Date.now() - new Date(index.indexedAt).getTime();
  return {
    indexed: true,
    indexedAt: index.indexedAt,
    pageCount: index.pageCount,
    chunkCount: index.chunks.length,
    baseUrl: index.baseUrl,
    stale: age > STALE_MS,
  };
}

export async function indexSite(
  siteKey: string,
  options?: { origin?: string; force?: boolean }
): Promise<SiteIndex> {
  const site = getSiteByKey(siteKey);
  if (!site) {
    throw new Error("Site non reconnu");
  }

  if (!options?.force) {
    const status = await getIndexStatus(siteKey);
    if (status.indexed && !status.stale) {
      const existing = await loadIndex(siteKey);
      if (existing) return existing;
    }
  }

  const baseUrl = resolveCrawlBaseUrl(siteKey, options?.origin);
  if (!baseUrl) {
    throw new Error("Impossible de déterminer l'URL à indexer pour ce site");
  }

  const crawled = await crawlSite(baseUrl);

  const index: SiteIndex = {
    siteKey,
    baseUrl: crawled.baseUrl,
    siteName: crawled.siteName,
    siteSummary: crawled.siteSummary,
    indexedAt: new Date().toISOString(),
    pageCount: crawled.pageCount,
    chunks: crawled.chunks,
  };

  await saveIndex(index);

  if (crawled.siteName && crawled.siteName !== site.name) {
    updateSite(siteKey, {
      name: crawled.siteName,
      language: crawled.language ?? site.language,
      baseUrl: crawled.baseUrl,
    });
  } else {
    updateSite(siteKey, { baseUrl: crawled.baseUrl });
  }

  return index;
}

export async function searchSiteKnowledge(
  siteKey: string,
  query: string
): Promise<ContentChunk[]> {
  const index = await loadIndex(siteKey);
  if (!index || index.chunks.length === 0) return [];
  return searchChunks(index.chunks, query, 6);
}

export async function reindexAllSites(): Promise<
  Array<{ siteKey: string; ok: boolean; error?: string }>
> {
  const results: Array<{ siteKey: string; ok: boolean; error?: string }> = [];

  for (const site of listSites()) {
    try {
      await indexSite(site.siteKey, { force: true });
      results.push({ siteKey: site.siteKey, ok: true });
    } catch (error) {
      results.push({
        siteKey: site.siteKey,
        ok: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      });
    }
  }

  return results;
}

export async function getSiteIndexSummary(
  siteKey: string
): Promise<Pick<SiteIndex, "siteName" | "siteSummary" | "pageCount" | "indexedAt"> | null> {
  const index = await loadIndex(siteKey);
  if (!index) return null;
  return {
    siteName: index.siteName,
    siteSummary: index.siteSummary,
    pageCount: index.pageCount,
    indexedAt: index.indexedAt,
  };
}
