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

  if (error) throw new Error(`Failed to fetch error clusters: ${error.message}`);

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

export async function getPulseMetrics(projectId: string, days: number = 7) {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data: logs, error } = await supabaseAdmin
    .from("event_logs")
    .select("event_name, timestamp")
    .eq("project_id", projectId)
    .gte("timestamp", since);

  if (error) throw new Error(`Failed to fetch metrics: ${error.message}`);

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
