import { ChatMessage, AgentConfig } from "./types";
import { keyManager, ProviderName } from "./key-manager";
import { aiComplete, FREE_MODELS, PAID_MODELS } from "./ai";

export type LLMProvider = ProviderName;

export interface ProviderRequest {
  provider: LLMProvider;
  model: string;
  messages: ChatMessage[];
  config?: Partial<AgentConfig>;
}

export const FREE_MODEL_LIST: Record<LLMProvider, string[]> = {
  openrouter: [...FREE_MODELS, ...PAID_MODELS],
  groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
  gemini: ["gemini-2.0-flash", "gemini-2.5-pro-preview"],
  openai: ["gpt-4o", "gpt-4o-mini"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
};

export class LLMRouter {
  private priorityChain: LLMProvider[] = ["openrouter", "groq", "gemini", "openai", "deepseek"];

  async executeWithFailover(
    messages: ChatMessage[],
    config?: Partial<AgentConfig>
  ): Promise<{ provider: LLMProvider; model: string; content: string; cached: boolean }> {
    const model = config?.model || FREE_MODELS[0];

    try {
      const result = await aiComplete({
        messages,
        model: model,
        temperature: config?.temperature,
        maxTokens: config?.maxTokens,
      });

      const provider = keyManager.getFirstConfiguredProvider() || "openrouter";

      return {
        provider,
        model: result.model,
        content: result.content,
        cached: false,
      };
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  getFetchParams(req: { provider: string; model: string; messages: ChatMessage[]; config?: Partial<AgentConfig> }) {
    const provider = (keyManager.getFirstConfiguredProvider() || "openrouter") as ProviderName;
    const apiKey = keyManager.getKey(provider) ?? "";
    const url = provider === "openrouter"
      ? (process.env.OPENROUTER_API_URL || "https://openrouter.ai/api/v1/chat/completions")
      : provider === "groq"
        ? "https://api.groq.com/openai/v1/chat/completions"
        : provider === "openai"
          ? "https://api.openai.com/v1/chat/completions"
          : provider === "deepseek"
            ? "https://api.deepseek.com/v1/chat/completions"
            : "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    };

    if (provider === "openrouter") {
      headers["HTTP-Referer"] = process.env.NEXT_PUBLIC_SITE_URL || "https://sovereign-forge.app";
      headers["X-Title"] = "Sovereign Forge OS";
    }

    return {
      url,
      headers,
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
