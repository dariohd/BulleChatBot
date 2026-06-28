import {
  getIndexStatus,
  indexSite,
} from "@/lib/index/service";
import { corsHeaders, jsonWithCors, optionsResponse } from "@/lib/cors";
import { getSiteByKey, isDomainAllowed } from "@/lib/sites";
import type { IndexSyncRequest } from "@/lib/types";

export const maxDuration = 60;

export async function OPTIONS(req: Request) {
  return optionsResponse(req.headers.get("origin"));
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");

  try {
    const body = (await req.json()) as IndexSyncRequest;
    const siteKey =
      body.siteKey ?? req.headers.get("x-bulle-site-key") ?? "";

    if (!siteKey) {
      return jsonWithCors({ error: "Clé de site manquante" }, { status: 400, origin });
    }

    const site = getSiteByKey(siteKey);
    if (!site) {
      return jsonWithCors({ error: "Site non reconnu" }, { status: 404, origin });
    }

    if (!isDomainAllowed(site, origin ?? body.origin ?? null)) {
      return jsonWithCors(
        { error: "Domaine non autorisé" },
        { status: 403, origin }
      );
    }

    const status = await getIndexStatus(siteKey);
    if (status.indexed && !status.stale && !body.force) {
      return jsonWithCors({ status: "fresh", ...status }, { origin });
    }

    const index = await indexSite(siteKey, {
      origin: body.origin ?? origin ?? undefined,
      force: body.force,
    });

    return jsonWithCors(
      {
        status: "indexed",
        pageCount: index.pageCount,
        chunkCount: index.chunks.length,
        indexedAt: index.indexedAt,
        baseUrl: index.baseUrl,
        siteName: index.siteName,
      },
      { origin }
    );
  } catch (error) {
    console.error("[Bulle index/sync]", error);
    return jsonWithCors(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de l'indexation",
      },
      { status: 500, origin }
    );
  }
}

export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  const { searchParams } = new URL(req.url);
  const siteKey =
    searchParams.get("siteKey") ??
    req.headers.get("x-bulle-site-key") ??
    "";

  if (!siteKey) {
    return jsonWithCors({ error: "siteKey requis" }, { status: 400, origin });
  }

  const site = getSiteByKey(siteKey);
  if (!site) {
    return jsonWithCors({ error: "Site non reconnu" }, { status: 404, origin });
  }

  const status = await getIndexStatus(siteKey);
  return jsonWithCors(status, { origin });
}
