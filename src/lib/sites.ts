import { randomBytes } from "crypto";
import type { SiteConfig } from "./types";

const sites = new Map<string, SiteConfig>();
let bootstrapped = false;

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

function registerSite(site: SiteConfig) {
  sites.set(site.siteKey, site);
}

function ensureBootstrapped() {
  if (bootstrapped) return;
  bootstrapped = true;
  bootstrapSites();
}

function bootstrapSites() {
  const fromJson = process.env.BULLE_SITES;
  if (fromJson) {
    try {
      const parsed = JSON.parse(fromJson) as SiteConfig[];
      for (const site of parsed) {
        registerSite({
          ...site,
          domain: site.domain,
          createdAt: site.createdAt ?? new Date().toISOString(),
        });
      }
      return;
    } catch (error) {
      console.error("[Bulle] BULLE_SITES JSON invalide:", error);
    }
  }

  if (process.env.BULLE_SITE_KEY) {
    registerSite({
      id: process.env.BULLE_SITE_ID ?? "main",
      name: process.env.BULLE_SITE_NAME ?? "Mon site",
      domain: process.env.BULLE_SITE_DOMAINS ?? process.env.BULLE_SITE_DOMAIN ?? "",
      baseUrl: process.env.BULLE_SITE_BASE_URL,
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
    return;
  }

  if (!process.env.VERCEL) {
    createSite({
      name: "Site de démonstration",
      domain: "localhost",
      baseUrl: process.env.BULLE_SITE_BASE_URL ?? "http://localhost:3001",
      welcomeMessage:
        "Bonjour, je suis Bulle. Posez-moi une question sur ce site.",
      primaryColor: "#2563eb",
    });
  }
}

export function createSite(input: {
  name: string;
  domain: string;
  baseUrl?: string;
  instructions?: string;
  tone?: string;
  language?: string;
  welcomeMessage?: string;
  primaryColor?: string;
}): SiteConfig {
  ensureBootstrapped();
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
    createdAt: new Date().toISOString(),
  };
  registerSite(site);
  return site;
}

export function getSiteByKey(siteKey: string): SiteConfig | undefined {
  ensureBootstrapped();
  return sites.get(siteKey);
}

export function listSites(): SiteConfig[] {
  ensureBootstrapped();
  return Array.from(sites.values());
}

export function updateSite(
  siteKey: string,
  updates: Partial<Omit<SiteConfig, "id" | "siteKey" | "createdAt">>
): SiteConfig | undefined {
  ensureBootstrapped();
  const site = sites.get(siteKey);
  if (!site) return undefined;

  const updated: SiteConfig = {
    ...site,
    ...updates,
    domain: updates.domain ?? site.domain,
  };
  registerSite(updated);
  return updated;
}

export function getSiteDomains(site: SiteConfig): string[] {
  return parseDomains(site.domain);
}

export function isDomainAllowed(
  site: SiteConfig,
  origin: string | null
): boolean {
  if (!origin) {
    return (
      process.env.NODE_ENV === "development" || Boolean(process.env.VERCEL)
    );
  }

  try {
    const host = new URL(origin).hostname.replace(/^www\./, "");
    const allowed = getSiteDomains(site);

    if (allowed.some((d) => host === d || host.endsWith(`.${d}`))) {
      return true;
    }

    // Autoriser le domaine Bulle lui-même (page démo / tests)
    const bulleHost = getBullePublicHost();
    if (bulleHost && (host === bulleHost || host.endsWith(`.${bulleHost}`))) {
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
