import { getAnalyticsSummary } from "@/lib/analytics";
import { requireAdmin } from "@/lib/auth";
import { LIMITS } from "@/lib/env";
import { getIndexStatus } from "@/lib/index/service";
import { getOpsErrorsSummary } from "@/lib/ops-errors";
import { buildSiteAlerts, getSiteUsageToday } from "@/lib/quotas";
import { hasDistributedRateLimit } from "@/lib/rate-limit";
import { listSites } from "@/lib/sites";

export async function GET(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const sites = await listSites();
  const siteKeys = sites.map((site) => site.siteKey);
  const analytics = await getAnalyticsSummary(siteKeys);
  const opsSummary = await getOpsErrorsSummary(siteKeys, 5);

  const overview = await Promise.all(
    sites.map(async (site) => {
      const status = await getIndexStatus(site.siteKey, site.baseUrl);
      const stats = analytics.find((a) => a.siteKey === site.siteKey);
      const today = await getSiteUsageToday(site.siteKey);
      const ops = opsSummary.find((item) => item.siteKey === site.siteKey);
      const alerts = buildSiteAlerts(site.quotas, today.chatsToday, today.syncsToday);

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
        alerts,
        recentErrors: ops?.errors ?? [],
        errors24h: ops?.errorCount24h ?? 0,
      };
    })
  );

  const alertCount = overview.reduce(
    (count, site) => count + site.alerts.length,
    0
  );
  const errors24h = overview.reduce(
    (count, site) => count + site.errors24h,
    0
  );

  return Response.json({
    sites: overview,
    platform: {
      distributedRateLimit: hasDistributedRateLimit(),
      chatRateLimitPerMin: LIMITS.chatRateLimit,
      syncRateLimitPerHour: LIMITS.syncRateLimit,
      defaultMaxChatsPerDay: LIMITS.defaultMaxChatsPerDay,
      defaultMaxSyncsPerDay: LIMITS.defaultMaxSyncsPerDay,
      alertCount,
      errors24h,
    },
  });
}
