import { NextRequest, NextResponse } from "next/server";
import { runTrendScout } from "@/lib/agents/trend-hunter";
import { traced } from "@/lib/telemetry";
import { requireAuth, isAuthError } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  return traced("rd.scout", { "agent.role": "Trend Hunter" }, async () => {
    try {
      const result = await runTrendScout();
      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}
