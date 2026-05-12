/**
 * llm-router.ts
 * Provider priority: opencode-go → opencode-zen → github-models → huggingface
 *
 * Endpoints (from official OpenCode docs, May 2026):
 *   Go:            https://opencode.ai/zen/go/v1/chat/completions
 *   Zen:           https://opencode.ai/zen/v1/chat/completions   (OpenAI-compat models)
 *                  https://opencode.ai/zen/v1/messages           (Anthropic-compat models)
 *                  https://opencode.ai/zen/v1/responses          (OpenAI Responses API models)
 *   GitHub Models: https://models.github.ai/inference/chat/completions
 *   HuggingFace:   https://router.huggingface.co/v1/chat/completions
 */

import { keyManager, type ProviderName } from "./key-manager";

// ─── Model catalogues ────────────────────────────────────────────────────────

/**
 * OpenCode Go — paid subscription models ($10/mo).
 * All served at the same OpenAI-compat endpoint.
 * Ordered by capability tier: heavy → balanced → fast/cheap.
 */
export const GO_MODELS = {
  // Heavy / frontier-quality
  heavy: [
    "glm-5.1",          // GLM-5.1 — top coding benchmark, ~SWE-Bench 58%
    "kimi-k2.6",        // Kimi K2.6 — 58.6% SWE-Bench Pro
    "deepseek-v4-pro",  // DeepSeek V4 Pro — 55.4% SWE-Bench Pro
    "mimo-v2.5-pro",    // MiMo V2.5 Pro
  ],
  // Balanced
  balanced: [
    "glm-5",            // GLM-5
    "kimi-k2.5",        // Kimi K2.5
    "qwen3.6-plus",     // Qwen3.6 Plus
    "mimo-v2.5",        // MiMo V2.5
  ],
  // Fast / high-volume
  fast: [
    "minimax-m2.7",     // MiniMax M2.7 — 17,000 req/mo
    "minimax-m2.5",     // MiniMax M2.5 — 31,800 req/mo
    "qwen3.5-plus",     // Qwen3.5 Plus — 50,500 req/mo (most generous)
    "deepseek-v4-flash",// DeepSeek V4 Flash — 158,150 req/mo (highest volume)
  ],
} as const;

/**
 * OpenCode Zen — pay-as-you-go models.
 * Mix of OpenAI-compat, Anthropic-compat, and Responses API.
 * Free models included.
 */
export const ZEN_MODELS = {
  free: [
    "big-pickle",
    "minimax-m2.5-free",
    "ring-2.6-1t-free",
    "nemotron-3-super-free",
  ],
  openai_compat: [  // endpoint: /zen/v1/chat/completions
    "qwen3.6-plus",
    "qwen3.5-plus",
    "minimax-m2.7",
    "minimax-m2.5",
    "glm-5.1",
    "kimi-k2.5",
    "kimi-k2.6",
    "big-pickle",
    "ring-2.6-1t-free",
    "nemotron-3-super-free",
    "minimax-m2.5-free",
  ],
  anthropic_compat: [  // endpoint: /zen/v1/messages
    "claude-opus-4-7",
    "claude-opus-4-6",
    "claude-opus-4-5",
    "claude-sonnet-4-6",
    "claude-sonnet-4-5",
    "claude-haiku-4-5",
  ],
  openai_responses: [  // endpoint: /zen/v1/responses
    "gpt-5.5",
    "gpt-5.5-pro",
    "gpt-5.4",
    "gpt-5.4-mini",
    "gpt-5.4-nano",
    "gpt-5.3-codex",
    "gpt-5.3-codex-spark",
    "gpt-5.2",
    "gpt-5.1",
    "gpt-5-nano",
  ],
  google_compat: [  // endpoint: /zen/v1/models/<model-id>
    "gemini-3.1-pro",
    "gemini-3-flash",
  ],
} as const;

/**
 * GitHub Models — free tier via GitHub PAT.
 * Endpoint: https://models.github.ai/inference/chat/completions
 */
export const GITHUB_MODELS = [
  "openai/gpt-4.1-mini",
  "openai/gpt-4.1-nano",
  "meta-llama/Llama-4-Scout-17B-16E-Instruct",
  "meta-llama/Meta-Llama-3.1-8B-Instruct",
  "mistralai/Mistral-Small-24B-Instruct-2501",
  "deepseek/DeepSeek-V3-0324",
  "microsoft/Phi-4",
  "Cohere/cohere-command-a",
] as const;

/**
 * HuggingFace — free tier via HF token.
 * Endpoint: https://router.huggingface.co/v1/chat/completions
 */
export const HF_MODELS = [
  "deepseek-ai/DeepSeek-V3-0324",
  "meta-llama/Llama-3.1-8B-Instruct",
  "Qwen/Qwen2.5-72B-Instruct",
  "mistralai/Mistral-Small-24B-Instruct-2501",
  "microsoft/Phi-3.5-mini-instruct",
  "google/gemma-2-2b-it",
] as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export interface AgentConfig {
  temperature: number;
  max_tokens: number;
  stream: boolean;
}

