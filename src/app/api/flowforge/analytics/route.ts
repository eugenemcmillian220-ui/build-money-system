import { NextResponse } from "next/server";
import type { FlowForgeAnalytics } from "@/lib/flowforge/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const analytics: FlowForgeAnalytics = {
    total_workflows: 5,
    active_workflows: 3,
    total_executions: 1247,
    success_rate: 0.968,
    avg_execution_time_ms: 2340,
    credits_consumed: 8450,
    revenue_generated: 3200,
    top_workflows: [
      { id: "wf-1", name: "AI Lead Scoring Pipeline", executions: 456 },
      { id: "wf-2", name: "Content Generation & Distribution", executions: 312 },
      { id: "wf-3", name: "AI Customer Support Bot", executions: 189 },
      { id: "wf-4", name: "Data ETL Pipeline", executions: 167 },
      { id: "wf-5", name: "Instant Alert Trigger", executions: 123 },
    ],
  };

  const workflows = [
    { id: "wf-1", name: "AI Lead Scoring Pipeline", status: "active", mode: "elite", execution_count: 456, updated_at: new Date().toISOString() },
    { id: "wf-2", name: "Content Generation & Distribution", status: "active", mode: "universal", execution_count: 312, updated_at: new Date(Date.now() - 86400000).toISOString() },
    { id: "wf-3", name: "AI Customer Support Bot", status: "active", mode: "universal", execution_count: 189, updated_at: new Date(Date.now() - 2 * 86400000).toISOString() },
    { id: "wf-4", name: "Data ETL Pipeline", status: "paused", mode: "elite", execution_count: 167, updated_at: new Date(Date.now() - 3 * 86400000).toISOString() },
    { id: "wf-5", name: "Instant Alert Trigger", status: "active", mode: "nano", execution_count: 123, updated_at: new Date(Date.now() - 5 * 86400000).toISOString() },
  ];

  return NextResponse.json({ analytics, workflows });
}
