#!/usr/bin/env node
/**
 * Applique les instructions Bulle d'un preset (config/site-presets/*.json).
 *
 * Usage :
 *   BULLE_URL=https://bulle-chatbot.vercel.app BULLE_ADMIN_SECRET=xxx \
 *     node scripts/apply-site-instructions.mjs bulletonsite
 */
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const presetId = process.argv[2];

if (!presetId) {
  console.error("Usage: node scripts/apply-site-instructions.mjs <preset-id>");
  process.exit(1);
}

const presetPath = path.join(
  __dirname,
  "..",
  "config",
  "site-presets",
  `${presetId}.json`
);

let preset;
try {
  preset = JSON.parse(readFileSync(presetPath, "utf-8"));
} catch {
  console.error(`Preset introuvable : ${presetPath}`);
  process.exit(1);
}

const baseUrl = (process.env.BULLE_URL ?? "http://localhost:3001").replace(
  /\/$/,
  ""
);
const secret = process.env.BULLE_ADMIN_SECRET ?? process.env.ADMIN_SECRET;

if (!secret) {
  console.error("BULLE_ADMIN_SECRET (ou ADMIN_SECRET) requis.");
  process.exit(1);
}

if (!preset.siteKey || !preset.instructions) {
  console.error("Le preset doit contenir siteKey et instructions.");
  process.exit(1);
}

const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ secret }),
});

if (!loginRes.ok) {
  console.error("Connexion admin échouée:", loginRes.status, await loginRes.text());
  process.exit(1);
}

const cookie = loginRes.headers.get("set-cookie");
if (!cookie) {
  console.error("Cookie de session absent.");
  process.exit(1);
}

const patchRes = await fetch(`${baseUrl}/api/sites`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Cookie: cookie.split(";")[0],
  },
  body: JSON.stringify({
    siteKey: preset.siteKey,
    instructions: preset.instructions,
  }),
});

if (!patchRes.ok) {
  console.error("Mise à jour échouée:", patchRes.status, await patchRes.text());
  process.exit(1);
}

const updated = await patchRes.json();
console.log(
  `Instructions appliquées pour « ${updated.name ?? preset.name ?? preset.siteKey} ».`
);
