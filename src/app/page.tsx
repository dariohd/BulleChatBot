import type { Metadata } from "next";
import Script from "next/script";
import { getBullePublicUrl, getDemoSiteKey } from "@/lib/demo";

const baseUrl = getBullePublicUrl();

export default function Home() {
  const siteKey = getDemoSiteKey();
  const snippet = `<script
  src="${baseUrl}/widget/bulle.js"
  data-site-key="${siteKey}"
  data-api="${baseUrl}"
  defer
></script>`;

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-lg font-bold text-white">
              B
            </div>
            <div>
              <h1 className="text-lg font-semibold">Bulle</h1>
              <p className="text-sm text-[var(--muted)]">
                Assistant IA embarquable
              </p>
            </div>
          </div>
          <a
            href="#integration"
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Intégrer sur un site
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--accent)]">
            Chatbot autonome
          </p>
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Un assistant qui s&apos;adapte à chaque site
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-[var(--muted)]">
            Installez Bulle en une ligne. Il explore le site, indexe son contenu
            et répond aux visiteurs sans configuration métier, sur n&apos;importe
            quel site.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {[
            {
              title: "Auto-indexation",
              desc: "Au premier chargement, Bulle explore le site (sitemap, pages) et construit sa base de connaissances.",
            },
            {
              title: "Universel",
              desc: "Aucun métier ciblé. Bulle s'adapte au contenu réel de chaque site, quel qu'il soit.",
            },
            {
              title: "Autonome",
              desc: "Re-indexation hebdomadaire, réponses contextualisées, garde-fous anti-invention.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6"
            >
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="integration"
        className="border-t border-[var(--border)] bg-[var(--card)]"
      >
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-2xl font-bold">Intégration en 30 secondes</h2>
          <p className="mt-3 max-w-xl text-[var(--muted)]">
            Collez ce snippet avant la balise{" "}
            <code className="rounded bg-[var(--accent-light)] px-1.5 py-0.5 text-sm text-[var(--accent)]">
              &lt;/body&gt;
            </code>{" "}
            de votre site.
          </p>

          <pre className="mt-6 overflow-x-auto rounded-xl border border-[var(--border)] bg-[#0f172a] p-5 text-sm leading-relaxed text-[#e2e8f0]">
            <code>{snippet}</code>
          </pre>

          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="font-semibold">Créer un nouveau site</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Appelez l&apos;API pour enregistrer un site et obtenir une clé
                unique.
              </p>
              <pre className="mt-3 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 text-xs">
                <code>{`POST ${baseUrl}/api/sites
{
  "name": "Mon entreprise",
  "domain": "monsite.fr",
  "instructions": "Tu es l'assistant de Mon Entreprise...",
  "welcomeMessage": "Bonjour !",
  "primaryColor": "#2563eb"
}`}</code>
              </pre>
            </div>
            <div>
              <h3 className="font-semibold">Personnalisation</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Chaque site peut avoir ses propres instructions, ton, couleur et
                message d&apos;accueil.
              </p>
              <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                <li>
                  <code className="text-xs">data-site-key</code> — clé du site
                  (obligatoire)
                </li>
                <li>
                  <code className="text-xs">data-api</code> — URL du serveur
                  Bulle
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-2xl font-bold">Comment ça marche</h2>
        <div className="mt-8 space-y-6">
          {[
            {
              step: "1",
              title: "Le visiteur ouvre Bulle",
              desc: "La bulle flottante apparaît en bas à droite de la page.",
            },
            {
              step: "2",
              title: "Bulle lit la page",
              desc: "Titre, description, titres et contenu principal sont extraits automatiquement.",
            },
            {
              step: "3",
              title: "Conversation contextualisée",
              desc: "Chaque question est traitée avec le contexte du site et de la page actuelle.",
            },
          ].map((item) => (
            <div key={item.step} className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-light)] text-sm font-bold text-[var(--accent)]">
                {item.step}
              </div>
              <div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--border)] py-8 text-center text-sm text-[var(--muted)]">
        Bulle — Assistant IA pour vos sites
      </footer>

      <Script
        src="/widget/bulle.js"
        data-site-key={siteKey}
        data-api={baseUrl}
        strategy="lazyOnload"
      />
    </main>
  );
}
