import "server-only";

/**
 * Fire-and-forget the next stage. We only wait long enough for Vercel's edge
 * to accept the connection (~1s); the receiving function runs in its own
 * serverless invocation and keeps going regardless of whether this request
 * completes.
 *
 * `WORKER_SHARED_SECRET` authenticates inter-stage calls so worker endpoints
 * cannot be invoked externally.
 */
export async function triggerStage(
  baseUrl: string,
  stage: "intent" | "generate" | "polish" | "persist",
  jobId: string,
): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    await fetch(`${baseUrl}/api/manifest/worker?stage=${stage}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Worker-Secret": process.env.WORKER_SHARED_SECRET ?? "",
      },
      body: JSON.stringify({ jobId }),
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") return;
    console.warn(`[manifest/chain] trigger ${stage} failed:`, err);
  } finally {
    clearTimeout(timer);
  }
}
