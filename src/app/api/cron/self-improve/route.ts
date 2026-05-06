export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { selfImprovementEngine } from "@/lib/self-improve";

export const runtime = "nodejs";
export const maxDuration = 280;

/**
 * Cron: /api/cron/self-improve — runs daily at 2 AM
 * Processes feedback and learning data to improve the AI system
 */
export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await selfImprovementEngine.runSelfImprovement();
    return NextResponse.json({
      ...result,
      triggeredBy: "cron",
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Self-improvement failed" },
      { status: 500 }
    );
  }
}
