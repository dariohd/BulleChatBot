import assert from "node:assert/strict";
import { test } from "node:test";
import {
  collectSchemaText,
  mergeStructuredContent,
} from "../src/lib/crawl/structured.ts";
import { buildSiteAlerts } from "../src/lib/quotas.ts";

test("collectSchemaText extrait les champs schema.org utiles", () => {
  const parts = collectSchemaText({
    "@type": "WebPage",
    description: "Portfolio de Hugo Davion, développeur web.",
    headline: "Hugo Davion",
  });
  assert.ok(parts.some((part) => part.includes("Portfolio")));
});

test("mergeStructuredContent enrichit le texte principal", () => {
  const merged = mergeStructuredContent("Contenu court.", [
    "Description détaillée du site pour les visiteurs.",
  ]);
  assert.match(merged, /Description détaillée/);
  assert.match(merged, /Contenu court/);
});

test("buildSiteAlerts signale un quota proche ou atteint", () => {
  const warn = buildSiteAlerts({ maxChatsPerDay: 50, maxSyncsPerDay: 3 }, 41, 1);
  assert.equal(warn.length, 1);
  assert.equal(warn[0].level, "warn");

  const critical = buildSiteAlerts(
    { maxChatsPerDay: 50, maxSyncsPerDay: 3 },
    50,
    3
  );
  assert.equal(critical.length, 2);
  assert.equal(critical[0].level, "critical");
});
