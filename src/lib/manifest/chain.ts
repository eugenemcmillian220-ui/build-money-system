import "server-only";
import { after } from "next/server";
import type { StageName } from "./stages";
import { withStageTimeout } from "@/lib/pipeline-timeout";

const MANIFEST_STAGE_TIMEOUT_MS = 5_000;
const MANIFEST_STAGE_MAX_RETRIES = 3;
const MANIFEST_STAGE_RETRY_BASE_MS = 500;

function getRailwayWorkerBaseUrl(): string | null {
  const configured = process.env.WORKER_BASE_URL || process.env.RAILWAY_PUBLIC_DOMAIN;
  if (!configured) return null;

  const trimmed = configured.trim().replace(/\/+$/, "");
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function getStageRunnerFallback() {
  return import("./stages");
}

async function runStageDirectly(stage: StageName, jobId: string, baseUrl: string): Promise<void> {
  const stages = await getStageRunnerFallback();

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
    "polish-parallel": stages.runPolishParallelStage,
    persist: stages.runPersistStage,
  };

  const runner = RUNNERS[stage];
  if (!runner) {
    console.warn(`[manifest/chain] unknown stage "${stage}" for job ${jobId}`);
    return;
  }

  await runner(jobId, baseUrl);

  const next = stages.nextStage[stage];
  if (next) {
    triggerStage(baseUrl, next, jobId);
  }
}

async function dispatchStageFetch(baseUrl: string, stage: StageName, jobId: string, workerSecret: string): Promise<Response> {
  const railwayWorkerBaseUrl = getRailwayWorkerBaseUrl();

  if (railwayWorkerBaseUrl) {
    return fetch(`${railwayWorkerBaseUrl}/run-manifest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Worker-Secret": workerSecret,
        "Idempotency-Key": `${jobId}:${stage}`,
      },
      body: JSON.stringify({ baseUrl, jobId, stage }),
    });
  }

  return fetch(`${baseUrl}/api/manifest/worker?stage=${stage}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Worker-Secret": workerSecret,
    },
    body: JSON.stringify({ jobId }),
  });
}

/**
 * Fire-and-forget the next stage using Next.js's `after()` primitive so the
 * outbound fetch survives after the response is sent to the caller. On Vercel,
 * a bare detached fetch can be torn down before the request headers are
 * flushed once the handler returns — `after()` tells the runtime to keep the
 * sandbox alive until the callback resolves.
 *
 * In development (NODE_ENV !== "production"), the `after()` fetch times out
 * because the worker route runs in the same process. Instead, we directly
 * import and call the stage runner function, then chain to the next stage.
 *
 * In production, setting `WORKER_BASE_URL` (or `RAILWAY_PUBLIC_DOMAIN`) sends
 * stage triggers to the Railway worker `/run-manifest` endpoint. Without that
 * setting, the pipeline keeps the existing Vercel worker-route behavior.
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
        await runStageDirectly(stage, jobId, baseUrl);
      } catch (err) {
        console.error(`[manifest/chain] dev runner ${stage} failed for job ${jobId}:`, err);
      }
    });
    return;
  }

  after(async () => {
    try {
      const workerSecret = process.env.WORKER_SHARED_SECRET;
      if (!workerSecret) {
        console.error(`[manifest/chain] WORKER_SHARED_SECRET is not set — stage "${stage}" for job ${jobId} will not run in production!`);
        return;
      }

      const workerBaseUrl = getRailwayWorkerBaseUrl();
      if (workerBaseUrl) {
        console.info(`[manifest/chain] dispatching ${stage} for job ${jobId} to Railway worker ${workerBaseUrl}`);
      }

      const res = await withStageTimeout(
        () => dispatchStageFetch(baseUrl, stage, jobId, workerSecret),
        {
          stage: `triggerStage-${stage}`,
          budgetMs: MANIFEST_STAGE_TIMEOUT_MS,
          maxRetries: MANIFEST_STAGE_MAX_RETRIES,
          retryBaseMs: MANIFEST_STAGE_RETRY_BASE_MS,
          onAttempt: (attempt, err) => {
            if (err) {
              console.warn(`[manifest/chain] triggerStage-${stage} attempt ${attempt} failed: ${err.message}`);
            }
          },
        }
      );

      if (!res.ok) {
        const errorBody = await res.text().catch(() => "No error body");
        console.error(
          `[manifest/chain] trigger ${stage} returned HTTP ${res.status} for job ${jobId}. Body: ${errorBody}`,
        );
        console.info(`[manifest/chain] attempting fallback direct call for stage ${stage} (job ${jobId})`);
        await runStageDirectly(stage, jobId, baseUrl);
      }
    } catch (err) {
      console.error(`[manifest/chain] trigger ${stage} failed for job ${jobId}:`, err);
      try {
        console.info(`[manifest/chain] fetch error, attempting fallback direct call for stage ${stage} (job ${jobId})`);
        await runStageDirectly(stage, jobId, baseUrl);
      } catch (fallbackErr) {
        console.error(`[manifest/chain] fallback also failed for stage ${stage} (job ${jobId}):`, fallbackErr);
      }
    }
  });
}
