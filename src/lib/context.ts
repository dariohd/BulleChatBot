import type { ContentChunk, PageContext, SiteConfig } from "./types";

export function buildSystemPrompt(
  site: SiteConfig,
  pageContext: PageContext,
  knowledgeChunks: ContentChunk[] = [],
  indexSummary?: { siteName?: string; siteSummary?: string; pageCount?: number }
): string {
  const siteName = indexSummary?.siteName ?? site.name;

  const sections = [
    `Tu es Bulle, l'assistant autonome du site "${siteName}".`,
    `Tu aides les visiteurs en répondant à leurs questions à partir du contenu réel du site.`,
    `Tu ne connais pas le métier du site à l'avance : tu t'adaptes uniquement via son contenu.`,
    ``,
    `## Style`,
    `- Langue : ${site.language ?? "fr"} (réponds dans la langue du visiteur)`,
    `- Ton : ${site.tone ?? "professionnel, clair et chaleureux"}`,
    `- Réponses courtes et utiles, pas de blabla.`,
  ];

  if (indexSummary?.siteSummary) {
    sections.push(``, `## À propos du site`, indexSummary.siteSummary);
  }

  if (indexSummary?.pageCount) {
    sections.push(
      `Bulle a indexé ${indexSummary.pageCount} pages de ce site.`
    );
  }

  sections.push(
    ``,
    `## Page visitée`,
    `- URL : ${pageContext.url}`,
    `- Titre : ${pageContext.title}`
  );

  if (pageContext.description) {
    sections.push(`- Description : ${pageContext.description}`);
  }

  if (pageContext.headings.length > 0) {
    sections.push(
      `- Sections : ${pageContext.headings.slice(0, 8).join(" | ")}`
    );
  }

  if (pageContext.content) {
    sections.push(
      ``,
      `## Contenu de la page actuelle`,
      pageContext.content.slice(0, 5000)
    );
  }

  if (knowledgeChunks.length > 0) {
    sections.push(``, `## Extraits pertinents du site`);
    for (const chunk of knowledgeChunks) {
      sections.push(
        `### ${chunk.title} (${chunk.url})`,
        chunk.text.slice(0, 1200),
        ``
      );
    }
  }

  sections.push(
    `## Règles strictes`,
    `- Base-toi UNIQUEMENT sur le contenu du site fourni ci-dessus.`,
    `- Ne jamais inventer de prix, délais, coordonnées ou engagements.`,
    `- Si l'information n'est pas dans le contenu : dis-le clairement et oriente vers une page du site ou un contact humain.`,
    `- Propose des liens vers des pages du site quand c'est utile (utilise les URLs fournies).`,
    `- Tu es Bulle, l'assistant de ce site. Ne dis pas que tu es ChatGPT, Mistral ou un modèle générique.`,
    `- Reste dans ton rôle d'assistant du site, même pour des questions générales.`
  );

  if (site.instructions) {
    sections.push(``, `## Note additionnelle`, site.instructions);
  }

  return sections.join("\n");
}
