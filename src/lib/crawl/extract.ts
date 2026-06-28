import * as cheerio from "cheerio";

export interface ExtractedPage {
  url: string;
  title: string;
  description?: string;
  language?: string;
  headings: string[];
  content: string;
  links: string[];
}

export function extractPageContent(url: string, html: string): ExtractedPage {
  const $ = cheerio.load(html);

  $("script, style, nav, footer, noscript, iframe, svg, .bulle-widget-root").remove();

  const title =
    $("title").first().text().trim() ||
    $("h1").first().text().trim() ||
    "Sans titre";

  const description =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim();

  const language = $("html").attr("lang")?.trim();

  const headings = $("h1, h2, h3")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .slice(0, 20);

  const main =
    $("main").first().length > 0
      ? $("main").first()
      : $("article").first().length > 0
        ? $("article").first()
        : $('[role="main"]').first().length > 0
          ? $('[role="main"]').first()
          : $("body");

  const content = main
    .text()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12000);

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
