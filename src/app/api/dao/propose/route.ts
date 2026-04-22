export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { daoEngine, ProposalType } from "@/lib/dao-engine";
import { requireAuth, isAuthError } from "@/lib/api-auth";

const proposalSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(4000),
  proposedBy: z.string().uuid().optional(),
  type: z.enum(["investment", "tech_adoption", "governance", "treasury"]).default("governance"),
  orgId: z.string().uuid().optional(),
  quorumRequired: z.number().min(1).max(10_000_000).optional(),
  executionPayload: z.record(z.unknown()).optional(),
  expiresInDays: z.number().min(1).max(365).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Phase 19 — DAO: Create a new governance proposal.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = proposalSchema.parse({
      ...body,
      proposedBy: body.proposedBy ?? auth.user.id,
      orgId: body.orgId ?? undefined,
    });

    const proposal = await daoEngine.createProposal({
      title: parsed.title,
      description: parsed.description,
      proposedBy: parsed.proposedBy || auth.user.id,
      type: parsed.type as ProposalType,
      orgId: parsed.orgId,
      quorumRequired: parsed.quorumRequired,
      executionPayload: parsed.executionPayload,
      expiresInDays: parsed.expiresInDays,
      metadata: parsed.metadata,
    });

    return NextResponse.json({ success: true, proposal });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", issues: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/**
 * Convenience GET — returns the 20 most recent proposals.
 */
export async function GET() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  try {
    const proposals = await daoEngine.getProposals({ limit: 20 });
    return NextResponse.json({ success: true, proposals });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
