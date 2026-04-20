// DA-028 TODO: Refactor action-switch pattern into dedicated sub-routes (e.g., /api/federation/register/route.ts)
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { swarmMesh, type TradeStatus, type TradeType, type IntelType } from "@/lib/swarm-mesh";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { z } from "zod";

const registerSchema = z.object({
  empireName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  empireUrl: z.string().url().optional(),
  capabilities: z.array(z.string()).max(20).optional(),
  agentsAvailable: z.array(z.string()).max(50).optional(),
});

const tradeSchema = z.object({
  sellerEmpireId: z.string().uuid(),
  buyerEmpireId: z.string().uuid(),
  tradeType: z.enum(["agent_lending", "knowledge", "compute", "template"]),
  resourceName: z.string().min(1).max(200),
  resourceDescription: z.string().max(1000).optional(),
  priceAgt: z.number().min(0).max(10000).optional(),
  priceUgt: z.number().min(0).max(10000).optional(),
  durationHours: z.number().min(1).max(8760).optional(),
});

const intelSchema = z.object({
  sourceEmpireId: z.string().uuid(),
  intelType: z.enum(["trend", "security", "performance", "market", "threat"]),
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(2000),
  data: z.record(z.unknown()).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

/**
 * GET /api/federation — Query federation data
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "empires";

  try {
    switch (action) {
      case "empires": {
        const capability = searchParams.get("capability") || undefined;
        const minTrust = searchParams.get("minTrust")
          ? parseInt(searchParams.get("minTrust")!)
          : undefined;
        const limit = parseInt(searchParams.get("limit") || "50");
        const empires = await swarmMesh.getEmpires({ capability, minTrust, limit });
        return NextResponse.json({ empires });
      }

      case "empire": {
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "Missing empire id" }, { status: 400 });
        const empire = await swarmMesh.getEmpire(id);
        const connections = await swarmMesh.getConnections(id);
        return NextResponse.json({ empire, connections });
      }

      case "my_empire": {
        // Get the user's org empire
        const orgId = searchParams.get("orgId");
        if (!orgId) return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
        const empire = await swarmMesh.getEmpireByOrg(orgId);
        return NextResponse.json({ empire });
      }

      case "connections": {
        const empireId = searchParams.get("empireId");
        if (!empireId) return NextResponse.json({ error: "Missing empireId" }, { status: 400 });
        const connections = await swarmMesh.getConnections(empireId);
        return NextResponse.json({ connections });
      }

      case "trades": {
        const empireId = searchParams.get("empireId") || undefined;
        const status = (searchParams.get("status") || undefined) as TradeStatus | undefined;
        const tradeType = (searchParams.get("tradeType") || undefined) as TradeType | undefined;
        const limit = parseInt(searchParams.get("limit") || "50");
        const trades = await swarmMesh.getTrades({ empireId, status, tradeType, limit });
        return NextResponse.json({ trades });
      }

      case "intelligence": {
        const intelType = (searchParams.get("intelType") || undefined) as IntelType | undefined;
        const minConfidence = searchParams.get("minConfidence")
          ? parseFloat(searchParams.get("minConfidence")!)
          : undefined;
        const limit = parseInt(searchParams.get("limit") || "50");
        const feed = await swarmMesh.getIntelligenceFeed({ intelType, minConfidence, limit });
        return NextResponse.json({ intelligence: feed });
      }

      case "stats": {
        const stats = await swarmMesh.getStats();
        return NextResponse.json({ stats });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error("[Federation API] GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Federation query failed" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/federation — Mutation operations
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    const body = await request.json();
    const action = body.action || "register";

    switch (action) {
      case "register": {
        const parsed = registerSchema.parse(body);
        const orgId = authResult.user.id /* DA-027 FIX: Always use authenticated user's org, never from body */;
        const empire = await swarmMesh.registerEmpire({ ...parsed, orgId });
        return NextResponse.json({ empire }, { status: 201 });
      }

      case "connect": {
        const connectSchema = z.object({
          sourceEmpireId: z.string().uuid(),
          targetEmpireId: z.string().uuid(),
        });
        const parsed = connectSchema.parse(body);
        const connection = await swarmMesh.requestConnection({
          ...parsed,
          initiatedBy: authResult.user.id,
        });
        return NextResponse.json({ connection }, { status: 201 });
      }

      case "accept_connection": {
        const parsed = z.object({ connectionId: z.string().uuid() }).parse(body);
        const connection = await swarmMesh.acceptConnection(parsed.connectionId);
        return NextResponse.json({ connection });
      }

      case "propose_trade": {
        const parsed = tradeSchema.parse(body);
        const trade = await swarmMesh.proposeTrade(parsed);
        return NextResponse.json({ trade }, { status: 201 });
      }

      case "accept_trade": {
        const parsed = z.object({ tradeId: z.string().uuid() }).parse(body);
        const trade = await swarmMesh.acceptTrade(parsed.tradeId);
        return NextResponse.json({ trade });
      }

      case "complete_trade": {
        const parsed = z.object({
          tradeId: z.string().uuid(),
          rating: z.number().min(1).max(5),
          review: z.string().max(500).optional(),
        }).parse(body);
        const trade = await swarmMesh.completeTrade(parsed);
        return NextResponse.json({ trade });
      }

      case "share_intelligence": {
        const parsed = intelSchema.parse(body);
        const intel = await swarmMesh.shareIntelligence(parsed);
        return NextResponse.json({ intelligence: intel }, { status: 201 });
      }

      case "heartbeat": {
        const parsed = z.object({ empireId: z.string().uuid() }).parse(body);
        await swarmMesh.heartbeat(parsed.empireId);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error("[Federation API] POST error:", error);
    const message = error instanceof Error ? error.message : "Federation operation failed";
    const status = message.includes("Cannot connect to self") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
