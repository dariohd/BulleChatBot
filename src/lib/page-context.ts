export const PAGE_CONTEXT_SELECTORS = [
  "main",
  "article",
  '[role="main"]',
] as const;

export const PAGE_CONTEXT_EXCLUDE_SELECTORS = [
  "script",
  "style",
  "nav",
  "footer",
  "header",
  "noscript",
  "iframe",
  ".bulle-widget-root",
] as const;

export const PAGE_CONTEXT_HEADING_SELECTOR = "h1, h2, h3";
export const PAGE_CONTEXT_MAX_HEADINGS = 15;
export const PAGE_CONTEXT_MAX_CONTENT = 8000;

export function normalizePageText(text: string, maxLength = PAGE_CONTEXT_MAX_CONTENT): string {
  return text.replace(/\s+/g, " ").trim().slice(0, maxLength);
}
