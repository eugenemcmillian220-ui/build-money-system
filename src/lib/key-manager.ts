/**
 * Multi-Provider Key Rotation Manager
 *
 * Supports round-robin rotation across multiple API keys for:
 *   - OpenCode Zen (primary)
 *   - GitHub Models (free tier via GitHub PAT)
 *   - Hugging Face Inference (free tier via HF token)
 *
 * Keys are read from environment variables on first access.
 * Keys that hit error thresholds are temporarily placed on cooldown.
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

const PROVIDER_ENV_MAP: Record<ProviderName, { multi: string[]; single: string[] }> = {
  opencodezen: {
    multi: ["OPENCODE_ZEN_API_KEYS"],
    single: ["OPENCODE_ZEN_API_KEY"],
  },
  github: {
    multi: ["GITHUB_MODELS_TOKENS"],
    single: ["GITHUB_TOKEN", "GITHUB_ACCESS_TOKEN"],
  },
  huggingface: {
    multi: ["HF_API_KEYS"],
    single: ["HF_TOKEN", "HUGGINGFACE_TOKEN", "HF_API_KEY"],
  },
};

class KeyManager {
  private pools = new Map<ProviderName, ProviderKeyPool>();

  private getPool(provider: ProviderName): ProviderKeyPool {
    let pool = this.pools.get(provider);
    if (!pool) {
      const envConfig = PROVIDER_ENV_MAP[provider];
      let keys: string[] = [];

      for (const envName of envConfig.multi) {
        keys = parseKeys(process.env[envName]);
        if (keys.length > 0) break;
      }

      if (keys.length === 0) {
        for (const envName of envConfig.single) {
          keys = parseKeys(process.env[envName]);
          if (keys.length > 0) break;
        }
      }

      pool = new ProviderKeyPool(keys);
      this.pools.set(provider, pool);
    }
    return pool;
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

  reportError(provider: ProviderName, key: string): void {
    this.getPool(provider).reportError(key);
  }

  reportSuccess(provider: ProviderName, key: string): void {
    this.getPool(provider).reportSuccess(key);
  }

  getConfiguredProviders(): ProviderName[] {
    const providers: ProviderName[] = ["opencodezen", "github", "huggingface"];
    return providers.filter((p) => this.isConfigured(p));
  }
}

export const keyManager = new KeyManager();
