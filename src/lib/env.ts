export function cleanEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.replace(/[^\x20-\x7E]/g, "").trim();
}

export const LIMITS = {
  maxMessageLength: parseInt(process.env.BULLE_MAX_MESSAGE_LENGTH ?? "2000", 10),
  maxChatMessages: parseInt(process.env.BULLE_MAX_CHAT_MESSAGES ?? "20", 10),
  maxPageContentLength: parseInt(
    process.env.BULLE_MAX_PAGE_CONTENT ?? "8000",
    10
  ),
  chatRateLimit: parseInt(process.env.BULLE_CHAT_RATE_LIMIT ?? "30", 10),
  chatRateWindowMs: parseInt(
    process.env.BULLE_CHAT_RATE_WINDOW_MS ?? "60000",
    10
  ),
  syncRateLimit: parseInt(process.env.BULLE_SYNC_RATE_LIMIT ?? "5", 10),
  syncRateWindowMs: parseInt(
    process.env.BULLE_SYNC_RATE_WINDOW_MS ?? "3600000",
    10
  ),
} as const;
