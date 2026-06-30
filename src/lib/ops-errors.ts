import { randomBytes } from "crypto";
import { listJsonIds, loadJson, saveJson } from "@/lib/storage/json-store";

const ERRORS_PREFIX = "bulle-ops-errors";
const MAX_ERRORS_PER_SITE = 40;

export interface OpsErrorEvent {
  route: "chat" | "index_sync" | "cron" | "admin";
  status: number;
  message: string;
  timestamp: string;
  host?: string;
}

function eventId(): string {
  return `${Date.now()}-${randomBytes(4).toString("hex")}`;
}

function errorsPrefix(siteKey: string): string {
  return `${ERRORS_PREFIX}/${siteKey}`;
}

export async function trackOpsError(
  siteKey: string,
  event: Omit<OpsErrorEvent, "timestamp">
): Promise<void> {
  try {
    const prefix = errorsPrefix(siteKey);
    const id = eventId();
    const payload: OpsErrorEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };
    await saveJson(prefix, id, payload);

    const ids = await listJsonIds(prefix);
    if (ids.length > MAX_ERRORS_PER_SITE) {
      const { deleteJson } = await import("@/lib/storage/json-store");
      const stale = ids.sort().slice(0, ids.length - MAX_ERRORS_PER_SITE);
      await Promise.all(stale.map((staleId) => deleteJson(prefix, staleId)));
    }
  } catch (error) {
    console.error("[Bulle ops-errors]", error);
  }
}

export async function getSiteOpsErrors(
  siteKey: string,
  limit = 8
): Promise<OpsErrorEvent[]> {
  const prefix = errorsPrefix(siteKey);
  const ids = (await listJsonIds(prefix)).sort().slice(-limit);
  const events: OpsErrorEvent[] = [];

  for (const id of ids) {
    const event = await loadJson<OpsErrorEvent>(prefix, id);
    if (event) events.push(event);
  }

  return events.reverse();
}

export async function getOpsErrorsSummary(
  siteKeys: string[],
  limitPerSite = 5
): Promise<
  Array<{ siteKey: string; errors: OpsErrorEvent[]; errorCount24h: number }>
> {
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

  return Promise.all(
    siteKeys.map(async (siteKey) => {
      const errors = await getSiteOpsErrors(siteKey, MAX_ERRORS_PER_SITE);
      const errorCount24h = errors.filter(
        (event) => new Date(event.timestamp).getTime() >= dayAgo
      ).length;
      return {
        siteKey,
        errors: errors.slice(0, limitPerSite),
        errorCount24h,
      };
    })
  );
}
