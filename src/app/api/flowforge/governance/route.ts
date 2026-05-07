import { NextRequest, NextResponse } from "next/server";
import { createAuditEntry } from "@/lib/flowforge/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, title, description, proposalId, vote } = body;

    if (action === "create_proposal") {
      if (!title) {
        return NextResponse.json({ error: "Proposal title is required" }, { status: 400 });
      }

      const proposal = {
        id: crypto.randomUUID(),
        org_id: "default-org",
        title,
        description: description || "",
        proposed_by: "current-user",
        status: "active",
        votes_for: 0,
        votes_against: 0,
        quorum_required: 10,
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
      };

      createAuditEntry(
        "default-org",
        "current-user",
        "governance.vote",
        "proposal",
        proposal.id,
        { action: "created", title },
      );

      return NextResponse.json({ proposal, success: true });
    }

    if (action === "vote") {
      if (!proposalId || !vote) {
        return NextResponse.json(
          { error: "proposalId and vote (for/against) are required" },
          { status: 400 },
        );
      }

      createAuditEntry(
        "default-org",
        "current-user",
        "governance.vote",
        "proposal",
        proposalId,
        { vote },
      );

      return NextResponse.json({
        success: true,
        proposalId,
        vote,
        recorded_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: `Governance action failed: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
