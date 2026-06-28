import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { put, head, del } from "@vercel/blob";
import type { SiteIndex } from "@/lib/types";

const memoryCache = new Map<string, SiteIndex>();

function blobPath(siteKey: string): string {
  return `bulle-index/${siteKey}.json`;
}

function localPath(siteKey: string): string {
  return path.join(process.cwd(), "data", "index", `${siteKey}.json`);
}

async function saveLocal(index: SiteIndex): Promise<void> {
  const filePath = localPath(index.siteKey);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(index), "utf-8");
  memoryCache.set(index.siteKey, index);
}

async function loadLocal(siteKey: string): Promise<SiteIndex | null> {
  try {
    const raw = await readFile(localPath(siteKey), "utf-8");
    const index = JSON.parse(raw) as SiteIndex;
    memoryCache.set(siteKey, index);
    return index;
  } catch {
    return null;
  }
}

async function saveBlob(index: SiteIndex): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN manquant");
  }

  const pathname = blobPath(index.siteKey);

  try {
    const existing = await head(pathname);
    if (existing?.url) {
      await del(existing.url);
    }
  } catch {
    // blob may not exist yet
  }

  await put(pathname, JSON.stringify(index), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });

  memoryCache.set(index.siteKey, index);
}

async function loadBlob(siteKey: string): Promise<SiteIndex | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;

  try {
    const meta = await head(blobPath(siteKey));
    if (!meta?.url) return null;
    const response = await fetch(meta.url, { cache: "no-store" });
    if (!response.ok) return null;
    const index = (await response.json()) as SiteIndex;
    memoryCache.set(siteKey, index);
    return index;
  } catch {
    return null;
  }
}

export async function saveIndex(index: SiteIndex): Promise<void> {
  memoryCache.set(index.siteKey, index);

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await saveBlob(index);
    return;
  }

  if (!process.env.VERCEL) {
    await saveLocal(index);
    return;
  }

  console.warn(
    "[Bulle] Index en mémoire uniquement — configurez BLOB_READ_WRITE_TOKEN sur Vercel pour la persistance."
  );
}

export async function loadIndex(siteKey: string): Promise<SiteIndex | null> {
  const cached = memoryCache.get(siteKey);
  if (cached) return cached;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const fromBlob = await loadBlob(siteKey);
    if (fromBlob) return fromBlob;
  }

  if (!process.env.VERCEL) {
    return loadLocal(siteKey);
  }

  return null;
}

export function getCachedIndex(siteKey: string): SiteIndex | null {
  return memoryCache.get(siteKey) ?? null;
}
