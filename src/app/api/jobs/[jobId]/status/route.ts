import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, AuthResult } from "@/lib/api-auth";
import { loadManifestation } from "@/lib/manifest/store";
import { userCanAccessOrg } from "@/lib/manifest/org-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  const { jobId } = await params;
  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const row = await loadManifestation(jobId);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const userId = (authResult as AuthResult).user.id;
  const isCreator = Boolean(row.user_id && userId && row.user_id === userId);
  let isOrgPeer = false;
  if (!isCreator && row.org_id && userId) {
    isOrgPeer = await userCanAccessOrg(userId, row.org_id);
  }
  if (!isCreator && !isOrgPeer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stageToPhase: Record<string, string> = {
    queued: "queued",
    "intent-classify": "classifying",
    "intent-scout": "scouting",
    "intent-architect": "architecting",
    intent: "intent",
    "generate-plan": "planning",
    "plan-outline": "planning-outline",
    "plan-details": "planning-details",
    "generate-build-code": "building",
    "generate-build-fix": "fixing",
    "generate-build": "building",
    generate: "generating",
    "polish-analyze": "polishing-analyze",
    "polish-launch": "polishing-launch",
    polish: "polishing",
    "polish-parallel": "polishing",
    persist: "persisting",
    complete: "complete",
    error: "error",
  };

  const totalStages = 8;
  const stageOrder = [
    "queued",
    "intent-classify",
    "intent-scout",
    "intent-architect",
    "plan-outline",
    "plan-details",
    "generate-build-code",
    "generate-build-fix",
    "polish-parallel",
    "persist",
    "complete",
  ];
  const currentIdx = stageOrder.indexOf(row.current_stage);
  const progress = row.current_stage === "complete"
    ? 100
    : row.current_stage === "error"
      ? 0
      : Math.round(((currentIdx >= 0 ? currentIdx : 0) / totalStages) * 100);

  return NextResponse.json({
    jobId: row.id,
    phase: stageToPhase[row.current_stage] || row.current_stage,
    progress,
    projectId: row.project_id,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
