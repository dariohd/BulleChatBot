import type { SiteConfig } from "@/lib/types";

const PRIVATE_HOST_RE =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|::1|\[::1\])/i;

export function isAllowedWebhookUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (!["http:", "https:"].includes(u.protocol)) return false;
    const host = u.hostname.toLowerCase();
    if (PRIVATE_HOST_RE.test(host) || host.endsWith(".local")) {
      return process.env.NODE_ENV !== "production";
    }
    return true;
  } catch {
    return false;
  }
}

export async function dispatchWebhook(
  site: SiteConfig,
  payload: Record<string, unknown>
): Promise<void> {
  if (!site.webhookUrl) return;
  if (!isAllowedWebhookUrl(site.webhookUrl)) {
    console.error("[Bulle webhook] URL refusée:", site.webhookUrl);
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    await fetch(site.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteKey: site.siteKey,
        siteName: site.name,
        at: new Date().toISOString(),
        ...payload,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (error) {
    console.error("[Bulle webhook]", error);
  }
}
