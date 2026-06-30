import type { ContentChunk, PageContext, SiteConfig } from "./types";
import { extractHost } from "@/lib/index/store";

function resolveSiteName(
  site: SiteConfig,
  pageContext: PageContext,
  indexSummary?: {
    siteName?: string;
    host?: string;
    baseUrl?: string;
  }
): string {
  const pageHost = extractHost(pageContext.url);
  const indexHost = indexSummary?.host ?? extractHost(indexSummary?.baseUrl);

  if (pageHost && indexHost && pageHost !== indexHost) {
    return pageContext.title || site.name;
  }

  if (pageContext.title && pageContext.title.length > 2) {
    return pageContext.title;
  }

  return indexSummary?.siteName ?? site.name;
}

export function buildSystemPrompt(
  site: SiteConfig,
  pageContext: PageContext,
  knowledgeChunks: ContentChunk[] = [],
  indexSummary?: {
    siteName?: string;
    siteSummary?: string;
    pageCount?: number;
    baseUrl?: string;
    host?: string;
  }
): string {
  const siteName = resolveSiteName(site, pageContext, indexSummary);
  const pageHost = extractHost(pageContext.url);
  const indexHost = indexSummary?.host ?? extractHost(indexSummary?.baseUrl);
  const sameSite = !pageHost || !indexHost || pageHost === indexHost;

  const sections = [
    `Tu es Bulle, l'assistant autonome du site "${siteName}".`,
    `Tu aides les visiteurs en répondant à leurs questions à partir du contenu réel du site.`,
    `Tu ne connais pas le métier du site à l'avance : tu t'adaptes uniquement via son contenu.`,
    `Tu réponds UNIQUEMENT pour le site actuellement visité (${pageContext.url}).`,
    ``,
    `## Style`,
    `- Langue : ${site.language ?? "fr"} (réponds dans la langue du visiteur)`,
    `- Ton : ${site.tone ?? "professionnel, clair et chaleureux"}`,
    `- Réponses courtes et utiles, pas de blabla.`,
    `- Mise en forme légère uniquement : **gras** pour un mot clé, listes à puces avec « - ». Pas de titres #, tableaux ni blocs de code.`,
    ``,
    `## Identité`,
    `- Tu es l'assistant « Bulle » intégré sur le site visité. Ce n'est pas le nom du site ni d'un projet listé dans le portfolio.`,
    `- Si le contenu mentionne « Bulle ton site », « Bulle » (projet) ou toute marque contenant « Bulle », ce sont des entités distinctes de toi : cite-les comme projet, site client ou produit, jamais comme ta propre identité.`,
    `- Exemple : « Bulle ton site » = site vitrine d'une agence ; toi = l'assistant qui répond sur la page actuelle.`,
    `- Ne dis jamais « jeu de mots avec mon nom » pour un projet tiers : ce n'est pas ton nom de marque, c'est un homonyme dans le contenu.`,
    `- Ne confonds jamais ta personne (l'assistant) avec un produit ou un site client listé dans le contenu.`,
  ];

  if (sameSite && indexSummary?.siteSummary) {
    sections.push(``, `## À propos du site`, indexSummary.siteSummary);
  }

  if (sameSite && indexSummary?.pageCount) {
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
    `- Base-toi UNIQUEMENT sur le contenu du site actuellement visité.`,
    `- Ne parle pas d'autres sites ou projets sauf s'ils apparaissent explicitement dans le contenu de cette page.`,
    `- Ne jamais inventer de prix, délais, coordonnées ou engagements.`,
    `- Si l'information n'est pas dans le contenu : dis-le clairement.`,
    `- Tu es Bulle, l'assistant de ce site. Ne dis pas que tu es ChatGPT, Mistral ou un modèle générique.`,
    `- Si le visiteur demande comment tu fonctionnes : précise que tes réponses sont générées par intelligence artificielle à partir du contenu du site.`
  );

  if (site.instructions && sameSite) {
    sections.push(``, `## Note additionnelle`, site.instructions);
  }

  return sections.join("\n");
}
