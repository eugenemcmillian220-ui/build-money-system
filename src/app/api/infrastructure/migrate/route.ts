export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth, isAuthError } from "@/lib/api-auth";

const migrationSchema = z.object({
  projectId: z.string().optional(),
  target: z.enum(["vercel", "supabase", "stripe", "all"]).default("all"),
  orgId: z.string().uuid().optional(),
});

/**
 * Phase 25 — Neural Link: Consolidate simulated infra into live provisioned
 * services. This endpoint returns a deterministic migration plan describing
 * what would move where, and records the migration intent for the org.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = migrationSchema.parse(body);

    const plan = [
      { service: "vercel", status: "ready", step: "Provision production deploy + edge regions" },
      { service: "supabase", status: "ready", step: "Apply RLS policies + run pending migrations" },
      { service: "stripe", status: "ready", step: "Activate live keys + webhook replay" },
      { service: "cdn", status: "ready", step: "Enable edge cache + asset cold-warm" },
      { service: "observability", status: "ready", step: "Turn on Sovereign Pulse ingest" },
    ].filter((s) => parsed.target === "all" || s.service === parsed.target);

    if (supabaseAdmin && parsed.orgId) {
      try {
        await supabaseAdmin.from("migration_intents").insert({
          org_id: parsed.orgId,
          project_id: parsed.projectId ?? null,
          target: parsed.target,
          plan,
          created_by: auth.user.id,
        });
      } catch (e) {
        // migration_intents table may not exist in every environment — this
        // is an audit nicety, not required for the response.
        console.warn("Skipping migration_intents audit:", (e as Error).message);
      }
    }

    return NextResponse.json({
      success: true,
      migration: {
        target: parsed.target,
        projectId: parsed.projectId ?? null,
        plan,
        etaMinutes: 5 * plan.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", issues: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
