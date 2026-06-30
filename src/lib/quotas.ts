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

export interface SiteAlert {
  level: "warn" | "critical";
  code: "quota_chat" | "quota_sync";
  message: string;
}

export function buildSiteAlerts(
  quotas: SiteConfig["quotas"] | null | undefined,
  chatsToday: number,
  syncsToday: number
): SiteAlert[] {
  const alerts: SiteAlert[] = [];

  const chatMax = quotas?.maxChatsPerDay;
  if (chatMax && chatMax > 0) {
    const ratio = chatsToday / chatMax;
    if (ratio >= 1) {
      alerts.push({
        level: "critical",
        code: "quota_chat",
        message: `Quota conversations atteint (${chatsToday}/${chatMax} aujourd'hui)`,
      });
    } else if (ratio >= 0.8) {
      alerts.push({
        level: "warn",
        code: "quota_chat",
        message: `Quota conversations bientôt atteint (${chatsToday}/${chatMax})`,
      });
    }
  }

  const syncMax = quotas?.maxSyncsPerDay;
  if (syncMax && syncMax > 0) {
    const ratio = syncsToday / syncMax;
    if (ratio >= 1) {
      alerts.push({
        level: "critical",
        code: "quota_sync",
        message: `Quota syncs atteint (${syncsToday}/${syncMax} aujourd'hui)`,
      });
    } else if (ratio >= 0.8) {
      alerts.push({
        level: "warn",
        code: "quota_sync",
        message: `Quota syncs bientôt atteint (${syncsToday}/${syncMax})`,
      });
    }
  }

  return alerts;
}
