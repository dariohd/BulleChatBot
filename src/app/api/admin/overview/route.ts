import { getAnalyticsSummary } from "@/lib/analytics";
import { requireAdmin } from "@/lib/auth";
import { LIMITS } from "@/lib/env";
import { getIndexStatus } from "@/lib/index/service";
import { getSiteUsageToday } from "@/lib/quotas";
import { hasDistributedRateLimit } from "@/lib/rate-limit";
import { listSites } from "@/lib/sites";

export async function GET(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const sites = await listSites();
  const analytics = await getAnalyticsSummary(sites.map((s) => s.siteKey));

  const overview = await Promise.all(
    sites.map(async (site) => {
      const status = await getIndexStatus(site.siteKey, site.baseUrl);
      const stats = analytics.find((a) => a.siteKey === site.siteKey);
      const today = await getSiteUsageToday(site.siteKey);
      return {
        id: site.id,
        name: site.name,
        domain: site.domain,
        siteKey: site.siteKey,
        createdAt: site.createdAt,
        quotas: site.quotas ?? null,
        index: status,
        analytics: {
          totalChats: stats?.totalChats ?? 0,
          totalSyncs: stats?.totalSyncs ?? 0,
          chatsToday: today.chatsToday,
          syncsToday: today.syncsToday,
          lastChatAt: stats?.lastChatAt,
          lastSyncAt: stats?.lastSyncAt,
        },
      };
    })
  );

  return Response.json({
    sites: overview,
    platform: {
      distributedRateLimit: hasDistributedRateLimit(),
      chatRateLimitPerMin: LIMITS.chatRateLimit,
      syncRateLimitPerHour: LIMITS.syncRateLimit,
      defaultMaxChatsPerDay: LIMITS.defaultMaxChatsPerDay,
      defaultMaxSyncsPerDay: LIMITS.defaultMaxSyncsPerDay,
    },
  });
}
