const CONTACT_PATTERNS =
  /contact|nous écrire|écrivez|joindre|prendre rendez-vous/i;
const ABOUT_PATTERNS =
  /à propos|a propos|about|qui suis|présentation|presentation|parcours/i;
const PROJECT_PATTERNS =
  /projets?|portfolio|réalisations|realisations|works|galerie/i;
const SERVICE_PATTERNS =
  /services?|prestations|offres|tarifs|solutions/i;
const STACK_PATTERNS = /stack|techno|compétences|competences|skills/i;

function normalizeKey(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function headingToQuestion(heading: string): string | null {
  const topic = heading.replace(/\s+/g, " ").trim();
  if (topic.length < 2 || topic.length > 80) return null;

  const lower = topic.toLowerCase();

  if (CONTACT_PATTERNS.test(lower)) return "Comment vous contacter ?";
  if (ABOUT_PATTERNS.test(lower)) return "Parlez-moi de ce site en bref.";
  if (PROJECT_PATTERNS.test(lower)) return "Quels projets sont présentés ici ?";
  if (SERVICE_PATTERNS.test(lower)) return "Quels services sont proposés ?";
  if (STACK_PATTERNS.test(lower)) return "Quelles technologies sont utilisées ?";

  const clean = topic.replace(/[?:!.…]+$/g, "").trim();
  if (clean.length < 4) return null;

  return `En savoir plus sur « ${clean} » ?`;
}

export function derivePageSuggestions(options: {
  headings?: string[];
  siteName?: string;
}): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  function push(question: string | null) {
    if (!question) return;
    const key = normalizeKey(question);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(question);
  }

  for (const heading of options.headings ?? []) {
    if (result.length >= 3) break;
    push(headingToQuestion(heading));
  }

  if (result.length < 3 && options.siteName) {
    push(`Que propose ${options.siteName} ?`);
  }

  if (result.length < 3) {
    push("Résumez ce site en quelques mots.");
  }
  if (result.length < 3) {
    push("Comment vous contacter ?");
  }

  return result.slice(0, 3);
}
