import { vcAgent } from "@/lib/vc-agent";
import { z } from "zod";

export const runtime = "nodejs";

const requestSchema = z.object({
  orgId: z.string().uuid(),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { orgId } = requestSchema.parse(body);

    const proposals = await vcAgent.evaluateOrganization(orgId);

    return Response.json({
      success: true,
      proposals,
      count: proposals.length,
    });
  } catch (error) {
    console.error("VC Evaluation error:", error);
    const message = error instanceof Error ? error.message : "VC Evaluation failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
