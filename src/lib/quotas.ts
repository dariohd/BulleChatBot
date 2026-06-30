import { getSiteAnalytics, countTodayEvents } from "@/lib/analytics";
import type { SiteConfig } from "@/lib/types";

function startOfUtcDay(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).toISOString();
}

export async function getSiteUsageToday(siteKey: string): Promise<{
  chatsToday: number;
  syncsToday: number;
}> {
  const analytics = await getSiteAnalytics(siteKey);
  return {
    chatsToday: countTodayEvents(analytics.events, "chat"),
    syncsToday: countTodayEvents(analytics.events, "index_sync"),
  };
}

export async function checkSiteQuotas(
  site: SiteConfig,
  type: "chat" | "sync"
): Promise<{ allowed: boolean; reason?: string }> {
  const quotas = site.quotas;
  if (!quotas) return { allowed: true };

  const max =
    type === "chat" ? quotas.maxChatsPerDay : quotas.maxSyncsPerDay;
  if (!max) return { allowed: true };

  const analytics = await getSiteAnalytics(site.siteKey);
  const dayStart = startOfUtcDay();
  const todayCount = analytics.events.filter(
    (event) =>
      event.timestamp >= dayStart &&
      event.type === (type === "chat" ? "chat" : "index_sync")
  ).length;

  if (todayCount >= max) {
    return {
      allowed: false,
      reason:
        type === "chat"
          ? "Quota journalier de conversations atteint"
          : "Quota journalier de synchronisations atteint",
    };
  }

  return { allowed: true };
}
