import { NextResponse } from "next/server";
import { requireAuth, isAuthError, AuthResult } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET() {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  const userId = (authResult as AuthResult).user.id;
  if (!userId) {
    return NextResponse.json(null);
  }

  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("manifestations")
    .select("id, current_stage, status, logs, project_id, error, updated_at")
    .eq("user_id", userId)
    .in("status", ["pending", "running"])
    .gte("updated_at", thirtyMinutesAgo)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    // Check for a recently completed job
    const { data: recentCompleted } = await supabaseAdmin
      .from("manifestations")
      .select("id, current_stage, status, project_id, error, updated_at")
      .eq("user_id", userId)
      .in("status", ["complete", "error"])
      .gte("updated_at", thirtyMinutesAgo)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentCompleted) {
      return NextResponse.json({
        jobId: recentCompleted.id,
        phase: recentCompleted.current_stage,
        status: recentCompleted.status,
        projectId: recentCompleted.project_id,
        error: recentCompleted.error,
        liveOutput: [],
        updatedAt: recentCompleted.updated_at,
      });
    }

    return NextResponse.json(null);
  }

  const logs = (data.logs as Array<{ ts: string; level: string; text: string }>) || [];
  const liveOutput = logs.slice(-20);

  return NextResponse.json({
    jobId: data.id,
    phase: data.current_stage,
    status: data.status,
    projectId: data.project_id,
    error: data.error,
    liveOutput,
    updatedAt: data.updated_at,
  });
}