export interface ProviderRequest {
  provider: ProviderName;
  model: string;
  endpoint: string;
  messages: ChatMessage[];
  config: AgentConfig;
  apiKey: string;
}

// ─── Default configs per use-case ────────────────────────────────────────────

export const AGENT_CONFIGS: Record<string, Partial<AgentConfig>> = {
  // Heavy LLM work — code generation, architecture
  codegen:    { temperature: 0.2, max_tokens: 8192,  stream: true  },
  // Classification, intent detection
  classify:   { temperature: 0.1, max_tokens: 1024,  stream: false },
  // Scout / research / analysis
  research:   { temperature: 0.4, max_tokens: 4096,  stream: false },
  // Documentation, summaries
  document:   { temperature: 0.3, max_tokens: 4096,  stream: false },
  // Quick utility calls
  utility:    { temperature: 0.2, max_tokens: 2048,  stream: false },
};

const DEFAULT_CONFIG: AgentConfig = { temperature: 0.2, max_tokens: 4096, stream: true };

// ─── Router ──────────────────────────────────────────────────────────────────

class LLMRouter {

  /**
   * Returns a fully-configured ProviderRequest ready to execute.
   * Priority: opencode-go → opencode-zen → github-models → huggingface
   *
   * @param messages    Conversation messages
   * @param useCase     One of AGENT_CONFIGS keys (default: "codegen")
   * @param modelTier   For Go/Zen: "heavy" | "balanced" | "fast" | "free"
   */
  getNextRequest(
    messages: ChatMessage[],
    useCase: keyof typeof AGENT_CONFIGS = "codegen",
    modelTier: "heavy" | "balanced" | "fast" | "free" = "balanced"
  ): ProviderRequest {
    const config: AgentConfig = { ...DEFAULT_CONFIG, ...(AGENT_CONFIGS[useCase] ?? {}) };

    // 1. OpenCode Go (paid subscription — primary for most agent work)
    if (keyManager.isConfigured("opencode-go")) {
      const key = keyManager.getKey("opencode-go");
      if (key) {
        const model = this.pickGoModel(modelTier);
        return {
          provider: "opencode-go",
          model,
          endpoint: "https://opencode.ai/zen/go/v1/chat/completions",
          messages,
          config,
          apiKey: key,
        };
      }
    }

    // 2. OpenCode Zen (pay-as-you-go — fallback including free models)
    if (keyManager.isConfigured("opencode-zen")) {
      const key = keyManager.getKey("opencode-zen");
      if (key) {
        const { model, endpoint } = this.pickZenModel(modelTier);
        return {
          provider: "opencode-zen",
          model,
          endpoint,
          messages,
          config,
          apiKey: key,
        };
      }
    }

    // 3. GitHub Models (free tier)
    if (keyManager.isConfigured("github-models")) {
      const key = keyManager.getKey("github-models");
      if (key) {
        const model = modelTier === "heavy" || modelTier === "balanced"
          ? "deepseek/DeepSeek-V3-0324"
          : "openai/gpt-4.1-nano";
        return {
          provider: "github-models",
          model,
          endpoint: "https://models.github.ai/inference/chat/completions",
          messages,
          config,
          apiKey: key,
        };
      }
    }

    // 4. HuggingFace (free tier — last resort)
    if (keyManager.isConfigured("huggingface")) {
      const key = keyManager.getKey("huggingface");
      if (key) {
        const model = modelTier === "heavy" || modelTier === "balanced"
          ? "deepseek-ai/DeepSeek-V3-0324"
          : "meta-llama/Llama-3.1-8B-Instruct";
        return {
          provider: "huggingface",
          model,
          endpoint: "https://router.huggingface.co/v1/chat/completions",
          messages,
          config,
          apiKey: key,
        };
      }
    }

    throw new Error(
      "[llm-router] No providers configured. Set at least one of: " +
      "OPENCODE_GO_API_KEY, OPENCODE_ZEN_API_KEY, GITHUB_TOKEN, HF_TOKEN"
    );
  }

  /** Build fetch params from a ProviderRequest */
  getFetchParams(req: ProviderRequest): {
    url: string;
    headers: Record<string, string>;
    body: unknown;
  } {
    const baseBody = {
      model: req.model,
      messages: req.messages,
      temperature: req.config.temperature,
      max_tokens: req.config.max_tokens,
      stream: req.config.stream,
    };

    // Anthropic-compat endpoint uses different auth header format
    const isAnthropicEndpoint = req.endpoint.endsWith("/messages");

    return {
      url: req.endpoint,
      headers: isAnthropicEndpoint
        ? {
            "Content-Type": "application/json",
            "x-api-key": req.apiKey,
            "anthropic-version": "2023-06-01",
          }
        : {
            "Content-Type": "application/json",
            Authorization: `Bearer ${req.apiKey}`,
          },
      body: baseBody,
    };
  }

