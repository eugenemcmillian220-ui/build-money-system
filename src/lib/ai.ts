import { ChatMessage } from "./types";
import { logger } from "./logger";
import { keyManager, ProviderName } from "./key-manager";

// ---------------------------------------------------------------------------
// Model catalogues per provider
// ---------------------------------------------------------------------------

export const ZEN_FREE_MODELS = [
  "deepseek-v4-flash",
  "glm-5",
  "mimo-v2.5",
  "qwen3.5-plus",
  "kimi-k2.5",
  "minimax-m2.5",
];

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

export const GITHUB_FREE_MODELS = [
  "openai/gpt-4.1-mini",
  "openai/gpt-4.1-nano",
  "openai/gpt-4o-mini",
  "meta-llama/Llama-4-Scout-17B-16E-Instruct",
  "meta-llama/Meta-Llama-3.1-8B-Instruct",
  "meta-llama/Meta-Llama-3.1-70B-Instruct",
  "mistralai/Mistral-Small-24B-Instruct-2501",
  "deepseek/DeepSeek-V3-0324",
  "microsoft/Phi-4",
  "Cohere/cohere-command-a",
];

export const HF_FREE_MODELS = [
  "deepseek-ai/DeepSeek-V3-0324",
  "meta-llama/Llama-3.1-8B-Instruct",
  "Qwen/Qwen2.5-72B-Instruct",
  "mistralai/Mistral-Small-24B-Instruct-2501",
  "microsoft/Phi-3.5-mini-instruct",
  "NousResearch/Hermes-3-Llama-3.1-8B",
  "HuggingFaceH4/zephyr-7b-beta",
];

export const ALL_FREE_MODELS: Record<ProviderName, string[]> = {
  opencodezen: ZEN_FREE_MODELS,
  github: GITHUB_FREE_MODELS,
  huggingface: HF_FREE_MODELS,
};

// ---------------------------------------------------------------------------
// Provider endpoint config
// ---------------------------------------------------------------------------

interface ProviderConfig {
  getUrl: () => string;
  getHeaders: (apiKey: string) => Record<string, string>;
  supportsStream: boolean;
}

