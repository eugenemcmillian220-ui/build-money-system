import { ChatMessage } from "./types";
import { logger } from "./logger";
import { keyManager } from "./key-manager";

/**
 * OpenCode Zen — Free-tier models (primary, used first).
 * Rate-limited on free plan; unlimited on Go/Pro plans.
 */
export const ZEN_FREE_MODELS = [
  "deepseek-v4-flash",
  "glm-5",
  "mimo-v2.5",
  "qwen3.5-plus",
  "kimi-k2.5",
  "minimax-m2.5",
];

/**
 * OpenCode Zen — Paid-tier models (fallback).
 * Available on Go ($5/$10/mo) and Pro plans.
 * No rate limits on paid plans.
 */
export const ZEN_PAID_MODELS = [
  "kimi-k2.6",
  "glm-5.1",
  "mimo-v2-pro",
  "mimo-v2-omni",
  "mimo-v2.5-pro",
  "minimax-m2.7",
  "qwen3.6-plus",
  "deepseek-v4-pro",
];

export interface AIOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
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
  timedOut?: boolean;
}

const MODEL_COSTS: Record<string, number> = {
  // Free-tier models (no cost)
  "deepseek-v4-flash": 0,
  "glm-5": 0,
  "mimo-v2.5": 0,
  "qwen3.5-plus": 0,
  "kimi-k2.5": 0,
  "minimax-m2.5": 0,
  // Paid-tier models
  "kimi-k2.6": 0.00003,
  "glm-5.1": 0.00003,
  "mimo-v2-pro": 0.00004,
  "mimo-v2-omni": 0.00004,
  "mimo-v2.5-pro": 0.00005,
  "minimax-m2.7": 0.00004,
  "qwen3.6-plus": 0.00004,
  "deepseek-v4-pro": 0.00005,
};

function getApiUrl(): string {
  return process.env.OPENCODE_ZEN_API_URL || "https://opencode.ai/zen/go/v1/chat/completions";
}

function getEmbedUrl(): string {
  return process.env.OPENCODE_ZEN_EMBED_URL || "https://opencode.ai/zen/go/v1/embeddings";
}

export async function aiComplete(options: AIOptions): Promise<AIResult> {
  const allModels = [...ZEN_FREE_MODELS, ...ZEN_PAID_MODELS];

  const modelsToTry = options.model
    ? [options.model, ...allModels].filter((m, i, self) => self.indexOf(m) === i)
    : allModels;

  let lastError: Error | null = null;
  const MAX_TIMEOUT_RETRIES = 1;
  let timeoutCount = 0;

  for (const model of modelsToTry) {
    const apiKey = keyManager.getKey("opencodezen");
    if (!apiKey) {
      throw new Error("No OpenCode Zen API keys available — set OPENCODE_ZEN_API_KEY or OPENCODE_ZEN_API_KEYS");
    }

    try {
      const controller = new AbortController();
      const timeoutMs = options.timeout ?? 120000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(getApiUrl(), {
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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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
        throw new Error(`Empty response from OpenCode Zen model ${model}`);
      }

      const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;
      const totalTokens = usage.total_tokens || promptTokens + completionTokens;

      const costRate = MODEL_COSTS[model] || 0.00003;
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
      if (error instanceof Error && error.name === "AbortError") {
        timeoutCount++;
        lastError = new Error(`Model ${model} timed out`);
        if (timeoutCount >= MAX_TIMEOUT_RETRIES) {
          logger.error(`AI call timed out for ${timeoutCount} models, stopping retries`);
          break;
        }
        logger.warn(`AI call timed out after ${options.timeout ?? 120000}ms for model ${model}, trying next model (${timeoutCount}/${MAX_TIMEOUT_RETRIES})`);
        continue;
      }
      logger.warn(`Failed to call OpenCode Zen model ${model}:`, { error });
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }

  throw lastError || new Error("All OpenCode Zen models failed");
}

export async function* aiStream(options: AIOptions): AsyncIterable<string> {
  const model = options.model || ZEN_FREE_MODELS[0];
  const apiKey = keyManager.getKey("opencodezen");

  if (!apiKey) {
    throw new Error("No OpenCode Zen API keys available");
  }

  const controller = new AbortController();
  const timeoutMs = options.timeout ?? 120000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(getApiUrl(), {
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
        stream: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenCode Zen API error (${response.status}): ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") return;
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      logger.error(`AI stream timed out after ${timeoutMs}ms`);
      throw new Error("Generation timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function aiEmbed(text: string): Promise<number[]> {
  const apiKey = keyManager.getKey("opencodezen");

  if (!apiKey) {
    throw new Error("No OpenCode Zen API keys available for embeddings");
  }

  try {
    const response = await fetch(getEmbedUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model: "text-embedding-zen",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenCode Zen embedding error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    logger.error("Embedding generation failed", { error });
    return new Array(1536).fill(0);
  }
}
