import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { loadManifestation } from "@/lib/manifest/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const row = await loadManifestation(id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const userId = (authResult as { user?: { id?: string } }).user?.id;
  if (row.user_id && userId && row.user_id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    id: row.id,
    status: row.status,
    current_stage: row.current_stage,
    logs: row.logs,
    project_id: row.project_id,
    result: row.result,
    error: row.error,
    updated_at: row.updated_at,
  });
}
