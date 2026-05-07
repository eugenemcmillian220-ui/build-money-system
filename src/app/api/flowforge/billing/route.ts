import { NextRequest, NextResponse } from "next/server";
import { createAuditEntry } from "@/lib/flowforge/audit";
import { isAdminEmail, ADMIN_CREDIT_BALANCE } from "@/lib/admin-emails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, tier, credits } = body;

    if (action === "upgrade") {
      if (!tier) {
        return NextResponse.json({ error: "Tier is required for upgrade" }, { status: 400 });
      }

      createAuditEntry(
        "default-org",
        "current-user",
        "billing.upgraded",
        "subscription",
        crypto.randomUUID(),
        { from: "free", to: tier },
      );

      return NextResponse.json({
        success: true,
        subscription: {
          id: crypto.randomUUID(),
          tier,
          status: "active",
          started_at: new Date().toISOString(),
        },
      });
    }

    if (action === "purchase_credits") {
      const amount = Number(credits) || 1000;

      return NextResponse.json({
        success: true,
        credits_added: amount,
        transaction_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      current_plan: {
        tier: "pro",
        credits_remaining: 4550,
        next_billing_date: new Date(Date.now() + 30 * 86400000).toISOString(),
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: `Billing action failed: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const email = request.headers.get("x-user-email") || "";
  const adminFree = isAdminEmail(email);

  return NextResponse.json({
    current_plan: {
      tier: adminFree ? "admin_free" : "pro",
      credits_remaining: adminFree ? ADMIN_CREDIT_BALANCE : 4550,
      executions_remaining: adminFree ? 999999 : 42750,
      next_billing_date: new Date(Date.now() + 30 * 86400000).toISOString(),
      is_admin: adminFree,
      all_plans_free: adminFree,
    },
    usage: {
      credits_used_this_month: 5450,
      executions_this_month: 7250,
    },
  });
}
