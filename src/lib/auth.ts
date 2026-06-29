import { createHmac, timingSafeEqual } from "crypto";

const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const ADMIN_COOKIE_NAME = "bulle_admin_session";

function getAdminSecret(): string | undefined {
  return process.env.BULLE_ADMIN_SECRET?.trim() || undefined;
}

export function createAdminSessionToken(secret: string): string {
  const issuedAt = Date.now().toString();
  const payload = `bulle-admin:${issuedAt}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifyAdminSessionToken(
  token: string,
  secret: string
): boolean {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return false;

  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!payload.startsWith("bulle-admin:")) return false;

  const issuedAt = Number(payload.replace("bulle-admin:", ""));
  if (!Number.isFinite(issuedAt)) return false;
  if (Date.now() - issuedAt > SESSION_MAX_AGE_MS) return false;

  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  try {
    const a = Buffer.from(signature, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function isAdminRequest(req: Request): boolean {
  const secret = getAdminSecret();
  if (!secret) return false;

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const header = req.headers.get("x-bulle-admin-secret");
  if (header === secret) return true;

  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(
    new RegExp(`${ADMIN_COOKIE_NAME}=([^;]+)`)
  );
  if (match?.[1] && verifyAdminSessionToken(decodeURIComponent(match[1]), secret)) {
    return true;
  }

  return false;
}

export function requireAdmin(req: Request): Response | null {
  if (isAdminRequest(req)) return null;
  return new Response(JSON.stringify({ error: "Non autorisé" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

export function getAdminSecretForLogin(): string | undefined {
  return getAdminSecret();
}

export function validateAdminPassword(password: string): boolean {
  const secret = getAdminSecret();
  return Boolean(secret && password === secret);
}
