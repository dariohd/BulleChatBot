import { requireAdmin } from "@/lib/auth";
import {
  deleteConversationLogs,
  listConversationLogs,
  purgeOldConversations,
} from "@/lib/conversations";
import { getSiteByKey } from "@/lib/sites";
import { purgeLogsSchema } from "@/lib/validation";

export async function GET(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const siteKey = searchParams.get("siteKey");
  if (!siteKey) {
    return Response.json({ error: "siteKey requis" }, { status: 400 });
  }

  const site = await getSiteByKey(siteKey);
  if (!site) {
    return Response.json({ error: "Site non trouvé" }, { status: 404 });
  }

  const logs = await listConversationLogs(siteKey);
  return Response.json({ logs });
}

export async function DELETE(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const parsed = purgeLogsSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "siteKey requis" }, { status: 400 });
    }

    const site = await getSiteByKey(parsed.data.siteKey);
    if (!site) {
      return Response.json({ error: "Site non trouvé" }, { status: 404 });
    }

    const deleted = await deleteConversationLogs(parsed.data.siteKey);
    return Response.json({ ok: true, deleted });
  } catch {
    return Response.json({ error: "Erreur suppression" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const parsed = purgeLogsSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "siteKey requis" }, { status: 400 });
    }

    const site = await getSiteByKey(parsed.data.siteKey);
    if (!site) {
      return Response.json({ error: "Site non trouvé" }, { status: 404 });
    }

    const retention = site.conversationRetentionDays ?? 30;
    const purged = await purgeOldConversations(parsed.data.siteKey, retention);
    return Response.json({ ok: true, purged });
  } catch {
    return Response.json({ error: "Erreur purge" }, { status: 500 });
  }
}
