import { serverEnv } from "./env";
import { ChatMessage, AgentConfig } from "./types";

export type LLMProvider = "openrouter" | "gemini" | "groq" | "deepseek" | "cerebras" | "cloudflare";

export interface ProviderRequest {
  provider: LLMProvider;
  model: string;
  messages: ChatMessage[];
  config?: Partial<AgentConfig>;
}

export const FREE_MODELS: Record<LLMProvider, string[]> = {
  openrouter: [
    "openrouter/free",
    "qwen/qwen3-coder-480b-a35b-instruct:free",
    "meta-llama/llama-3.3-70b-instruct:free"
  ],
  gemini: [
    "gemini-3.1-flash-lite-preview",
    "gemini-3.1-flash-preview"
  ],
  groq: [
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "llama-3.3-70b-versatile"
  ],
  deepseek: [
    "deepseek-chat",
    "deepseek-reasoner"
  ],
  cerebras: [
    "gpt-oss-120b",
    "llama3.1-8b"
  ],
  cloudflare: [
    "@cf/meta/llama-3.2-3b-instruct",
    "@cf/meta/llama-3.2-1b-instruct"
  ]
};

/**
 * LLM Router: "Infinite Fallback" Strategy
 * Rotates through 2026's most generous free providers to avoid rate limits.
 */
export class LLMRouter {
  private currentRotationIndex = 0;
  
  // Strategy: Tiered Fallback
  private priorityChain: LLMProvider[] = [
    "groq",       // 1. Fastest
    "gemini",     // 2. High Capacity
    "cerebras",   // 3. Complexity (120B)
    "openrouter", // 4. Aggregator
    "deepseek",   // 5. Failover (No hard limit)
    "cloudflare"  // 6. Global Edge
  ];

  /**
   * Get the best available provider based on the priority chain and configured keys
   */
  getNextRequest(messages: ChatMessage[], config?: Partial<AgentConfig>): ProviderRequest {
    const availableProviders = this.priorityChain.filter(p => this.isConfigured(p));

    if (availableProviders.length === 0) {
      throw new Error("No LLM providers configured. Please add API keys to environment variables.");
    }

    // Round-robin within available providers to spread load
    const provider = availableProviders[this.currentRotationIndex % availableProviders.length];
    this.currentRotationIndex++;

    const models = FREE_MODELS[provider];
    const model = models[Math.floor(Math.random() * models.length)];

    return { provider, model, messages, config };
  }

  private isConfigured(provider: LLMProvider): boolean {
    switch (provider) {
      case "openrouter": return !!serverEnv.OPENROUTER_API_KEY;
      case "gemini": return !!serverEnv.GEMINI_API_KEY;
      case "groq": return !!serverEnv.GROQ_API_KEY;
      case "deepseek": return !!serverEnv.DEEPSEEK_API_KEY;
      case "cerebras": return !!serverEnv.CEREBRAS_API_KEY;
      case "cloudflare": return !!(serverEnv.CLOUDFLARE_API_KEY && serverEnv.CLOUDFLARE_ACCOUNT_ID);
      default: return false;
    }
  }

  /**
   * Builds the fetch parameters for a specific provider
   */
  getFetchParams(req: ProviderRequest) {
    const { provider, model, messages, config } = req;
    let url = "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    let body: unknown;

    const temp = config?.temperature ?? 0.7;
    const maxTokens = config?.maxTokens ?? 4096;

    switch (provider) {
      case "openrouter":
        url = "https://openrouter.ai/api/v1/chat/completions";
        headers["Authorization"] = `Bearer ${serverEnv.OPENROUTER_API_KEY}`;
        body = { model, messages: this.formatMessages(messages), temperature: temp, max_tokens: maxTokens };
        break;
      case "gemini":
        url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${serverEnv.GEMINI_API_KEY}`;
        body = {
          contents: messages.map(m => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: typeof m.content === "string" ? m.content : JSON.stringify(m.content) }]
          })),
          generationConfig: { temperature: temp, maxOutputTokens: maxTokens }
        };
        break;
      case "groq":
        url = "https://api.groq.com/openai/v1/chat/completions";
        headers["Authorization"] = `Bearer ${serverEnv.GROQ_API_KEY}`;
        body = { model, messages: this.formatMessages(messages), temperature: temp, max_tokens: maxTokens };
        break;
      case "deepseek":
        url = "https://api.deepseek.com/chat/completions";
        headers["Authorization"] = `Bearer ${serverEnv.DEEPSEEK_API_KEY}`;
        body = { model, messages: this.formatMessages(messages), temperature: temp, max_tokens: maxTokens };
        break;
      case "cerebras":
        url = "https://api.cerebras.ai/v1/chat/completions";
        headers["Authorization"] = `Bearer ${serverEnv.CEREBRAS_API_KEY}`;
        body = { model, messages: this.formatMessages(messages), temperature: temp, max_tokens: maxTokens };
        break;
      case "cloudflare":
        url = `https://api.cloudflare.com/client/v4/accounts/${serverEnv.CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`;
        headers["Authorization"] = `Bearer ${serverEnv.CLOUDFLARE_API_KEY}`;
        body = { messages: this.formatMessages(messages), stream: false };
        break;
    }

    return { url, headers, body, provider };
  }

  private formatMessages(messages: ChatMessage[]): unknown[] {
    return messages.map(m => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content)
    }));
  }
}

export const llmRouter = new LLMRouter();
