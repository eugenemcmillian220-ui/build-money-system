/**
 * Multi-Provider Key Rotation Manager
 *
 * Supports round-robin rotation across multiple API keys for each provider:
 *   - OpenCode Zen (primary)
 *   - GitHub Models (free tier)
 *   - Hugging Face Inference (free tier via router.huggingface.co)
 *
 * Keys are read from environment variables on first access. Keys that hit
 * error thresholds are temporarily placed on cooldown.
 */

export type ProviderName = "opencodezen" | "github" | "huggingface";

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
    let pool = this.pools.get(provider);
    if (!pool) {
      pool = this.createPool(provider);
      this.pools.set(provider, pool);
    }
    return pool;
  }

  private createPool(provider: ProviderName): ProviderKeyPool {
    switch (provider) {
      case "opencodezen": {
        const multiKeys = parseKeys(process.env.OPENCODE_ZEN_API_KEYS);
        const singleKey = parseKeys(process.env.OPENCODE_ZEN_API_KEY);
        return new ProviderKeyPool(multiKeys.length > 0 ? multiKeys : singleKey);
      }
      case "github": {
        const multiKeys = parseKeys(process.env.GITHUB_MODELS_API_KEYS);
        const singleKey = parseKeys(process.env.GITHUB_MODELS_TOKEN);
        return new ProviderKeyPool(multiKeys.length > 0 ? multiKeys : singleKey);
      }
      case "huggingface": {
        const multiKeys = parseKeys(process.env.HF_API_KEYS);
        const singleKey = parseKeys(process.env.HF_TOKEN);
        return new ProviderKeyPool(multiKeys.length > 0 ? multiKeys : singleKey);
      }
    }
  }

  resetPool(provider?: ProviderName): void {
    if (provider) {
      this.pools.delete(provider);
    } else {
      this.pools.clear();
    }
  }

  getKey(provider: ProviderName = "opencodezen"): string | null {
    return this.getPool(provider).getNext();
  }

  isConfigured(provider: ProviderName = "opencodezen"): boolean {
    return this.getPool(provider).size > 0;
  }

  /** Returns list of providers that have at least one key configured */
  getConfiguredProviders(): ProviderName[] {
    const all: ProviderName[] = ["opencodezen", "github", "huggingface"];
    return all.filter((p) => this.getPool(p).size > 0);
  }

  reportError(provider: ProviderName, key: string): void {
    this.getPool(provider).reportError(key);
  }

  reportSuccess(provider: ProviderName, key: string): void {
    this.getPool(provider).reportSuccess(key);
  }
}

export const keyManager = new KeyManager();
