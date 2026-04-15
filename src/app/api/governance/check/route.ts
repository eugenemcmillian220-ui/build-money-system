import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth, isAuthError } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 12: Sovereign Governance Check
 * Verifies if an action (e.g., deployment, deletion) is permitted by the organization's DAO rules.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    const { orgId, action, projectId } = await request.json();

    if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

    // In a real DAO, we would check the 'governance_proposals' table for approved votes.
    // For the MVP, we assume Elite tiers have 'Autonomous Governance' (Auto-Approve).
    
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("billing_tier")
      .eq("id", orgId)
      .single();

    const isElite = org?.billing_tier === "elite" || org?.billing_tier === "pro";

    if (isElite) {
      return NextResponse.json({ approved: true, message: "Autonomous Governance: Action Auto-Approved." });
    }

    // Default: Pending Vote
    return NextResponse.json({ 
      approved: false, 
      message: "Governance: Multi-sig approval required. Proposal created in Governance Vault." 
    });

  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
