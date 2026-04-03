import { serverEnv } from "./env";
import { ChatMessage, AgentConfig } from "./types";

export type LLMProvider = "openrouter" | "gemini" | "groq";

export interface ProviderRequest {
  provider: LLMProvider;
  model: string;
  messages: ChatMessage[];
  config?: Partial<AgentConfig>;
}

export const FREE_MODELS: Record<LLMProvider, string[]> = {
  openrouter: [
    "openrouter/free",
    "stepfun/step-3-5-flash:free",
    "qwen/qwen3-coder-480b-a35b-instruct:free",
    "nvidia/nemotron-3-super-120b-a12b:free"
  ],
  gemini: [
    "gemini-3.1-flash-lite-preview",
    "gemini-3.1-flash-preview",
    "gemini-2.5-pro"
  ],
  groq: [
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant"
  ]
};

/**
 * LLM Router: Rotates through providers and free models to avoid rate limits
 */
export class LLMRouter {
  private currentProviderIndex = 0;
  private providers: LLMProvider[] = ["openrouter", "gemini", "groq"];

  constructor() {
    // Only include providers with configured API keys
    this.providers = this.providers.filter(p => {
      if (p === "openrouter") return !!serverEnv.OPENROUTER_API_KEY;
      if (p === "gemini") return !!serverEnv.GEMINI_API_KEY;
      if (p === "groq") return !!serverEnv.GROQ_API_KEY;
      return false;
    });
  }

  /**
   * Get the next available provider and a random free model from its list
   */
  getNextFreeRequest(messages: ChatMessage[], config?: Partial<AgentConfig>): ProviderRequest {
    if (this.providers.length === 0) {
      throw new Error("No LLM providers configured. Please add API keys for OpenRouter, Gemini, or Groq.");
    }

    const provider = this.providers[this.currentProviderIndex];
    const models = FREE_MODELS[provider];
    const model = models[Math.floor(Math.random() * models.length)];

    // Rotate for next call
    this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;

    return { provider, model, messages, config };
  }

  /**
   * Builds the fetch parameters for a specific provider
   */
  getFetchParams(req: ProviderRequest) {
    const { provider, model, messages, config } = req;
    
    let url = "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    let body: unknown;

    switch (provider) {
      case "openrouter":
        url = "https://openrouter.ai/api/v1/chat/completions";
        headers["Authorization"] = `Bearer ${serverEnv.OPENROUTER_API_KEY}`;
        headers["HTTP-Referer"] = serverEnv.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
        headers["X-Title"] = "AI App Builder";
        body = {
          model,
          messages: this.formatMessages(provider, messages),
          temperature: config?.temperature ?? 0.7,
          max_tokens: config?.maxTokens ?? 4096,
        };
        break;
      case "gemini":
        url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${serverEnv.GEMINI_API_KEY}`;
        body = {
          contents: messages.map(m => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: typeof m.content === "string" ? m.content : JSON.stringify(m.content) }]
          })),
          generationConfig: {
            temperature: config?.temperature ?? 0.7,
            maxOutputTokens: config?.maxTokens ?? 4096,
          }
        };
        break;
      case "groq":
        url = "https://api.groq.com/openai/v1/chat/completions";
        headers["Authorization"] = `Bearer ${serverEnv.GROQ_API_KEY}`;
        body = {
          model,
          messages: this.formatMessages(provider, messages),
          temperature: config?.temperature ?? 0.7,
          max_tokens: config?.maxTokens ?? 4096,
        };
        break;
    }

    return { url, headers, body, provider };
  }

  private formatMessages(provider: LLMProvider, messages: ChatMessage[]): unknown[] {
    if (provider === "gemini") return messages; // Handled in getFetchParams
    
    // OpenRouter and Groq use OpenAI format
    return messages.map(m => ({
      role: m.role,
      content: m.content
    }));
  }
}

export const llmRouter = new LLMRouter();
