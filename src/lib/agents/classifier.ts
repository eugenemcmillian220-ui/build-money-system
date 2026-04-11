import { callLLMJson } from "../llm";
import { ManifestMode } from "../prompts/phase-19";
import { intentClassificationSchema } from "../types";

export interface IntentClassification {
  mode: ManifestMode;
  protocol: string;
  infrastructure: {
    database: "supabase" | "neon" | "turso";
    auth: "supabase" | "clerk" | "better-auth";
    payments: "stripe" | "lemon-squeezy" | "coinbase";
  };
}

export async function classifyIntent(prompt: string): Promise<IntentClassification> {
  const systemPrompt = `You are the Intent Dispatcher. Classify the user prompt into a build mode and tech stack.
Return JSON ONLY:
{
  "mode": "elite" | "universal" | "nano",
  "protocol": "saas" | "tma" | "farcaster" | "marketplace",
  "infrastructure": {
    "database": "supabase" | "neon" | "turso",
    "auth": "supabase" | "clerk" | "better-auth",
    "payments": "stripe" | "lemon-squeezy" | "coinbase"
  }
}`;

  try {
    return await callLLMJson(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      intentClassificationSchema,
      { temperature: 0.1 }
    ) as IntentClassification;
  } catch (err) {
    console.error("Classifier parse failed, falling back to defaults.", err);
    return {
      mode: "universal",
      protocol: "saas",
      infrastructure: {
        database: "supabase",
        auth: "supabase",
        payments: "stripe"
      }
    };
  }
}
