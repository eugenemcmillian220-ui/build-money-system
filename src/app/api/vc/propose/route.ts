export const dynamic = "force-dynamic";
import { vcAgent, type InvestmentProposal } from "@/lib/vc-agent";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/api-auth";

export const runtime = "nodejs";

const proposeSchema = z.object({
  proposal: z.record(z.unknown()),
});

// GET: Scout for investment opportunities in an organization
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");

  if (!orgId) {
    return Response.json({ error: "orgId is required" }, { status: 400 });
  }

  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    const proposals = await vcAgent.evaluateOrganization(orgId);
    return Response.json({ success: true, proposals });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "VC evaluation failed" }, { status: 500 });
  }
}

// POST: Issue a formal offer
export async function POST(request: Request): Promise<Response> {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    const body = await request.json();
    const parsed = proposeSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Proposal data is required", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const proposal = parsed.data.proposal as unknown as InvestmentProposal;

    const offerId = await vcAgent.issueOffer(proposal);
    return Response.json({ success: true, offerId });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Offer issuance failed" }, { status: 500 });
  }
}
