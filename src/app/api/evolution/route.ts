export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { evolutionEngine } from "@/lib/self-evolution";
import { requireAuth, isAuthError } from "@/lib/api-auth";

/**
 * Phase 24 — Self-Evolution: Triggers a recursive-growth cycle.
 * Thin alias of `/api/evolve` with a payload-less POST so the phase
 * detail page can drive it from a single button press.
 */
export async function POST() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  try {
    const result = await evolutionEngine.triggerCycle();
    return NextResponse.json({
      success: result.success,
      patchesApplied: result.patchesApplied,
      at: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  try {
    const history = await evolutionEngine.getHistory();
    return NextResponse.json({ success: true, history });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
