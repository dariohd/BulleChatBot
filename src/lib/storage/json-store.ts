import { mkdir, readdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { del, list } from "@vercel/blob";
import {
  canUseBlobStorage,
  readBlobJson,
  writeBlobJson,
} from "@/lib/storage/blob-access";

function blobPath(prefix: string, id: string): string {
  return `${prefix}/${id}.json`;
}

function localDir(prefix: string): string {
  return path.join(process.cwd(), "data", prefix);
}

function localPath(prefix: string, id: string): string {
  return path.join(localDir(prefix), `${id}.json`);
}

export async function saveJson<T>(
  prefix: string,
  id: string,
  data: T
): Promise<void> {
  if (canUseBlobStorage()) {
    await writeBlobJson(blobPath(prefix, id), data);
    return;
  }

  const json = JSON.stringify(data);
  if (!process.env.VERCEL) {
    const filePath = localPath(prefix, id);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, json, "utf-8");
  }
}

export async function loadJson<T>(
  prefix: string,
  id: string
): Promise<T | null> {
  if (canUseBlobStorage()) {
    return readBlobJson<T>(blobPath(prefix, id));
  }

  if (!process.env.VERCEL) {
    try {
      const raw = await readFile(localPath(prefix, id), "utf-8");
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  return null;
}

export async function deleteJson(prefix: string, id: string): Promise<void> {
  if (canUseBlobStorage()) {
    try {
      await del(blobPath(prefix, id));
    } catch {
      // blob may not exist
    }
    return;
  }

  if (!process.env.VERCEL) {
    try {
      await unlink(localPath(prefix, id));
    } catch {
      // file may not exist
    }
  }
}

export async function listJsonIds(prefix: string): Promise<string[]> {
  if (canUseBlobStorage()) {
    try {
      const { blobs } = await list({ prefix: `${prefix}/` });
      return blobs
        .map((blob) =>
          blob.pathname.replace(`${prefix}/`, "").replace(/\.json$/, "")
        )
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  if (!process.env.VERCEL) {
    try {
      const dir = localDir(prefix);
      const files = await readdir(dir);
      return files
        .filter((file) => file.endsWith(".json"))
        .map((file) => file.replace(/\.json$/, ""));
    } catch {
      return [];
    }
  }

  return [];
}
