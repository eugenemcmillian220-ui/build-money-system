import { NextRequest, NextResponse } from "next/server";
import {
  runIntentClassifyStage,
  runIntentScoutStage,
  runIntentArchitectStage,
  runIntentStage,
  runGenerateStage,
  runGeneratePlanStage,
  runPlanOutlineStage,
  runPlanDetailsStage,
  runGenerateBuildCodeStage,
  runGenerateBuildFixStage,
  runGenerateBuildStage,
  runPolishAnalyzeStage,
  runPolishLaunchStage,
  runPolishStage,
  runPolishParallelStage,
  runPersistStage,
  nextStage,
  type StageName,
} from "@/lib/manifest/stages";
import { triggerStage } from "@/lib/manifest/chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Each stage gets its own fresh serverless invocation budget.
// Vercel Hobby hard cap is 60s; each AI call uses 25s timeout so we fit ≥2 attempts.
export const maxDuration = 60;

const RUNNERS: Record<StageName, (id: string, baseUrl: string) => Promise<void>> = {
  "intent-classify": runIntentClassifyStage,
  "intent-scout": runIntentScoutStage,
  "intent-architect": runIntentArchitectStage,
  intent: runIntentStage,
  generate: runGenerateStage,
  "generate-plan": runGeneratePlanStage,
  "plan-outline": runPlanOutlineStage,
  "plan-details": runPlanDetailsStage,
  "generate-build-code": runGenerateBuildCodeStage,
  "generate-build-fix": runGenerateBuildFixStage,
  "generate-build": runGenerateBuildStage,
  "polish-analyze": runPolishAnalyzeStage,
  "polish-launch": runPolishLaunchStage,
  polish: runPolishStage,
  // New: single-stage parallel polish — replaces the 2-hop analyze→launch chain.
  "polish-parallel": runPolishParallelStage,
  persist: runPersistStage,
};

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-worker-secret");
  const expected = process.env.WORKER_SHARED_SECRET;
  if (!expected) {
    console.error("[manifest/worker] WORKER_SHARED_SECRET env var is not set — all worker calls will be rejected.");
    return NextResponse.json({ error: "Worker misconfigured" }, { status: 503 });
  }
  if (secret !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stage = new URL(request.url).searchParams.get("stage") as StageName | null;
  if (!stage || !(stage in RUNNERS)) {
    return NextResponse.json({ error: "Unknown stage" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const jobId = (body as { jobId?: string }).jobId;
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const baseUrl = new URL(request.url).origin;

  try {
    await RUNNERS[stage](jobId, baseUrl);
  } catch (err) {
    // runners already persisted failure state; just acknowledge.
    console.error(`[manifest/worker] ${stage} failed:`, err);
    return NextResponse.json({ ok: false, stage, error: (err as Error).message }, { status: 200 });
  }

  const next = nextStage[stage];
  if (next) {
    // Chain to next stage in a fresh serverless invocation via after(), so the
    // outbound fetch is flushed after the response is sent to the caller
    // without being cut off by Vercel's sandbox lifecycle.
    triggerStage(baseUrl, next, jobId);
  }

  return NextResponse.json({ ok: true, stage, next });
}
