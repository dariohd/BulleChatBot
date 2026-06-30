# Bulle

Assistant IA embarquable pour sites web — widget JS + API Next.js.

| | |
|---|---|
| **URL production** | https://bulle-chatbot.vercel.app |
| **Dépôt GitHub** | [github.com/dariohd/BulleChatBot](https://github.com/dariohd/BulleChatBot) |
| **Notes techniques** | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| **Intégration client** | [docs/INTEGRATION.md](docs/INTEGRATION.md) |

Bulle tourne sur le **port 3001** en local pour éviter le conflit avec bulletonsite (3000).

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Mistral** (chat + embeddings RAG) ou **Ollama** en local
- Widget embarquable (`public/widget/bulle.js`)
- Persistance **Vercel Blob** (sites, index, analytics, quotas)
- Tailwind CSS 4

### Services en production

| Service | Requis | Rôle |
|---|---|---|
| Vercel | oui | Hébergement, API, cron hebdomadaire |
| Vercel Blob | oui | Config sites, index RAG, stats, quotas |
| Mistral | oui | Réponses IA + embeddings |
| Upstash Redis | non | Rate limit minute partagé entre instances (optionnel) |

Sans Upstash, le rate limit court terme tourne en mémoire par instance. Les quotas journaliers (50 chats, 3 syncs) restent centralisés dans Blob.

## Démarrage rapide

```bash
npm install
cp .env.example .env
npm run dev
```

→ http://localhost:3001

## Dev vs production

| Environnement | Provider | Pourquoi |
|---|---|---|
| **Local** (`npm run dev`) | `ollama` | Gratuit, sur la machine |
| **Vercel** (prod) | `mistral` | API Mistral directe, fiable |

Le widget sur un site client **n'exécute pas l'IA**. Il envoie les messages à l'API Bulle (Vercel), qui appelle Mistral :

```
Visiteur → widget JS → /api/chat (Vercel) → Mistral → stream
```

## Déployer sur Vercel

1. Variables sur Vercel :
   ```
   BULLE_PROVIDER=mistral
   BULLE_MODEL=mistral-small-latest
   MISTRAL_API_KEY=...
   BULLE_ADMIN_SECRET=...
   NEXT_PUBLIC_BULLE_URL=https://bulle-chatbot.vercel.app
   BLOB_READ_WRITE_TOKEN=...
   CRON_SECRET=...
   ```
2. Sur les sites clients :
   ```html
   <script
     src="https://bulle-chatbot.vercel.app/widget/bulle.js"
     data-site-key="bulle_..."
     data-api="https://bulle-chatbot.vercel.app"
     defer
   ></script>
   ```

Voir [DEPLOY.md](DEPLOY.md) pour le détail.

## Modèles IA

### Ollama (local)

```bash
ollama pull llama3.2
```

```env
BULLE_PROVIDER=ollama
BULLE_MODEL=llama3.2
```

### Mistral (production)

```env
BULLE_PROVIDER=mistral
BULLE_MODEL=mistral-small-latest
MISTRAL_API_KEY=...
```

Avec `MISTRAL_API_KEY`, Bulle indexe aussi les embeddings (`mistral-embed`) pour un RAG plus précis.

## Multi-sites

Chaque client a sa propre clé site. Création via l'API admin :

```bash
curl -X POST https://bulle-chatbot.vercel.app/api/sites \
  -H "Authorization: Bearer $BULLE_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"name":"Mon client","domain":"monsite.fr"}'
```

Les sites sont persistés dans Vercel Blob. Tableau de bord : `/admin` (jauges de consommation, quotas, indexation, édition des sites).

## Intégration site externe

Snippet direct (dev ou sites sans proxy) :

```html
<script
  src="http://localhost:3001/widget/bulle.js"
  data-site-key="bulle_votre_cle"
  data-api="http://localhost:3001"
  defer
></script>
```

En production, préférer le **proxy same-origin** pour éviter les blocages adblock : voir [docs/INTEGRATION.md](docs/INTEGRATION.md).

Générer une clé : `npm run generate-site-key`

## Variables d'environnement

| Variable | Description |
|---|---|
| `BULLE_PROVIDER` | `ollama` ou `mistral` |
| `BULLE_MODEL` | Nom du modèle |
| `MISTRAL_API_KEY` | Clé API Mistral (chat + embeddings) |
| `BULLE_ADMIN_SECRET` | Secret pour créer des sites et accéder à `/admin` |
| `BLOB_READ_WRITE_TOKEN` | Persistance index, sites, analytics et quotas |
| `CRON_SECRET` | Protection du cron de re-indexation |
| `NEXT_PUBLIC_BULLE_URL` | URL publique du serveur Bulle |
| `BULLE_CRAWL_MAX_PAGES` | Limite de pages crawlées (défaut : 30) |
| `BULLE_DEFAULT_MAX_CHATS_PER_DAY` | Quota chats / jour des nouveaux sites (défaut : 50) |
| `BULLE_DEFAULT_MAX_SYNCS_PER_DAY` | Quota syncs / jour des nouveaux sites (défaut : 3) |
| `UPSTASH_REDIS_REST_URL` | Rate limit distribué (optionnel) |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limit distribué (optionnel) |

## Scripts

```bash
npm run dev      # Next dev :3001
npm run build    # production
npm run start    # serveur prod local
npm run lint
npm run test     # tests unitaires
```

## Contact

- Hugo Davion — [bulletonsite.com](https://bulletonsite.com)
