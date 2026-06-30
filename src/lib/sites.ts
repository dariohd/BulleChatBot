import { randomBytes } from "crypto";
import { deleteJson, loadJson, listJsonIds, saveJson } from "@/lib/storage/json-store";
import type { SiteConfig, SitePublicConfig, SiteAdminView, SiteQuotas } from "./types";
import { LIMITS } from "@/lib/env";

const SITES_PREFIX = "bulle-sites";
const sites = new Map<string, SiteConfig>();
let loadPromise: Promise<void> | null = null;

function defaultSiteQuotas(): SiteQuotas {
  return {
    maxChatsPerDay: LIMITS.defaultMaxChatsPerDay,
    maxSyncsPerDay: LIMITS.defaultMaxSyncsPerDay,
  };
}

function generateSiteKey(): string {
  return `bulle_${randomBytes(24).toString("hex")}`;
}

function normalizeDomain(domain: string): string {
  try {
    const url = domain.includes("://") ? domain : `https://${domain}`;
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return domain.replace(/^www\./, "").toLowerCase();
  }
}

function parseDomains(domains: string): string[] {
  return domains
    .split(",")
    .map((d) => normalizeDomain(d.trim()))
    .filter(Boolean);
}

function hostMatchesDomain(host: string, domain: string): boolean {
  const normalizedHost = host.replace(/^www\./, "");
  const normalizedDomain = domain.replace(/^www\./, "");
  return normalizedHost === normalizedDomain;
}

async function persistSite(site: SiteConfig): Promise<void> {
  sites.set(site.siteKey, site);
  await saveJson(SITES_PREFIX, site.siteKey, site);
}

async function loadPersistedSites(): Promise<void> {
  const ids = await listJsonIds(SITES_PREFIX);
  for (const siteKey of ids) {
    const site = await loadJson<SiteConfig>(SITES_PREFIX, siteKey);
    if (site?.siteKey) {
      sites.set(site.siteKey, site);
    }
  }
}

function bootstrapFromEnv(): SiteConfig[] {
  const created: SiteConfig[] = [];

  const fromJson = process.env.BULLE_SITES;
  if (fromJson) {
    try {
      const parsed = JSON.parse(fromJson) as SiteConfig[];
      for (const site of parsed) {
        created.push({
          ...site,
          createdAt: site.createdAt ?? new Date().toISOString(),
        });
      }
      return created;
    } catch (error) {
      console.error("[Bulle] BULLE_SITES JSON invalide:", error);
    }
  }

  if (process.env.BULLE_SITE_KEY) {
    created.push({
      id: process.env.BULLE_SITE_ID ?? "main",
      name: process.env.BULLE_SITE_NAME ?? "Mon site",
      domain:
        process.env.BULLE_SITE_DOMAINS ??
        process.env.BULLE_SITE_DOMAIN ??
        "",
      siteKey: process.env.BULLE_SITE_KEY,
      instructions: process.env.BULLE_SITE_INSTRUCTIONS,
      tone: process.env.BULLE_SITE_TONE ?? "professionnel et chaleureux",
      language: process.env.BULLE_SITE_LANGUAGE ?? "fr",
      welcomeMessage:
        process.env.BULLE_SITE_WELCOME ??
        "Bonjour, je suis Bulle. Posez-moi une question sur ce site.",
      primaryColor: process.env.BULLE_SITE_COLOR ?? "#2563eb",
      createdAt: new Date().toISOString(),
    });
  }

  return created;
}

async function ensureLoaded(): Promise<void> {
  if (loadPromise) {
    await loadPromise;
    return;
  }

  loadPromise = (async () => {
    await loadPersistedSites();

    const fromEnv = bootstrapFromEnv();
    for (const site of fromEnv) {
      if (!sites.has(site.siteKey)) {
        await persistSite(site);
      }
    }

    if (sites.size === 0 && !process.env.VERCEL) {
      const id = randomBytes(8).toString("hex");
      const demoSite: SiteConfig = {
        id,
        name: "Site de démonstration",
        domain: "localhost",
        baseUrl: "http://localhost:3001",
        siteKey: generateSiteKey(),
        tone: "professionnel et chaleureux",
        language: "fr",
        welcomeMessage:
          "Bonjour, je suis Bulle. Posez-moi une question sur ce site.",
        primaryColor: "#2563eb",
        createdAt: new Date().toISOString(),
      };
      await persistSite(demoSite);
    }
  })();

  await loadPromise;
}

