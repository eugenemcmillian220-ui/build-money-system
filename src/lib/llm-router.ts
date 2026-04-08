import { ChatMessage, AgentConfig } from "./types";
import { keyManager, ProviderName } from "./key-manager";

export type LLMProvider = ProviderName;

export interface ProviderRequest {
  provider: LLMProvider;
  model: string;
  messages: ChatMessage[];
  config?: Partial<AgentConfig>;
}

export const FREE_MODELS: Record<LLMProvider, string[]> = {
  openrouter: [
    "qwen/qwen3-coder-480b-a35b-instruct:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "openrouter/free",
  ],
  gemini: [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
  ],
  groq: [
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "llama-3.3-70b-versatile",
    "llama3-8b-8192",
  ],
  openai: [
    "gpt-4o-mini",
    "gpt-3.5-turbo",
  ],
  deepseek: [
    "deepseek-chat",
    "deepseek-reasoner",
  ],
  cerebras: [
    "llama3.1-70b",
    "llama3.1-8b",
  ],
  cloudflare: [
    "@cf/meta/llama-3.2-3b-instruct",
    "@cf/meta/llama-3.2-1b-instruct",
  ],
};

/**
 * LLM Router: Multi-Key Rotation + Tiered Fallback Strategy
 * Rotates through the most generous free providers and rotates keys within each.
 */
export class LLMRouter {
  private currentRotationIndex = 0;

  private priorityChain: LLMProvider[] = [
    "groq",
    "gemini",
    "openrouter",
    "openai",
    "cerebras",
    "deepseek",
    "cloudflare",
  ];

  getNextRequest(messages: ChatMessage[], config?: Partial<AgentConfig>): ProviderRequest {
    const availableProviders = this.priorityChain.filter((p) => keyManager.isConfigured(p));

    if (availableProviders.length === 0) {
      throw new Error(
        "No LLM providers configured. Add at least one API key: OPENROUTER_API_KEY, GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY."
      );
    }

    const provider = availableProviders[this.currentRotationIndex % availableProviders.length];
    this.currentRotationIndex++;

    const models = FREE_MODELS[provider];
    const model = models[Math.floor(Math.random() * models.length)];

    return { provider, model, messages, config };
  }

  /**
   * Builds the fetch parameters for a specific provider, using key rotation.
   */
  getFetchParams(req: ProviderRequest): { url: string; headers: Record<string, string>; body: unknown; apiKey: string } {
    const { provider, model, messages, config } = req;
    let url = "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    let body: unknown;

    const temp = config?.temperature ?? 0.7;
    const maxTokens = config?.maxTokens ?? 4096;

    const apiKey = keyManager.getKey(provider) ?? "";

    switch (provider) {
      case "openrouter":
        url = "https://openrouter.ai/api/v1/chat/completions";
        headers["Authorization"] = `Bearer ${apiKey}`;
        headers["HTTP-Referer"] = process.env.NEXT_PUBLIC_SITE_URL ?? "https://localhost:3000";
        headers["X-Title"] = "AI App Builder";
        body = { model, messages: this.formatMessages(messages), temperature: temp, max_tokens: maxTokens };
        break;

      case "gemini":
        url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        body = {
          contents: messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: typeof m.content === "string" ? m.content : JSON.stringify(m.content) }],
          })),
          generationConfig: { temperature: temp, maxOutputTokens: maxTokens },
        };
        break;

      case "groq":
        url = "https://api.groq.com/openai/v1/chat/completions";
        headers["Authorization"] = `Bearer ${apiKey}`;
        body = { model, messages: this.formatMessages(messages), temperature: temp, max_tokens: maxTokens };
        break;

      case "openai":
        url = "https://api.openai.com/v1/chat/completions";
        headers["Authorization"] = `Bearer ${apiKey}`;
        body = { model, messages: this.formatMessages(messages), temperature: temp, max_tokens: maxTokens };
        break;

      case "deepseek":
        url = "https://api.deepseek.com/chat/completions";
        headers["Authorization"] = `Bearer ${apiKey}`;
        body = { model, messages: this.formatMessages(messages), temperature: temp, max_tokens: maxTokens };
        break;

      case "cerebras":
        url = "https://api.cerebras.ai/v1/chat/completions";
        headers["Authorization"] = `Bearer ${apiKey}`;
        body = { model, messages: this.formatMessages(messages), temperature: temp, max_tokens: maxTokens };
        break;

      case "cloudflare": {
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
        url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
        headers["Authorization"] = `Bearer ${apiKey}`;
        body = { messages: this.formatMessages(messages), stream: false };
        break;
      }
    }

    return { url, headers, body, apiKey };
  }

  private formatMessages(messages: ChatMessage[]): unknown[] {
    return messages.map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    }));
  }
}

export const llmRouter = new LLMRouter();
