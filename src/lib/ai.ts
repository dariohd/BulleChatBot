import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import { ollama } from "ai-sdk-ollama";

export type BulleProvider =
  | "ollama"
  | "gateway"
  | "mistral"
  | "anthropic"
  | "google";

const DEFAULTS: Record<BulleProvider, string> = {
  ollama: "llama3.2",
  gateway: "mistral/mistral-small-latest",
  mistral: "mistral-small-latest",
  anthropic: "claude-3-5-haiku-latest",
  google: "gemini-2.0-flash",
};

export function getBulleProvider(): BulleProvider {
  const provider = process.env.BULLE_PROVIDER as BulleProvider | undefined;
  if (provider && provider in DEFAULTS) return provider;
  return process.env.VERCEL ? "gateway" : "ollama";
}

export function getBulleModel() {
  const provider = getBulleProvider();
  const modelId = process.env.BULLE_MODEL ?? DEFAULTS[provider];

  switch (provider) {
    case "gateway":
      // Format "provider/model" — routé via Vercel AI Gateway en prod
      return modelId;
    case "mistral": {
      const mistral = createMistral({
        apiKey: process.env.MISTRAL_API_KEY,
      });
      return mistral(modelId);
    }
    case "anthropic": {
      const anthropic = createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      return anthropic(modelId);
    }
    case "google": {
      const google = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      });
      return google(modelId);
    }
    case "ollama":
    default:
      return ollama(modelId);
  }
}
