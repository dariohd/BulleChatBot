import { requireAdmin } from "@/lib/auth";
import { rotateSiteKey, toAdminSiteView } from "@/lib/sites";
import { rotateSiteKeySchema } from "@/lib/validation";

export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const parsed = rotateSiteKeySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "siteKey requis" }, { status: 400 });
    }

    const rotated = await rotateSiteKey(parsed.data.siteKey);
    if (!rotated) {
      return Response.json({ error: "Site non trouvé" }, { status: 404 });
    }

    return Response.json(toAdminSiteView(rotated));
  } catch {
    return Response.json({ error: "Erreur rotation" }, { status: 500 });
  }
}
