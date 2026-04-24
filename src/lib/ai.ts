import { ChatMessage } from "./types";
import { logger } from "./logger";

export const FREE_MODELS = [
  "opencode-zen-free",
  "opencode-zen-nano"
];

export const PAID_MODELS = [
  "opencode-zen-pro",
  "opencode-zen-ultra"
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
  "opencode-zen-free": 0,
  "opencode-zen-nano": 0,
  "opencode-zen-pro": 0.00001, // 0.01 credits per 1k tokens
  "opencode-zen-ultra": 0.00005, // 0.05 credits per 1k tokens
};

export async function aiComplete(options: AIOptions): Promise<AIResult> {
  const apiKey = process.env.OPENCODE_ZEN_API_KEY;
  const apiUrl = process.env.OPENCODE_ZEN_API_URL || "https://api.opencodezen.com/v1/chat/completions";

  if (!apiKey) {
    throw new Error("OPENCODE_ZEN_API_KEY is not set");
  }

  const modelsToTry = options.model 
    ? [options.model, ...FREE_MODELS.filter(m => m !== options.model)]
    : [...PAID_MODELS, ...FREE_MODELS];

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
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
        throw new Error(`OpenCode Zen API error (${response.status}): ${errorText}`);
      }

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
