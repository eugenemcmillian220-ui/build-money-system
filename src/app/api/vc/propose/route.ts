export const dynamic = "force-dynamic";
import { vcAgent } from "@/lib/vc-agent";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/api-auth";

export const runtime = "nodejs";

const proposeSchema = z.object({
  orgId: z.string().uuid(),
});

const offerSchema = z.object({
  proposal: z.record(z.unknown()),
});

// GET: Scout for investment opportunities in an organization
export async function GET(request: Request): Promise<Response> {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  const { searchParams } = new URL(request.url);
  const rawOrgId = searchParams.get("orgId");

  const parsed = proposeSchema.safeParse({ orgId: rawOrgId });
  if (!parsed.success) {
    return Response.json({ error: "Valid orgId is required" }, { status: 400 });
  }
  const orgId = parsed.data.orgId;

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
    const parsed = offerSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Proposal data is required", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const proposal = parsed.data.proposal;

    const offerId = await vcAgent.issueOffer(proposal as unknown as Parameters<typeof vcAgent.issueOffer>[0]);
    return Response.json({ success: true, offerId });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Offer issuance failed" }, { status: 500 });
  }
}
