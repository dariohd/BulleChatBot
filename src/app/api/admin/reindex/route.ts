import { requireAdmin } from "@/lib/auth";
import { indexSite } from "@/lib/index/service";
import { getSiteByKey } from "@/lib/sites";
import { adminReindexSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const parsed = adminReindexSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Données invalides" }, { status: 400 });
    }

    const site = await getSiteByKey(parsed.data.siteKey);
    const index = await indexSite(parsed.data.siteKey, {
      origin: site?.baseUrl,
      force: parsed.data.force ?? true,
    });

    return Response.json({
      ok: true,
      pageCount: index.pageCount,
      chunkCount: index.chunks.length,
      indexedAt: index.indexedAt,
      baseUrl: index.baseUrl,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Erreur d'indexation",
      },
      { status: 500 }
    );
  }
}
