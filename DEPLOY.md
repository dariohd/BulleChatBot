# Déploiement Vercel — Bulle

URL production : **https://bulle-chatbot.vercel.app**

## Autonomie (install and forget)

À l'installation du widget, Bulle :

1. **Explore le site** (robots.txt, sitemap, pages liées, jusqu'à 30 pages par défaut)
2. **Indexe le contenu** (stocké dans Vercel Blob, avec embeddings Mistral si configuré)
3. **Répond avec RAG** (page actuelle + extraits pertinents du site)
4. **Se met à jour** chaque semaine (cron dimanche 4h)

Aucune config métier requise. Un script + une clé site.

## Variables Vercel (production)

| Variable | Valeur |
|---|---|
| `BULLE_PROVIDER` | `mistral` |
| `BULLE_MODEL` | `mistral-small-latest` |
| `MISTRAL_API_KEY` | clé API Mistral |
| `BULLE_ADMIN_SECRET` | secret pour l'admin et la création de sites |
| `BULLE_SITE_KEY` | clé du site principal (bootstrap initial) |
| `BULLE_SITE_DOMAINS` | domaines autorisés, séparés par virgules |
| `BULLE_SITE_NAME` | nom initial (écrasé après indexation) |
| `NEXT_PUBLIC_BULLE_URL` | `https://bulle-chatbot.vercel.app` |
| `BLOB_READ_WRITE_TOKEN` | auto via Vercel Blob |
| `CRON_SECRET` | secret pour le cron de re-indexation |
| `UPSTASH_REDIS_REST_URL` | Redis Upstash (rate limit fiable, tier gratuit) |
| `UPSTASH_REDIS_REST_TOKEN` | token Upstash |
| `BULLE_DEFAULT_MAX_CHATS_PER_DAY` | quota chats / jour par défaut (50) |
| `BULLE_DEFAULT_MAX_SYNCS_PER_DAY` | quota syncs / jour par défaut (3) |

## Upstash (gratuit, recommandé)

1. Créer une base Redis sur [upstash.com](https://upstash.com) (région proche de `iad1` Vercel)
2. Copier `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN`
3. Les ajouter sur Vercel → Settings → Environment Variables (Production)
4. Redéployer Bulle

L’admin affichera **Upstash actif** dans la section Plateforme.

## Nouveau client

1. Créer le site via l'API (recommandé) :
   ```bash
   curl -X POST https://bulle-chatbot.vercel.app/api/sites \
     -H "Authorization: Bearer $BULLE_ADMIN_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"name":"Client XYZ","domain":"client.fr"}'
   ```
2. Récupérer la `siteKey` dans la réponse
3. Donner le snippet au client (voir [INTEGRATION.md](INTEGRATION.md))

Les sites sont persistés automatiquement dans Blob. Plus besoin de redéployer pour chaque client.

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

## Tableau de bord

https://bulle-chatbot.vercel.app/admin

Connexion avec `BULLE_ADMIN_SECRET`. Affiche les sites, l'état d'indexation, les jauges de consommation du jour (chats / syncs vs quotas) et les statistiques cumulées.

## Commandes utiles

```bash
npm run generate-site-key    # nouvelle clé site (manuel)
npm run test                 # tests unitaires
npx vercel deploy --prod     # redéployer
npx vercel env ls            # voir les variables
```

## Forcer une re-indexation

```bash
curl -X POST https://bulle-chatbot.vercel.app/api/index/sync \
  -H "Content-Type: application/json" \
  -d '{"siteKey":"bulle_...","force":true}'
```

## Sécurité

- `GET /api/sites` sans `siteKey` : réservé à l'admin (Bearer token)
- `GET /api/sites?siteKey=...` : config publique du widget (sans la clé)
- `POST/PATCH /api/sites` : admin uniquement
- Les clés API Mistral ne quittent jamais le serveur
