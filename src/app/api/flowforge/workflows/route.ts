import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, nodes, trigger_type, mode, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Workflow name is required" }, { status: 400 });
    }

    const workflow = {
      id: uuidv4(),
      name,
      description: description || `${name} workflow`,
      nodes: nodes || [],
      trigger_type: trigger_type || "manual",
      mode: mode || "universal",
      status: "draft",
      version: 1,
      is_monetized: false,
      price_credits: 0,
      execution_count: 0,
      avg_execution_ms: 0,
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({ workflow, success: true });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to create workflow: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    workflows: [],
    total: 0,
    message: "FlowForge Workflows API — use POST to create workflows",
  });
}
