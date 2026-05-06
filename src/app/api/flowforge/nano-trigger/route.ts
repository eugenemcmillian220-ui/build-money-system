import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createAuditEntry } from "@/lib/flowforge/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { triggerId, workflowId } = body;

    if (!triggerId || !workflowId) {
      return NextResponse.json(
        { error: "triggerId and workflowId are required" },
        { status: 400 },
      );
    }

    const executionId = uuidv4();

    createAuditEntry(
      "default-org",
      "nano-user",
      "workflow.executed",
      "nano-trigger",
      triggerId,
      { workflowId, executionId, source: "nano-tap" },
    );

    return NextResponse.json({
      success: true,
      execution_id: executionId,
      trigger_id: triggerId,
      workflow_id: workflowId,
      status: "completed",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Nano trigger failed: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
