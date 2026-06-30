# Notes techniques — Bulle v0.3

Next.js 15 App Router. Région Vercel : `cdg1`. Chat streaming via Vercel AI SDK (`ai`) et Mistral direct.

## Widget

- Source : `public/widget/bulle.js`
- Build : `npm run build:widget` génère `bulle.v{version}.js` + `manifest.json`
- Attributs : `data-site-key`, `data-api` (URL Bulle) ou `data-proxy="same-origin"` (proxy client)
- Extrait le contexte page, envoie `sessionId`
- Sync index : une fois par session (`sessionStorage`)
- Messages : persistés en `sessionStorage` pendant la navigation
- Rendu léger : gras (`**`), listes, liens markdown et URLs

Constantes partagées avec le crawl serveur : `src/lib/page-context.ts`

## Providers

`src/lib/ai.ts` : `ollama` en local, `mistral` en production.

## RAG

1. Crawl (robots.txt, sitemaps imbriqués, liens internes)
2. Extraction cheerio (`src/lib/crawl/extract.ts`) + JSON-LD / meta Open Graph
3. Découpage en chunks + embeddings `mistral-embed` si `MISTRAL_API_KEY`
4. Recherche hybride : cosinus puis mots-clés

Index par couple `siteKey + hostname` dans Vercel Blob (privé). Le statut d'indexation admin utilise `baseUrl` du site pour résoudre le bon fichier.

## Persistance (Blob privé)

| Donnée | Chemin |
|---|---|
| Index | `bulle-index/{siteKey}__{host}.json` |
| Sites | `bulle-sites/{siteKey}.json` |
| Analytics | `bulle-analytics-events/{siteKey}/{eventId}.json` |
| Erreurs ops | `bulle-ops-errors/{siteKey}/{eventId}.json` |
| Conversations | `bulle-conversations/{siteKey}/{sessionId}.json` |
| Curseur cron | `bulle-cron/reindex.json` |

En local : dossier `data/` (gitignored).

## Sécurité et limites

- `siteKey` + contrôle strict du header `Origin`
- **Rate limiting minute** : mémoire par instance par défaut (30 chats/min, 5 syncs/h par IP) ; Upstash Redis si `UPSTASH_REDIS_REST_*` est configuré
- **Quotas journaliers** par site dans Blob (`quotas.maxChatsPerDay`, `maxSyncsPerDay`, défaut 50/3)
- `BULLE_ADMIN_SECRET` : cookie httpOnly via `/api/admin/login`
- Clés API LLM côté serveur uniquement
- Blobs en accès privé (lecture legacy public pour migration)

## APIs

| Route | Accès |
|---|---|
| `POST /api/chat` | Widget (siteKey + Origin) |
| `POST /api/index/sync` | Widget (siteKey + Origin) |
| `GET /api/sites?siteKey=` | Public (config widget) ou admin (config complète) |
| `GET /api/sites` | Admin |
| `POST/PATCH/DELETE /api/sites` | Admin |
| `POST /api/admin/login` | Public (pose le cookie) |
| `POST /api/admin/logout` | Public |
| `GET /api/admin/overview` | Admin (stats jour, quotas, index, plateforme) |
| `POST /api/admin/reindex` | Admin |
| `POST /api/admin/rotate-key` | Admin |
| `GET/DELETE/PATCH /api/admin/logs` | Admin (conversations RGPD) |
| `GET /api/cron/reindex` | Cron (`CRON_SECRET` obligatoire) |

## Webhooks

Si `webhookUrl` est défini sur un site : `chat.started`, `chat.completed`, `index.completed`.

## Variables d'environnement clés

| Variable | Rôle |
|---|---|
| `MISTRAL_API_KEY` | Chat + embeddings |
| `BULLE_ADMIN_SECRET` | Dashboard admin |
| `BLOB_READ_WRITE_TOKEN` | Persistance |
| `CRON_SECRET` | Cron re-index |
| `BULLE_DEFAULT_MAX_CHATS_PER_DAY` | Quota défaut nouveaux sites |
| `BULLE_DEFAULT_MAX_SYNCS_PER_DAY` | Quota défaut nouveaux sites |
| `UPSTASH_REDIS_REST_URL` | Rate limit distribué (optionnel) |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limit distribué (optionnel) |

## Limites connues

- Crawl HTML statique + métadonnées structurées (JSON-LD, og:). Pas de rendu JavaScript côté client (Puppeteer = coûteux, non prévu).
- `siteKey` visible dans le DOM du site client (standard widget embarqué)
- Sans Upstash, le rate limit minute n'est pas partagé entre instances serverless (acceptable à faible trafic)

## Tests

```bash
npm test      # 18 tests unitaires
npm run build # build widget + Next.js
```

CI : `.github/workflows/ci.yml`
