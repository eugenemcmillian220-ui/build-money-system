import { supabaseAdmin } from "./supabase/admin";

export interface PulseEvent {
  name: string;
  properties?: Record<string, unknown>;
  url?: string;
  sessionId?: string;
}

export interface ErrorCluster {
  id: string;
  errorMessage: string;
  errorType: string;
  severity: string;
  occurrenceCount: number;
  lastOccurrenceAt: string;
  impactScore: number;
}

export class SovereignPulse {
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  /**
   * Ingest a telemetry event
   */
  async track(event: PulseEvent): Promise<void> {
    try {
      await fetch("/api/pulse/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: this.projectId,
          ...event,
        }),
      });
    } catch (err) {
      console.error("[PULSE] Ingestion failed:", err);
    }
  }

  /**
   * Get error clusters for the project
   */
  async getErrorClusters(): Promise<ErrorCluster[]> {
    const { data, error } = await supabaseAdmin
      .from("error_clusters")
      .select("*")
      .eq("project_id", this.projectId)
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

  /**
   * Resolve an error cluster
   */
  async resolveCluster(clusterId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("error_clusters")
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", clusterId);

    if (error) throw new Error(`Failed to resolve cluster: ${error.message}`);
  }

  /**
   * Get project metrics (sessions, views, errors)
   */
  async getMetrics(days: number = 7) {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    
    const { data: logs, error } = await supabaseAdmin
      .from("event_logs")
      .select("event_name, timestamp")
      .eq("project_id", this.projectId)
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
      // If we had session_id in the logs
    });

    return metrics;
  }
}

// Default instance for the platform itself
export const platformPulse = new SovereignPulse("00000000-0000-0000-0000-000000000000");