  // ─── Model pickers ─────────────────────────────────────────────────────────

  private pickGoModel(tier: "heavy" | "balanced" | "fast" | "free"): string {
    switch (tier) {
      case "heavy":   return GO_MODELS.heavy[0];    // glm-5.1
      case "fast":    return GO_MODELS.fast[2];     // qwen3.5-plus (avoid dead deepseek-v4-flash)
      case "free":    return GO_MODELS.fast[2];     // qwen3.5-plus (highest req/mo)
      case "balanced":
      default:        return GO_MODELS.balanced[0]; // glm-5
    }
  }

  private pickZenModel(tier: "heavy" | "balanced" | "fast" | "free"): {
    model: string;
    endpoint: string;
  } {
    const base = "https://opencode.ai/zen/v1";
    switch (tier) {
      case "heavy":
        return { model: "claude-opus-4-6", endpoint: `${base}/messages` };
      case "balanced":
        return { model: "kimi-k2.6", endpoint: `${base}/chat/completions` };
      case "fast":
        return { model: "qwen3.5-plus", endpoint: `${base}/chat/completions` };
      case "free":
      default:
        return { model: "big-pickle", endpoint: `${base}/chat/completions` };
    }
  }

  /**
   * Execute a request with automatic provider failover.
   * Tries providers in priority order until one succeeds.
   */
  async executeWithFailover(
    messages: ChatMessage[],
    useCase: keyof typeof AGENT_CONFIGS = "codegen",
    modelTier: "heavy" | "balanced" | "fast" | "free" = "balanced"
  ): Promise<{ content: string; provider: ProviderName; model: string }> {
    const req = this.getNextRequest(messages, useCase, modelTier);
    const { url, headers, body } = this.getFetchParams(req);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      keyManager.reportError(req.provider, req.apiKey);
      throw new Error(
        `[llm-router] ${req.provider}/${req.model} returned ${response.status}: ${await response.text().catch(() => "unknown")}`
      );
    }

    keyManager.reportSuccess(req.provider, req.apiKey);

    const data = await response.json();

    // Extract content based on endpoint format
    let content: string;
    if (req.endpoint.endsWith("/messages")) {
      const parts = data?.content as Array<{ text?: string }> | undefined;
      content = parts?.[0]?.text ?? "";
    } else {
      const choices = data?.choices as Array<{ message?: { content?: string } }> | undefined;
      content = choices?.[0]?.message?.content ?? "";
    }

    return { content, provider: req.provider, model: req.model };
  }

  /**
   * Get a specific model explicitly by name, auto-resolving its endpoint.
   * Useful when an agent needs a particular model (e.g. Scout → fast model,
   * Codegen → heavy model).
   */
  getRequestForModel(
    modelId: string,
    messages: ChatMessage[],
    useCase: keyof typeof AGENT_CONFIGS = "codegen"
  ): ProviderRequest {
    const config: AgentConfig = { ...DEFAULT_CONFIG, ...(AGENT_CONFIGS[useCase] ?? {}) };

    // Check Go models
    const allGoModels = [
      ...GO_MODELS.heavy,
      ...GO_MODELS.balanced,
      ...GO_MODELS.fast,
    ] as readonly string[];

    if (allGoModels.includes(modelId) && keyManager.isConfigured("opencode-go")) {
      const key = keyManager.getKey("opencode-go")!;
      return {
        provider: "opencode-go",
        model: modelId,
        endpoint: "https://opencode.ai/zen/go/v1/chat/completions",
        messages, config, apiKey: key,
      };
    }

    // Check Zen models
    const zenOpenAIModels = ZEN_MODELS.openai_compat as readonly string[];
    const zenAnthropicModels = ZEN_MODELS.anthropic_compat as readonly string[];
    const zenResponseModels = ZEN_MODELS.openai_responses as readonly string[];

    if (keyManager.isConfigured("opencode-zen")) {
      const key = keyManager.getKey("opencode-zen")!;
      const base = "https://opencode.ai/zen/v1";

      if (zenOpenAIModels.includes(modelId)) {
        return { provider: "opencode-zen", model: modelId, endpoint: `${base}/chat/completions`, messages, config, apiKey: key };
      }
      if (zenAnthropicModels.includes(modelId)) {
        return { provider: "opencode-zen", model: modelId, endpoint: `${base}/messages`, messages, config, apiKey: key };
      }
      if (zenResponseModels.includes(modelId)) {
        return { provider: "opencode-zen", model: modelId, endpoint: `${base}/responses`, messages, config, apiKey: key };
      }
    }

    // Fallback to default routing
    return this.getNextRequest(messages, useCase);
  }
}

export const llmRouter = new LLMRouter();
