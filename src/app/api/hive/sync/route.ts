import { hiveMind } from "@/lib/hive-mind";
import { z } from "zod";

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
  } catch (error) {
    return Response.json({ error: "Failed to recall from Hive Mind" }, { status: 500 });
  }
}
