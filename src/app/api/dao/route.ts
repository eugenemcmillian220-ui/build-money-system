// DA-028 TODO: Refactor action-switch pattern into dedicated sub-routes (e.g., /api/federation/register/route.ts)
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { daoEngine, type ProposalStatus } from "@/lib/dao-engine";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { z } from "zod";

const createProposalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  type: z.enum(["investment", "tech_adoption", "governance", "treasury"]),
  orgId: z.string().uuid().optional(),
  quorumRequired: z.number().min(1).max(1000).optional(),
  executionPayload: z.record(z.unknown()).optional(),
  expiresInDays: z.number().min(1).max(90).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * GET /api/dao - List proposals, get stats, or get balances
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "proposals";

  try {
    switch (action) {
      case "proposals": {
        const status = (searchParams.get("status") || undefined) as ProposalStatus | undefined;
        const limit = parseInt(searchParams.get("limit") || "20");
        const offset = parseInt(searchParams.get("offset") || "0");
        const proposals = await daoEngine.getProposals({ status, limit, offset });
        return NextResponse.json({ proposals });
      }

      case "proposal": {
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "Missing proposal id" }, { status: 400 });
        const proposal = await daoEngine.getProposal(id);
        const votes = await daoEngine.getVotes({ proposalId: id });
        return NextResponse.json({ proposal, votes });
      }

      case "balances": {
        const balances = await daoEngine.getBalances(authResult.user.id);
        return NextResponse.json({ balances });
      }

      case "stats": {
        const stats = await daoEngine.getStats();
        return NextResponse.json({ stats });
      }

      case "votes": {
        const proposalId = searchParams.get("proposalId") || undefined;
        const votes = await daoEngine.getVotes({
          proposalId,
          voterId: searchParams.get("voterId") || undefined,
        });
        return NextResponse.json({ votes });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error("[DAO API] GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "DAO query failed" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dao - Create proposal, cast vote, execute proposal
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    const body = await request.json();
    const action = body.action || "create_proposal";

    switch (action) {
      case "create_proposal": {
        const parsed = createProposalSchema.parse(body);
        const proposal = await daoEngine.createProposal({
          ...parsed,
          proposedBy: authResult.user.id,
        });
        return NextResponse.json({ proposal }, { status: 201 });
      }

      case "vote": {
        const voteSchema = z.object({
          proposalId: z.string().uuid(),
          vote: z.enum(["for", "against"]),
          tokensUsed: z.number().min(1).max(100).optional(),
        });
        const parsed = voteSchema.parse(body);
        const result = await daoEngine.castVote({
          ...parsed,
          voterId: authResult.user.id,
        });
        return NextResponse.json(result);
      }

      case "execute": {
        const execSchema = z.object({ proposalId: z.string().uuid() });
        const parsed = execSchema.parse(body);
        const result = await daoEngine.executeProposal(parsed.proposalId);
        return NextResponse.json({ proposal: result });
      }

      case "expire_stale": {
        const count = await daoEngine.expireStaleProposals();
        return NextResponse.json({ expired: count });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error("[DAO API] POST error:", error);
    const message = error instanceof Error ? error.message : "DAO operation failed";
    const status = message.includes("Already voted") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
