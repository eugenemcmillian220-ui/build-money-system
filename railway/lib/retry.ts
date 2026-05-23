export async function withRetry<T>(fn: () => Promise<T>, retries = 2, baseMs = 500): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try { return await fn(); } catch (e) { lastErr = e; }
    if (i < retries) await new Promise((r) => setTimeout(r, baseMs * 2 ** i));
  }
  throw lastErr;
}
