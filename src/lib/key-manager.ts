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
    this.entries.set("opencode-go", this.readKey("OPENCODE_GO_API_KEY"));
    this.entries.set("opencode-zen", this.readKey("OPENCODE_ZEN_API_KEY"));
    this.entries.set("github-models", this.readKey("GITHUB_MODELS_TOKEN"));
    this.entries.set("huggingface", this.readKey("HUGGINGFACE_API_KEY"));
  }

  private readKey(envVar: string): KeyEntry | null {
    const raw = process.env[envVar];
    if (!raw || !raw.trim()) return null;
    const key = raw.trim();
    return { key, errorCount: 0, cooldownUntil: 0 };
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
    const envMap: Record<ProviderName, string> = {
      "opencode-go": "OPENCODE_GO_API_KEY",
      "opencode-zen": "OPENCODE_ZEN_API_KEY",
      "github-models": "GITHUB_MODELS_TOKEN",
      "huggingface": "HUGGINGFACE_API_KEY",
    };
    this.entries.set(provider, this.readKey(envMap[provider]));
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
