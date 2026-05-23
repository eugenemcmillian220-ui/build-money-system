import { NextRequest, NextResponse } from "next/server";
import { createExecution, executeNode, calculateCreditsUsed } from "@/lib/flowforge/engine";
import type { Workflow, WorkflowNode, NodeExecutionResult } from "@/lib/flowforge/types";
import { createAuditEntry } from "@/lib/flowforge/audit";
import { normalizeFlowForgeMode, resolveFlowForgeTriggerType } from "@/lib/flowforge/mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { workflow, input, workflow_id } = body as {
      workflow?: Partial<Workflow>;
      input?: Record<string, unknown>;
      workflow_id?: string;
    };

    if (!workflow && !workflow_id) {
      return NextResponse.json(
        { error: "Either workflow or workflow_id is required" },
        { status: 400 },
      );
    }

    const normalizedMode = normalizeFlowForgeMode(workflow?.mode);

    const wf: Workflow = {
      id: workflow_id || workflow?.id || crypto.randomUUID(),
      org_id: (workflow?.org_id as string) || "default-org",
      name: workflow?.name || "Unnamed Workflow",
      description: workflow?.description || "",
      status: "active",
      nodes: (workflow?.nodes as WorkflowNode[]) || [],
      trigger_type: resolveFlowForgeTriggerType(normalizedMode, workflow?.trigger_type),
      trigger_config: workflow?.trigger_config || {},
      mode: normalizedMode,
      version: workflow?.version || 1,
      is_monetized: workflow?.is_monetized || false,
      price_credits: workflow?.price_credits || 0,
      execution_count: (workflow?.execution_count || 0) + 1,
      avg_execution_ms: workflow?.avg_execution_ms || 0,
      created_by: "system",
      created_at: workflow?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: workflow?.tags || [],
    };

    const execution = createExecution(wf, input || {});
    execution.status = "running";

    const nodeResults: NodeExecutionResult[] = [];
    let currentInput: unknown = input || {};

    for (const node of wf.nodes) {
      const result = await executeNode(node, currentInput);
      nodeResults.push(result);

      if (result.status === "failed") {
        execution.status = "failed";
        execution.error = result.error;
        break;
      }

      currentInput = result.output;
    }

    if (execution.status !== "failed") {
      execution.status = "completed";
    }

    execution.node_results = nodeResults;
    execution.completed_at = new Date().toISOString();
    execution.duration_ms = Date.now() - startTime;
    execution.output = nodeResults.length > 0
      ? (nodeResults[nodeResults.length - 1].output as Record<string, unknown>)
      : {};
    execution.credits_used = calculateCreditsUsed(execution, wf);

    createAuditEntry(
      wf.org_id,
      "system",
      "workflow.executed",
      "workflow",
      wf.id,
      {
        status: execution.status,
        duration_ms: execution.duration_ms,
        credits_used: execution.credits_used,
        nodes_executed: nodeResults.length,
      },
    );

    return NextResponse.json({
      execution: {
        id: execution.id,
        status: execution.status,
        duration_ms: execution.duration_ms,
        credits_used: execution.credits_used,
        output: execution.output,
        error: execution.error,
        node_results: nodeResults.map((nr) => ({
          node_id: nr.node_id,
          status: nr.status,
          error: nr.error,
        })),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Execution failed: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
