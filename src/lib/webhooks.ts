import type { SiteConfig } from "@/lib/types";

export async function dispatchWebhook(
  site: SiteConfig,
  payload: Record<string, unknown>
): Promise<void> {
  if (!site.webhookUrl) return;

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
