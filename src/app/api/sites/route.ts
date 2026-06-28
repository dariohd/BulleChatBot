import { createSite, getSiteByKey, listSites, updateSite } from "@/lib/sites";
import { jsonWithCors, optionsResponse } from "@/lib/cors";

export async function OPTIONS(req: Request) {
  return optionsResponse(req.headers.get("origin"));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const siteKey = searchParams.get("siteKey");

  if (siteKey) {
    const site = getSiteByKey(siteKey);
    if (!site) {
      return jsonWithCors({ error: "Site non trouvé" }, { status: 404 });
    }
    const { siteKey: _, ...publicConfig } = site;
    return jsonWithCors({
      id: site.id,
      name: site.name,
      welcomeMessage: site.welcomeMessage,
      primaryColor: site.primaryColor,
      language: site.language,
    });
  }

  return jsonWithCors({ sites: listSites().map((s) => ({
    id: s.id,
    name: s.name,
    domain: s.domain,
    siteKey: s.siteKey,
    createdAt: s.createdAt,
  })) });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const site = createSite({
      name: body.name,
      domain: body.domain,
      instructions: body.instructions,
      tone: body.tone,
      language: body.language,
      welcomeMessage: body.welcomeMessage,
      primaryColor: body.primaryColor,
    });
    return jsonWithCors(site, { status: 201 });
  } catch {
    return jsonWithCors({ error: "Données invalides" }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { siteKey, ...updates } = body;
    if (!siteKey) {
      return jsonWithCors({ error: "siteKey requis" }, { status: 400 });
    }
    const updated = updateSite(siteKey, updates);
    if (!updated) {
      return jsonWithCors({ error: "Site non trouvé" }, { status: 404 });
    }
    return jsonWithCors(updated);
  } catch {
    return jsonWithCors({ error: "Données invalides" }, { status: 400 });
  }
}
