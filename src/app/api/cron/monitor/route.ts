import { NextResponse } from "next/server";
import { autoDeployer } from "@/lib/auto-deployer";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Cron: /api/cron/monitor — runs every 5 minutes via Vercel Cron
 * Checks health of all tracked deployments and triggers auto-heal if needed
 */
export async function GET(request: Request): Promise<Response> {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const metrics = autoDeployer.getMetrics();
  const healActions: unknown[] = [];

  for (const deployment of metrics.currentHealth) {
    try {
      const health = await autoDeployer.checkHealth(deployment.deploymentId);

      if (health.status === "unhealthy" || health.status === "degraded") {
        const healAction = await autoDeployer.autoHeal(deployment.deploymentId);
        healActions.push({ deploymentId: deployment.deploymentId, action: healAction });
      }
    } catch (e) {
      console.error(`Health check failed for ${deployment.deploymentId}:`, e);
    }
  }

  return NextResponse.json({
    checked: metrics.currentHealth.length,
    healActionsTriggered: healActions.length,
    healActions,
    timestamp: new Date().toISOString(),
  });
}
