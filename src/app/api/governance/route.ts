export const dynamic = "force-dynamic";
import { governance } from "@/lib/governance";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/api-auth";

export const runtime = "nodejs";

const resolveSchema = z.object({
  actionId: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  reason: z.string().optional(),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { actionId, status, reason } = resolveSchema.parse(body);

    await governance.resolveAction(actionId, status, reason);

    return Response.json({ success: true, actionId, status });
  } catch (error) {
    console.error("Governance resolution error:", error);
    const message = error instanceof Error ? error.message : "Resolution failed";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const actionId = searchParams.get("actionId");

  if (!actionId) return Response.json({ error: "Missing actionId" }, { status: 400 });

  try {
    const status = await governance.checkActionStatus(actionId);
    return Response.json({ actionId, status });
  } catch {
    return Response.json({ error: "Governance action failed" }, { status: 500 });
  }
}
