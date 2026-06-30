import { z } from "zod";
import { LIMITS } from "@/lib/env";

const quotasSchema = z.object({
  maxChatsPerDay: z.number().int().min(1).max(100000).optional(),
  maxSyncsPerDay: z.number().int().min(1).max(1000).optional(),
});

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z
    .string()
    .min(1)
    .max(LIMITS.maxMessageLength),
});

const pageContextSchema = z.object({
  url: z.string().max(2048).optional().default(""),
  title: z.string().max(500).optional().default(""),
  description: z.string().max(1000).optional(),
  headings: z.array(z.string().max(300)).max(20).optional().default([]),
  content: z
    .string()
    .max(LIMITS.maxPageContentLength)
    .optional()
    .default(""),
  language: z.string().max(10).optional(),
});

export const chatRequestSchema = z.object({
  siteKey: z.string().min(8).max(128).optional(),
  sessionId: z.string().min(8).max(128).optional(),
  messages: z
    .array(messageSchema)
    .min(1)
    .max(LIMITS.maxChatMessages),
  pageContext: pageContextSchema.optional(),
});

export const indexSyncRequestSchema = z.object({
  siteKey: z.string().min(8).max(128).optional(),
  origin: z.string().url().max(2048).optional(),
  force: z.boolean().optional(),
});

export const createSiteSchema = z.object({
  name: z.string().min(1).max(200),
  domain: z.string().min(1).max(500),
  baseUrl: z.string().url().max(2048).optional(),
  instructions: z.string().max(4000).optional(),
  tone: z.string().max(200).optional(),
  language: z.string().max(10).optional(),
  welcomeMessage: z.string().max(500).optional(),
  suggestions: z.array(z.string().min(1).max(80)).max(3).optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  quotas: quotasSchema.optional(),
  webhookUrl: z.string().url().max(2048).optional(),
  logConversations: z.boolean().optional(),
  conversationRetentionDays: z.number().int().min(1).max(365).optional(),
});

export const updateSiteSchema = createSiteSchema
  .partial()
  .extend({
    siteKey: z.string().min(8).max(128),
  });

export const deleteSiteSchema = z.object({
  siteKey: z.string().min(8).max(128),
});

export const rotateSiteKeySchema = z.object({
  siteKey: z.string().min(8).max(128),
});

export const adminReindexSchema = z.object({
  siteKey: z.string().min(8).max(128),
  force: z.boolean().optional(),
});

export const adminLoginSchema = z.object({
  secret: z.string().min(8).max(256),
});

export const purgeLogsSchema = z.object({
  siteKey: z.string().min(8).max(128),
});
