export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { daoEngine } from "@/lib/dao-engine";

/**
 * Phase 19 Cron: DAO Maintenance
 * - Expires stale proposals past their deadline
 * - Can be called by Vercel Cron or external scheduler
 */
export async function GET(request: NextRequest) {
  // Verify cron secret for production security
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const expiredCount = await daoEngine.expireStaleProposals();
    const stats = await daoEngine.getStats();

    return NextResponse.json({
      success: true,
      expired: expiredCount,
      stats: {
        open: stats.openProposals,
        total: stats.totalProposals,
        totalVotes: stats.totalVotes,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[DAO Cron] Maintenance error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Maintenance failed" },
      { status: 500 }
    );
  }
}
