import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth, isAuthError } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 8: Sandbox Environment Creator
 * Provisions a temporary, isolated environment for testing manifestations.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    const { projectId, orgId } = await request.json();

    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    // In a real implementation, this would trigger a Docker container or a Vercel Preview Deployment.
    // For now, we create a 'sandbox' record in the deployments table.
    
    const { data: deployment, error } = await supabaseAdmin
      .from("deployments")
      .insert({
        project_id: projectId,
        org_id: orgId,
        url: `https://sandbox-${projectId.slice(0, 8)}.forge-test.app`,
        status: "ready",
        metadata: { type: "sandbox", expires_at: new Date(Date.now() + 3600000).toISOString() } // 1 hour expiry
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, sandboxUrl: deployment.url });

  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
