import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type ManifestStage =
  | "queued"
  | "intent"
  | "generate"
  | "polish"
  | "persist"
  | "complete"
  | "error";

export type ManifestStatus = "pending" | "running" | "complete" | "error";

export interface ManifestLog {
  ts: string;
  level: "info" | "warn" | "error";
  text: string;
}

export interface ManifestationRow {
  id: string;
  org_id: string | null;
  user_id: string | null;
  prompt: string;
  options: Record<string, unknown>;
  status: ManifestStatus;
  current_stage: ManifestStage;
  logs: ManifestLog[];
  state: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function createManifestation(input: {
  orgId: string | null;
  userId: string | null;
  prompt: string;
  options: Record<string, unknown>;
}): Promise<ManifestationRow> {
  const { data, error } = await supabaseAdmin
    .from("manifestations")
    .insert({
      org_id: input.orgId,
      user_id: input.userId,
      prompt: input.prompt,
      options: input.options,
      status: "pending",
      current_stage: "queued",
      logs: [
        {
          ts: new Date().toISOString(),
          level: "info",
          text: "Manifestation queued.",
        },
      ],
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create manifestation: ${error?.message}`);
  }
  return data as ManifestationRow;
}

export async function loadManifestation(id: string): Promise<ManifestationRow | null> {
  const { data, error } = await supabaseAdmin
    .from("manifestations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load manifestation: ${error.message}`);
  return (data as ManifestationRow | null) ?? null;
}

export async function appendLog(id: string, level: ManifestLog["level"], text: string): Promise<void> {
  const row = await loadManifestation(id);
  if (!row) return;
  const next = [
    ...row.logs,
    { ts: new Date().toISOString(), level, text },
  ];
  await supabaseAdmin
    .from("manifestations")
    .update({ logs: next, updated_at: new Date().toISOString() })
    .eq("id", id);
}

export async function setStage(
  id: string,
  stage: ManifestStage,
  patch: Partial<Pick<ManifestationRow, "status" | "state" | "result" | "error" | "project_id">> = {},
  logText?: string,
): Promise<void> {
  const row = await loadManifestation(id);
  if (!row) return;
  const logs = logText
    ? [...row.logs, { ts: new Date().toISOString(), level: "info" as const, text: logText }]
    : row.logs;
  await supabaseAdmin
    .from("manifestations")
    .update({
      current_stage: stage,
      logs,
      updated_at: new Date().toISOString(),
      ...patch,
    })
    .eq("id", id);
}

export async function failManifestation(id: string, message: string): Promise<void> {
  const row = await loadManifestation(id);
  const logs = [
    ...(row?.logs ?? []),
    { ts: new Date().toISOString(), level: "error" as const, text: message },
  ];

  // Atomically refund reserved credits. The RPC guards against double-refund:
  // it flips state.creditsRefunded in a single UPDATE (only matches rows where
  // creditsReserved=true AND creditsRefunded IS NOT true), so concurrent
  // invocations (e.g. serverless retries) can at most issue one refund.
  if (row?.org_id) {
    const state = (row.state ?? {}) as { creditsReserved?: boolean; dynamicCost?: number };
    if (state.creditsReserved && typeof state.dynamicCost === "number") {
      try {
        const { data: refunded, error: rpcError } = await supabaseAdmin.rpc(
          "refund_manifestation_credits",
          { p_manifestation_id: id },
        );
        if (rpcError) throw rpcError;
        if (refunded) {
          logs.push({
            ts: new Date().toISOString(),
            level: "info" as const,
            text: `Refunded ${state.dynamicCost} reserved credits after failure.`,
          });
        }
      } catch (err) {
        logs.push({
          ts: new Date().toISOString(),
          level: "warn" as const,
          text: `Credit refund failed: ${(err as Error).message}`,
        });
      }
    }
  }

  await supabaseAdmin
    .from("manifestations")
    .update({
      status: "error",
      current_stage: "error",
      error: message,
      logs,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}
