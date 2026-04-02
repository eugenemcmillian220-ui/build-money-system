import { NextResponse } from "next/server";
import { revenueOptimizer } from "@/lib/revenue-optimizer";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Cron: /api/cron/revenue-optimize — runs every Monday at 9 AM
 * Runs pricing optimization and records weekly revenue snapshot
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
    const history = revenueOptimizer.getRevenueHistory();
    const latestRevenue = history[history.length - 1]?.revenue ?? 0;

    const suggestions = revenueOptimizer.generateOptimizationSuggestions({
      mrr: latestRevenue,
      arpu: latestRevenue > 0 ? latestRevenue / 10 : 0,
      churnRate: 3.5,
      conversionRate: 4.2,
    });

    // Record this week's revenue snapshot
    revenueOptimizer.recordRevenue(new Date().toISOString(), latestRevenue);

    return NextResponse.json({
      weeklySnapshot: { revenue: latestRevenue, date: new Date().toISOString() },
      optimizationSuggestions: suggestions,
      triggeredBy: "cron",
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Revenue optimization failed" },
      { status: 500 }
    );
  }
}
