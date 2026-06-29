import { createMistral } from "@ai-sdk/mistral";
import { ollama } from "ai-sdk-ollama";
import { cleanEnv } from "@/lib/env";

export type BulleProvider = "ollama" | "mistral";

const DEFAULTS: Record<BulleProvider, string> = {
  ollama: "llama3.2",
  mistral: "mistral-small-latest",
};

export function getBulleProvider(): BulleProvider {
  const provider = cleanEnv(process.env.BULLE_PROVIDER) as
    | BulleProvider
    | undefined;

  if (provider === "ollama" || provider === "mistral") return provider;
  if (cleanEnv(process.env.MISTRAL_API_KEY)) return "mistral";
  if (process.env.VERCEL) return "mistral";
  return "ollama";
}

export function getBulleModel() {
  const provider = getBulleProvider();
  const modelId = cleanEnv(process.env.BULLE_MODEL) ?? DEFAULTS[provider];

  if (provider === "mistral") {
    const apiKey = cleanEnv(process.env.MISTRAL_API_KEY);
    if (!apiKey) {
      throw new Error("MISTRAL_API_KEY manquante ou invalide");
    }
    const mistral = createMistral({ apiKey });
    return mistral(modelId);
  }

  return ollama(modelId);
}
