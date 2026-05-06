// DA-067 FIX: TODO: Strip sensitive fields before returning sync results
export const dynamic = "force-dynamic";
import { hiveMind } from "@/lib/hive-mind";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/api-auth";

export const runtime = "nodejs";

const contributionSchema = z.object({
  orgId: z.string().uuid().optional(),
  type: z.enum(["bug_fix", "architecture"]),
  problem: z.string(),
  solution: z.any(),
});

/**
 * POST /api/hive/sync
 * Contributes an anonymized build pattern to the Hive Mind
 */
export async function POST(request: Request): Promise<Response> {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    const body = await request.json();
    const { orgId, type, problem, solution } = contributionSchema.parse(body);

    // 1. Extract pattern (Anonymization)
    const pattern = await hiveMind.extractPattern(problem, solution, type);

    if (pattern) {
      // 2. Persist to Global Knowledge Base
      await hiveMind.contribute(pattern, orgId);
    }

    return Response.json({ success: true });
  } catch (_error) {
    console.error("Hive sync error:", _error);
    return Response.json({ error: "Failed to sync with Hive Mind" }, { status: 500 });
  }
}

/**
 * GET /api/hive/sync
 * Recalls relevant knowledge from the Hive Mind
 */
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const problem = searchParams.get("problem");
  const tags = searchParams.get("tags")?.split(",") || [];

  if (!problem) return Response.json({ error: "Missing problem query" }, { status: 400 });

  try {
    const relevant = await hiveMind.recall(problem, tags);
    return Response.json({ success: true, results: relevant });
  } catch {
    return Response.json({ error: "Hive sync failed" }, { status: 500 });
  }
}
