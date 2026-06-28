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
}

export interface ContentChunk {
  id: string;
  url: string;
  title: string;
  text: string;
}

export interface SiteIndex {
  siteKey: string;
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
  pageUrl?: string;
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
