import { ChatMessage } from "./types";
import { logger } from "./logger";
import { keyManager } from "./key-manager";

export const FREE_MODELS = [
  "gpt-5-nano",
  "gpt-5-mini",
  "gpt-4o-zen"
];

export const PAID_MODELS = [
  "gpt-5-ultra",
  "gpt-5-pro",
  "gpt-o1-zen"
];

export interface AIOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIResult {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
}

const MODEL_COSTS: Record<string, number> = {
  "gpt-5-nano": 0,
  "gpt-5-mini": 0,
  "gpt-4o-zen": 0,
  "gpt-5-ultra": 0.00005, // 0.05 credits per 1k tokens
  "gpt-5-pro": 0.00003, // 0.03 credits per 1k tokens
  "gpt-o1-zen": 0.00008, // 0.08 credits per 1k tokens
};

export async function aiComplete(options: AIOptions): Promise<AIResult> {
  const apiUrl = process.env.OPENCODE_ZEN_API_URL || "https://api.opencodezen.com/v1/chat/completions";

  const modelsToTry = options.model 
    ? [options.model, ...FREE_MODELS, ...PAID_MODELS].filter((m, i, self) => self.indexOf(m) === i)
    : [...FREE_MODELS, ...PAID_MODELS];

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    const apiKey = keyManager.getKey("opencodezen");
    if (!apiKey) {
      throw new Error("No OpenCode Zen API keys available");
    }

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: options.messages.map(m => ({
            role: m.role,
            content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
          })),
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4096,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429) {
          keyManager.reportError("opencodezen", apiKey);
        }
        throw new Error(`OpenCode Zen API error (${response.status}): ${errorText}`);
      }

      keyManager.reportSuccess("opencodezen", apiKey);
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error("Empty response from OpenCode Zen");
      }

      const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;
      const totalTokens = usage.total_tokens || promptTokens + completionTokens;

      const costRate = MODEL_COSTS[model] || 0.00001;
      const cost = totalTokens * costRate;

      return {
        content,
        model,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
        },
        cost,
      };
    } catch (error: unknown) {
      logger.warn(`Failed to call OpenCode Zen with model ${model}:`, { error });
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }

  throw lastError || new Error("All OpenCode Zen models failed");
}
