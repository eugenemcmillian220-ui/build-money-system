import { ChatMessage } from "./types";
import { logger } from "./logger";
import { keyManager, ProviderName } from "./key-manager";

/* ------------------------------------------------------------------ */
/*  Model & Provider Definitions                                       */
/* ------------------------------------------------------------------ */

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

/**
 * GitHub Models — Free-tier models.
 * Available at https://models.inference.ai.azure.com via GitHub token.
 * Free tier: rate-limited but zero cost.
 */
export const GITHUB_FREE_MODELS = [
  "gpt-4o-mini",
  "DeepSeek-V3-0324",
  "Llama-4-Scout-17B-16E-Instruct",
  "Mistral-Small-24B-Instruct-2501",
  "Phi-4",
  "AI21-Jamba-1.5-Mini",
];

/**
 * Hugging Face — Free inference models.
 * Available at https://router.huggingface.co/v1 (OpenAI-compatible).
 * Free tier with HF_TOKEN.
 */
export const HF_FREE_MODELS = [
  "deepseek-ai/DeepSeek-V3-0324",
  "Qwen/Qwen2.5-72B-Instruct",
  "mistralai/Mistral-Small-24B-Instruct-2501",
  "meta-llama/Llama-3.3-70B-Instruct",
  "microsoft/Phi-4-mini-instruct",
  "NousResearch/Hermes-3-Llama-3.1-8B",
];

/** Per-provider API endpoint configuration */
interface ProviderConfig {
  name: ProviderName;
  getUrl: () => string;
  models: string[];
}

const PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    name: "opencodezen",
    getUrl: () => process.env.OPENCODE_ZEN_API_URL || "https://opencode.ai/zen/go/v1/chat/completions",
    models: [...ZEN_FREE_MODELS, ...ZEN_PAID_MODELS],
  },
  {
    name: "github",
    getUrl: () => process.env.GITHUB_MODELS_API_URL || "https://models.inference.ai.azure.com/chat/completions",
    models: GITHUB_FREE_MODELS,
  },
  {
    name: "huggingface",
    getUrl: () => process.env.HF_API_URL || "https://router.huggingface.co/v1/chat/completions",
    models: HF_FREE_MODELS,
  },
];

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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
  provider?: ProviderName;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
  timedOut?: boolean;
}

const MODEL_COSTS: Record<string, number> = {
  // OpenCode Zen Free-tier (no cost)
  "deepseek-v4-flash": 0, "glm-5": 0, "mimo-v2.5": 0,
  "qwen3.5-plus": 0, "kimi-k2.5": 0, "minimax-m2.5": 0,
  // OpenCode Zen Paid-tier
  "kimi-k2.6": 0.00003, "glm-5.1": 0.00003,
  "mimo-v2-pro": 0.00004, "mimo-v2-omni": 0.00004,
  "mimo-v2.5-pro": 0.00005, "minimax-m2.7": 0.00004,
  "qwen3.6-plus": 0.00004, "deepseek-v4-pro": 0.00005,
  // GitHub Models Free-tier (no cost)
  "gpt-4o-mini": 0, "DeepSeek-V3-0324": 0,
  "Llama-4-Scout-17B-16E-Instruct": 0, "Mistral-Small-24B-Instruct-2501": 0,
  "Phi-4": 0, "AI21-Jamba-1.5-Mini": 0,
  // Hugging Face Free-tier (no cost)
  "deepseek-ai/DeepSeek-V3-0324": 0, "Qwen/Qwen2.5-72B-Instruct": 0,
  "mistralai/Mistral-Small-24B-Instruct-2501": 0,
  "meta-llama/Llama-3.3-70B-Instruct": 0,
  "microsoft/Phi-4-mini-instruct": 0, "NousResearch/Hermes-3-Llama-3.1-8B": 0,
};

/* ------------------------------------------------------------------ */
/*  Smart Provider Rotation                                            */
/* ------------------------------------------------------------------ */

/** Track per-provider health for smart rotation */
interface ProviderHealth {
  consecutiveFailures: number;
  lastSuccess: number;
  lastFailure: number;
  avgLatencyMs: number;
  totalCalls: number;
}

const providerHealth: Map<ProviderName, ProviderHealth> = new Map();

function getHealth(provider: ProviderName): ProviderHealth {
  let h = providerHealth.get(provider);
  if (!h) {
    h = { consecutiveFailures: 0, lastSuccess: 0, lastFailure: 0, avgLatencyMs: 0, totalCalls: 0 };
    providerHealth.set(provider, h);
  }
  return h;
}

function recordSuccess(provider: ProviderName, latencyMs: number): void {
  const h = getHealth(provider);
  h.consecutiveFailures = 0;
  h.lastSuccess = Date.now();
  h.totalCalls++;
  h.avgLatencyMs = h.avgLatencyMs === 0 ? latencyMs : h.avgLatencyMs * 0.7 + latencyMs * 0.3;
}

function recordFailure(provider: ProviderName): void {
  const h = getHealth(provider);
  h.consecutiveFailures++;
  h.lastFailure = Date.now();
}

/**
 * Build a smart-ordered list of (provider, model) pairs to try.
 * Priority: configured providers first, sorted by health score,
 * then each provider's models in order.
 */
