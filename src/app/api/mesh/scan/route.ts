export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { swarmMesh } from "@/lib/swarm-mesh";
import { requireAuth, isAuthError } from "@/lib/api-auth";

/**
 * Phase 22 — Swarm Mesh: Scan the federation for available empires,
 * active trades, and aggregate stats.
 */
export async function GET() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  try {
    const [empires, trades, stats] = await Promise.all([
      swarmMesh.getEmpires({ limit: 20 }),
      swarmMesh.getTrades({ limit: 20 }),
      swarmMesh.getStats(),
    ]);

    return NextResponse.json({
      success: true,
      scan: {
        empires,
        trades,
        stats,
        scannedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
