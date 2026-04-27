import { ChatMessage, AgentConfig } from "./types";
import { keyManager, ProviderName } from "./key-manager";
import { aiComplete, ZEN_FREE_MODELS, ZEN_PAID_MODELS } from "./ai";

export type LLMProvider = ProviderName;

export interface ProviderRequest {
  provider: LLMProvider;
  model: string;
  messages: ChatMessage[];
  config?: Partial<AgentConfig>;
}

export const FREE_MODELS: Record<LLMProvider, string[]> = {
  opencodezen: [...ZEN_FREE_MODELS, ...ZEN_PAID_MODELS],
};

export class LLMRouter {
  async executeWithFailover(
    messages: ChatMessage[],
    config?: Partial<AgentConfig>
  ): Promise<{ provider: LLMProvider; model: string; content: string; cached: boolean }> {
    const model = config?.model || ZEN_FREE_MODELS[0];

    try {
      const result = await aiComplete({
        messages,
        model,
        temperature: config?.temperature,
        maxTokens: config?.maxTokens,
      });

      return {
        provider: "opencodezen",
        model: result.model,
        content: result.content,
        cached: false,
      };
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  getFetchParams(req: { provider: string; model: string; messages: ChatMessage[]; config?: Partial<AgentConfig> }) {
    const apiKey = keyManager.getKey("opencodezen") ?? "";
    const url = process.env.OPENCODE_ZEN_API_URL || "https://opencode.ai/zen/go/v1/chat/completions";

    return {
      url,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: {
        model: req.model,
        messages: req.messages.map(m => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
        })),
        temperature: req.config?.temperature ?? 0.7,
        max_tokens: req.config?.maxTokens ?? 4096,
      },
      apiKey,
    };
  }
}

export const llmRouter = new LLMRouter();
