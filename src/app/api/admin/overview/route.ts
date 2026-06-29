import { getAnalyticsSummary } from "@/lib/analytics";
import { requireAdmin } from "@/lib/auth";
import { getIndexStatus } from "@/lib/index/service";
import { listSites } from "@/lib/sites";

export async function GET(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const sites = await listSites();
  const analytics = await getAnalyticsSummary(sites.map((s) => s.siteKey));

  const overview = await Promise.all(
    sites.map(async (site) => {
      const status = await getIndexStatus(site.siteKey);
      const stats = analytics.find((a) => a.siteKey === site.siteKey);
      return {
        id: site.id,
        name: site.name,
        domain: site.domain,
        siteKey: site.siteKey,
        createdAt: site.createdAt,
        index: status,
        analytics: {
          totalChats: stats?.totalChats ?? 0,
          totalSyncs: stats?.totalSyncs ?? 0,
          lastChatAt: stats?.lastChatAt,
          lastSyncAt: stats?.lastSyncAt,
        },
      };
    })
  );

  return Response.json({ sites: overview });
}
