import { ChatMessage, AgentConfig } from "./types";
import { keyManager, ProviderName } from "./key-manager";
import { llmCache } from "./llm-cache";

export type LLMProvider = ProviderName;

export interface ProviderRequest {
  provider: LLMProvider;
  model: string;
  messages: ChatMessage[];
  config?: Partial<AgentConfig>;
}

/**
 * Updated model list (April 2026) — ordered by priority within each provider.
 * Primary model tried first, fallbacks used on failure.
 * gemini-2.0-flash-exp removed from OpenRouter — replaced with gemini-2.0-flash-001 + llama-4 fallbacks.
 */
export const FREE_MODELS: Record<LLMProvider, string[]> = {
  openrouter: [
    "qwen/qwen3-coder-480b-a35b-instruct:free",
    "mistralai/devstral:free",
    "nvidia/llama-3.1-nemotron-ultra:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "deepseek/deepseek-r1:free",
    "google/gemini-2.0-flash-001:free",
    "meta-llama/llama-4-maverick:free",
    "meta-llama/llama-4-scout:free",
  ],
  gemini: [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
  ],
  groq: [
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "llama-3.3-70b-versatile",
    "qwen-2.5-coder-32b",
    "llama-3.1-8b-instant",
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

// ─── Circuit Breaker ────────────────────────────────────────────────────

interface CircuitState {
  failures: number;
  lastFailure: number;
  openUntil: number;
}

const CIRCUIT_OPEN_DURATION_MS = 60_000;
const CIRCUIT_FAILURE_THRESHOLD = 2;

// ─── Backoff ────────────────────────────────────────────────────────────────────

const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 8_000;

function backoffDelay(attempt: number): number {
  const delay = Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
  return delay * (0.75 + Math.random() * 0.5);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * LLM Router v2: Circuit Breaker + Exponential Backoff + Model-Level Failover + Cache
 */
export class LLMRouter {
  private circuits: Map<LLMProvider, CircuitState> = new Map();

  private priorityChain: LLMProvider[] = [
    "groq",
    "gemini",
    "openrouter",
    "openai",
    "cerebras",
    "deepseek",
    "cloudflare",
  ];

  private getCircuit(provider: LLMProvider): CircuitState {
    if (!this.circuits.has(provider)) {
      this.circuits.set(provider, { failures: 0, lastFailure: 0, openUntil: 0 });
    }
    return this.circuits.get(provider)!;
  }

  private isCircuitOpen(provider: LLMProvider): boolean {
    const circuit = this.getCircuit(provider);
    if (circuit.openUntil === 0) return false;
    if (Date.now() >= circuit.openUntil) {
      circuit.openUntil = 0;
      circuit.failures = 0;
      return false;
    }
    return true;
  }

  private recordFailure(provider: LLMProvider): void {
    const circuit = this.getCircuit(provider);
    circuit.failures++;
    circuit.lastFailure = Date.now();
    if (circuit.failures >= CIRCUIT_FAILURE_THRESHOLD) {
      circuit.openUntil = Date.now() + CIRCUIT_OPEN_DURATION_MS;
      console.warn(
        `[LLMRouter] Circuit OPEN for ${provider} — cooling down for ${CIRCUIT_OPEN_DURATION_MS / 1000}s`
      );
    }
  }

  private recordSuccess(provider: LLMProvider): void {
    const circuit = this.getCircuit(provider);
    circuit.failures = 0;
    circuit.openUntil = 0;
  }

  private getAvailableProviders(): LLMProvider[] {
    return this.priorityChain.filter(
      (p) => keyManager.isConfigured(p) && !this.isCircuitOpen(p)
    );
  }

  getFailoverChain(messages: ChatMessage[], config?: Partial<AgentConfig>): ProviderRequest[] {
    const available = this.getAvailableProviders();
    if (available.length === 0) {
      const sorted = this.priorityChain
        .filter((p) => keyManager.isConfigured(p))
        .sort((a, b)) => {
          const ca = this.getCircuit(a);
          const cb = this.getCircuit(b);
          return ca.openUntil - cb.openUntil;
        });
      if (sorted.length === 0) {
        throw new Error(
          "No LLM providers configured. Add at least one API key."
        );
      }
      const p = sorted[0];
      const models = FREE_MODELS[p];
      return [{ provider: p, model: models[0], messages, config }];
    }

    const chain: ProviderRequest[] = [];
    for (const provider of available) {
      const models = FREE_MODELS[provider];
      for (const model of models) {
        chain.push({ provider, model, messages, config });
      }
    }
    return chain;
  }

  getNextRequest(messages: ChatMessage[], config?: Partial<AgentConfig>): ProviderRequest {
    const chain = this.getFailoverChain(messages, config);
    return chain[0];
  }

  async executeWithFailover(
    messages: ChatMessage[],
    config?: Partial<AgentConfig>,
    options?: { skipCache?: boolean; maxRetries?: number }
  ): Promise<{ provider: LLMProvider; model: string; content: string; cached: boolean }> {
    const maxRetries = options?.maxRetries ?? 2;

    if (!options?.skipCache) {
      const chain = this.getFailoverChain(messages, config);
      if (chain.length > 0) {
        const formattedMsgs = this.formatMessages(messages) as Array<{ role: string; content: string }>;
        const cached = llmCache.get(chain[0].model, formattedMsgs);
        if (cached) {
          return {
            provider: chain[0].provider,
            model: chain[0].model,
            content: cached,
            cached: true,
          };
        }
      }
    }

    const chain = this.getFailoverChain(messages, config);
    let lastError: Error | null = null;

    for (const req of chain) {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const { url, headers, body, apiKey } = this.getFetchParams(req);

          const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
          });

          if (response.status === 429) {
            keyManager.reportError(req.provider, apiKey);
            if (attempt < maxRetries) {
              const delay = backoffDelay(attempt);
              console.warn(
                `[LLMRouter] 429 from ${req.provider}/${req.model} — backing off ${Math.round(delay)}ms`
              );
              await sleep(delay);
              continue;
            }
            this.recordFailure(req.provider);
            lastError = new Error(`429 rate limited: ${req.provider}/${req.model}`);
            break;
          }

          if (!response.ok) {
            const text = await response.text().catch(() => "");
            lastError = new Error(`${req.provider}/${req.model} HTTP ${response.status}: ${text.slice(0, 200)}`);
            if (response.status >= 500) {
              this.recordFailure(req.provider);
            }
            break;
          }

          const data = (await response.json()) as {
            choices?: Array<{ message?: { content?: string }; delta?: { content?: string } }>;
            content?: Array<{ text?: string }>;
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            result?: string;
          };

          const content = this.extractContent(data, req.provider);
          if (!content) {
            lastError = new Error(`Empty response from ${req.provider}/${req.model}`);
            break;
          }

          this.recordSuccess(req.provider);
          const formattedMsgs = this.formatMessages(messages) as Array<{ role: string; content: string }>;
          llmCache.set(req.model, formattedMsgs, content);

          return {
            provider: req.provider,
            model: req.model,
            content,
            cached: false,
          };
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (attempt < maxRetries) {
            await sleep(backoffDelay(attempt));
            continue;
          }
          break;
        }
      }
    }

    throw lastError ?? new Error("All LLM providers exhausted");
  }

  private getFetchParams(req: ProviderRequest): {
    url: string;
    headers: Record<string, string>;
    body: unknown;
    apiKey: string;
  } {
    const apiKey = keyManager.getKey(req.provider);
    if (!apiKey) throw new Error(`No API key for provider: ${req.provider}`);

    const messages = this.formatMessages(req.messages);
    const temperature = req.config?.temperature ?? 0.7;
    const maxTokens = req.config?.maxTokens ?? 4096;

    switch (req.provider) {
      case "openrouter":
        return {
          url: "https://openrouter.ai/api/v1/chat/completions",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "https://localhost:3000",
            "X-Title": "AI App Builder",
          },
          body: { model: req.model, messages, temperature, max_tokens: maxTokens },
          apiKey,
        };

      case "groq":
        return {
          url: "https://api.groq.com/openai/v1/chat/completions",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: { model: req.model, messages, temperature, max_tokens: maxTokens },
          apiKey,
        };

      case "gemini": {
        const geminiMessages = req.messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));
        return {
          url: `https://generativelanguage.googleapis.com/v1beta/models/${req.model}:generateContent?key=${apiKey}`,
          headers: { "Content-Type": "application/json" },
          body: {
            contents: geminiMessages,
            generationConfig: { temperature, maxOutputTokens: maxTokens },
          },
          apiKey,
        };
      }

      case "openai":
        return {
          url: "https://api.openai.com/v1/chat/completions",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: { model: req.model, messages, temperature, max_tokens: maxTokens },
          apiKey,
        };

      case "deepseek":
        return {
          url: "https://api.deepseek.com/chat/completions",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: { model: req.model, messages, temperature, max_tokens: maxTokens },
          apiKey,
        };

      case "cerebras":
        return {
          url: "https://api.cerebras.ai/v1/chat/completions",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: { model: req.model, messages, temperature, max_tokens: maxTokens },
          apiKey,
        };

      case "cloudflare": {
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
        return {
          url: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${req.model}`,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: { messages },
          apiKey,
        };
      }

      default:
        throw new Error(`Unsupported provider: ${req.provider}`);
    }
  }

  private formatMessages(messages: ChatMessage[]): unknown[] {
    return messages.map((m) => ({ role: m.role, content: m.content }));
  }

  private extractContent(data: Record<string, unknown>, provider: LLMProvider): string | null {
    if (provider === "gemini") {
      const candidates = (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates;
      return candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    }
    if (provider === "cloudflare") {
      const result = (data as { result?: string }).result;
      return result ?? null;
    }
    const choices = (data as { choices?: Array<{ message?: { content?: string } }> }).choices;
    return choices?.[0]?.message?.content ?? null;
  }

  getCircuitStatus(): Record<LLMProvider, { open: boolean; failures: number; recoversAt?: string }> {
    const status: Record<string, { open: boolean; failures: number; recoversAt?: string }> = {};
    for (const provider of this.priorityChain) {
      const circuit = this.getCircuit(provider);
      const open = this.isCircuitOpen(provider);
      status[provider] = {
        open,
        failures: circuit.failures,
        ...(open ? { recoversAt: new Date(circuit.openUntil).toISOString() } : {}),
      };
    }
    return status as Record<LLMProvider, { open: boolean; failures: number; recoversAt?: string }>;
  }
}

export const llmRouter = new LLMRouter();
