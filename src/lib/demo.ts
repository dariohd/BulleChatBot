import { getBullePublicUrl, listSites } from "@/lib/sites";

export function getDemoSiteKey(): string {
  const sites = listSites();
  const demo = sites.find((s) => s.domain.includes("localhost"));
  return demo?.siteKey ?? sites[0]?.siteKey ?? process.env.BULLE_SITE_KEY ?? "";
}

export { getBullePublicUrl };
