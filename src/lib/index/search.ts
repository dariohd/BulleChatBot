import type { ContentChunk } from "@/lib/types";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

export function searchChunks(
  chunks: ContentChunk[],
  query: string,
  limit = 6
): ContentChunk[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return chunks.slice(0, limit);

  const scored = chunks.map((chunk) => {
    const titleTokens = tokenize(chunk.title);
    const textTokens = tokenize(chunk.text);
    const allTokens = new Set([...titleTokens, ...textTokens]);

    let score = 0;
    for (const token of queryTokens) {
      if (chunk.title.toLowerCase().includes(token)) score += 4;
      if (chunk.text.toLowerCase().includes(token)) score += 2;
      if (allTokens.has(token)) score += 1;
    }

    return { chunk, score };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.chunk);
}
