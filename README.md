# Bulle

Assistant IA autonome et embarquable pour vos sites web.

Bulle tourne sur le **port 3001** pour ne pas entrer en conflit avec d'autres projets locaux (ex. bulletonsite sur 3000).

## Démarrage rapide

```bash
npm install
cp .env.example .env
npm run dev
```

Ouvrir **http://localhost:3001** pour tester Bulle seul, sans greffer sur un autre site.

## Dev vs Production

| Environnement | Provider | Pourquoi |
|---|---|---|
| **Local** (`npm run dev`) | `ollama` | Gratuit, tourne sur ta machine |
| **Vercel** (prod) | `gateway` | Ollama n'est pas accessible depuis le cloud |

### Comment ça marche quand Bulle est greffé sur d'autres sites

Le widget sur bulletonsite (ou n'importe quel site) **n'exécute pas l'IA**. Il envoie les messages à ton serveur Bulle (sur Vercel). C'est **Vercel** qui appelle le modèle.

```
Visiteur sur bulletonsite.fr
    → widget Bulle (JS)
    → API Bulle sur Vercel (bulle.vercel.app/api/chat)
    → Mistral / Claude / Gemini via AI Gateway
    → réponse streamée au visiteur
```

Ollama n'intervient que si l'API tourne sur ta machine locale.

### Déployer sur Vercel avec un vrai modèle

1. Activer **AI Gateway** dans le dashboard Vercel (Settings → AI Gateway)
2. Configurer les variables d'environnement sur Vercel :
   ```
   BULLE_PROVIDER=gateway
   BULLE_MODEL=mistral/mistral-small-latest
   NEXT_PUBLIC_BULLE_URL=https://ton-domaine-bulle.vercel.app
   ```
3. Sur tes sites clients, pointer `data-api` vers l'URL Vercel :
   ```html
   <script
     src="https://ton-domaine-bulle.vercel.app/widget/bulle.js"
     data-site-key="bulle_..."
     data-api="https://ton-domaine-bulle.vercel.app"
     defer
   ></script>
   ```

## Modèle IA (sans OpenAI)

Par défaut, Bulle utilise **Ollama** en local (gratuit, sans clé API).

### Option 1 : Ollama (recommandé pour tester)

1. Installer [Ollama](https://ollama.com)
2. Télécharger un modèle :
   ```bash
   ollama pull llama3.2
   ```
3. Dans `.env` :
   ```env
   BULLE_PROVIDER=ollama
   BULLE_MODEL=llama3.2
   ```

### Option 2 : Mistral

```env
BULLE_PROVIDER=mistral
BULLE_MODEL=mistral-small-latest
MISTRAL_API_KEY=votre_cle
```

### Option 3 : Anthropic (Claude)

```env
BULLE_PROVIDER=anthropic
BULLE_MODEL=claude-3-5-haiku-latest
ANTHROPIC_API_KEY=votre_cle
```

### Option 4 : Google (Gemini)

```env
BULLE_PROVIDER=google
BULLE_MODEL=gemini-2.0-flash
GOOGLE_GENERATIVE_AI_API_KEY=votre_cle
```

## Intégration sur un site externe

```html
<script
  src="http://localhost:3001/widget/bulle.js"
  data-site-key="bulle_votre_cle"
  data-api="http://localhost:3001"
  defer
></script>
```

En production, remplacer par l'URL de votre serveur Bulle déployé.

## Variables d'environnement

| Variable | Description |
|---|---|
| `BULLE_PROVIDER` | `ollama`, `mistral`, `anthropic` ou `google` |
| `BULLE_MODEL` | Nom du modèle selon le provider |
| `OLLAMA_BASE_URL` | Non utilisé (Ollama sur `localhost:11434` par défaut) |
| `MISTRAL_API_KEY` | Clé API Mistral |
| `ANTHROPIC_API_KEY` | Clé API Anthropic |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Clé API Google |
| `NEXT_PUBLIC_BULLE_URL` | URL publique du serveur Bulle |
