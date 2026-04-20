export const dynamic = "force-dynamic";
import { evolutionEngine } from "@/lib/self-evolution";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/api-auth";

export const runtime = "nodejs";
export const maxDuration = 120; // Self-evolution takes time

const requestSchema = z.object({
  projectId: z.string(),
  screenshotUrl: z.string().url(),
  userFeedback: z.string().min(5),
  orgId: z.string().uuid(),
});

export async function POST(request: Request): Promise<Response> {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    const body = await request.json();
    const parsed = requestSchema.parse(body);

    const result = await evolutionEngine.triggerCycle();

    return Response.json({
      success: result.success,
      projectId: parsed.projectId,
      patchesApplied: result.patchesApplied,
    });
  } catch (error) {
    console.error("Evolution error:", error);
    const message = error instanceof Error ? error.message : "Self-evolution failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
