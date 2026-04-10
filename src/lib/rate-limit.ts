export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

const memoryStore = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number = 10, windowMs: number = 60000): RateLimitResult {
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
