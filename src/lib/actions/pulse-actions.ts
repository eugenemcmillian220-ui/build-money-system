"use server";

import { supabaseAdmin } from "../supabase/admin";
import type { ErrorCluster } from "./pulse-actions.types";

export async function getErrorClusters(projectId: string): Promise<ErrorCluster[]> {
  const { data, error } = await supabaseAdmin
    .from("error_clusters")
    .select("*")
    .eq("project_id", projectId)
    .eq("is_resolved", false)
    .order("occurrence_count", { ascending: false });

  if (error) {
    console.warn(`[Pulse] Error clusters unavailable: ${error.message}`);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    errorMessage: row.error_message,
    errorType: row.error_type,
    severity: row.severity,
    occurrenceCount: row.occurrence_count,
    lastOccurrenceAt: row.last_occurrence_at,
    impactScore: row.impact_score,
  }));
}

export async function resolveCluster(clusterId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("error_clusters")
    .update({ is_resolved: true, resolved_at: new Date().toISOString() })
    .eq("id", clusterId);

  if (error) throw new Error(`Failed to resolve cluster: ${error.message}`);
}

export interface JobDiagnostic {
  id: string;
  mode: string;
  blueprint: string;
  phaseReached: string;
  durationMs: number | null;
  outcome: "success" | "fallback" | "timeout" | "failed" | "running";
  createdAt: string;
}

export async function getJobDiagnostics(limit = 20): Promise<JobDiagnostic[]> {
  const { data, error } = await supabaseAdmin
    .from("manifestations")
    .select("id, status, current_stage, options, state, created_at, updated_at, error")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn(`[Pulse] Job diagnostics unavailable: ${error.message}`);
    return [];
  }

  return (data || []).map((row) => {
    const options = (row.options || {}) as Record<string, unknown>;
    const state = (row.state || {}) as Record<string, unknown>;
    const mode = (state.mode as string) || (options.mode as string) || "unknown";
    const blueprint = (options.blueprint as string) || (state.projectName as string) || "Custom";
    const created = new Date(row.created_at).getTime();
    const updated = new Date(row.updated_at).getTime();
    const durationMs = row.status === "complete" || row.status === "error" ? updated - created : null;

    let outcome: JobDiagnostic["outcome"] = "running";
    if (row.status === "complete") {
      outcome = state.usedFallback ? "fallback" : "success";
    } else if (row.status === "error") {
      const errMsg = (row.error || "") as string;
      outcome = errMsg.includes("timed out") ? "timeout" : "failed";
    }

    return {
      id: row.id,
      mode,
      blueprint,
      phaseReached: row.current_stage,
      durationMs,
      outcome,
      createdAt: row.created_at,
    };
  });
}

export async function getPulseMetrics(projectId: string, days: number = 7) {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data: logs, error } = await supabaseAdmin
    .from("event_logs")
    .select("event_name, timestamp")
    .eq("project_id", projectId)
    .gte("timestamp", since);

  if (error) {
    console.warn(`[Pulse] Metrics unavailable: ${error.message}`);
    return { views: 0, errors: 0, sessions: new Set(), latency: 0 };
  }

  const metrics = {
    views: 0,
    errors: 0,
    sessions: new Set(),
    latency: 142, // Mock latency for now
  };

  logs?.forEach(log => {
    if (log.event_name === "page_view") metrics.views++;
    if (log.event_name === "error") metrics.errors++;
  });

  return metrics;
}
