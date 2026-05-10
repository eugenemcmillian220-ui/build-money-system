export const dynamic = "force-dynamic";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { agentEconomy } from "@/lib/economy";
import { ADMIN_FREE_TIER } from "@/lib/admin-emails";

export const runtime = "nodejs";

const transactionSchema = z.object({
  action: z.enum(["buy", "sell", "list"]),
  agentId: z.string().uuid(),
  price: z.number().min(0).optional(),
  orgId: z.string().uuid(),
});

/**
 * GET /api/economy
 * Get multi-agent economy data (agent marketplace, transactions)
 */
export async function GET(request: NextRequest): Promise<Response> {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");

  try {
    const supabase = getSupabaseAdmin();

    const ledgerQuery = supabase
      .from("agent_ledger")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (orgId) ledgerQuery.eq("org_id", orgId);

    const [ledgerResult, skillsResult] = await Promise.all([
      ledgerQuery,
      supabase.from("agent_skills").select("*").eq("status", "active").limit(50),
    ]);

    const recentActivity = ledgerResult.data ?? [];
    const agentListings = skillsResult.data ?? [];

    return NextResponse.json({
      success: true,
      data: {
        totalTransactions: recentActivity.length,
        agentListings,
        recentActivity,
        economyStats: {
          totalValue: recentActivity.reduce((sum, t) => sum + Number(t.amount ?? 0), 0),
          activeAgents: agentListings.length,
          transactionsToday: recentActivity.filter(
            (t) => new Date(t.created_at).toDateString() === new Date().toDateString()
          ).length,
        },
      },
    });
  } catch (error) {
    console.error("Failed to get economy data:", error);
    return NextResponse.json(
      { error: "Failed to get economy data" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/economy
 * Execute economy transaction (buy/sell agent, list agent)
 */
export async function POST(request: NextRequest): Promise<Response> {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    const body = await request.json();
    const parsed = transactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { action, agentId, price, orgId } = parsed.data;
    const supabase = getSupabaseAdmin();

    const { data: orgData } = await supabase
      .from("organizations")
      .select("billing_tier")
      .eq("id", orgId)
      .single();
    const isAdmin = orgData?.billing_tier === ADMIN_FREE_TIER;

    switch (action) {
      case "list": {
        if (price === undefined) {
          return NextResponse.json(
            { error: "price is required for listing" },
            { status: 400 }
          );
        }

        const { data: listing, error: listError } = await supabase
          .from("agent_skills")
          .update({ price, status: "active", updated_at: new Date().toISOString() })
          .eq("id", agentId)
          .select()
          .single();

        if (listError) {
          console.error("[Economy] List agent error:", listError);
          return NextResponse.json(
            { error: `Failed to list agent: ${listError.message}` },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `Agent ${agentId} listed for ${price} credits`,
          listing,
        });
      }

      case "buy": {
        const { data: skill, error: skillError } = await supabase
          .from("agent_skills")
          .select("*")
          .eq("id", agentId)
          .single();

        if (skillError || !skill) {
          return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        if (!isAdmin) {
          const { data: reserved, error: reserveError } = await supabase.rpc("reserve_credits", {
            org_id: orgId,
            amount: skill.price,
          });

          if (reserveError || !reserved) {
            return NextResponse.json(
              { error: `Insufficient credits. This agent costs ${skill.price} credits.` },
              { status: 402 }
            );
          }
        }

        if (!isAdmin) {
          await agentEconomy.recordTransaction({
            orgId,
            fromAgent: "System",
            amount: skill.price,
            type: "hiring",
            description: `Purchased agent: ${skill.name}`,
          });
        }

        return NextResponse.json({
          success: true,
          message: `Successfully purchased agent ${skill.name}`,
          transaction: { agentId, action: "buy", price: skill.price, timestamp: new Date().toISOString() },
        });
      }

      case "sell": {
        if (price === undefined) {
          return NextResponse.json(
            { error: "price is required for selling" },
            { status: 400 }
          );
        }

        if (!isAdmin) {
          await agentEconomy.grantCredits(orgId, price, "top_up");
        }

        return NextResponse.json({
          success: true,
          message: `Agent ${agentId} sold for ${price} credits`,
          transaction: { agentId, price, action: "sell", timestamp: new Date().toISOString() },
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use buy, sell, or list" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Economy transaction error:", error);
    return NextResponse.json(
      { error: "Economy transaction failed" },
      { status: 500 }
    );
  }
}
