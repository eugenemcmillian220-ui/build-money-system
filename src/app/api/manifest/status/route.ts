import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { loadManifestation } from "@/lib/manifest/store";
import { userCanAccessOrg } from "@/lib/manifest/org-access";

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
  // Mirror the SELECT RLS policy on manifestations: the authenticated user must
  // be the creator, an org member, or the org owner. loadManifestation uses the
  // service role (bypasses RLS) so this check is the sole gate.
  const isCreator = Boolean(row.user_id && userId && row.user_id === userId);
  let isOrgPeer = false;
  if (!isCreator && row.org_id && userId) {
    isOrgPeer = await userCanAccessOrg(userId, row.org_id);
  }
  if (!isCreator && !isOrgPeer) {
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
