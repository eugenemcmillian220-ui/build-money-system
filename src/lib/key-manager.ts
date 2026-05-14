/**
 * key-manager.ts
 * Multi-key rotation pool for approved providers only:
 *   - opencode-go   (Go subscription: $10/mo, endpoint: /zen/go/v1/...)
 *   - opencode-zen  (Zen pay-as-you-go, endpoint: /zen/v1/...)
 *   - github-models (Free tier via GitHub PAT)
 *   - huggingface   (Free tier via HF token)
 */

export type ProviderName =
  | "opencode-go"
  | "opencode-zen"
  | "github-models"
  | "huggingface";

interface KeyEntry {
  key: string;
  errorCount: number;
  cooldownUntil: number; // epoch ms
}

interface KeyPool {
  keys: KeyEntry[];
  cursor: number;
}

const COOLDOWN_MS = 60_000; // 60 seconds
const ERROR_THRESHOLD = 3;

class KeyManager {
  private pools: Map<ProviderName, KeyPool> = new Map();

  constructor() {
    this.initPool("opencode-go",    this.readKeys("OPENCODE_GO_API_KEYS", "OPENCODE_GO_API_KEY"));
    this.initPool("opencode-zen",   this.readKeys("OPENCODE_ZEN_API_KEYS", "OPENCODE_ZEN_API_KEY"));
    this.initPool("github-models",  this.readKeys("GITHUB_TOKEN", "GITHUB_MODELS_TOKEN"));
    this.initPool("huggingface",    this.readKeys("HUGGINGFACE_API_KEY", "HF_TOKEN", "HUGGINGFACE_TOKEN"));
  }

  private readKeys(...envVars: string[]): string[] {
    for (const envVar of envVars) {
      const raw = process.env[envVar];
      if (raw && raw.trim()) {
        return raw
          .split(/[,\n]+/)
          .map((k) => k.trim())
          .filter(Boolean);
      }
    }
    return [];
  }

  private initPool(provider: ProviderName, keys: string[]) {
    this.pools.set(provider, {
      keys: keys.map((key) => ({ key, errorCount: 0, cooldownUntil: 0 })),
      cursor: 0,
    });
  }

  isConfigured(provider: ProviderName): boolean {
    const pool = this.pools.get(provider);
    return !!pool && pool.keys.length > 0;
  }

  isAnyConfigured(): boolean {
    const providers: ProviderName[] = ["opencode-go", "opencode-zen", "github-models", "huggingface"];
    return providers.some((p) => this.isConfigured(p));
  }

  getKey(provider: ProviderName): string | null {
    const pool = this.pools.get(provider);
    if (!pool || pool.keys.length === 0) return null;

    const now = Date.now();
    const total = pool.keys.length;

    for (let i = 0; i < total; i++) {
      const idx = (pool.cursor + i) % total;
      const entry = pool.keys[idx];
      if (entry.cooldownUntil <= now) {
        pool.cursor = (idx + 1) % total;
        return entry.key;
      }
    }

    // All keys on cooldown — return least-recently-cooled key as last resort
    const fallback = pool.keys.reduce((a, b) =>
      a.cooldownUntil < b.cooldownUntil ? a : b
    );
    return fallback.key;
  }

  reportError(provider: ProviderName, key: string): void {
    const pool = this.pools.get(provider);
    if (!pool) return;
    const entry = pool.keys.find((e) => e.key === key);
    if (!entry) return;
    entry.errorCount++;
    if (entry.errorCount >= ERROR_THRESHOLD) {
      entry.cooldownUntil = Date.now() + COOLDOWN_MS;
      console.warn(
        `[key-manager] ${provider} key ...${key.slice(-6)} entered ${COOLDOWN_MS / 1000}s cooldown`
      );
    }
  }

  reportSuccess(provider: ProviderName, key: string): void {
    const pool = this.pools.get(provider);
    if (!pool) return;
    const entry = pool.keys.find((e) => e.key === key);
    if (!entry) return;
    entry.errorCount = 0;
    entry.cooldownUntil = 0;
  }

  resetPool(provider: ProviderName): void {
    const keys = (() => {
      switch (provider) {
        case "opencode-go":
          return this.readKeys("OPENCODE_GO_API_KEYS", "OPENCODE_GO_API_KEY");
        case "opencode-zen":
          return this.readKeys("OPENCODE_ZEN_API_KEYS", "OPENCODE_ZEN_API_KEY");
        case "github-models":
          return this.readKeys("GITHUB_TOKEN", "GITHUB_MODELS_TOKEN");
        case "huggingface":
          return this.readKeys("HUGGINGFACE_API_KEY", "HF_TOKEN", "HUGGINGFACE_TOKEN");
      }
    })();
    this.initPool(provider, keys);
  }

  status(): Record<ProviderName, { configured: boolean; keyCount: number; available: number }> {
    const now = Date.now();
    const providers: ProviderName[] = [
      "opencode-go",
      "opencode-zen",
      "github-models",
      "huggingface",
    ];
    return Object.fromEntries(
      providers.map((p) => {
        const pool = this.pools.get(p);
        const keys = pool?.keys ?? [];
        return [
          p,
          {
            configured: keys.length > 0,
            keyCount: keys.length,
            available: keys.filter((e) => e.cooldownUntil <= now).length,
          },
        ];
      })
    ) as Record<ProviderName, { configured: boolean; keyCount: number; available: number }>;
  }
}

export const keyManager = new KeyManager();
