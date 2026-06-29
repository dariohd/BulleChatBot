import { crawlSite } from "@/lib/crawl/crawler";
import { enrichChunksWithEmbeddings } from "@/lib/index/embeddings";
import { searchChunks } from "@/lib/index/search";
import {
  acquireIndexLock,
  extractHost,
  getIndexKey,
  loadIndex,
  releaseIndexLock,
  saveIndex,
} from "@/lib/index/store";
import { loadJson, saveJson } from "@/lib/storage/json-store";
import { getSiteByKey, listSites } from "@/lib/sites";
import type { ContentChunk, IndexStatus, SiteIndex } from "@/lib/types";

const STALE_MS =
  parseInt(process.env.BULLE_INDEX_STALE_HOURS ?? "168", 10) * 3600000;
const CRON_CURSOR_PREFIX = "bulle-cron";

export { extractHost, getIndexKey };

export async function resolveCrawlBaseUrl(
  siteKey: string,
  origin?: string
): Promise<string | null> {
  const site = await getSiteByKey(siteKey);
  if (!site) return null;

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

  if (!process.env.VERCEL) {
    if (origin) return origin.replace(/\/$/, "");
    if (site.baseUrl) return site.baseUrl;
    return "http://localhost:3001";
  }

  if (site.baseUrl) return site.baseUrl;
  return null;
}

export async function getIndexStatus(
  siteKey: string,
  originOrUrl?: string
): Promise<IndexStatus> {
  const indexKey = getIndexKey(siteKey, originOrUrl);
  const index = await loadIndex(indexKey);
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
  const site = await getSiteByKey(siteKey);
  if (!site) {
    throw new Error("Site non reconnu");
  }

  const baseUrl = await resolveCrawlBaseUrl(siteKey, options?.origin);
  if (!baseUrl) {
    throw new Error("Impossible de déterminer l'URL à indexer pour ce site");
  }

  const host = extractHost(baseUrl);
  if (!host) {
    throw new Error("URL à indexer invalide");
  }

  const indexKey = getIndexKey(siteKey, baseUrl);

  if (!acquireIndexLock(indexKey)) {
    const existing = await loadIndex(indexKey);
    if (existing) return existing;
    throw new Error("Indexation déjà en cours pour ce site");
  }

  try {
    if (!options?.force) {
      const status = await getIndexStatus(siteKey, baseUrl);
      if (status.indexed && !status.stale) {
        const existing = await loadIndex(indexKey);
        if (existing) return existing;
      }
    }

    const crawled = await crawlSite(baseUrl);
    const chunks = await enrichChunksWithEmbeddings(crawled.chunks);

    const index: SiteIndex = {
      siteKey,
      host,
      baseUrl: crawled.baseUrl,
      siteName: crawled.siteName,
      siteSummary: crawled.siteSummary,
      indexedAt: new Date().toISOString(),
      pageCount: crawled.pageCount,
      chunks,
    };

    await saveIndex(indexKey, index);
    return index;
  } finally {
    releaseIndexLock(indexKey);
  }
}

export async function searchSiteKnowledge(
  siteKey: string,
  query: string,
  pageUrl?: string
): Promise<ContentChunk[]> {
  const indexKey = getIndexKey(siteKey, pageUrl);
  const index = await loadIndex(indexKey);
  if (!index || index.chunks.length === 0) return [];
  return searchChunks(index.chunks, query, 6);
}

export async function reindexNextSite(): Promise<{
  siteKey: string;
  ok: boolean;
  error?: string;
}> {
  const allSites = await listSites();
  if (allSites.length === 0) {
    return { siteKey: "", ok: true };
  }

  const cursor =
    (await loadJson<{ lastIndex: number }>(CRON_CURSOR_PREFIX, "reindex")) ?? {
      lastIndex: -1,
    };
  const nextIndex = (cursor.lastIndex + 1) % allSites.length;
  const site = allSites[nextIndex];

  try {
    const baseUrl =
      site.baseUrl ??
      (site.domain.split(",")[0]
        ? `https://${site.domain.split(",")[0].trim()}`
        : undefined);
    await indexSite(site.siteKey, { origin: baseUrl, force: true });
    await saveJson(CRON_CURSOR_PREFIX, "reindex", { lastIndex: nextIndex });
    return { siteKey: site.siteKey, ok: true };
  } catch (error) {
    return {
      siteKey: site.siteKey,
      ok: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

export async function getSiteIndexSummary(
  siteKey: string,
  pageUrl?: string
): Promise<
  Pick<
    SiteIndex,
    "siteName" | "siteSummary" | "pageCount" | "indexedAt" | "baseUrl" | "host"
  > | null
> {
  const indexKey = getIndexKey(siteKey, pageUrl);
  const index = await loadIndex(indexKey);
  if (!index) return null;
  return {
    siteName: index.siteName,
    siteSummary: index.siteSummary,
    pageCount: index.pageCount,
    indexedAt: index.indexedAt,
    baseUrl: index.baseUrl,
    host: index.host,
  };
}
