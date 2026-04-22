export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { daoEngine } from "@/lib/dao-engine";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth, isAuthError } from "@/lib/api-auth";

/**
 * Phase 19 — DAO: Treasury audit. Returns an aggregate of credit ledgers,
 * token supply, and active proposals for transparency.
 */
export async function GET() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  try {
    const stats = await daoEngine.getStats();

    let totalCreditBalance = 0;
    let orgCount = 0;
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from("organizations")
        .select("credit_balance");
      if (data) {
        orgCount = data.length;
        totalCreditBalance = data.reduce(
          (sum, r) => sum + Number(r.credit_balance ?? 0),
          0,
        );
      }
    }

    return NextResponse.json({
      success: true,
      treasury: {
        ...stats,
        orgCount,
        totalCreditBalance,
        asOf: new Date().toISOString(),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
