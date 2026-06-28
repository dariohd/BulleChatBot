# Déploiement Vercel — Bulle

URL production : **https://bulle-chatbot.vercel.app**

## Autonomie (install and forget)

À l'installation du widget, Bulle :

1. **Explore le site** (sitemap + pages liées, jusqu'à 30 pages)
2. **Indexe le contenu** (stocké dans Vercel Blob)
3. **Répond avec RAG** (page actuelle + extraits pertinents du site)
4. **Se met à jour** chaque semaine (cron dimanche 4h)

Aucune config métier requise. Un script + une clé site.

## Variables Vercel (production)

| Variable | Valeur |
|---|---|
| `BULLE_PROVIDER` | `gateway` |
| `BULLE_MODEL` | `mistral/mistral-small-latest` |
| `BULLE_SITE_KEY` | clé générée (`npm run generate-site-key`) |
| `BULLE_SITE_DOMAINS` | domaines autorisés, séparés par virgules |
| `BULLE_SITE_BASE_URL` | URL publique du site à crawler |
| `BULLE_SITE_NAME` | nom initial (écrasé après indexation) |
| `NEXT_PUBLIC_BULLE_URL` | `https://bulle-chatbot.vercel.app` |
| `BLOB_READ_WRITE_TOKEN` | auto via Vercel Blob (store `bulle-index`) |
| `CRON_SECRET` | secret pour le cron de re-indexation |

## Greffer sur un site client

```html
<script
  src="https://bulle-chatbot.vercel.app/widget/bulle.js"
  data-site-key="bulle_..."
  data-api="https://bulle-chatbot.vercel.app"
  defer
></script>
```

Le widget déclenche automatiquement `/api/index/sync` au premier chargement.

## Commandes utiles

```bash
npm run generate-site-key    # nouvelle clé site
npx vercel deploy --prod     # redéployer
npx vercel env ls            # voir les variables
```

## Forcer une re-indexation

```bash
curl -X POST https://bulle-chatbot.vercel.app/api/index/sync \
  -H "Content-Type: application/json" \
  -d '{"siteKey":"bulle_...","force":true}'
```

## Nouveau client

1. `npm run generate-site-key`
2. Ajouter les variables `BULLE_SITE_*` sur Vercel (ou `BULLE_SITES` JSON pour plusieurs)
3. Redéployer
4. Donner le snippet au client
