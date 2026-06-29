import { reindexNextSite } from "@/lib/index/service";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET non configuré" },
      { status: 500 }
    );
  }

  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const result = await reindexNextSite();

  return NextResponse.json({
    ok: result.ok,
    reindexedAt: new Date().toISOString(),
    result,
  });
}
