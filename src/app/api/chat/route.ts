import { streamText } from "ai";
import { getBulleModel } from "@/lib/ai";
import { buildSystemPrompt } from "@/lib/context";
import { corsHeaders, jsonWithCors, optionsResponse } from "@/lib/cors";
import {
  getSiteIndexSummary,
  searchSiteKnowledge,
} from "@/lib/index/service";
import { getSiteByKey, isDomainAllowed } from "@/lib/sites";
import type { ChatRequest } from "@/lib/types";

export const maxDuration = 60;

export async function OPTIONS(req: Request) {
  return optionsResponse(req.headers.get("origin"));
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");

  try {
    const body = (await req.json()) as ChatRequest;
    const siteKey =
      body.siteKey ?? req.headers.get("x-bulle-site-key") ?? "";
    const { pageContext, messages } = body;

    if (!siteKey) {
      return jsonWithCors({ error: "Clé de site manquante" }, { status: 400, origin });
    }

    const site = getSiteByKey(siteKey);
    if (!site) {
      return jsonWithCors({ error: "Site non reconnu" }, { status: 404, origin });
    }

    if (!isDomainAllowed(site, origin)) {
      return jsonWithCors(
        { error: "Domaine non autorisé pour ce site" },
        { status: 403, origin }
      );
    }

    if (!messages?.length) {
      return jsonWithCors({ error: "Messages manquants" }, { status: 400, origin });
    }

    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user");

    const knowledgeChunks = lastUserMessage
      ? await searchSiteKnowledge(siteKey, lastUserMessage.content)
      : [];

    const indexSummary = await getSiteIndexSummary(siteKey);

    const system = buildSystemPrompt(
      site,
      pageContext ?? {
        url: origin ?? "",
        title: site.name,
        headings: [],
        content: "",
      },
      knowledgeChunks,
      indexSummary ?? undefined
    );

    const result = streamText({
      model: getBulleModel(),
      system,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    return result.toTextStreamResponse({
      headers: corsHeaders(origin),
    });
  } catch (error) {
    console.error("[Bulle chat]", error);
    return jsonWithCors(
      { error: "Erreur lors du traitement de la conversation" },
      { status: 500, origin }
    );
  }
}
