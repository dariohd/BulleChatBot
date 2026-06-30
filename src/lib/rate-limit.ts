import { LIMITS } from "@/lib/env";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

let chatLimiter: import("@upstash/ratelimit").Ratelimit | null | undefined;
let syncLimiter: import("@upstash/ratelimit").Ratelimit | null | undefined;

function pruneExpired(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

export function hasDistributedRateLimit(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

function hasUpstash(): boolean {
  return hasDistributedRateLimit();
}

async function getChatLimiter() {
  if (chatLimiter !== undefined) return chatLimiter;
  if (!hasUpstash()) {
    chatLimiter = null;
    return null;
  }
  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis } = await import("@upstash/redis");
  chatLimiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(
      LIMITS.chatRateLimit,
      `${Math.ceil(LIMITS.chatRateWindowMs / 1000)} s`
    ),
    prefix: "bulle:chat",
  });
  return chatLimiter;
}

async function getSyncLimiter() {
  if (syncLimiter !== undefined) return syncLimiter;
  if (!hasUpstash()) {
    syncLimiter = null;
    return null;
  }
  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis } = await import("@upstash/redis");
  syncLimiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(
      LIMITS.syncRateLimit,
      `${Math.ceil(LIMITS.syncRateWindowMs / 1000)} s`
    ),
    prefix: "bulle:sync",
  });
  return syncLimiter;
}

export function getRequestClientId(req: Request, siteKey: string): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  return `${siteKey}:${ip}`;
}

function checkRateLimitMemory(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  pruneExpired(now);

  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true };
}

async function checkRateLimitDistributed(
  limiter: import("@upstash/ratelimit").Ratelimit,
  key: string
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  const result = await limiter.limit(key);
  if (result.success) return { allowed: true };
  return {
    allowed: false,
    retryAfterSec: Math.max(
      1,
      Math.ceil((result.reset - Date.now()) / 1000)
    ),
  };
}

export async function checkChatRateLimit(clientId: string) {
  const limiter = await getChatLimiter();
  if (limiter) return checkRateLimitDistributed(limiter, clientId);
  return checkRateLimitMemory(
    `chat:${clientId}`,
    LIMITS.chatRateLimit,
    LIMITS.chatRateWindowMs
  );
}

export async function checkSyncRateLimit(clientId: string) {
  const limiter = await getSyncLimiter();
  if (limiter) return checkRateLimitDistributed(limiter, clientId);
  return checkRateLimitMemory(
    `sync:${clientId}`,
    LIMITS.syncRateLimit,
    LIMITS.syncRateWindowMs
  );
}

// Sync helper for tests
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSec?: number } {
  return checkRateLimitMemory(key, limit, windowMs);
}
