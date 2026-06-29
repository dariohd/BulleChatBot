import assert from "node:assert/strict";
import { test } from "node:test";
import { cosineSimilarity } from "../src/lib/index/embeddings.ts";
import { searchChunksByKeywords } from "../src/lib/index/search.ts";
import type { ContentChunk } from "../src/lib/types.ts";

const chunks: ContentChunk[] = [
  {
    id: "1",
    url: "https://example.com/tarifs",
    title: "Tarifs et forfaits",
    text: "Nos forfaits démarrent à 29 euros par mois pour les petites équipes.",
  },
  {
    id: "2",
    url: "https://example.com/contact",
    title: "Contact",
    text: "Écrivez-nous à contact@example.com pour toute question commerciale.",
  },
];

test("searchChunksByKeywords trouve les tarifs", () => {
  const results = searchChunksByKeywords(chunks, "forfaits 29 euros", 2);
  assert.equal(results[0]?.id, "1");
});

test("searchChunksByKeywords retourne une liste vide sans correspondance", () => {
  const results = searchChunksByKeywords(chunks, "xyz abc qqq", 2);
  assert.equal(results.length, 0);
});

test("cosineSimilarity renvoie 1 pour des vecteurs identiques", () => {
  const vector = [0.2, 0.5, 0.9];
  assert.equal(cosineSimilarity(vector, vector), 1);
});
