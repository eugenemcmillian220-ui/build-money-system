import { ChatMessage, AgentConfig } from "./types";
import { keyManager, ProviderName } from "./key-manager";
import { aiComplete, ZEN_FREE_MODELS, ZEN_PAID_MODELS, GITHUB_FREE_MODELS, HF_FREE_MODELS, ALL_FREE_MODELS, getProviderHealth } from "./ai";

export type LLMProvider = ProviderName;

export interface ProviderRequest {
  provider: LLMProvider;
  model: string;
  messages: ChatMessage[];
  config?: Partial<AgentConfig>;
}

export const FREE_MODELS: Record<LLMProvider, string[]> = {
  opencodezen: [...ZEN_FREE_MODELS, ...ZEN_PAID_MODELS],
  github: GITHUB_FREE_MODELS,
  huggingface: HF_FREE_MODELS,
};

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
    const provider = (req.provider as ProviderName) || "opencodezen";
    const apiKey = keyManager.getKey(provider) ?? "";

    const urlMap: Record<ProviderName, string> = {
      opencodezen: process.env.OPENCODE_ZEN_API_URL || "https://opencode.ai/zen/go/v1/chat/completions",
      github: process.env.GITHUB_MODELS_API_URL || "https://models.github.ai/inference/chat/completions",
      huggingface: process.env.HF_API_URL || "https://router.huggingface.co/v1/chat/completions",
    };

    const url = urlMap[provider] ?? urlMap.opencodezen;

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
