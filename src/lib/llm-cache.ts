/**
 * LLM Response Cache
 * 
 * In-memory LRU cache for LLM responses to avoid redundant API calls.
 * Keyed on hash of (model + messages). TTL-based expiration.
 * 
 * For production at scale, swap to Redis/Upstash:
 *   npm install @upstash/redis
 */

import { createHash } from "crypto";

interface CacheEntry {
  response: string;
  createdAt: number;
  hits: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ENTRIES = 500;

class LLMCache {
  private cache = new Map<string, CacheEntry>();
  private ttlMs: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  /**
   * Generate a cache key from the request parameters.
   * Uses SHA-256 hash of serialized messages + model to keep keys short.
   */
  private makeKey(model: string, messages: Array<{ role: string; content: string }>): string {
    const payload = JSON.stringify({ model, messages });
    return createHash("sha256").update(payload).digest("hex").slice(0, 32);
  }

  get(model: string, messages: Array<{ role: string; content: string }>): string | null {
    const key = this.makeKey(model, messages);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.response;
  }

  set(model: string, messages: Array<{ role: string; content: string }>, response: string): void {
    const key = this.makeKey(model, messages);

    // Evict oldest entries if at capacity
    if (this.cache.size >= MAX_ENTRIES) {
      const oldest = [...this.cache.entries()]
        .sort((a, b) => a[1].createdAt - b[1].createdAt)
        .slice(0, Math.floor(MAX_ENTRIES * 0.2)); // Evict 20%
      for (const [k] of oldest) {
        this.cache.delete(k);
      }
    }

    this.cache.set(key, {
      response,
      createdAt: Date.now(),
      hits: 0,
    });
  }

  /** Cache stats for health/debug endpoints */
  stats(): { size: number; maxSize: number; ttlMs: number } {
    return {
      size: this.cache.size,
      maxSize: MAX_ENTRIES,
      ttlMs: this.ttlMs,
    };
  }

  clear(): void {
    this.cache.clear();
  }
}

export const llmCache = new LLMCache();
