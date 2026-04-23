import "server-only";
import { after } from "next/server";

/**
 * Fire-and-forget the next stage using Next.js's `after()` primitive so the
 * outbound fetch survives after the response is sent to the caller. On Vercel,
 * a bare detached fetch can be torn down before the request headers are
 * flushed once the handler returns — `after()` tells the runtime to keep the
 * sandbox alive until the callback resolves. The receiving worker function
 * runs in its own independent serverless invocation, so we don't need to wait
 * for it to complete.
 *
 * `WORKER_SHARED_SECRET` authenticates inter-stage calls so worker endpoints
 * cannot be invoked externally.
 */
export function triggerStage(
  baseUrl: string,
  stage: "intent" | "generate" | "polish" | "persist",
  jobId: string,
): void {
  after(async () => {
    try {
      const res = await fetch(`${baseUrl}/api/manifest/worker?stage=${stage}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Worker-Secret": process.env.WORKER_SHARED_SECRET ?? "",
        },
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok) {
        console.warn(
          `[manifest/chain] trigger ${stage} returned HTTP ${res.status} for job ${jobId}`,
        );
      }
    } catch (err) {
      console.warn(`[manifest/chain] trigger ${stage} failed for job ${jobId}:`, err);
    }
  });
}
