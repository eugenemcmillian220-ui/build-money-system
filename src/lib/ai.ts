import { ChatMessage } from "./types";
import { logger } from "./logger";
import { keyManager, ProviderName } from "./key-manager";

/**
 * Free-tier models available via OpenRouter (no cost).
 * These are the primary models used for generation.
 */
export const FREE_MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-4-maverick:free",
  "deepseek/deepseek-chat-v3-0324:free",
];

/**
 * Paid models available via OpenRouter or direct provider APIs.
 */
export const PAID_MODELS = [
  "openai/gpt-4o",
  "anthropic/claude-sonnet-4",
  "google/gemini-2.5-pro-preview",
];

export interface AIOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface AIResult {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
  timedOut?: boolean;
}

const MODEL_COSTS: Record<string, number> = {
  "google/gemini-2.0-flash-exp:free": 0,
  "meta-llama/llama-4-maverick:free": 0,
  "deepseek/deepseek-chat-v3-0324:free": 0,
  "openai/gpt-4o": 0.00005,
  "anthropic/claude-sonnet-4": 0.00006,
  "google/gemini-2.5-pro-preview": 0.00003,
};

interface ProviderEndpoint {
  provider: ProviderName;
  url: string;
}

function getProviderEndpoint(): ProviderEndpoint {
  if (keyManager.isConfigured("openrouter")) {
    return {
      provider: "openrouter",
      url: process.env.OPENROUTER_API_URL || "https://openrouter.ai/api/v1/chat/completions",
    };
  }
  if (keyManager.isConfigured("groq")) {
    return {
      provider: "groq",
      url: "https://api.groq.com/openai/v1/chat/completions",
    };
  }
  if (keyManager.isConfigured("openai")) {
    return {
      provider: "openai",
      url: "https://api.openai.com/v1/chat/completions",
    };
  }
  if (keyManager.isConfigured("deepseek")) {
    return {
      provider: "deepseek",
      url: "https://api.deepseek.com/v1/chat/completions",
    };
  }
  if (keyManager.isConfigured("gemini")) {
    return {
      provider: "gemini",
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    };
  }
  return {
    provider: "openrouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
  };
}

function getModelsForProvider(provider: ProviderName): string[] {
  switch (provider) {
    case "openrouter":
      return [...FREE_MODELS, ...PAID_MODELS];
    case "groq":
      return ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it"];
    case "openai":
      return ["gpt-4o", "gpt-4o-mini"];
    case "deepseek":
      return ["deepseek-chat", "deepseek-reasoner"];
    case "gemini":
      return ["gemini-2.0-flash", "gemini-2.5-pro-preview"];
    default:
      return FREE_MODELS;
  }
}

export async function aiComplete(options: AIOptions): Promise<AIResult> {
  const endpoint = getProviderEndpoint();
  const providerModels = getModelsForProvider(endpoint.provider);

  const modelsToTry = options.model
    ? [options.model, ...providerModels].filter((m, i, self) => self.indexOf(m) === i)
    : providerModels;

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    const apiKey = keyManager.getKey(endpoint.provider);
    if (!apiKey) {
      throw new Error(`No ${endpoint.provider} API keys available`);
    }

    try {
      const controller = new AbortController();
      const timeoutMs = options.timeout ?? 90000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      };

      if (endpoint.provider === "openrouter") {
        headers["HTTP-Referer"] = process.env.NEXT_PUBLIC_SITE_URL || "https://sovereign-forge.app";
        headers["X-Title"] = "Sovereign Forge OS";
      }

      const response = await fetch(endpoint.url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: options.messages.map(m => ({
            role: m.role,
            content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
          })),
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4096,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429) {
          keyManager.reportError(endpoint.provider, apiKey);
        }
        throw new Error(`${endpoint.provider} API error (${response.status}): ${errorText}`);
      }

      keyManager.reportSuccess(endpoint.provider, apiKey);
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error(`Empty response from ${endpoint.provider}`);
      }

      const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;
      const totalTokens = usage.total_tokens || promptTokens + completionTokens;

      const costRate = MODEL_COSTS[model] || 0.00001;
      const cost = totalTokens * costRate;

      return {
        content,
        model,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
        },
        cost,
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        logger.error(`AI call timed out after ${options.timeout ?? 90000}ms for model ${model}`);
        return {
          content: "ERROR: Request timed out",
          model,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          cost: 0,
          timedOut: true,
        };
      }
      logger.warn(`Failed to call ${endpoint.provider} with model ${model}:`, { error });
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }

  throw lastError || new Error("All AI models failed");
}

export async function* aiStream(options: AIOptions): AsyncIterable<string> {
  const endpoint = getProviderEndpoint();
  const model = options.model || FREE_MODELS[0];
  const apiKey = keyManager.getKey(endpoint.provider);

  if (!apiKey) {
    throw new Error(`No ${endpoint.provider} API keys available`);
  }

  const controller = new AbortController();
  const timeoutMs = options.timeout ?? 90000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    };

    if (endpoint.provider === "openrouter") {
      headers["HTTP-Referer"] = process.env.NEXT_PUBLIC_SITE_URL || "https://sovereign-forge.app";
      headers["X-Title"] = "Sovereign Forge OS";
    }

    const response = await fetch(endpoint.url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: options.messages.map(m => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
        })),
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        stream: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${endpoint.provider} API error (${response.status}): ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") return;
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      logger.error(`AI stream timed out after ${timeoutMs}ms`);
      throw new Error("Generation timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function aiEmbed(text: string): Promise<number[]> {
  const endpoint = getProviderEndpoint();
  let embedUrl: string;
  let embedModel: string;

  if (endpoint.provider === "openrouter") {
    embedUrl = "https://openrouter.ai/api/v1/embeddings";
    embedModel = "openai/text-embedding-3-small";
  } else if (endpoint.provider === "openai") {
    embedUrl = "https://api.openai.com/v1/embeddings";
    embedModel = "text-embedding-3-small";
  } else {
    embedUrl = "https://openrouter.ai/api/v1/embeddings";
    embedModel = "openai/text-embedding-3-small";
  }

  const apiKey = keyManager.getKey(endpoint.provider);

  if (!apiKey) {
    throw new Error(`No ${endpoint.provider} API keys available for embeddings`);
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    };

    if (endpoint.provider === "openrouter") {
      headers["HTTP-Referer"] = process.env.NEXT_PUBLIC_SITE_URL || "https://sovereign-forge.app";
    }

    const response = await fetch(embedUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        input: text,
        model: embedModel,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Embedding error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    logger.error("Embedding generation failed", { error });
    return new Array(1536).fill(0);
  }
}
