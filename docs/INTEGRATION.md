# Intégration Bulle sur un site client

## Snippet standard

Collez avant `</body>`. En production, le build sert un fichier versionné (`bulle.v030.js` via `manifest.json`) ; `bulle.js` reste un alias de compatibilité :

```html
<script
  src="https://bulle-chatbot.vercel.app/widget/bulle.js"  data-site-key="bulle_VOTRE_CLE"
  data-api="https://bulle-chatbot.vercel.app"
  defer
></script>
```

## Bulle ton site (bulletonsite)

Projet séparé sur le port 3000. Snippet à intégrer dans le layout principal :

```html
<script
  src="https://bulle-chatbot.vercel.app/widget/bulle.js"
  data-site-key="bulle_VOTRE_CLE"
  data-api="https://bulle-chatbot.vercel.app"
  defer
></script>
```

Domaines autorisés pour cette clé : `localhost`, `bulletonsite.vercel.app`.

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
          data-api="https://bulle-chatbot.vercel.app"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
```

## Vérification

1. Ouvrir le site client
2. La bulle apparaît en bas à droite
3. Première visite : indexation silencieuse (quelques secondes)
4. Poser une question sur le contenu du site

## Créer une nouvelle clé

```bash
curl -X POST https://bulle-chatbot.vercel.app/api/sites \
  -H "Authorization: Bearer VOTRE_BULLE_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"name":"Nom du site","domain":"mondomaine.fr,www.mondomaine.fr"}'
```

La réponse contient `siteKey` à utiliser dans le snippet.

## Personnalisation

Via `PATCH /api/sites` (admin) :

- `welcomeMessage` : message d'accueil
- `primaryColor` : couleur de la bulle
- `tone` : ton des réponses
- `instructions` : consignes additionnelles

## RGPD

Le widget affiche « Assistant IA · Propulsé par Bulle ». Bulle précise dans ses réponses qu'elles sont générées par intelligence artificielle si le visiteur le demande.
