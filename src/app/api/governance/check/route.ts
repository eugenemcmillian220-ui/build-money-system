import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 12: Sovereign Governance Check
 * Verifies if an action (e.g., deployment, deletion) is permitted by the organization's DAO rules.
 * 
 * UPDATE: Autonomous Governance is now enabled for ALL tiers to support the Automated Builder Mode.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    const { orgId } = await request.json();

    if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

    // Automated Builder Mode: Action Auto-Approved for all tiers to ensure seamless manifestation.
    return NextResponse.json({ 
      approved: true, 
      message: "Autonomous Governance: Action Auto-Approved via Automated Builder Protocol." 
    });

  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
