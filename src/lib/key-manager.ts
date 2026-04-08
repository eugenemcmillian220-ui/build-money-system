/**
 * Multi-Key Rotation Manager
 * Supports rotating multiple API keys across GROQ, Gemini, OpenAI, and OpenRouter
 * to avoid rate limits and maximize throughput.
 */

export type ProviderName = "openrouter" | "groq" | "gemini" | "openai" | "deepseek" | "cerebras" | "cloudflare";

interface KeyEntry {
  key: string;
  usageCount: number;
  lastUsed: number;
  errorCount: number;
  cooldownUntil: number;
}

const COOLDOWN_MS = 60_000;
const MAX_ERRORS_BEFORE_COOLDOWN = 3;

class ProviderKeyPool {
  private keys: KeyEntry[] = [];
  private roundRobinIndex = 0;

  constructor(rawKeys: string[]) {
    this.keys = rawKeys
      .map((k) => k.trim())
      .filter(Boolean)
      .map((key) => ({
        key,
        usageCount: 0,
        lastUsed: 0,
        errorCount: 0,
        cooldownUntil: 0,
      }));
  }

  get size(): number {
    return this.keys.length;
  }

  getNext(): string | null {
    if (this.keys.length === 0) return null;

    const now = Date.now();
    const available = this.keys.filter((k) => now >= k.cooldownUntil);

    if (available.length === 0) {
      const soonest = this.keys.reduce((a, b) => (a.cooldownUntil < b.cooldownUntil ? a : b));
      return soonest.key;
    }

    const entry = available[this.roundRobinIndex % available.length];
    this.roundRobinIndex = (this.roundRobinIndex + 1) % available.length;
    entry.usageCount++;
    entry.lastUsed = now;
    return entry.key;
  }

  reportError(key: string): void {
    const entry = this.keys.find((k) => k.key === key);
    if (!entry) return;
    entry.errorCount++;
    if (entry.errorCount >= MAX_ERRORS_BEFORE_COOLDOWN) {
      entry.cooldownUntil = Date.now() + COOLDOWN_MS;
      entry.errorCount = 0;
    }
  }

  reportSuccess(key: string): void {
    const entry = this.keys.find((k) => k.key === key);
    if (!entry) return;
    entry.errorCount = 0;
  }
}

/**
 * Parse a comma-separated or newline-separated list of API keys from an env var.
 */
function parseKeys(envValue: string | undefined): string[] {
  if (!envValue) return [];
  return envValue
    .split(/[\n,]+/)
    .map((k) => k.trim())
    .filter(Boolean);
}

class KeyManager {
  private pools: Map<ProviderName, ProviderKeyPool> = new Map();

  private getPool(provider: ProviderName): ProviderKeyPool {
    if (!this.pools.has(provider)) {
      this.pools.set(provider, this.buildPool(provider));
    }
    return this.pools.get(provider)!;
  }

  private buildPool(provider: ProviderName): ProviderKeyPool {
    let keys: string[] = [];
    switch (provider) {
      case "openrouter":
        keys = parseKeys(process.env.OPENROUTER_KEYS ?? process.env.OPENROUTER_API_KEYS ?? process.env.OPENROUTER_API_KEY);
        break;
      case "groq":
        keys = parseKeys(process.env.GROQ_KEYS ?? process.env.GROQ_API_KEYS ?? process.env.GROQ_API_KEY);
        break;
      case "gemini":
        keys = parseKeys(process.env.GEMINI_KEYS ?? process.env.GEMINI_API_KEYS ?? process.env.GEMINI_API_KEY);
        break;
      case "openai":
        keys = parseKeys(process.env.OPENAI_KEYS ?? process.env.OPENAI_API_KEYS ?? process.env.OPENAI_API_KEY);
        break;
      case "deepseek":
        keys = parseKeys(process.env.DEEPSEEK_API_KEYS ?? process.env.DEEPSEEK_API_KEY);
        break;
      case "cerebras":
        keys = parseKeys(process.env.CEREBRAS_API_KEYS ?? process.env.CEREBRAS_API_KEY);
        break;
      case "cloudflare":
        keys = parseKeys(process.env.CLOUDFLARE_API_KEYS ?? process.env.CLOUDFLARE_API_KEY);
        break;
    }
    return new ProviderKeyPool(keys);
  }

  /**
   * Invalidate pool cache so fresh env vars are picked up.
   */
  resetPool(provider: ProviderName): void {
    this.pools.delete(provider);
  }

  getKey(provider: ProviderName): string | null {
    return this.getPool(provider).getNext();
  }

  isConfigured(provider: ProviderName): boolean {
    return this.getPool(provider).size > 0;
  }

  reportError(provider: ProviderName, key: string): void {
    this.getPool(provider).reportError(key);
  }

  reportSuccess(provider: ProviderName, key: string): void {
    this.getPool(provider).reportSuccess(key);
  }
}

export const keyManager = new KeyManager();
