export const dynamic = "force-dynamic";
import { maAgent } from "@/lib/ma-agent";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/api-auth";

export const runtime = "nodejs";

const requestSchema = z.object({
  orgId: z.string().uuid(),
});

/**
 * POST /api/ma/analyze
 * Scans for synergies and proposes mergers within an organization
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { orgId } = requestSchema.parse(body);

    const proposals = await maAgent.detectSynergy(orgId);

    // Auto-persist high-confidence proposals
    for (const prop of proposals) {
      if (prop.synergyScore > 0.85) {
        await maAgent.proposeMerger(prop);
      }
    }

    return Response.json({
      success: true,
      foundCount: proposals.length,
      proposals,
    });
  } catch (error) {
    console.error("M&A Analysis error:", error);
    return Response.json({ error: "M&A Analysis failed" }, { status: 500 });
  }
}
