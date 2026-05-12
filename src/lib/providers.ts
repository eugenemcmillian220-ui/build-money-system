// src/lib/providers.ts
// Verified against official OpenCode Go docs — May 2026

export type ProviderID =
  | "opencodezen"
  | "opencodezen_go_openai"   // /chat/completions — most Go models
  | "opencodezen_go_anthropic" // /messages — MiniMax only
  | "github"
  | "huggingface";

export type FormatType = "openai" | "anthropic";

export interface ProviderConfig {
  id: ProviderID;
  baseURL: string;
  apiKeyEnvVar: string;
  format: FormatType;
  defaultHeaders?: Record<string, string>;
}

// ── Provider registry ─────────────────────────────────────────
export const PROVIDERS: Record<ProviderID, ProviderConfig> = {
  // Free tier
  opencodezen: {
    id: "opencodezen",
    baseURL: "https://opencode.ai/zen/v1",
    apiKeyEnvVar: "OPENCODE_ZEN_API_KEY",
    format: "openai",
  },

  // Go tier — openai-compatible (most models)
  opencodezen_go_openai: {
    id: "opencodezen_go_openai",
    baseURL: "https://opencode.ai/zen/go/v1",
    apiKeyEnvVar: "OPENCODE_ZEN_API_KEY",
    format: "openai",   // → /chat/completions
  },

  // Go tier — anthropic-compatible (MiniMax M2.5 and M2.7 ONLY)
  opencodezen_go_anthropic: {
    id: "opencodezen_go_anthropic",
    baseURL: "https://opencode.ai/zen/go/v1",
    apiKeyEnvVar: "OPENCODE_ZEN_API_KEY",
    format: "anthropic", // → /messages
  },

  // Fallback: GitHub Models
  github: {
    id: "github",
    baseURL: "https://models.inference.ai.azure.com",
    apiKeyEnvVar: "GITHUB_MODELS_TOKEN",
    format: "openai",
  },

  // Fallback: Hugging Face
  huggingface: {
    id: "huggingface",
    baseURL: "https://router.huggingface.co/v1",
    apiKeyEnvVar: "HUGGINGFACE_API_KEY",
    format: "openai",
  },
};

// ── Go tier model registry ─────────────────────────────────────
// Source: https://opencode.ai/zen/go — official docs
// API uses bare model IDs — NO opencode-go/ prefix in API calls
// (opencode-go/ prefix is TUI config only)

export const ZEN_GO_OPENAI_MODELS = [
  "glm-5",
  "glm-5.1",
  "kimi-k2.5",
  "kimi-k2.6",
  "deepseek-v4-pro",
  // "deepseek-v4-flash" removed — returns HTTP 404 from OpenCode Zen API
  "mimo-v2.5",
  "mimo-v2.5-pro",
  "qwen3.5-plus",
  "qwen3.6-plus",
  "hy3-preview",
] as const;

export const ZEN_GO_ANTHROPIC_MODELS = [
  // These two ONLY — use /messages endpoint
  "minimax-m2.5",
  "minimax-m2.7",
] as const;

// ── Free tier models ──────────────────────────────────────────
export const ZEN_FREE_MODELS = [
  "big-pickle",
  "minimax-m2.5-free",
  "gpt-5-nano",
  "nemotron-3-super-free",
  "hy3-preview-free",
  "ling-2.6-flash-free",
  "trinity-large-preview-free",
] as const;

// ── Fallback model lists ───────────────────────────────────────
export const GITHUB_MODELS = [
  "gpt-4o-mini",
  "Llama-3.3-70B-Instruct",
  "DeepSeek-R1",
] as const;

export const HF_MODELS = [
  "deepseek-ai/DeepSeek-R1",
  "meta-llama/Llama-3.3-70B-Instruct",
  "Qwen/Qwen2.5-Coder-32B-Instruct",
] as const;

// ── Stage → model assignments ──────────────────────────────────
export const STAGE_MODEL_MAP: Record<string, {
  provider: ProviderID;
  model: string;
}> = {
  "plan-outline": {
    provider: "opencodezen_go_openai",
    model: "qwen3.5-plus", // Fast and reliable for high-level structure
  },
  "plan-details": {
    provider: "opencodezen_go_openai",
    model: "qwen3.5-plus", // Use for speed to avoid serverless stalls
  },
  "detailing-components": {
    provider: "opencodezen_go_openai",
    model: "qwen3.5-plus",
  },
  "planSpecDetails": {
    provider: "opencodezen_go_openai",
    model: "qwen3.5-plus",
  },
  "codegen": {
    provider: "opencodezen_go_openai",
    model: "deepseek-v4-pro",
  },
  "quick": {
    provider: "opencodezen_go_openai",
    model: "qwen3.5-plus",
  },
  "outline": {
    provider: "opencodezen_go_openai",
    model: "qwen3.5-plus",
  },
  "default": {
    provider: "opencodezen_go_openai",
    model: "qwen3.5-plus",
  },
};

// ── Helpers ────────────────────────────────────────────────────

/** All Go models (both openai and anthropic format) */
export const ZEN_GO_ALL_MODELS = [
  ...ZEN_GO_OPENAI_MODELS,
  ...ZEN_GO_ANTHROPIC_MODELS,
] as const;

/** Check if a model uses the anthropic format (MiniMax only) */
export function isAnthropicModel(model: string): boolean {
  return (ZEN_GO_ANTHROPIC_MODELS as readonly string[]).includes(model);
}

/** Get the provider endpoint path based on format */
export function getEndpointPath(format: FormatType): string {
  return format === "openai" ? "/chat/completions" : "/messages";
}

/** Parse response based on format */
export function extractResponseContent(
  data: Record<string, unknown>,
  format: FormatType,
): string {
  if (format === "openai") {
    const choices = data?.choices as Array<{ message?: { content?: string } }> | undefined;
    return choices?.[0]?.message?.content ?? "";
  }
  const content = data?.content as Array<{ text?: string }> | undefined;
  return content?.[0]?.text ?? "";
}
