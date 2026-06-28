import { reindexAllSites } from "@/lib/index/service";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const results = await reindexAllSites();

  return NextResponse.json({
    ok: true,
    reindexedAt: new Date().toISOString(),
    results,
  });
}
