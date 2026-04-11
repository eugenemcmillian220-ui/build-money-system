import { vcAgent } from "@/lib/vc-agent";
import { z } from "zod";

export const runtime = "nodejs";

const proposeSchema = z.object({
  orgId: z.string().uuid(),
});

// GET: Scout for investment opportunities in an organization
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");

  if (!orgId) {
    return Response.json({ error: "orgId is required" }, { status: 400 });
  }

  try {
    const proposals = await vcAgent.evaluateOrganization(orgId);
    return Response.json({ success: true, proposals });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "VC evaluation failed" }, { status: 500 });
  }
}

// POST: Issue a formal offer
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const proposal = body.proposal; // Expecting full InvestmentProposal object

    if (!proposal) {
      return Response.json({ error: "Proposal data is required" }, { status: 400 });
    }

    const offerId = await vcAgent.issueOffer(proposal);
    return Response.json({ success: true, offerId });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Offer issuance failed" }, { status: 500 });
  }
}