export async function createSite(input: {
  name: string;
  domain: string;
  baseUrl?: string;
  instructions?: string;
  tone?: string;
  language?: string;
  welcomeMessage?: string;
  primaryColor?: string;
  quotas?: import("./types").SiteQuotas;
  webhookUrl?: string;
  logConversations?: boolean;
  conversationRetentionDays?: number;
}): Promise<SiteConfig> {
  await ensureLoaded();
  const id = randomBytes(8).toString("hex");
  const site: SiteConfig = {
    id,
    name: input.name,
    domain: input.domain,
    baseUrl: input.baseUrl,
    siteKey: generateSiteKey(),
    instructions: input.instructions,
    tone: input.tone ?? "professionnel et chaleureux",
    language: input.language ?? "fr",
    welcomeMessage:
      input.welcomeMessage ??
      `Bonjour, je suis Bulle, l'assistant de ${input.name}. Comment puis-je vous aider ?`,
    primaryColor: input.primaryColor ?? "#2563eb",
    quotas: input.quotas ?? defaultSiteQuotas(),
    webhookUrl: input.webhookUrl,
    logConversations: input.logConversations,
    conversationRetentionDays: input.conversationRetentionDays,
    createdAt: new Date().toISOString(),
  };
  await persistSite(site);
  return site;
}

export async function getSiteByKey(
  siteKey: string
): Promise<SiteConfig | undefined> {
  await ensureLoaded();
  return sites.get(siteKey);
}

export async function listSites(): Promise<SiteConfig[]> {
  await ensureLoaded();
  return Array.from(sites.values());
}

export async function updateSite(
  siteKey: string,
  updates: Partial<Omit<SiteConfig, "id" | "siteKey" | "createdAt">>
): Promise<SiteConfig | undefined> {
  await ensureLoaded();
  const site = sites.get(siteKey);
  if (!site) return undefined;

  const updated: SiteConfig = {
    ...site,
    ...updates,
    domain: updates.domain ?? site.domain,
  };
  await persistSite(updated);
  return updated;
}

export async function deleteSite(siteKey: string): Promise<boolean> {
  await ensureLoaded();
  if (!sites.has(siteKey)) return false;
  sites.delete(siteKey);
  await deleteJson(SITES_PREFIX, siteKey);
  return true;
}

export async function rotateSiteKey(siteKey: string): Promise<SiteConfig | undefined> {
  await ensureLoaded();
  const site = sites.get(siteKey);
  if (!site) return undefined;

  const oldKey = site.siteKey;
  const rotated: SiteConfig = {
    ...site,
    siteKey: generateSiteKey(),
  };

  sites.delete(oldKey);
  await deleteJson(SITES_PREFIX, oldKey);
  await persistSite(rotated);
  return rotated;
}

export function getSiteDomains(site: SiteConfig): string[] {
  return parseDomains(site.domain);
}

export function isDomainAllowed(
  site: SiteConfig,
  origin: string | null
): boolean {
  if (!origin) {
    return process.env.NODE_ENV === "development" && !process.env.VERCEL;
  }

  try {
    const host = new URL(origin).hostname.replace(/^www\./, "");
    const allowed = getSiteDomains(site);

    if (allowed.some((d) => hostMatchesDomain(host, d))) {
      return true;
    }

    const bulleHost = getBullePublicHost();
    if (bulleHost && hostMatchesDomain(host, bulleHost)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export function getBullePublicUrl(): string {
  if (process.env.NEXT_PUBLIC_BULLE_URL) {
    return process.env.NEXT_PUBLIC_BULLE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3001";
}

function getBullePublicHost(): string | null {
  try {
    return new URL(getBullePublicUrl()).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function toPublicSiteConfig(site: SiteConfig): SitePublicConfig {
  return {
    id: site.id,
    name: site.name,
    welcomeMessage: site.welcomeMessage,
    suggestions: site.suggestions?.slice(0, 3),
    primaryColor: site.primaryColor,
    language: site.language,
  };
}

export function toAdminSiteView(site: SiteConfig): SiteAdminView {
  return {
    ...site,
    domains: getSiteDomains(site),
  };
}
