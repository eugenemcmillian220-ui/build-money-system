import { ChatMessage } from "./types";
import { logger } from "./logger";
import { keyManager, ProviderName } from "./key-manager";
import {
  ZEN_GO_OPENAI_MODELS,
  ZEN_GO_ANTHROPIC_MODELS,
  ZEN_GO_ALL_MODELS,
  ZEN_FREE_MODELS as ZEN_FREE_MODELS_NEW,
  GITHUB_MODELS as GITHUB_MODELS_NEW,
  HF_MODELS as HF_MODELS_NEW,
  STAGE_MODEL_MAP,
  extractResponseContent,
} from "./providers";

// ---------------------------------------------------------------------------
// Model catalogues per provider (OpenCode Zen + GitHub + Hugging Face ONLY)
// ---------------------------------------------------------------------------

export { ZEN_FREE_MODELS_NEW as ZEN_FREE_MODELS_V2 };
export { ZEN_GO_OPENAI_MODELS, ZEN_GO_ANTHROPIC_MODELS, ZEN_GO_ALL_MODELS };
export { STAGE_MODEL_MAP };

// Legacy model lists — kept for backward compatibility with llm-router imports
export const ZEN_FREE_MODELS = [...ZEN_FREE_MODELS_NEW];

export const ZEN_GO_MODELS = [...ZEN_GO_ALL_MODELS];

/** @deprecated Alias kept for backward compatibility */
export const ZEN_PAID_MODELS = ZEN_GO_MODELS;

export const STAGE_PREFERRED_MODELS: Record<string, string> = {
  "plan-outline": "qwen3.5-plus",
  "plan-details": "qwen3.5-plus",
  "detailing-components": "qwen3.5-plus",
  "planSpecDetails": "qwen3.5-plus",
  "codegen": "deepseek-v4-pro",
  "quick": "qwen3.5-plus",
  "outline": "qwen3.5-plus",
  "default": "qwen3.5-plus",
};

export const GITHUB_FREE_MODELS = [
  ...GITHUB_MODELS_NEW,
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
  ...HF_MODELS_NEW,
  "deepseek-ai/DeepSeek-V3-0324",
  "meta-llama/Llama-3.1-8B-Instruct",
  "Qwen/Qwen2.5-72B-Instruct",
  "mistralai/Mistral-Small-24B-Instruct-2501",
  "microsoft/Phi-3.5-mini-instruct",
  "NousResearch/Hermes-3-Llama-3.1-8B",
  "HuggingFaceH4/zephyr-7b-beta",
];

export const ALL_FREE_MODELS: Record<ProviderName, string[]> = {
  "opencode-zen": [...ZEN_FREE_MODELS],
  "opencode-go": [...ZEN_GO_OPENAI_MODELS],
  "github-models": GITHUB_FREE_MODELS,
  "huggingface": HF_FREE_MODELS,
};

// ---------------------------------------------------------------------------
// Provider endpoint config
// ---------------------------------------------------------------------------

interface ProviderConfig {
  getUrl: (model?: string) => string;
  getHeaders: (apiKey: string) => Record<string, string>;
  transformBody?: (body: Record<string, unknown>, model: string) => Record<string, unknown>;
  extractContent?: (data: Record<string, unknown>) => string | null;
  supportsStream: boolean;

}

