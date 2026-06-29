import { get, put } from "@vercel/blob";

export function canUseBlobStorage(): boolean {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return false;
  if (process.env.NEXT_PHASE === "phase-production-build") return false;
  return true;
}

export async function readBlobJson<T>(pathname: string): Promise<T | null> {
  if (!canUseBlobStorage()) return null;
  try {
    const result = await get(pathname, {
      access: "private",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    if (result && result.statusCode === 200 && result.stream) {
      const text = await new Response(result.stream).text();
      return JSON.parse(text) as T;
    }
  } catch {
    // tenter la lecture legacy (blobs publics)
  }

  try {
    const { head } = await import("@vercel/blob");
    const meta = await head(pathname);
    if (!meta?.url) return null;
    const response = await fetch(meta.url, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function writeBlobJson(
  pathname: string,
  data: unknown
): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN manquant");
  }

  const payload = JSON.stringify(data);
  const options = {
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  };

  try {
    await put(pathname, payload, { ...options, access: "private" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Cannot use private access on a public store")) {
      await put(pathname, payload, { ...options, access: "public" });
      return;
    }
    throw error;
  }
}
