import type { ContentChunk } from "@/lib/types";
import { cosineSimilarity, embedQuery } from "./embeddings";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

export function searchChunksByKeywords(
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

function searchChunksByEmbeddings(
  chunks: ContentChunk[],
  queryEmbedding: number[],
  limit = 6
): ContentChunk[] {
  const scored = chunks
    .filter((chunk) => chunk.embedding && chunk.embedding.length > 0)
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding!),
    }))
    .filter((item) => item.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((item) => item.chunk);
}

export async function searchChunks(
  chunks: ContentChunk[],
  query: string,
  limit = 6
): Promise<ContentChunk[]> {
  if (chunks.length === 0) return [];

  const hasEmbeddings = chunks.some((c) => c.embedding?.length);
  if (hasEmbeddings) {
    const queryEmbedding = await embedQuery(query);
    if (queryEmbedding) {
      const results = searchChunksByEmbeddings(chunks, queryEmbedding, limit);
      if (results.length > 0) return results;
    }
  }

  return searchChunksByKeywords(chunks, query, limit);
}
