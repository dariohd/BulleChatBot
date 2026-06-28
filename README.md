# Bulle

Assistant IA embarquable pour sites web — widget JS + API Next.js.

| | |
|---|---|
| **URL production** | https://bulle-chatbot.vercel.app |
| **Dépôt GitHub** | [github.com/dariohd/BulleChatBot](https://github.com/dariohd/BulleChatBot) |
| **Notes techniques** | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |

Bulle tourne sur le **port 3001** en local pour éviter le conflit avec bulletonsite (3000).

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Vercel AI SDK** — Ollama, Mistral, Anthropic, Google, AI Gateway
- Widget embarquable (`public/widget/bulle.js`)
- Tailwind CSS 4

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
| **Vercel** (prod) | `gateway` | Ollama inaccessible depuis le cloud |

Le widget sur un site client **n'exécute pas l'IA**. Il envoie les messages à l'API Bulle (Vercel), qui appelle le modèle :

```
Visiteur → widget JS → /api/chat (Vercel) → Mistral / Claude / Gemini (AI Gateway) → stream
```

Ollama n'intervient qu'en local.

## Déployer sur Vercel

1. Activer **AI Gateway** (Settings → AI Gateway)
2. Variables sur Vercel :
   ```
   BULLE_PROVIDER=gateway
   BULLE_MODEL=mistral/mistral-small-latest
   NEXT_PUBLIC_BULLE_URL=https://ton-domaine-bulle.vercel.app
   ```
3. Sur les sites clients :
   ```html
   <script
     src="https://ton-domaine-bulle.vercel.app/widget/bulle.js"
     data-site-key="bulle_..."
     data-api="https://ton-domaine-bulle.vercel.app"
     defer
   ></script>
   ```

## Modèles IA

### Ollama (local)

```bash
ollama pull llama3.2
```

```env
BULLE_PROVIDER=ollama
BULLE_MODEL=llama3.2
```

### Mistral / Anthropic / Google

Voir `.env.example` pour `MISTRAL_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`.

## Intégration site externe

```html
<script
  src="http://localhost:3001/widget/bulle.js"
  data-site-key="bulle_votre_cle"
  data-api="http://localhost:3001"
  defer
></script>
```

Générer une clé : `npm run generate-site-key`

## Variables d'environnement

| Variable | Description |
|---|---|
| `BULLE_PROVIDER` | `ollama`, `mistral`, `anthropic`, `google`, `gateway` |
| `BULLE_MODEL` | Nom du modèle selon le provider |
| `MISTRAL_API_KEY` | Clé API Mistral |
| `ANTHROPIC_API_KEY` | Clé API Anthropic |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Clé API Google |
| `NEXT_PUBLIC_BULLE_URL` | URL publique du serveur Bulle |

## Scripts

```bash
npm run dev      # Next dev :3001
npm run build    # production
npm run start    # serveur prod local
npm run lint
```

## Contact

- Hugo Davion — [bulletonsite.com](https://bulletonsite.com)
