import { createMistral } from "@ai-sdk/mistral";
import { embed, embedMany } from "ai";
import { cleanEnv } from "@/lib/env";
import type { ContentChunk } from "@/lib/types";

const EMBED_MODEL = "mistral-embed";
const BATCH_SIZE = 24;

export function isEmbeddingEnabled(): boolean {
  return Boolean(cleanEnv(process.env.MISTRAL_API_KEY));
}

function getMistralEmbedder() {
  const apiKey = cleanEnv(process.env.MISTRAL_API_KEY);
  if (!apiKey) {
    throw new Error("MISTRAL_API_KEY manquante pour les embeddings");
  }
  const mistral = createMistral({ apiKey });
  return mistral.embedding(EMBED_MODEL);
}

export async function embedQuery(text: string): Promise<number[] | null> {
  if (!isEmbeddingEnabled()) return null;
  try {
    const model = getMistralEmbedder();
    const { embedding } = await embed({ model, value: text });
    return embedding;
  } catch (error) {
    console.error("[Bulle embeddings] query:", error);
    return null;
  }
}

export async function enrichChunksWithEmbeddings(
  chunks: ContentChunk[]
): Promise<ContentChunk[]> {
  if (!isEmbeddingEnabled() || chunks.length === 0) return chunks;

  const enriched: ContentChunk[] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    try {
      const model = getMistralEmbedder();
      const values = batch.map((c) => `${c.title}\n${c.text}`.slice(0, 8000));
      const { embeddings } = await embedMany({ model, values });
      for (let j = 0; j < batch.length; j++) {
        enriched.push({ ...batch[j], embedding: embeddings[j] });
      }
    } catch (error) {
      console.error("[Bulle embeddings] batch:", error);
      enriched.push(...batch);
    }
  }

  return enriched;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
