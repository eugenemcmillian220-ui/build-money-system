import { NextRequest, NextResponse } from "next/server";
import { runCeoAgent } from "@/lib/agents/ceo";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { traced } from "@/lib/telemetry";
import { Project } from "@/lib/types";
import { requireAuth, isAuthError } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");

  if (!orgId) {
    return NextResponse.json({ error: "orgId required" }, { status: 400 });
  }

  return traced("ceo.report", { "agent.role": "CEO" }, async () => {
    try {
      const { data: projects } = await supabaseAdmin
        .from("projects")
        .select("*")
        .eq("org_id", orgId);

      const result = await runCeoAgent(projects as Project[] || []);
      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}
