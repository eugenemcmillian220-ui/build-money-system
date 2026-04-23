import { NextRequest, NextResponse } from "next/server";
import {
  runIntentStage,
  runGenerateStage,
  runPolishStage,
  runPersistStage,
  nextStage,
  type StageName,
} from "@/lib/manifest/stages";
import { triggerStage } from "@/lib/manifest/chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Each stage gets its own fresh serverless invocation budget.
// 300 is the Vercel Hobby hard cap; each stage is designed to finish inside that window.
export const maxDuration = 300;

const RUNNERS: Record<StageName, (id: string, baseUrl: string) => Promise<void>> = {
  intent: runIntentStage,
  generate: runGenerateStage,
  polish: runPolishStage,
  persist: runPersistStage,
};

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-worker-secret");
  const expected = process.env.WORKER_SHARED_SECRET;
  if (!expected || secret !== expected) {
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
