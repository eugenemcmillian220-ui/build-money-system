import { NextRequest, NextResponse } from "next/server";
import { loadManifestation } from "@/lib/manifest/store";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { userCanAccessOrg } from "@/lib/manifest/org-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("jobId") || searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "jobId or id is required" }, { status: 400 });
  }

  try {
    const row = await loadManifestation(id);
    if (!row) {
      return NextResponse.json({ error: "Manifestation not found" }, { status: 404 });
    }

    const userId = (authResult as { user?: { id?: string } }).user?.id;
    if (row.org_id && userId) {
      const allowed = await userCanAccessOrg(userId, row.org_id);
      if (!allowed && row.user_id !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (row.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { nextStage } = await import("@/lib/manifest/stages");
    const next_stage = nextStage[row.current_stage as keyof typeof nextStage] || (row.status === "pending" ? "intent-classify" : null);

    return NextResponse.json({
      id: row.id,
      status: row.status,
      current_stage: row.current_stage,
      next_stage,
      error: row.error,
      last_error: row.error, // explicitly labeled as requested
      updated_at: row.updated_at,
      created_at: row.created_at,
      logs: row.logs,
      state: row.state,
      result: row.result,
      env_check: {
        has_worker_secret: !!process.env.WORKER_SHARED_SECRET,
        worker_secret_configured: !!process.env.WORKER_SHARED_SECRET,
        node_env: process.env.NODE_ENV,
        is_production: process.env.NODE_ENV === "production",
      }
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
