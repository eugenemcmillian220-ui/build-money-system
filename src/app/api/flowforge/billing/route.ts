import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createAuditEntry } from "@/lib/flowforge/audit";

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
        uuidv4(),
        { from: "free", to: tier },
      );

      return NextResponse.json({
        success: true,
        subscription: {
          id: uuidv4(),
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
        transaction_id: uuidv4(),
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
  } catch (err) {
    return NextResponse.json(
      { error: `Billing action failed: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    current_plan: {
      tier: "pro",
      credits_remaining: 4550,
      executions_remaining: 42750,
      next_billing_date: new Date(Date.now() + 30 * 86400000).toISOString(),
    },
    usage: {
      credits_used_this_month: 5450,
      executions_this_month: 7250,
    },
  });
}
