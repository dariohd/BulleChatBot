import { createMistral } from "@ai-sdk/mistral";
import { generateText } from "ai";

const apiKey = process.env.MISTRAL_API_KEY?.replace(/[^\x20-\x7E]/g, "").trim();
if (!apiKey) {
  console.error("MISTRAL_API_KEY manquante");
  process.exit(1);
}

const mistral = createMistral({ apiKey });
const { text } = await generateText({
  model: mistral("mistral-small-latest"),
  prompt: "Dis bonjour en une phrase.",
});

console.log("OK:", text);
