// Legacy providers (Groq/Gemini/OpenAI/OpenRouter) have been fully removed.
// src/lib/providers.ts
// Verified against live API — May 2026

export type ProviderID =
  | "opencode-zen"
  | "opencode-go"
  | "github-models"
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
  // Primary: OpenCode Go tier
  "opencode-go": {
    id: "opencode-go",
    baseURL: "https://opencode.ai/zen/go/v1",
    apiKeyEnvVar: "OPENCODE_GO_API_KEY",
    format: "openai",
  },
  // Secondary: OpenCode Zen (pay-as-you-go + free models)
  "opencode-zen": {
    id: "opencode-zen",
    baseURL: "https://opencode.ai/zen/v1",
    apiKeyEnvVar: "OPENCODE_ZEN_API_KEY",
    format: "openai",
  },
  // Tertiary: GitHub Models — verified live May 2026
  "github-models": {
    id: "github-models",
    baseURL: "https://models.inference.ai.azure.com",
    apiKeyEnvVar: "GITHUB_TOKEN",
    format: "openai",
  },
  // Fallback: Hugging Face
  "huggingface": {
    id: "huggingface",
    baseURL: "https://router.huggingface.co/v1",
    apiKeyEnvVar: "HF_TOKEN",
    format: "openai",
  },
};

// ── OpenCode Go tier models ────────────────────────────────────
// Source: https://opencode.ai/zen/go — verified May 2026
// Use bare model IDs — NO opencode-go/ prefix in API calls
export const ZEN_GO_OPENAI_MODELS = [
  "qwen3.5-plus",    // Fast, reliable — primary workhorse
  "qwen3.6-plus",    // Upgraded Qwen
  "deepseek-v4-pro", // Best for codegen
  "kimi-k2.5",       // Long context
  "kimi-k2.6",       // Latest Kimi
  "glm-5",           // GLM series
  "glm-5.1",
  "mimo-v2.5",       // MiMo reasoning
  "mimo-v2.5-pro",
  "hy3-preview",     // Hunyuan
] as const;

export const ZEN_GO_ANTHROPIC_MODELS = [
  // These two ONLY — use /messages endpoint
  "minimax-m2.5",
  "minimax-m2.7",
] as const;

// ── OpenCode Zen free models ──────────────────────────────────
export const ZEN_FREE_MODELS = [
  "gpt-5-nano",
  "big-pickle",
  "minimax-m2.5-free",
  "hy3-preview-free",
  "ling-2.6-flash-free",
  "trinity-large-preview-free",
  "nemotron-3-super-free",
] as const;

// ── GitHub Models — verified live May 2026 ────────────────────
export const GITHUB_MODELS = [
  // OpenAI
  "gpt-4o",                        // Flagship — best quality
  "gpt-4o-mini",                   // Fast + cheap
  // Meta Llama
  "Meta-Llama-3.1-405B-Instruct",  // Largest open model
  "Llama-3.3-70B-Instruct",        // Best quality/speed tradeoff
  "Meta-Llama-3.1-8B-Instruct",    // Ultra fast
  // Microsoft Phi
  "Phi-4",                         // Strong reasoning
  "Phi-4-multimodal-instruct",     // Vision capable
  // DeepSeek
  "DeepSeek-R1",                   // Reasoning/thinking model
  "DeepSeek-V3-0324",              // Latest DeepSeek
  // Cohere
  "Cohere-command-a",              // Enterprise-grade
] as const;

// ── Hugging Face models ────────────────────────────────────────
export const HF_MODELS = [
  "deepseek-ai/DeepSeek-V3-0324",
  "meta-llama/Llama-3.3-70B-Instruct",
  "Qwen/Qwen2.5-Coder-32B-Instruct",
  "Qwen/Qwen2.5-72B-Instruct",
  "mistralai/Mistral-7B-Instruct-v0.3",
] as const;

// ── Stage → model assignments ──────────────────────────────────
// Optimized per-stage: fast models for planning, powerful for codegen
export const STAGE_MODEL_MAP: Record<string, {
  provider: ProviderID;
  model: string;
}> = {
  // Planning stages — fast + smart
  "plan-outline":         { provider: "opencode-go", model: "qwen3.5-plus" },
  "plan-details":         { provider: "opencode-go", model: "qwen3.5-plus" },
  "detailing-components": { provider: "opencode-go", model: "qwen3.5-plus" },
  "planSpecDetails":      { provider: "opencode-go", model: "qwen3.5-plus" },
  "outline":              { provider: "opencode-go", model: "qwen3.5-plus" },
  "quick":                { provider: "opencode-go", model: "qwen3.5-plus" },
  // Codegen — use deepseek-v4-pro (best for code)
  "codegen":              { provider: "opencode-go", model: "deepseek-v4-pro" },
  // Default
  "default":              { provider: "opencode-go", model: "qwen3.5-plus" },
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
