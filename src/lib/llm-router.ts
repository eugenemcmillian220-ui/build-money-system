import { ChatMessage, AgentConfig } from "./types";
import { keyManager, ProviderName } from "./key-manager";
import {
  aiComplete,
  ZEN_FREE_MODELS,
  GITHUB_FREE_MODELS,
  HF_FREE_MODELS,
  ALL_FREE_MODELS,
  STAGE_PREFERRED_MODELS,
  ZEN_GO_OPENAI_MODELS,
  ZEN_GO_ANTHROPIC_MODELS,
  getProviderHealth,
} from "./ai";
import { STAGE_MODEL_MAP } from "./providers";

export type LLMProvider = ProviderName;

export interface ProviderRequest {
  provider: LLMProvider;
  model: string;
  messages: ChatMessage[];
  config?: Partial<AgentConfig>;
}

export const FREE_MODELS: Record<LLMProvider, string[]> = {
  opencodezen: [...ZEN_FREE_MODELS],
  opencodezen_go_openai: [...ZEN_GO_OPENAI_MODELS],
  opencodezen_go_anthropic: [...ZEN_GO_ANTHROPIC_MODELS],
  github: GITHUB_FREE_MODELS,
  huggingface: HF_FREE_MODELS,
};

const ZEN_URL = process.env.OPENCODE_ZEN_API_URL || "https://opencode.ai/zen/v1/chat/completions";

/** URL map for direct fetch calls (getFetchParams). Auto-selects configured provider. */
const PROVIDER_URLS: Record<ProviderName, string> = {
  opencodezen: ZEN_URL,
  opencodezen_go_openai: "https://opencode.ai/zen/go/v1/chat/completions",
  opencodezen_go_anthropic: "https://opencode.ai/zen/go/v1/messages",
  github: process.env.GITHUB_MODELS_API_URL || "https://models.github.ai/inference/chat/completions",
  huggingface: process.env.HF_API_URL || "https://router.huggingface.co/v1/chat/completions",
};

export function getPreferredModel(stage: string): string {
  return STAGE_PREFERRED_MODELS[stage] || STAGE_PREFERRED_MODELS["default"] || "deepseek-v4-flash";
}

export function getStageModelConfig(stage: string): { provider: LLMProvider; model: string } {
  return STAGE_MODEL_MAP[stage] || STAGE_MODEL_MAP["default"] || { provider: "opencodezen_go_openai", model: "deepseek-v4-flash" };
}

export class LLMRouter {
  async executeWithFailover(
    messages: ChatMessage[],
    config?: Partial<AgentConfig>
  ): Promise<{ provider: LLMProvider; model: string; content: string; cached: boolean }> {
    const model = config?.model || undefined;

    const result = await aiComplete({
      messages,
      model,
      temperature: config?.temperature,
      maxTokens: config?.maxTokens,
    });

    return {
      provider: result.provider,
      model: result.model,
      content: result.content,
      cached: false,
    };
  }

  getFetchParams(req: { provider: string; model: string; messages: ChatMessage[]; config?: Partial<AgentConfig> }) {
    const provider = (req.provider as ProviderName) || keyManager.getConfiguredProviders()[0] || "opencodezen_go_openai";
    const apiKey = keyManager.getKey(provider) ?? "";
    const url = PROVIDER_URLS[provider] ?? PROVIDER_URLS.opencodezen;

    return {
      url,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: {
        model: req.model,
        messages: req.messages.map((m) => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
        })),
        temperature: req.config?.temperature ?? 0.7,
        max_tokens: req.config?.maxTokens ?? 4096,
      },
      apiKey,
    };
  }

  getAvailableProviders(): LLMProvider[] {
    return keyManager.getConfiguredProviders();
  }

  getModelsForProvider(provider: LLMProvider): string[] {
    return ALL_FREE_MODELS[provider] ?? [];
  }

  getHealth(): Record<string, unknown> {
    return getProviderHealth();
  }
}

export const llmRouter = new LLMRouter();
