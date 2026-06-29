import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizePageText, PAGE_CONTEXT_MAX_CONTENT } from "../src/lib/page-context.ts";

test("normalizePageText compresse les espaces et tronque", () => {
  const result = normalizePageText("  Bonjour   monde  ", 10);
  assert.equal(result, "Bonjour mo");
});

test("PAGE_CONTEXT_MAX_CONTENT est cohérent avec la validation", () => {
  assert.equal(PAGE_CONTEXT_MAX_CONTENT, 8000);
});
