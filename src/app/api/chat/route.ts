import { trackChat } from "@/lib/analytics";
import { appendConversationEntry } from "@/lib/conversations";
import { streamText } from "ai";
import { getBulleModel } from "@/lib/ai";
import { buildSystemPrompt } from "@/lib/context";
import {
  corsHeaders,
  jsonWithCors,
  optionsResponse,
  rateLimitResponse,
} from "@/lib/cors";
import {
  getSiteIndexSummary,
  searchSiteKnowledge,
} from "@/lib/index/service";
import { extractHost } from "@/lib/index/store";
import { trackOpsError } from "@/lib/ops-errors";
import { checkSiteQuotas } from "@/lib/quotas";
import {
  checkChatRateLimit,
  getRequestClientId,
} from "@/lib/rate-limit";
import { getSiteByKey, isDomainAllowed } from "@/lib/sites";
import { dispatchWebhook } from "@/lib/webhooks";
import { chatRequestSchema } from "@/lib/validation";

export const maxDuration = 60;

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  const siteKey = req.headers.get("x-bulle-site-key") ?? "";
  if (!origin || !siteKey) {
    return optionsResponse(origin, false);
  }
  const site = await getSiteByKey(siteKey);
  const allowed = site ? isDomainAllowed(site, origin) : false;
  return optionsResponse(origin, allowed);
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  let siteKey = "";

  try {
    const raw = await req.json();
    const parsed = chatRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonWithCors(
        { error: "Données invalides", details: parsed.error.flatten() },
        { status: 400, origin, allowed: Boolean(origin) }
      );
    }

    siteKey =
      parsed.data.siteKey ?? req.headers.get("x-bulle-site-key") ?? "";
    const { pageContext, messages, sessionId } = parsed.data;

    if (!siteKey) {
      return jsonWithCors(
        { error: "Clé de site manquante" },
        { status: 400, origin, allowed: false }
      );
    }

    const site = await getSiteByKey(siteKey);
    if (!site) {
      return jsonWithCors(
        { error: "Site non reconnu" },
        { status: 404, origin, allowed: false }
      );
    }

    if (!isDomainAllowed(site, origin)) {
      return jsonWithCors(
        { error: "Domaine non autorisé pour ce site" },
        { status: 403, origin, allowed: false }
      );
    }

    const clientId = getRequestClientId(req, siteKey);
    const rateLimit = await checkChatRateLimit(clientId);
    if (!rateLimit.allowed) {
      void trackOpsError(siteKey, {
        route: "chat",
        status: 429,
        message: "Rate limit minute",
        host: extractHost(pageContext?.url ?? origin ?? "") ?? undefined,
      });
      return rateLimitResponse(origin, rateLimit.retryAfterSec ?? 60, true);
    }

    const quota = await checkSiteQuotas(site, "chat");
    if (!quota.allowed) {
      void trackOpsError(siteKey, {
        route: "chat",
        status: 429,
        message: quota.reason ?? "Quota journalier",
        host: extractHost(pageContext?.url ?? origin ?? "") ?? undefined,
      });
      return jsonWithCors(
        { error: quota.reason ?? "Quota atteint" },
        { status: 429, origin, allowed: true }
      );
    }

    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user");

    const pageUrl = pageContext?.url ?? origin ?? "";
    const host = extractHost(pageUrl) ?? undefined;
    const effectiveSessionId =
      sessionId ?? `anon-${clientId.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 64)}`;

    const knowledgeChunks = lastUserMessage
      ? await searchSiteKnowledge(siteKey, lastUserMessage.content, pageUrl)
      : [];

    const indexSummary = await getSiteIndexSummary(siteKey, pageUrl);

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

    if (lastUserMessage) {
      void trackChat(siteKey, {
        host,
        messageLength: lastUserMessage.content.length,
      });

      if (site.logConversations) {
        void appendConversationEntry(
          siteKey,
          effectiveSessionId,
          {
            role: "user",
            content: lastUserMessage.content,
            at: new Date().toISOString(),
          },
          { host, pageUrl }
        );
      }
    }

    const result = streamText({
      model: getBulleModel(),
      system,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      onFinish: ({ text }) => {
        if (!site.logConversations || !text) return;
        void appendConversationEntry(
          siteKey,
          effectiveSessionId,
          {
            role: "assistant",
            content: text,
            at: new Date().toISOString(),
          },
          { host, pageUrl }
        );
        void dispatchWebhook(site, {
          type: "chat.completed",
          sessionId: effectiveSessionId,
          host,
          pageUrl,
          lastUserMessage: lastUserMessage?.content,
          assistantPreview: text.slice(0, 500),
        });
      },
    });

    if (lastUserMessage) {
      void dispatchWebhook(site, {
        type: "chat.started",
        sessionId: effectiveSessionId,
        host,
        pageUrl,
        message: lastUserMessage.content,
      });
    }

    return result.toTextStreamResponse({
      headers: corsHeaders(origin, true),
    });
  } catch (error) {
    console.error("[Bulle chat]", error);
    if (siteKey) {
      void trackOpsError(siteKey, {
        route: "chat",
        status: 500,
        message:
          error instanceof Error ? error.message : "Erreur chat inconnue",
        host: extractHost(origin ?? "") ?? undefined,
      });
    }
    return jsonWithCors(
      { error: "Erreur lors du traitement de la conversation" },
      { status: 500, origin, allowed: Boolean(origin) }
    );
  }
}
