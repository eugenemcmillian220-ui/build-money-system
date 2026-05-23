// Legacy providers (Groq/Gemini/OpenAI/OpenRouter) have been fully removed.
/**
 * key-manager.ts
 * Single-key manager for approved providers:
 *   - opencode-go   (Go subscription: paid primary)
 *   - opencode-zen  (Zen pay-as-you-go: fallback 1)
 *   - github-models (Free tier via GitHub PAT: fallback 2)
 *   - huggingface   (Free tier via HF token: fallback 3)
 *
 * NOTE: Multi-key pool rotation has been removed.
 * One key per provider. If a key hits errors it enters cooldown,
 * then automatically recovers after COOLDOWN_MS.
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

const COOLDOWN_MS = 60_000; // 60 seconds
const ERROR_THRESHOLD = 3;

class KeyManager {
  private entries: Map<ProviderName, KeyEntry | null> = new Map();

  constructor() {
    // Multi-alias resolution: first non-empty env var wins.
    // Supports comma-separated key pools — first key in the list is used.
    this.entries.set("opencode-go",    this.readFirstKey(["OPENCODE_GO_API_KEY", "OPENCODE_GO_API_KEYS"]));
    this.entries.set("opencode-zen",   this.readFirstKey(["OPENCODE_ZEN_API_KEY", "OPENCODE_ZEN_API_KEYS"]));
    this.entries.set("github-models",  this.readFirstKey(["GITHUB_MODELS_TOKEN", "GITHUB_MODELS_TOKENS", "GITHUB_TOKEN", "GITHUB_ACCESS_TOKEN"]));
    this.entries.set("huggingface",    this.readFirstKey(["HUGGINGFACE_API_KEY", "HF_TOKEN", "HUGGINGFACE_TOKEN", "HF_API_KEY", "HF_API_KEYS"]));
  }

  private readKey(envVar: string): KeyEntry | null {
    const raw = process.env[envVar];
    if (!raw || !raw.trim()) return null;
    // Support comma-separated key pools — use the first key
    const key = raw.trim().split(",")[0].trim();
    if (!key) return null;
    return { key, errorCount: 0, cooldownUntil: 0 };
  }

  private readFirstKey(envVars: string[]): KeyEntry | null {
    for (const envVar of envVars) {
      const entry = this.readKey(envVar);
      if (entry) return entry;
    }
    return null;
  }

  isConfigured(provider: ProviderName): boolean {
    return this.entries.get(provider) !== null && this.entries.get(provider) !== undefined;
  }

  isAnyConfigured(): boolean {
    const providers: ProviderName[] = ["opencode-go", "opencode-zen", "github-models", "huggingface"];
    return providers.some((p) => this.isConfigured(p));
  }

  getKey(provider: ProviderName): string | null {
    const entry = this.entries.get(provider);
    if (!entry) return null;

    const now = Date.now();

    // Key is on cooldown
    if (entry.cooldownUntil > now) {
      console.warn(
        `[key-manager] ${provider} key is on cooldown for ${Math.round((entry.cooldownUntil - now) / 1000)}s more`
      );
      // Still return the key as last resort — caller decides whether to use it
      return entry.key;
    }

    return entry.key;
  }

  reportError(provider: ProviderName, _key?: string): void {
    const entry = this.entries.get(provider);
    if (!entry) return;
    entry.errorCount++;
    if (entry.errorCount >= ERROR_THRESHOLD) {
      entry.cooldownUntil = Date.now() + COOLDOWN_MS;
      console.warn(
        `[key-manager] ${provider} entered ${COOLDOWN_MS / 1000}s cooldown after ${entry.errorCount} errors`
      );
    }
  }

  reportSuccess(provider: ProviderName, _key?: string): void {
    const entry = this.entries.get(provider);
    if (!entry) return;
    entry.errorCount = 0;
    entry.cooldownUntil = 0;
  }

  resetKey(provider: ProviderName): void {
    const envAliases: Record<ProviderName, string[]> = {
      "opencode-go":   ["OPENCODE_GO_API_KEY", "OPENCODE_GO_API_KEYS"],
      "opencode-zen":  ["OPENCODE_ZEN_API_KEY", "OPENCODE_ZEN_API_KEYS"],
      "github-models": ["GITHUB_MODELS_TOKEN", "GITHUB_MODELS_TOKENS", "GITHUB_TOKEN", "GITHUB_ACCESS_TOKEN"],
      "huggingface":   ["HUGGINGFACE_API_KEY", "HF_TOKEN", "HUGGINGFACE_TOKEN", "HF_API_KEY", "HF_API_KEYS"],
    };
    this.entries.set(provider, this.readFirstKey(envAliases[provider]));
  }

  status(): Record<ProviderName, { configured: boolean; onCooldown: boolean; cooldownRemainingMs: number }> {
    const now = Date.now();
    const providers: ProviderName[] = [
      "opencode-go",
      "opencode-zen",
      "github-models",
      "huggingface",
    ];
    return Object.fromEntries(
      providers.map((p) => {
        const entry = this.entries.get(p);
        const cooldownRemaining = entry ? Math.max(0, entry.cooldownUntil - now) : 0;
        return [
          p,
          {
            configured: !!entry,
            onCooldown: cooldownRemaining > 0,
            cooldownRemainingMs: cooldownRemaining,
          },
        ];
      })
    ) as Record<ProviderName, { configured: boolean; onCooldown: boolean; cooldownRemainingMs: number }>;
  }
}

export const keyManager = new KeyManager();
