import type { CheerioAPI } from "cheerio";

const SCHEMA_TEXT_KEYS = [
  "description",
  "articleBody",
  "text",
  "headline",
  "name",
  "about",
  "abstract",
] as const;

export function collectSchemaText(data: unknown): string[] {
  if (!data) return [];
  if (typeof data === "string") {
    const trimmed = data.trim();
    return trimmed.length >= 20 ? [trimmed] : [];
  }
  if (Array.isArray(data)) {
    return data.flatMap((item) => collectSchemaText(item));
  }
  if (typeof data !== "object") return [];

  const obj = data as Record<string, unknown>;
  const parts: string[] = [];

  for (const key of SCHEMA_TEXT_KEYS) {
    const value = obj[key];
    if (typeof value === "string" && value.trim().length >= 20) {
      parts.push(value.trim());
    }
  }

  if (obj["@graph"]) {
    parts.push(...collectSchemaText(obj["@graph"]));
  }

  return parts;
}

export function extractJsonLdSnippets($: CheerioAPI): string[] {
  const snippets: string[] = [];

  $("script[type='application/ld+json']").each((_, element) => {
    const raw = $(element).html()?.trim();
    if (!raw) return;
    try {
      snippets.push(...collectSchemaText(JSON.parse(raw)));
    } catch {
      // JSON-LD invalide, ignoré
    }
  });

  return dedupeSnippets(snippets);
}

export function readMetaContent(
  $: CheerioAPI,
  selectors: string[]
): string | undefined {
  for (const selector of selectors) {
    const value = $(selector).attr("content")?.trim();
    if (value) return value;
  }
  return undefined;
}

export function mergeStructuredContent(
  mainContent: string,
  snippets: string[]
): string {
  const unique = dedupeSnippets(snippets);
  if (unique.length === 0) return mainContent;

  const block = unique.join(" ");
  if (!mainContent.trim()) return block;
  if (mainContent.includes(block.slice(0, 40))) return mainContent;

  return `${block} ${mainContent}`.trim();
}

function dedupeSnippets(snippets: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const snippet of snippets) {
    const normalized = snippet.replace(/\s+/g, " ").trim();
    if (normalized.length < 20) continue;
    const key = normalized.slice(0, 80).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }

  return result;
}
