import { rdAgent } from "@/lib/rd-agent";

export const runtime = "nodejs";

/**
 * GET /api/rd/scout
 * Triggers an autonomous tech scouting cycle
 */
export async function GET(): Promise<Response> {
  try {
    const trends = await rdAgent.scoutTrends();
    await rdAgent.processTrends(trends);

    return Response.json({
      success: true,
      scoutedCount: trends.length,
      trends
    });
  } catch (error) {
    console.error("R&D Scouting error:", error);
    return Response.json({ error: "Scouting cycle failed" }, { status: 500 });
  }
}
