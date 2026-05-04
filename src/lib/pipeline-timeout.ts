import "server-only";
import { logger } from "./logger";

/**
 * Pipeline-level timeout & retry utilities for manifestation stages.
 *
 * Each stage runner can wrap its work in `withStageTimeout` so a single
 * stuck LLM call or agent can't hold the entire serverless invocation
 * hostage. Retries use exponential back-off with jitter.
 */

export class StageTimeoutError extends Error {
  constructor(
    public readonly stage: string,
    public readonly budgetMs: number,
    public readonly elapsedMs: number,
  ) {
    super(`Stage "${stage}" exceeded ${budgetMs}ms budget (elapsed ${elapsedMs}ms)`);
    this.name = "StageTimeoutError";
  }
}

export class StageRetryExhaustedError extends Error {
  constructor(
    public readonly stage: string,
    public readonly attempts: number,
    public readonly lastError: Error,
  ) {
    super(`Stage "${stage}" failed after ${attempts} attempts: ${lastError.message}`);
    this.name = "StageRetryExhaustedError";
  }
}

export interface StageTimeoutOptions {
  /** Stage name for logging. */
  stage: string;
  /** Hard timeout in ms (default 280_000 — leaves 20s headroom in a 300s serverless budget). */
  budgetMs?: number;
  /** Max retry attempts (default 0 — no retries). */
  maxRetries?: number;
  /** Base delay between retries in ms (default 2000). Doubles each retry + jitter. */
  retryBaseMs?: number;
  /** Per-attempt callback for logging / metrics. */
  onAttempt?: (attempt: number, error?: Error) => void;
}

const DEFAULT_BUDGET_MS = 280_000;
const DEFAULT_RETRY_BASE_MS = 2_000;

/**
 * Runs `fn` with a hard timeout and optional retries.
 *
 * - On timeout: throws `StageTimeoutError` immediately.
 * - On retries exhausted: throws `StageRetryExhaustedError`.
 * - Remaining budget shrinks across retries — a slow first attempt
 *   leaves less room for retries.
 */
export async function withStageTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  opts: StageTimeoutOptions,
): Promise<T> {
  const {
    stage,
    budgetMs = DEFAULT_BUDGET_MS,
    maxRetries = 0,
    retryBaseMs = DEFAULT_RETRY_BASE_MS,
    onAttempt,
  } = opts;

  const overallStart = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const elapsed = Date.now() - overallStart;
    const remaining = budgetMs - elapsed;

    if (remaining <= 0) {
      logger.error("Stage budget exhausted before attempt", {
        stage,
        attempt,
        budgetMs,
        elapsedMs: elapsed,
      });
      throw new StageTimeoutError(stage, budgetMs, elapsed);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);

    try {
      onAttempt?.(attempt, lastError ?? undefined);
      logger.debug("Stage attempt starting", {
        stage,
        attempt,
        remainingMs: remaining,
        maxRetries,
      });

      const result = await Promise.race<T>([
        fn(controller.signal),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener("abort", () => {
            reject(new StageTimeoutError(stage, budgetMs, Date.now() - overallStart));
          });
        }),
      ]);

      clearTimeout(timer);
      const totalMs = Date.now() - overallStart;
      logger.info("Stage completed", { stage, attempt, totalMs });
      return result;
    } catch (err) {
      clearTimeout(timer);
      const error = err instanceof Error ? err : new Error(String(err));
      lastError = error;

      if (error instanceof StageTimeoutError) {
        logger.error("Stage timed out", { stage, attempt, budgetMs });
        throw error;
      }

      if (attempt <= maxRetries) {
        const jitter = Math.random() * 500;
        const delay = retryBaseMs * Math.pow(2, attempt - 1) + jitter;
        logger.warn("Stage attempt failed, retrying", {
          stage,
          attempt,
          error: error.message,
          nextDelayMs: Math.round(delay),
        });
        await sleep(Math.min(delay, budgetMs - (Date.now() - overallStart)));
      }
    }
  }

  throw new StageRetryExhaustedError(stage, maxRetries + 1, lastError!);
}

/**
 * Wraps a promise with a simple per-call timeout.
 * Useful inside stage runners for individual LLM / agent calls.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}
