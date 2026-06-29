import * as cheerio from "cheerio";
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
}

const EXCLUDE_SELECTOR = PAGE_CONTEXT_EXCLUDE_SELECTORS.join(", ");

export function extractPageContent(url: string, html: string): ExtractedPage {
  const $ = cheerio.load(html);

  $(EXCLUDE_SELECTOR).remove();

  const title =
    $("title").first().text().trim() ||
    $("h1").first().text().trim() ||
    "Sans titre";

  const description =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim();

  const language = $("html").attr("lang")?.trim();

  const headings = $(PAGE_CONTEXT_HEADING_SELECTOR)
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .slice(0, PAGE_CONTEXT_MAX_HEADINGS);

  const main =
    $("main").first().length > 0
      ? $("main").first()
      : $("article").first().length > 0
        ? $("article").first()
        : $('[role="main"]').first().length > 0
          ? $('[role="main"]').first()
          : $("body");

  const content = normalizePageText(main.text(), 12000);

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
  };
}
