import { readFileSync } from "fs";
import path from "path";
import { listSites } from "@/lib/sites";

export async function getDemoSiteKey(): Promise<string> {
  if (process.env.BULLE_SITE_KEY) return process.env.BULLE_SITE_KEY;
  const sites = await listSites();
  const demo = sites.find((s) => s.domain.includes("localhost"));
  return demo?.siteKey ?? sites[0]?.siteKey ?? "";
}

export function getWidgetScriptPath(): string {
  if (process.env.NEXT_PUBLIC_BULLE_WIDGET_FILE) {
    return `/widget/${process.env.NEXT_PUBLIC_BULLE_WIDGET_FILE}`;
  }
  try {
    const manifest = JSON.parse(
      readFileSync(
        path.join(process.cwd(), "public", "widget", "manifest.json"),
        "utf-8"
      )
    ) as { file?: string };
    if (manifest.file) return `/widget/${manifest.file}`;
  } catch {
    // manifest absent en dev avant premier build
  }
  return "/widget/bulle.js";
}

export { getBullePublicUrl } from "@/lib/sites";
