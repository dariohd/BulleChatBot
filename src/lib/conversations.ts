import { loadJson, saveJson, listJsonIds, deleteJson } from "@/lib/storage/json-store";
import type { ConversationLog, ConversationLogEntry } from "@/lib/types";

const PREFIX = "bulle-conversations";

function logPath(siteKey: string, sessionId: string): string {
  return `${PREFIX}/${siteKey}/${sessionId}`;
}

export async function appendConversationEntry(
  siteKey: string,
  sessionId: string,
  entry: ConversationLogEntry,
  meta?: { host?: string; pageUrl?: string }
): Promise<void> {
  const id = sessionId;
  const prefix = `${PREFIX}/${siteKey}`;
  const existing = await loadJson<ConversationLog>(prefix, id);
  const now = new Date().toISOString();

  const log: ConversationLog = existing ?? {
    siteKey,
    sessionId,
    host: meta?.host,
    pageUrl: meta?.pageUrl,
    entries: [],
    createdAt: now,
    updatedAt: now,
  };

  log.entries.push(entry);
  if (log.entries.length > 100) {
    log.entries = log.entries.slice(-100);
  }
  log.updatedAt = now;
  if (meta?.host) log.host = meta.host;
  if (meta?.pageUrl) log.pageUrl = meta.pageUrl;

  await saveJson(prefix, id, log);
}

export async function listConversationLogs(
  siteKey: string
): Promise<ConversationLog[]> {
  const prefix = `${PREFIX}/${siteKey}`;
  const ids = await listJsonIds(prefix);
  const logs: ConversationLog[] = [];
  for (const id of ids.slice(-50)) {
    const log = await loadJson<ConversationLog>(prefix, id);
    if (log) logs.push(log);
  }
  return logs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deleteConversationLogs(siteKey: string): Promise<number> {
  const prefix = `${PREFIX}/${siteKey}`;
  const ids = await listJsonIds(prefix);
  await Promise.all(ids.map((id) => deleteJson(prefix, id)));
  return ids.length;
}

export async function purgeOldConversations(
  siteKey: string,
  retentionDays: number
): Promise<number> {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const prefix = `${PREFIX}/${siteKey}`;
  const ids = await listJsonIds(prefix);
  let deleted = 0;

  for (const id of ids) {
    const log = await loadJson<ConversationLog>(prefix, id);
    if (log && new Date(log.updatedAt).getTime() < cutoff) {
      await deleteJson(prefix, id);
      deleted += 1;
    }
  }

  return deleted;
}
