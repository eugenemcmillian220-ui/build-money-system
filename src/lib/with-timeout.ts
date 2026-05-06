export class TimeoutError extends Error {
  public partial?: unknown;

  constructor(message: string, partial?: unknown) {
    super(message);
    this.name = "TimeoutError";
    this.partial = partial;
  }
}

/**
 * Wraps an async function with a hard timeout.
 *
 * Default budget is 240 000 ms (4 min) — safe under the 300 s Vercel Hobby cap.
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  ms: number = 240_000,
  stageName: string = "unknown",
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new TimeoutError(
                `Stage ${stageName} timed out after ${ms}ms`,
              ),
            ),
          ms,
        );
      }),
    ]);
    clearTimeout(timer);
    return result;
  } catch (error: unknown) {
    clearTimeout(timer);
    throw error;
  }
}
