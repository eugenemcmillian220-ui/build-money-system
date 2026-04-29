import "server-only";
import { after } from "next/server";
import type { StageName } from "./stages";

/**
 * Fire-and-forget the next stage using Next.js's `after()` primitive so the
 * outbound fetch survives after the response is sent to the caller. On Vercel,
 * a bare detached fetch can be torn down before the request headers are
 * flushed once the handler returns — `after()` tells the runtime to keep the
 * sandbox alive until the callback resolves. The receiving worker function
 * runs in its own independent serverless invocation, so we don't need to wait
 * for it to complete.
 *
 * In development (NODE_ENV !== "production"), the `after()` fetch times out
 * because the worker route runs in the same process. Instead, we directly
 * import and call the stage runner function, then chain to the next stage.
 *
 * `WORKER_SHARED_SECRET` authenticates inter-stage calls so worker endpoints
 * cannot be invoked externally.
 */
export function triggerStage(
  baseUrl: string,
  stage: StageName,
  jobId: string,
): void {
  if (process.env.NODE_ENV !== "production") {
    after(async () => {
      try {
        const stages = await import("./stages");
        const { nextStage } = stages;

        const RUNNERS: Record<StageName, (id: string, base: string) => Promise<void>> = {
          "intent-classify": stages.runIntentClassifyStage,
          "intent-scout": stages.runIntentScoutStage,
          "intent-architect": stages.runIntentArchitectStage,
          intent: stages.runIntentStage,
          generate: stages.runGenerateStage,
          "generate-plan": stages.runGeneratePlanStage,
          "plan-outline": stages.runPlanOutlineStage,
          "plan-details": stages.runPlanDetailsStage,
          "generate-build-code": stages.runGenerateBuildCodeStage,
          "generate-build-fix": stages.runGenerateBuildFixStage,
          "generate-build": stages.runGenerateBuildStage,
          "polish-analyze": stages.runPolishAnalyzeStage,
          "polish-launch": stages.runPolishLaunchStage,
          polish: stages.runPolishStage,
          persist: stages.runPersistStage,
        };

        const runner = RUNNERS[stage];
        if (!runner) {
          console.warn(`[manifest/chain] unknown stage "${stage}" for job ${jobId}`);
          return;
        }

        await runner(jobId, baseUrl);

        const next = nextStage[stage];
        if (next) {
          triggerStage(baseUrl, next, jobId);
        }
      } catch (err) {
        console.error(`[manifest/chain] dev runner ${stage} failed for job ${jobId}:`, err);
      }
    });
    return;
  }

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
