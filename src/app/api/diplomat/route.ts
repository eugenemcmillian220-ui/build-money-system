export const dynamic = "force-dynamic";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { diplomatAgent } from "@/lib/diplomat-agent";
import { z } from "zod";


export const runtime = "nodejs";

const negotiateSchema = z.object({
  vendorId: z.string().uuid(),
  vendorName: z.string(),
  trigger: z.enum(["price_hike", "downtime", "rate_limit", "contract_renewal", "manual"]),
  context: z.string(),
});

// POST: Trigger a specific negotiation
export async function POST(request: Request): Promise<Response> {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    const body = await request.json();
    const incident = negotiateSchema.parse(body);

    const result = await diplomatAgent.negotiate(incident);

    return Response.json({ success: true, result });
  } catch (error) {
    console.error("Diplomat negotiation error:", error);
    return Response.json({ error: error instanceof Error ? error.message : "Negotiation failed" }, { status: 500 });
  }
}

// GET: Run a full vendor audit
export async function GET(): Promise<Response> {
  try {
    const summary = await diplomatAgent.auditVendors();
    return Response.json({ success: true, ...summary });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Audit failed" }, { status: 500 });
  }
}
