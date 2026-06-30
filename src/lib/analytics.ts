import { randomBytes } from "crypto";
import { deleteJson, listJsonIds, loadJson, saveJson } from "@/lib/storage/json-store";

const EVENTS_PREFIX = "bulle-analytics-events";
const MAX_EVENTS = 200;

export interface AnalyticsEvent {
  type: "chat" | "index_sync";
  timestamp: string;
  host?: string;
  messageLength?: number;
  pageCount?: number;
}

export interface SiteAnalytics {
  siteKey: string;
  totalChats: number;
  totalSyncs: number;
  lastChatAt?: string;
  lastSyncAt?: string;
  events: AnalyticsEvent[];
}

function eventId(): string {
  return `${Date.now()}-${randomBytes(4).toString("hex")}`;
}

async function listSiteEventIds(siteKey: string): Promise<string[]> {
  const prefix = `${EVENTS_PREFIX}/${siteKey}`;
  const ids = await listJsonIds(prefix);
  return ids.sort();
}

export async function trackChat(
  siteKey: string,
  options?: { host?: string; messageLength?: number }
): Promise<void> {
  try {
    const id = eventId();
    const event: AnalyticsEvent = {
      type: "chat",
      timestamp: new Date().toISOString(),
      host: options?.host,
      messageLength: options?.messageLength,
    };
    await saveJson(`${EVENTS_PREFIX}/${siteKey}`, id, event);
  } catch (error) {
    console.error("[Bulle analytics] chat:", error);
  }
}

export async function trackIndexSync(
  siteKey: string,
  options?: { host?: string; pageCount?: number }
): Promise<void> {
  try {
    const id = eventId();
    const event: AnalyticsEvent = {
      type: "index_sync",
      timestamp: new Date().toISOString(),
      host: options?.host,
      pageCount: options?.pageCount,
    };
    await saveJson(`${EVENTS_PREFIX}/${siteKey}`, id, event);
  } catch (error) {
    console.error("[Bulle analytics] sync:", error);
  }
}

export async function getSiteAnalytics(
  siteKey: string
): Promise<SiteAnalytics> {
  const eventIds = await listSiteEventIds(siteKey);
  const recentIds = eventIds.slice(-MAX_EVENTS);

  const events: AnalyticsEvent[] = [];
  for (const id of recentIds) {
    const event = await loadJson<AnalyticsEvent>(
      `${EVENTS_PREFIX}/${siteKey}`,
      id
    );
    if (event) events.push(event);
  }

  const totalChats = events.filter((e) => e.type === "chat").length;
  const totalSyncs = events.filter((e) => e.type === "index_sync").length;
  const lastChatAt = [...events]
    .reverse()
    .find((e) => e.type === "chat")?.timestamp;
  const lastSyncAt = [...events]
    .reverse()
    .find((e) => e.type === "index_sync")?.timestamp;

  return {
    siteKey,
    totalChats,
    totalSyncs,
    lastChatAt,
    lastSyncAt,
    events,
  };
}

export async function getAnalyticsSummary(
  siteKeys: string[]
): Promise<SiteAnalytics[]> {
  return Promise.all(siteKeys.map((key) => getSiteAnalytics(key)));
}

function startOfUtcDay(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).toISOString();
}

export function countTodayEvents(
  events: AnalyticsEvent[],
  type: "chat" | "index_sync"
): number {
  const dayStart = startOfUtcDay();
  return events.filter(
    (event) => event.timestamp >= dayStart && event.type === type
  ).length;
}

export async function getTodayUsage(siteKey: string): Promise<{
  chatsToday: number;
  syncsToday: number;
}> {
  const analytics = await getSiteAnalytics(siteKey);
  return {
    chatsToday: countTodayEvents(analytics.events, "chat"),
    syncsToday: countTodayEvents(analytics.events, "index_sync"),
  };
}

export async function deleteSiteAnalytics(siteKey: string): Promise<void> {
  const ids = await listSiteEventIds(siteKey);
  await Promise.all(
    ids.map((id) => deleteJson(`${EVENTS_PREFIX}/${siteKey}`, id))
  );
}
