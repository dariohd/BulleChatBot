import { isAdminRequest } from "@/lib/auth";
import { deleteSiteAnalytics } from "@/lib/analytics";
import {
  createSite,
  deleteSite,
  getSiteByKey,
  listSites,
  toAdminSiteView,
  toPublicSiteConfig,
  updateSite,
} from "@/lib/sites";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import {
  createSiteSchema,
  deleteSiteSchema,
  updateSiteSchema,
} from "@/lib/validation";

export async function OPTIONS(req: Request) {
  return optionsResponse(req.headers.get("origin"), false);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const siteKey = searchParams.get("siteKey");
  const origin = req.headers.get("origin");

  if (siteKey) {
    const site = await getSiteByKey(siteKey);
    if (!site) {
      return jsonWithCors({ error: "Site non trouvé" }, { status: 404 });
    }
    if (isAdminRequest(req)) {
      return jsonWithCors(toAdminSiteView(site));
    }
    return jsonWithCors(toPublicSiteConfig(site), {
      origin,
      allowed: Boolean(origin),
    });
  }

  if (!isAdminRequest(req)) {
    return jsonWithCors({ error: "Non autorisé" }, { status: 401 });
  }

  const sites = await listSites();
  return jsonWithCors({
    sites: sites.map((site) => ({
      id: site.id,
      name: site.name,
      domain: site.domain,
      siteKey: site.siteKey,
      createdAt: site.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return jsonWithCors({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createSiteSchema.safeParse(body);
    if (!parsed.success) {
      return jsonWithCors(
        { error: "Données invalides", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const site = await createSite(parsed.data);
    return jsonWithCors(toAdminSiteView(site), { status: 201 });
  } catch (error) {
    console.error("[Bulle sites] create:", error);
    return jsonWithCors({ error: "Erreur lors de la création" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!isAdminRequest(req)) {
    return jsonWithCors({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = updateSiteSchema.safeParse(body);
    if (!parsed.success) {
      return jsonWithCors({ error: "Données invalides" }, { status: 400 });
    }

    const { siteKey, ...updates } = parsed.data;
    const updated = await updateSite(siteKey, updates);
    if (!updated) {
      return jsonWithCors({ error: "Site non trouvé" }, { status: 404 });
    }
    return jsonWithCors(toAdminSiteView(updated));
  } catch {
    return jsonWithCors({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!isAdminRequest(req)) {
    return jsonWithCors({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = deleteSiteSchema.safeParse(body);
    if (!parsed.success) {
      return jsonWithCors({ error: "siteKey requis" }, { status: 400 });
    }

    const deleted = await deleteSite(parsed.data.siteKey);
    if (!deleted) {
      return jsonWithCors({ error: "Site non trouvé" }, { status: 404 });
    }

    await deleteSiteAnalytics(parsed.data.siteKey);
    return jsonWithCors({ ok: true });
  } catch {
    return jsonWithCors({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
