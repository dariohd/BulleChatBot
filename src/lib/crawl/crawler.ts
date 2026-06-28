import type { ContentChunk } from "@/lib/types";
import { extractPageContent } from "./extract";
import {
  fetchPage,
  isSameHost,
  MAX_PAGES,
  normalizeUrl,
  shouldSkipUrl,
} from "./fetch";
import { collectLinksFromPage, discoverUrls } from "./sitemap";

export interface CrawlResult {
  baseUrl: string;
  siteName: string;
  siteSummary?: string;
  language?: string;
  pageCount: number;
  chunks: ContentChunk[];
}

export async function crawlSite(baseUrl: string): Promise<CrawlResult> {
  const normalizedBase = normalizeUrl(baseUrl, baseUrl);
  if (!normalizedBase) {
    throw new Error("URL de base invalide");
  }

  const baseHost = new URL(normalizedBase).hostname;
  const queue: string[] = await discoverUrls(normalizedBase);
  const visited = new Set<string>();
  const chunks: ContentChunk[] = [];

  let siteName = "";
  let siteSummary: string | undefined;
  let language: string | undefined;

  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const batch = queue.splice(0, 3);

    await Promise.all(
      batch.map(async (rawUrl) => {
        const url = normalizeUrl(rawUrl, normalizedBase);
        if (!url || visited.has(url) || shouldSkipUrl(url)) return;
        if (!isSameHost(url, baseHost)) return;

        visited.add(url);

        const html = await fetchPage(url);
        if (!html) return;

        const page = extractPageContent(url, html);
        if (!page.content || page.content.length < 40) return;

        if (!siteName && url === normalizedBase) {
          siteName = page.title;
          siteSummary = page.description;
          language = page.language;
        }

        chunks.push(...chunkPage(page.url, page.title, page.content));

        for (const link of collectLinksFromPage(url, page.links, baseHost)) {
          if (!visited.has(link) && !queue.includes(link) && !shouldSkipUrl(link)) {
            queue.push(link);
          }
        }
      })
    );
  }

  if (!siteName && chunks.length > 0) {
    siteName = chunks[0].title;
  }

  return {
    baseUrl: normalizedBase,
    siteName: siteName || new URL(normalizedBase).hostname,
    siteSummary,
    language,
    pageCount: visited.size,
    chunks,
  };
}

function chunkPage(url: string, title: string, content: string): ContentChunk[] {
  const CHUNK_SIZE = 900;
  const OVERLAP = 120;
  const chunks: ContentChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < content.length) {
    const end = Math.min(start + CHUNK_SIZE, content.length);
    const text = content.slice(start, end).trim();
    if (text.length >= 60) {
      chunks.push({
        id: `${hash(url)}-${index}`,
        url,
        title,
        text,
      });
      index += 1;
    }
    if (end >= content.length) break;
    start = end - OVERLAP;
  }

  return chunks;
}

function hash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}
