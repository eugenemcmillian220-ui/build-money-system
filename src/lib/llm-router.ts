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
 */
export const FREE_MODELS: Record<LLMProvider, string[]> = {
  openrouter: [
    "qwen/qwen3-coder-480b-a35b-instruct:free",
    "mistralai/devstral:free",
    "nvidia/llama-3.1-nemotron-ultra:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "deepseek/deepseek-r1:free",
    "google/gemini-2.0-flash-exp:free",
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

// ─── Circuit Breaker ──────────────────────────────────────────────────────────

interface CircuitState {
  failures: number;
  lastFailure: number;
  openUntil: number; // timestamp when circuit can be retried
}

const CIRCUIT_OPEN_DURATION_MS = 60_000; // 1 minute cooldown
const CIRCUIT_FAILURE_THRESHOLD = 2; // open after 2 consecutive failures

// ─── Backoff ──────────────────────────────────────────────────────────────────

const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 8_000;

function backoffDelay(attempt: number): number {
  const delay = Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
  // add jitter ±25%
  return delay * (0.75 + Math.random() * 0.5);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * LLM Router v2: Circuit Breaker + Exponential Backoff + Model-Level Failover + Cache
 *
 * Improvements over v1:
 * 1. Circuit breaker per provider — skips providers that are rate-limited
 * 2. Exponential backoff with jitter on 429s
 * 3. Model-level failover — tries each model in priority order within a provider
 * 4. LLM cache integration — returns cached responses for identical prompts
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

  // ─── Circuit Breaker Logic ────────────────────────────────────────────────

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
      // half-open: allow one attempt
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

  // ─── Provider Selection ───────────────────────────────────────────────────

  private getAvailableProviders(): LLMProvider[] {
    return this.priorityChain.filter(
      (p) => keyManager.isConfigured(p) && !this.isCircuitOpen(p)
    );
  }

  /**
   * Returns the ordered list of (provider, model) pairs to attempt.
   * Within each provider, models are in priority order (best first).
   */
  getFailoverChain(messages: ChatMessage[], config?: Partial<AgentConfig>): ProviderRequest[] {
    const available = this.getAvailableProviders();
    if (available.length === 0) {
      // All circuits open — try the one that recovers soonest
      const sorted = this.priorityChain
        .filter((p) => keyManager.isConfigured(p))
        .sort((a, b) => {
          const ca = this.getCircuit(a);
          const cb = this.getCircuit(b);
          return ca.openUntil - cb.openUntil;
        });
      if (sorted.length === 0) {
        throw new Error(
          "No LLM providers configured. Add at least one API key: OPENROUTER_API_KEY, GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY."
        );
      }
      // Return the soonest-to-recover provider with its primary model
      const p = sorted[0];
      const models = FREE_MODELS[p];
      return [{ provider: p, model: models[0], messages, config }];
    }

    const chain: ProviderRequest[] = [];
    for (const provider of available) {
      const models = FREE_MODELS[provider];
      // Add primary model first, then fallbacks
      for (const model of models) {
        chain.push({ provider, model, messages, config });
      }
    }
    return chain;
  }

  /**
   * Legacy compat — returns the next single request (primary model of first available provider).
   */
  getNextRequest(messages: ChatMessage[], config?: Partial<AgentConfig>): ProviderRequest {
    const chain = this.getFailoverChain(messages, config);
    return chain[0];
  }

  // ─── Execute with Full Failover ───────────────────────────────────────────

  /**
   * Execute an LLM call with circuit breaker, model-level failover, exponential backoff, and cache.
   * This is the recommended entry point for all LLM calls.
   */
  async executeWithFailover(
    messages: ChatMessage[],
    config?: Partial<AgentConfig>,
    options?: { skipCache?: boolean; maxRetries?: number }
  ): Promise<{ provider: LLMProvider; model: string; content: string; cached: boolean }> {
    const maxRetries = options?.maxRetries ?? 2;

    // ── Check cache first ──
    if (!options?.skipCache) {
      // Try cache with each possible model (use first available provider's primary model as key)
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

    // ── Try each provider/model in the failover chain ──
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
            // Rate limited — backoff & maybe try next model
            keyManager.reportError(req.provider, apiKey);
            if (attempt < maxRetries) {
              const delay = backoffDelay(attempt);
              console.warn(
                `[LLMRouter] 429 from ${req.provider}/${req.model} — backing off ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries + 1})`
              );
              await sleep(delay);
              continue;
            }
            // Exhausted retries for this model — record circuit failure and move to next
            this.recordFailure(req.provider);
            lastError = new Error(`429 rate limited: ${req.provider}/${req.model}`);
            break; // next model/provider in chain
          }

          if (!response.ok) {
            const text = await response.text().catch(() => "");
            lastError = new Error(`${req.provider}/${req.model} returned ${response.status}: ${text}`);
            // Non-429 errors: skip to next model immediately
            break;
          }

          // ── Parse response ──
          const content = await this.parseResponse(req.provider, response);

          // ── Success — reset circuit & cache ──
          this.recordSuccess(req.provider);
          keyManager.reportSuccess(req.provider, apiKey);

          if (!options?.skipCache) {
            const formattedMsgs = this.formatMessages(messages) as Array<{ role: string; content: string }>;
            llmCache.set(req.model, formattedMsgs, content);
          }

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
          this.recordFailure(req.provider);
          break; // next model/provider
        }
      }
    }

    throw lastError ?? new Error("All LLM providers exhausted");
  }

  // ─── Response Parsing ─────────────────────────────────────────────────────

  private async parseResponse(provider: LLMProvider, response: Response): Promise<string> {
    const json = await response.json();

    if (provider === "gemini") {
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Gemini returned empty response");
      return text;
    }

    // OpenAI-compatible format (openrouter, groq, openai, deepseek, cerebras)
    const content = json?.choices?.[0]?.message?.content;
    if (!content) throw new Error(`${provider} returned empty response`);
    return content;
  }

  // ─── Fetch Params (unchanged API, used by executeWithFailover) ────────────

  getFetchParams(req: ProviderRequest): { url: string; headers: Record<string, string>; body: unknown; apiKey: string } {
    const { provider, model, messages, config } = req;

    const apiKey = keyManager.getKey(provider) ?? "";

    if (!apiKey && provider !== "cloudflare") {
      throw new Error(`API key for ${provider} not found.`);
    }

    let url = "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    let body: unknown;

    const temp = config?.temperature ?? 0.7;
    const maxTokens = config?.maxTokens ?? 4096;

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

  // ─── Debug / Health ───────────────────────────────────────────────────────

  getCircuitStatus(): Record<string, { open: boolean; failures: number; cooldownRemaining: number }> {
    const status: Record<string, { open: boolean; failures: number; cooldownRemaining: number }> = {};
    for (const provider of this.priorityChain) {
      const circuit = this.getCircuit(provider);
      const isOpen = this.isCircuitOpen(provider);
      status[provider] = {
        open: isOpen,
        failures: circuit.failures,
        cooldownRemaining: isOpen ? Math.max(0, circuit.openUntil - Date.now()) : 0,
      };
    }
    return status;
  }
}

export const llmRouter = new LLMRouter();
