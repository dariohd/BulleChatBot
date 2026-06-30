import assert from "node:assert/strict";
import { test } from "node:test";
import { derivePageSuggestions } from "../src/lib/suggestions.ts";

test("derivePageSuggestions transforme les titres de section", () => {
  const suggestions = derivePageSuggestions({
    siteName: "Hugo Davion",
    headings: ["Hugo Davion", "Projets", "Contact", "Stack technique"],
  });

  assert.equal(suggestions.length, 3);
  assert.ok(suggestions.some((s) => s.includes("projets")));
  assert.ok(suggestions.some((s) => s.includes("contacter")));
});

test("derivePageSuggestions complète avec le nom du site", () => {
  const suggestions = derivePageSuggestions({
    siteName: "Mon Agence",
    headings: ["Accueil"],
  });

  assert.ok(suggestions.some((s) => s.includes("Mon Agence")));
});
