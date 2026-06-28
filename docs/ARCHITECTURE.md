# Notes techniques

Next.js App Router. Route API principale : chat streaming via Vercel AI SDK (`ai` package).

## Widget

`public/widget/bulle.js` s'injecte sur le site hôte. Il lit `data-api` et `data-site-key`, ouvre la bulle UI, POST vers `/api/chat` avec le contexte page si configuré.

## Providers

Abstraction dans le code API : switch sur `BULLE_PROVIDER`. Ollama via `ai-sdk-ollama` en local ; en prod `gateway` route vers les modèles configurés dans le dashboard Vercel.

## Sécurité

Les `site-key` identifient l'origine autorisée (génération : `scripts/generate-site-key.mjs`). Ne pas exposer les clés API LLM côté client — tout passe par l'API Next.

## Scraping optionnel

`cheerio` peut enrichir le contexte avec le contenu de la page hôte (selon config route).
