import { evolveApplication } from "@/lib/self-evolution";
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
  try {
    const body = await request.json();
    const parsed = requestSchema.parse(body);

    const result = await evolveApplication(parsed);

    return Response.json({
      success: true,
      evolvedProjectId: result.id,
      description: result.description,
    });
  } catch (error) {
    console.error("Evolution error:", error);
    const message = error instanceof Error ? error.message : "Self-evolution failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
