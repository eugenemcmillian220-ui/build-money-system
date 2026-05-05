export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { swarmMesh } from "@/lib/swarm-mesh";

/**
 * Phase 22 Cron: Federation Mesh Sync
 * - Expires stale connections
 * - Deactivates dormant empires (no heartbeat in 30 days)
 * - Reports federation health stats
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const maintenance = await swarmMesh.runMaintenance();
    const stats = await swarmMesh.getStats();

    return NextResponse.json({
      success: true,
      maintenance,
      stats: {
        empires: stats.total_empires,
        connections: stats.total_connections,
        activeTrades: stats.active_trades,
        intelligenceShared: stats.intelligence_shared,
        avgTrust: Math.round(stats.avg_trust_score),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Federation Cron] Sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Federation sync failed" },
      { status: 500 }
    );
  }
}
