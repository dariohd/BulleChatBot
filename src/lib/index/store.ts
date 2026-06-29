import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { del } from "@vercel/blob";
import type { SiteIndex } from "@/lib/types";
import {
  canUseBlobStorage,
  readBlobJson,
  writeBlobJson,
} from "@/lib/storage/blob-access";

const memoryCache = new Map<string, SiteIndex>();
const indexLocks = new Set<string>();

export function extractHost(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function getIndexKey(
  siteKey: string,
  originOrUrl?: string | null
): string {
  const host = extractHost(originOrUrl);
  if (!host) return siteKey;
  return `${siteKey}__${host}`;
}

function blobPath(indexKey: string): string {
  return `bulle-index/${indexKey}.json`;
}

function localPath(indexKey: string): string {
  return path.join(process.cwd(), "data", "index", `${indexKey}.json`);
}

async function saveLocal(indexKey: string, index: SiteIndex): Promise<void> {
  const filePath = localPath(indexKey);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(index), "utf-8");
  memoryCache.set(indexKey, index);
}

async function loadLocal(indexKey: string): Promise<SiteIndex | null> {
  try {
    const raw = await readFile(localPath(indexKey), "utf-8");
    const index = JSON.parse(raw) as SiteIndex;
    memoryCache.set(indexKey, index);
    return index;
  } catch {
    return null;
  }
}

export async function acquireIndexLock(indexKey: string): Promise<boolean> {
  if (indexLocks.has(indexKey)) return false;
  indexLocks.add(indexKey);
  return true;
}

export function releaseIndexLock(indexKey: string): void {
  indexLocks.delete(indexKey);
}

export async function saveIndex(
  indexKey: string,
  index: SiteIndex
): Promise<void> {
  memoryCache.set(indexKey, index);

  if (canUseBlobStorage()) {
    await writeBlobJson(blobPath(indexKey), index);
    return;
  }

  if (!process.env.VERCEL) {
    await saveLocal(indexKey, index);
    return;
  }

  console.warn(
    "[Bulle] Index en mémoire uniquement — configurez BLOB_READ_WRITE_TOKEN."
  );
}

export async function loadIndex(indexKey: string): Promise<SiteIndex | null> {
  const cached = memoryCache.get(indexKey);
  if (cached) return cached;

  if (canUseBlobStorage()) {
    const fromBlob = await readBlobJson<SiteIndex>(blobPath(indexKey));
    if (fromBlob) {
      memoryCache.set(indexKey, fromBlob);
      return fromBlob;
    }
  }

  if (!process.env.VERCEL) {
    return loadLocal(indexKey);
  }

  return null;
}

export async function deleteIndex(indexKey: string): Promise<void> {
  memoryCache.delete(indexKey);
  if (canUseBlobStorage()) {
    try {
      await del(blobPath(indexKey));
    } catch {
      // ignore
    }
  }
}