const PROVIDER_CONFIGS: Record<ProviderName, ProviderConfig> = {
  opencodezen: {
    getUrl: () =>
      process.env.OPENCODE_ZEN_API_URL || "https://opencode.ai/zen/go/v1/chat/completions",
    getHeaders: (apiKey) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    }),
    supportsStream: true,
  },
  github: {
    getUrl: () =>
      process.env.GITHUB_MODELS_API_URL || "https://models.github.ai/inference/chat/completions",
    getHeaders: (apiKey) => ({
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${apiKey}`,
    }),
    supportsStream: true,
  },
  huggingface: {
    getUrl: () =>
      process.env.HF_API_URL || "https://router.huggingface.co/v1/chat/completions",
    getHeaders: (apiKey) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    }),
    supportsStream: true,
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AIOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  provider?: ProviderName;
}

export interface AIResult {
  content: string;
  model: string;
  provider: ProviderName;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
  timedOut?: boolean;
}

const MODEL_COSTS: Record<string, number> = {
  "deepseek-v4-flash": 0, "glm-5": 0, "mimo-v2.5": 0,
  "qwen3.5-plus": 0, "kimi-k2.5": 0, "minimax-m2.5": 0,
  "kimi-k2.6": 0.00003, "glm-5.1": 0.00003,
  "mimo-v2-pro": 0.00004, "mimo-v2-omni": 0.00004,
  "mimo-v2.5-pro": 0.00005, "minimax-m2.7": 0.00004,
  "qwen3.6-plus": 0.00004, "deepseek-v4-pro": 0.00005,
};

function getEmbedUrl(): string {
  return process.env.OPENCODE_ZEN_EMBED_URL || "https://opencode.ai/zen/go/v1/embeddings";
}

// ---------------------------------------------------------------------------
// Smart provider rotation
// ---------------------------------------------------------------------------

interface ProviderPerf {
  successCount: number;
  failCount: number;
  totalLatencyMs: number;
  lastFailAt: number;
}

const providerStats = new Map<ProviderName, ProviderPerf>();

function getStats(provider: ProviderName): ProviderPerf {
  let s = providerStats.get(provider);
  if (!s) {
    s = { successCount: 0, failCount: 0, totalLatencyMs: 0, lastFailAt: 0 };
    providerStats.set(provider, s);
  }
  return s;
}

function recordSuccess(provider: ProviderName, latencyMs: number): void {
  const s = getStats(provider);
  s.successCount++;
  s.totalLatencyMs += latencyMs;
}

function recordFailure(provider: ProviderName): void {
  const s = getStats(provider);
  s.failCount++;
  s.lastFailAt = Date.now();
}

function buildProviderOrder(preferred?: ProviderName): Array<{ provider: ProviderName; models: string[] }> {
  const configured = keyManager.getConfiguredProviders();
  if (configured.length === 0) {
    throw new Error(
      "No AI providers configured. Set at least one of: OPENCODE_ZEN_API_KEY, GITHUB_TOKEN, or HF_TOKEN"
    );
  }

  const scored = configured.map((p) => {
    const s = getStats(p);
    const avgLatency = s.successCount > 0 ? s.totalLatencyMs / s.successCount : 5000;
    const failPenalty = s.lastFailAt > Date.now() - 120_000 ? 10000 : 0;
    const preferBonus = p === preferred ? -50000 : 0;
    return { provider: p, score: avgLatency + failPenalty + preferBonus };
  });

  scored.sort((a, b) => a.score - b.score);

  return scored.map(({ provider }) => ({
    provider,
    models: ALL_FREE_MODELS[provider] ?? [],
  }));
}

// ---------------------------------------------------------------------------
// Core AI call with smart multi-provider failover
// ---------------------------------------------------------------------------

async function callProvider(
  provider: ProviderName,
  model: string,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number,
  timeoutMs: number,
): Promise<AIResult> {
  const apiKey = keyManager.getKey(provider);
  if (!apiKey) throw new Error(`No API key for provider ${provider}`);

  const cfg = PROVIDER_CONFIGS[provider];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    const response = await fetch(cfg.getUrl(), {
      method: "POST",
      headers: cfg.getHeaders(apiKey),
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
        })),
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

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

    if (!content) throw new Error(`Empty response from ${provider} model ${model}`);

    const latency = Date.now() - start;
    recordSuccess(provider, latency);

    const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || promptTokens + completionTokens;
    const costRate = MODEL_COSTS[model] || 0;

    return {
      content,
      model,
      provider,
      usage: { promptTokens, completionTokens, totalTokens },
      cost: totalTokens * costRate,
    };
  } catch (error: unknown) {
    clearTimeout(timer);
    recordFailure(provider);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${provider} model ${model} timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

export async function aiComplete(options: AIOptions): Promise<AIResult> {
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? 4096;
  const timeoutMs = options.timeout ?? 25_000;

  const order = buildProviderOrder(options.provider);

  let lastError: Error | null = null;
  let totalAttempts = 0;
  const MAX_TOTAL_ATTEMPTS = 6;
  // Hard budget so retries can't exceed the Vercel Hobby 60s function limit.
  // Leave 10s headroom for stage bookkeeping / DB writes.
  const TOTAL_BUDGET_MS = 50_000;
  const budgetStart = Date.now();

  for (const { provider, models } of order) {
    const modelsToTry = options.model
      ? [options.model, ...models].filter((m, i, a) => a.indexOf(m) === i)
      : models;

    for (const model of modelsToTry) {
      if (totalAttempts >= MAX_TOTAL_ATTEMPTS) break;

      const elapsed = Date.now() - budgetStart;
      if (elapsed >= TOTAL_BUDGET_MS) {
        logger.warn(`AI total budget exhausted after ${elapsed}ms and ${totalAttempts} attempts`);
        break;
      }
      totalAttempts++;

      // Clamp per-call timeout to remaining budget so we don't overshoot.
      const remaining = TOTAL_BUDGET_MS - elapsed;
      const effectiveTimeout = Math.min(timeoutMs, remaining);

      try {
        return await callProvider(provider, model, options.messages, temperature, maxTokens, effectiveTimeout);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.warn(`AI call failed [${provider}/${model}]: ${msg}`);
        lastError = error instanceof Error ? error : new Error(msg);
      }
    }
  }

  throw lastError || new Error("All AI providers and models failed");
}

// ---------------------------------------------------------------------------
// Streaming
// ---------------------------------------------------------------------------

export async function* aiStream(options: AIOptions): AsyncIterable<string> {
  const provider = options.provider ?? buildProviderOrder()[0]?.provider ?? "opencodezen";
  const model = options.model || (ALL_FREE_MODELS[provider]?.[0] ?? ZEN_FREE_MODELS[0]);
  const apiKey = keyManager.getKey(provider);

  if (!apiKey) throw new Error(`No API key for streaming (${provider})`);

  const cfg = PROVIDER_CONFIGS[provider];
  const controller = new AbortController();
  const timeoutMs = options.timeout ?? 120_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(cfg.getUrl(), {
      method: "POST",
      headers: cfg.getHeaders(apiKey),
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

    clearTimeout(timer);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${provider} stream error (${response.status}): ${errorText}`);
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
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Embeddings (OpenCode Zen only for now)
// ---------------------------------------------------------------------------

export async function aiEmbed(text: string): Promise<number[]> {
  const apiKey = keyManager.getKey("opencodezen");

  if (!apiKey) {
    logger.warn("No OpenCode Zen key for embeddings, returning zero vector");
    return new Array(1536).fill(0);
  }

  try {
    const response = await fetch(getEmbedUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
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

// ---------------------------------------------------------------------------
// Provider health info (for diagnostics endpoints)
// ---------------------------------------------------------------------------

export function getProviderHealth(): Record<string, unknown> {
  const configured = keyManager.getConfiguredProviders();
  const health: Record<string, unknown> = {};

  for (const p of configured) {
    const s = getStats(p);
    health[p] = {
      configured: true,
      models: ALL_FREE_MODELS[p]?.length ?? 0,
      successCount: s.successCount,
      failCount: s.failCount,
      avgLatencyMs: s.successCount > 0 ? Math.round(s.totalLatencyMs / s.successCount) : null,
    };
  }

  return { providers: health, activeProviders: configured.length };
}
