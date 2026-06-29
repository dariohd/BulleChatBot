export interface SiteQuotas {
  maxChatsPerDay?: number;
  maxSyncsPerDay?: number;
}

export interface SiteConfig {
  id: string;
  name: string;
  domain: string;
  baseUrl?: string;
  siteKey: string;
  instructions?: string;
  tone?: string;
  language?: string;
  welcomeMessage?: string;
  primaryColor?: string;
  createdAt: string;
  quotas?: SiteQuotas;
  webhookUrl?: string;
  logConversations?: boolean;
  conversationRetentionDays?: number;
}

export interface PageContext {
  url: string;
  title: string;
  description?: string;
  headings: string[];
  content: string;
  language?: string;
}

export interface ChatRequest {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  pageContext: PageContext;
  siteKey: string;
  sessionId?: string;
}

export interface ContentChunk {
  id: string;
  url: string;
  title: string;
  text: string;
  embedding?: number[];
}

export interface SitePublicConfig {
  id: string;
  name: string;
  welcomeMessage?: string;
  primaryColor?: string;
  language?: string;
}

export interface SiteAdminView extends SiteConfig {
  domains: string[];
}

export interface SiteIndex {
  siteKey: string;
  host: string;
  baseUrl: string;
  siteName?: string;
  siteSummary?: string;
  indexedAt: string;
  pageCount: number;
  chunks: ContentChunk[];
}

export interface IndexSyncRequest {
  siteKey: string;
  origin?: string;
  force?: boolean;
}

export interface IndexStatus {
  indexed: boolean;
  indexedAt?: string;
  pageCount?: number;
  chunkCount?: number;
  baseUrl?: string;
  stale?: boolean;
}

export interface ConversationLogEntry {
  role: "user" | "assistant";
  content: string;
  at: string;
}

export interface ConversationLog {
  siteKey: string;
  sessionId: string;
  host?: string;
  pageUrl?: string;
  entries: ConversationLogEntry[];
  createdAt: string;
  updatedAt: string;
}
