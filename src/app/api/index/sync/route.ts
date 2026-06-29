import { trackIndexSync } from "@/lib/analytics";
import { getIndexStatus, indexSite } from "@/lib/index/service";
import { extractHost } from "@/lib/index/store";
import { checkSiteQuotas } from "@/lib/quotas";
import {
  jsonWithCors,
  optionsResponse,
  rateLimitResponse,
} from "@/lib/cors";
import {
  checkSyncRateLimit,
  getRequestClientId,
} from "@/lib/rate-limit";
import { getSiteByKey, isDomainAllowed } from "@/lib/sites";
import { dispatchWebhook } from "@/lib/webhooks";
import { indexSyncRequestSchema } from "@/lib/validation";

export const maxDuration = 60;

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  const siteKey = req.headers.get("x-bulle-site-key") ?? "";
  if (!origin || !siteKey) {
    return optionsResponse(origin, false);
  }
  const site = await getSiteByKey(siteKey);
  const allowed = site ? isDomainAllowed(site, origin) : false;
  return optionsResponse(origin, allowed);
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");

  try {
    const raw = await req.json();
    const parsed = indexSyncRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonWithCors(
        { error: "Données invalides" },
        { status: 400, origin, allowed: Boolean(origin) }
      );
    }

    const siteKey =
      parsed.data.siteKey ?? req.headers.get("x-bulle-site-key") ?? "";

    if (!siteKey) {
      return jsonWithCors(
        { error: "Clé de site manquante" },
        { status: 400, origin, allowed: false }
      );
    }

    const site = await getSiteByKey(siteKey);
    if (!site) {
      return jsonWithCors(
        { error: "Site non reconnu" },
        { status: 404, origin, allowed: false }
      );
    }

    const crawlOrigin = parsed.data.origin ?? origin ?? undefined;
    if (!isDomainAllowed(site, crawlOrigin ?? origin ?? null)) {
      return jsonWithCors(
        { error: "Domaine non autorisé" },
        { status: 403, origin, allowed: false }
      );
    }

    const rateLimit = await checkSyncRateLimit(getRequestClientId(req, siteKey));
    if (!rateLimit.allowed) {
      return rateLimitResponse(origin, rateLimit.retryAfterSec ?? 300, true);
    }

    const quota = await checkSiteQuotas(site, "sync");
    if (!quota.allowed) {
      return jsonWithCors(
        { error: quota.reason ?? "Quota atteint" },
        { status: 429, origin, allowed: true }
      );
    }

    const status = await getIndexStatus(siteKey, crawlOrigin);
    if (status.indexed && !status.stale && !parsed.data.force) {
      return jsonWithCors(
        { status: "fresh", ...status },
        { origin, allowed: true }
      );
    }

    const index = await indexSite(siteKey, {
      origin: crawlOrigin,
      force: parsed.data.force,
    });

    void trackIndexSync(siteKey, {
      host: extractHost(index.baseUrl) ?? undefined,
      pageCount: index.pageCount,
    });

    void dispatchWebhook(site, {
      type: "index.completed",
      pageCount: index.pageCount,
      baseUrl: index.baseUrl,
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
      { origin, allowed: true }
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
      { status: 500, origin, allowed: Boolean(origin) }
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
    return jsonWithCors(
      { error: "siteKey requis" },
      { status: 400, origin, allowed: false }
    );
  }

  const site = await getSiteByKey(siteKey);
  if (!site) {
    return jsonWithCors(
      { error: "Site non reconnu" },
      { status: 404, origin, allowed: false }
    );
  }

  if (!isDomainAllowed(site, origin)) {
    return jsonWithCors(
      { error: "Domaine non autorisé" },
      { status: 403, origin, allowed: false }
    );
  }

  const status = await getIndexStatus(
    siteKey,
    searchParams.get("origin") ?? origin ?? undefined
  );
  return jsonWithCors(status, { origin, allowed: true });
}