function buildRotation(preferredModel?: string): Array<{ provider: ProviderName; model: string; url: string }> {
  const configured = PROVIDER_CONFIGS.filter((pc) => keyManager.isConfigured(pc.name));
  if (configured.length === 0) {
    throw new Error(
      "No AI providers configured. Set at least one of: OPENCODE_ZEN_API_KEY, GITHUB_MODELS_TOKEN, HF_TOKEN"
    );
  }

  // Score each provider: lower is better
  const scored = configured.map((pc) => {
    const h = getHealth(pc.name);
    const failPenalty = h.consecutiveFailures * 100;
    const latencyScore = h.avgLatencyMs / 1000;
    const recencyBonus = h.lastSuccess > 0 ? Math.max(0, 10 - (Date.now() - h.lastSuccess) / 60000) : 0;
    return { pc, score: failPenalty + latencyScore - recencyBonus };
  });
  scored.sort((a, b) => a.score - b.score);

  const result: Array<{ provider: ProviderName; model: string; url: string }> = [];

  // If a preferred model is specified, try to find it across providers first
  if (preferredModel) {
    for (const { pc } of scored) {
      if (pc.models.includes(preferredModel)) {
        result.push({ provider: pc.name, model: preferredModel, url: pc.getUrl() });
      }
    }
  }

  // Then add all models from each provider (interleaved for diversity)
  for (const { pc } of scored) {
    for (const model of pc.models) {
      const key = `${pc.name}:${model}`;
      if (!result.some((r) => `${r.provider}:${r.model}` === key)) {
        result.push({ provider: pc.name, model, url: pc.getUrl() });
      }
    }
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Core API: aiComplete with multi-provider rotation                  */
/* ------------------------------------------------------------------ */

export async function aiComplete(options: AIOptions): Promise<AIResult> {
  const rotation = buildRotation(options.model);

  let lastError: Error | null = null;
  const MAX_CONSECUTIVE_TIMEOUTS = 4;
  let timeoutCount = 0;

  for (const { provider, model, url } of rotation) {
    const apiKey = keyManager.getKey(provider);
    if (!apiKey) continue;

    const startMs = Date.now();
    try {
      const controller = new AbortController();
      const timeoutMs = options.timeout ?? 120000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: options.messages.map((m) => ({
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
          keyManager.reportError(provider, apiKey);
        }
        throw new Error(`${provider} API error (${response.status}): ${errorText}`);
      }

      keyManager.reportSuccess(provider, apiKey);
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error(`Empty response from ${provider} model ${model}`);
      }

      const latency = Date.now() - startMs;
      recordSuccess(provider, latency);

      const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;
      const totalTokens = usage.total_tokens || promptTokens + completionTokens;
      const costRate = MODEL_COSTS[model] || 0.00003;
      const cost = totalTokens * costRate;

      logger.info(`AI call succeeded`, { provider, model, latencyMs: latency, tokens: totalTokens });

      return {
        content,
        model,
        provider,
        usage: { promptTokens, completionTokens, totalTokens },
        cost,
      };
    } catch (error: unknown) {
      recordFailure(provider);
      if (error instanceof Error && error.name === "AbortError") {
        timeoutCount++;
        lastError = new Error(`Model ${model} (${provider}) timed out`);
        if (timeoutCount >= MAX_CONSECUTIVE_TIMEOUTS) {
          logger.error(`AI call timed out for ${timeoutCount} attempts across providers, stopping`);
          break;
        }
        logger.warn(`AI timeout: ${provider}/${model} after ${options.timeout ?? 120000}ms (${timeoutCount}/${MAX_CONSECUTIVE_TIMEOUTS})`);
        continue;
      }
      logger.warn(`AI call failed: ${provider}/${model}`, { error });
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }

  throw lastError || new Error("All AI providers and models failed");
}

/* ------------------------------------------------------------------ */
/*  Streaming                                                          */
/* ------------------------------------------------------------------ */

export async function* aiStream(options: AIOptions): AsyncIterable<string> {
  const rotation = buildRotation(options.model);
  let lastError: Error | null = null;

  for (const { provider, model, url } of rotation) {
    const apiKey = keyManager.getKey(provider);
    if (!apiKey) continue;

    const controller = new AbortController();
    const timeoutMs = options.timeout ?? 120000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: options.messages.map((m) => ({
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
        throw new Error(`${provider} API error (${response.status}): ${errorText}`);
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
      recordSuccess(provider, Date.now());
      return; // Stream completed successfully
    } catch (error) {
      clearTimeout(timeoutId);
      recordFailure(provider);
      if (error instanceof Error && error.name === "AbortError") {
        logger.warn(`AI stream timeout: ${provider}/${model}`);
        lastError = new Error("Generation timed out");
        continue; // Try next provider/model
      }
      lastError = error instanceof Error ? error : new Error(String(error));
      continue; // Try next provider/model
    }
  }

  throw lastError || new Error("All AI stream providers failed");
}

/* ------------------------------------------------------------------ */
/*  Embeddings                                                         */
/* ------------------------------------------------------------------ */

function getEmbedUrl(): string {
  return process.env.OPENCODE_ZEN_EMBED_URL || "https://opencode.ai/zen/go/v1/embeddings";
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
