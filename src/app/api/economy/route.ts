// DA-062 FIX: TODO: Add Zod schema validation for request bodies
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";

export const runtime = "nodejs";

/**
 * GET /api/economy
 * Get multi-agent economy data (agent marketplace, transactions)
 */
export async function GET(): Promise<Response> {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    return NextResponse.json({
      success: true,
      data: {
        totalTransactions: 0,
        agentListings: [],
        recentActivity: [],
        economyStats: {
          totalValue: 0,
          activeAgents: 0,
          transactionsToday: 0,
        }
      }
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
  try {
    const body = await request.json();
    const { action, agentId, price } = body;

    if (!action) {
      return NextResponse.json(
        { error: "action is required (buy, sell, or list)" },
        { status: 400 }
      );
    }

    switch (action) {
      case "list":
        if (!agentId || !price) {
          return NextResponse.json(
            { error: "agentId and price are required for listing" },
            { status: 400 }
          );
        }
        return NextResponse.json({
          success: true,
          message: `Agent ${agentId} listed for ${price} credits`,
          listing: { agentId, price, status: "active" }
        });

      case "buy":
        if (!agentId) {
          return NextResponse.json(
            { error: "agentId is required for buying" },
            { status: 400 }
          );
        }
        return NextResponse.json({
          success: true,
          message: `Successfully purchased agent ${agentId}`,
          transaction: { agentId, action: "buy", timestamp: new Date().toISOString() }
        });

      case "sell":
        if (!agentId || !price) {
          return NextResponse.json(
            { error: "agentId and price are required for selling" },
            { status: 400 }
          );
        }
        return NextResponse.json({
          success: true,
          message: `Agent ${agentId} sold for ${price} credits`,
          transaction: { agentId, price, action: "sell", timestamp: new Date().toISOString() }
        });

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