const PROVIDER_CONFIGS: Record<ProviderName, ProviderConfig> = {
  "opencode-zen": {
    getUrl: () =>
      process.env.OPENCODE_ZEN_API_URL || "https://opencode.ai/zen/v1/chat/completions",
    getHeaders: (apiKey) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    }),
    supportsStream: true,
  },
  "opencode-go": {
    getUrl: () => "https://opencode.ai/zen/go/v1/chat/completions",
    getHeaders: (apiKey) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    }),
    extractContent: (data) => extractResponseContent(data, "openai"),
    supportsStream: true,
  },
  "github-models": {
    getUrl: () =>
      process.env.GITHUB_MODELS_API_URL || "https://models.github.ai/inference/chat/completions",
    getHeaders: (apiKey) => ({
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${apiKey}`,
    }),
    supportsStream: true,
  },
  "huggingface": {
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
  // ZEN free tier
  "big-pickle": 0, "minimax-m2.5-free": 0, "gpt-5-nano": 0,
  "nemotron-3-super-free": 0, "hy3-preview-free": 0,
  "ling-2.6-flash-free": 0, "trinity-large-preview-free": 0,
  // ZEN Go tier — openai-compatible
  "glm-5": 0.0000022, "glm-5.1": 0.0000022,
  "kimi-k2.5": 0.00003, "kimi-k2.6": 0.00003,
  "deepseek-v4-pro": 0.000003, "qwen3.5-plus": 0.0000003,
  "mimo-v2.5": 0.0000015, "mimo-v2.5-pro": 0.000003,
  "qwen3.5-plus": 0.0000015, "qwen3.6-plus": 0.0000015,
  "hy3-preview": 0.0000015,
  // ZEN Go tier — anthropic-compatible (MiniMax)
  "minimax-m2.5": 0.0000012, "minimax-m2.7": 0.0000015,
};

function getEmbedUrl(): string {
  return process.env.OPENCODE_ZEN_EMBED_URL || "https://opencode.ai/zen/v1/embeddings";
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
  const ALL_PROVIDERS: ProviderName[] = ["opencode-go", "opencode-zen", "github-models", "huggingface"];
  const configured = ALL_PROVIDERS.filter((p) => keyManager.isConfigured(p));
  if (configured.length === 0) {
    throw new Error(
      "No AI providers configured. Set at least one of: OPENCODE_ZEN_API_KEY, GITHUB_TOKEN, or HF_TOKEN"
    );
  }

  // Preferred order: OpenCode Go (fastest) → Zen → GitHub Models → HF
  const DEFAULT_PRIORITY: ProviderName[] = ["opencode-go", "opencode-zen", "github-models", "huggingface"];

  const scored = configured.map((p) => {
    const s = getStats(p);
    const avgLatency = s.successCount > 0 ? s.totalLatencyMs / s.successCount : 5000;
    const failPenalty = s.lastFailAt > Date.now() - 120_000 ? 10000 : 0;
    const preferBonus = p === preferred ? -50000 : 0;
    const defaultOrder = DEFAULT_PRIORITY.indexOf(p);
    const orderBonus = defaultOrder >= 0 ? defaultOrder * 100 : 1000; // lower index = faster by default
    return { provider: p, score: avgLatency + failPenalty + preferBonus + orderBonus };
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
    const response = await fetch(cfg.getUrl(model), {
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
    const content = cfg.extractContent ? cfg.extractContent(data) : data.choices?.[0]?.message?.content;

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
    let modelsToTry: string[];
    if (options.model) {
      const isSupportedByProvider = models.includes(options.model);
      const isPreferredProvider = options.provider === provider;
      if (isSupportedByProvider || isPreferredProvider) {
        modelsToTry = [options.model, ...models].filter((m, i, a) => a.indexOf(m) === i);
      } else {
        modelsToTry = models;
      }
    } else {
      modelsToTry = models;
    }

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
  const order = buildProviderOrder(options.provider);
  const timeoutMs = options.timeout ?? 55_000;

  let lastError: Error | null = null;

  for (const { provider, models } of order) {
    let modelsToTry: string[];
    if (options.model) {
      const isSupportedByProvider = models.includes(options.model);
      const isPreferredProvider = options.provider === provider;
      if (isSupportedByProvider || isPreferredProvider) {
        modelsToTry = [options.model, ...models].filter((m, i, a) => a.indexOf(m) === i);
      } else {
        modelsToTry = models;
      }
    } else {
      modelsToTry = models;
    }

    for (const model of modelsToTry) {
      const apiKey = keyManager.getKey(provider);
      if (!apiKey) continue;

      const cfg = PROVIDER_CONFIGS[provider];
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(cfg.getUrl(model), {
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
        let yielded = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                recordSuccess(provider, Date.now());
                return;
              }
              try {
                const json = JSON.parse(data);
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  yielded = true;
                  yield content;
                }
              } catch {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }

        if (yielded) {
          recordSuccess(provider, Date.now());
          return;
        }
      } catch (error) {
        clearTimeout(timer);
        recordFailure(provider);
        if (error instanceof Error && error.name === "AbortError") {
          lastError = new Error(`${provider}/${model} stream timed out after ${timeoutMs}ms`);
        } else {
          const msg = error instanceof Error ? error.message : String(error);
          logger.warn(`AI stream failed [${provider}/${model}]: ${msg}`);
          lastError = error instanceof Error ? error : new Error(msg);
        }
      }
    }
  }

  throw lastError || new Error("All AI providers failed for streaming");
}

// ---------------------------------------------------------------------------
// Embeddings
// ---------------------------------------------------------------------------

export async function aiEmbed(text: string): Promise<number[]> {
  const apiKey = keyManager.getKey("opencode-zen");

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
  const ALL_PROVIDERS: ProviderName[] = ["opencode-go", "opencode-zen", "github-models", "huggingface"];
  const configured = ALL_PROVIDERS.filter((p) => keyManager.isConfigured(p));
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

