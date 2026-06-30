# Intégration Bulle sur un site client

## Snippet standard (dev ou test rapide)

Collez avant `</body>`. En production, le build sert un fichier versionné (`bulle.v030.js` via `manifest.json`) ; `bulle.js` reste un alias de compatibilité :

```html
<script
  src="https://bulle-chatbot.vercel.app/widget/bulle.js"
  data-site-key="bulle_VOTRE_CLE"
  data-api="https://bulle-chatbot.vercel.app"
  defer
></script>
```

## Production : proxy same-origin (recommandé)

Les appels API passent par **votre propre domaine** via un rewrite Vercel. Les bloqueurs de pub ne ciblent pas les requêtes same-origin.

Dans `vercel.json` du site client :

```json
{
  "rewrites": [
    {
      "source": "/api/bulle/:path*",
      "destination": "https://bulle-chatbot.vercel.app/api/:path*"
    }
  ]
}
```

Snippet (sans `data-api`, le widget utilise `/api/bulle` sur le même domaine) :

```html
<script
  src="https://bulle-chatbot.vercel.app/widget/bulle.js"
  data-site-key="bulle_VOTRE_CLE"
  data-proxy="same-origin"
  defer
></script>
```

Référence : portfolio [hugodavion](https://hugodavion.vercel.app) (`vercel.json` + `data-proxy="same-origin"`).

## Next.js (App Router)

Dans `app/layout.tsx` :

```tsx
import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <Script
          src="https://bulle-chatbot.vercel.app/widget/bulle.js"
          data-site-key="bulle_VOTRE_CLE"
          data-proxy="same-origin"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
```

Avec proxy, ajouter le rewrite dans `vercel.json` à la racine du projet.

## Vérification

1. Ouvrir le site client
2. La bulle apparaît en bas à droite
3. Première visite : indexation silencieuse (quelques secondes)
4. Poser une question sur le contenu du site
5. Admin Bulle : `/admin` pour voir l'état d'indexation et la consommation

## Créer une nouvelle clé

```bash
curl -X POST https://bulle-chatbot.vercel.app/api/sites \
  -H "Authorization: Bearer VOTRE_BULLE_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"name":"Nom du site","domain":"mondomaine.fr,www.mondomaine.fr"}'
```

La réponse contient `siteKey` à utiliser dans le snippet. Les nouveaux sites héritent des quotas par défaut (50 chats/jour, 3 syncs/jour).

## Personnalisation

Via `PATCH /api/sites` (admin) :

- `welcomeMessage` : message d'accueil
- `primaryColor` : couleur de la bulle
- `tone` : ton des réponses
- `instructions` : consignes additionnelles
- `quotas.maxChatsPerDay` : quota conversations / jour
- `quotas.maxSyncsPerDay` : quota synchronisations / jour

## RGPD

Le widget affiche « Assistant IA · Propulsé par Bulle ». Bulle précise dans ses réponses qu'elles sont générées par intelligence artificielle si le visiteur le demande.

Les conversations sont consultables et supprimables depuis l'admin (`/api/admin/logs`).
