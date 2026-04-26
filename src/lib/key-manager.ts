/**
 * Multi-Key Rotation Manager — OpenCode Zen Exclusive
 *
 * Supports round-robin rotation across multiple API keys for the
 * OpenCode Zen provider. Keys are read from environment variables
 * on first access. Keys that hit error thresholds are temporarily
 * placed on cooldown.
 *
 * Rate limiting applies only to the free tier. Paid plans (Go, Pro)
 * have no rate limits on the paid model pool.
 */

export type ProviderName = "opencodezen";

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
  private pool: ProviderKeyPool | null = null;

  private getPool(): ProviderKeyPool {
    if (!this.pool) {
      const multiKeys = parseKeys(process.env.OPENCODE_ZEN_API_KEYS);
      const singleKey = parseKeys(process.env.OPENCODE_ZEN_API_KEY);
      this.pool = new ProviderKeyPool(multiKeys.length > 0 ? multiKeys : singleKey);
    }
    return this.pool;
  }

  resetPool(_provider?: ProviderName): void {
    this.pool = null;
  }

  getKey(_provider?: ProviderName): string | null {
    return this.getPool().getNext();
  }

  isConfigured(_provider?: ProviderName): boolean {
    return this.getPool().size > 0;
  }

  reportError(_provider: ProviderName, key: string): void {
    this.getPool().reportError(key);
  }

  reportSuccess(_provider: ProviderName, key: string): void {
    this.getPool().reportSuccess(key);
  }
}

export const keyManager = new KeyManager();
