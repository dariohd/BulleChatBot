import * as cheerio from "cheerio";
import {
  extractJsonLdSnippets,
  mergeStructuredContent,
  readMetaContent,
} from "@/lib/crawl/structured";
import {
  PAGE_CONTEXT_EXCLUDE_SELECTORS,
  PAGE_CONTEXT_HEADING_SELECTOR,
  PAGE_CONTEXT_MAX_HEADINGS,
  normalizePageText,
} from "@/lib/page-context";

export interface ExtractedPage {
  url: string;
  title: string;
  description?: string;
  language?: string;
  headings: string[];
  content: string;
  links: string[];
  hasStructuredData: boolean;
}

const EXCLUDE_SELECTOR = PAGE_CONTEXT_EXCLUDE_SELECTORS.join(", ");

export function extractPageContent(url: string, html: string): ExtractedPage {
  const $ = cheerio.load(html);

  const jsonLdSnippets = extractJsonLdSnippets($);

  const title =
    $("title").first().text().trim() ||
    readMetaContent($, [
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
    ]) ||
    $("h1").first().text().trim() ||
    "Sans titre";

  const description =
    $('meta[name="description"]').attr("content")?.trim() ||
    readMetaContent($, [
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
    ]) ||
    jsonLdSnippets[0];

  const language = $("html").attr("lang")?.trim();

  const headings = $(PAGE_CONTEXT_HEADING_SELECTOR)
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .slice(0, PAGE_CONTEXT_MAX_HEADINGS);

  $(EXCLUDE_SELECTOR).remove();

  const main =
    $("main").first().length > 0
      ? $("main").first()
      : $("article").first().length > 0
        ? $("article").first()
        : $('[role="main"]').first().length > 0
          ? $('[role="main"]').first()
          : $("body");

  const mainText = normalizePageText(main.text(), 12000);
  const structuredSnippets = [
    ...(description ? [description] : []),
    ...jsonLdSnippets,
  ];
  const content = mergeStructuredContent(mainText, structuredSnippets);

  const links = $("a[href]")
    .map((_, el) => $(el).attr("href") ?? "")
    .get()
    .filter(Boolean);

  return {
    url,
    title,
    description,
    language,
    headings,
    content,
    links,
    hasStructuredData: structuredSnippets.length > 0,
  };
}
