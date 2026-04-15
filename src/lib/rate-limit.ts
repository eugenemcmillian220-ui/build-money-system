/**
 * Production rate limiter with Supabase persistence.
 * 
 * In production (Vercel serverless), the in-memory Map resets on every cold start,
 * making rate limiting ineffective. This version persists counters via Supabase RPC
 * and falls back to in-memory when Supabase is unavailable (local dev).
 *
 * For even lower latency, swap to Upstash Redis:
 *   npm install @upstash/ratelimit @upstash/redis
 */

import { supabaseAdmin } from "@/lib/supabase/admin";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// In-memory fallback for local dev or Supabase outage
const memoryStore = new Map<string, { count: number; reset: number }>();

function memoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || now > record.reset) {
    const reset = now + windowMs;
    memoryStore.set(key, { count: 1, reset });
    return { success: true, limit, remaining: limit - 1, reset };
  }

  if (record.count >= limit) {
    return { success: false, limit, remaining: 0, reset: record.reset };
  }

  record.count += 1;
  return { success: true, limit, remaining: limit - record.count, reset: record.reset };
}

/**
 * Rate limit a key. Persists to Supabase so limits survive serverless cold starts.
 * Falls back to in-memory if Supabase RPC is not available.
 */
export async function rateLimit(
  key: string,
  limit: number = 10,
  windowMs: number = 60000
): Promise<RateLimitResult> {
  if (!supabaseAdmin) {
    return memoryRateLimit(key, limit, windowMs);
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_ms: windowMs,
    });

    if (error) {
      console.warn("[rate-limit] Supabase RPC unavailable, using memory fallback:", error.message);
      return memoryRateLimit(key, limit, windowMs);
    }

    const result = data as { allowed: boolean; current_count: number };
    return {
      success: result.allowed,
      limit,
      remaining: Math.max(0, limit - result.current_count),
      reset: Date.now() + windowMs,
    };
  } catch (err) {
    console.warn("[rate-limit] Falling back to memory rate limiter:", err);
    return memoryRateLimit(key, limit, windowMs);
  }
}
