export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { autoDeployer } from "@/lib/auto-deployer";
import { z } from "zod";


export const runtime = "nodejs";

const deployRequestSchema = z.object({
  type: z.enum(["build", "deploy", "monitor"]),
  config: z.record(z.unknown()).optional(),
});

/**
 * POST /api/auto-deploy
 * Execute automated deployment with monitoring
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = deployRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { type } = parsed.data;

    if (type === "deploy") {
      const result = await autoDeployer.deployWithMonitoring(async () => {
        return {
          id: `deploy-${Date.now()}`,
          url: `https://generated-${Date.now()}.vercel.app`,
        };
      });

      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json(
      { error: "Invalid deployment type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Auto-deploy error:", error);
    return NextResponse.json(
      { error: "Deployment failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auto-deploy?deploymentId=xxx
 * Get deployment health or metrics
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const deploymentId = searchParams.get("deploymentId");

    if (deploymentId) {
      const health = await autoDeployer.checkHealth(deploymentId);
      return NextResponse.json({ success: true, data: health });
    }

    const metrics = autoDeployer.getMetrics();
    return NextResponse.json({ success: true, data: metrics });
  } catch (error) {
    console.error("Auto-deploy GET error:", error);
    return NextResponse.json(
      { error: "Failed to get deployment info" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/auto-deploy/heal
 * Trigger auto-healing for a deployment
 */
export async function PUT(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { deploymentId } = body;

    if (!deploymentId) {
      return NextResponse.json(
        { error: "deploymentId is required" },
        { status: 400 }
      );
    }

    const healAction = await autoDeployer.autoHeal(deploymentId);
    return NextResponse.json({ success: true, data: healAction });
  } catch (error) {
    console.error("Auto-heal error:", error);
    return NextResponse.json(
      { error: "Auto-heal failed" },
      { status: 500 }
    );
  }
}
