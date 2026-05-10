/**
 * Analytics Engine Module for Phase 6 - Autonomous AI Company Builder
 * Tracks metrics, generates reports, and provides business intelligence.
 * Persisted to Supabase (DA-037, DA-038 fixes).
 */

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export interface MetricData {
  name: string;
  value: number;
  unit?: string;
  category?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface Metric extends MetricData {
  id: string;
  ts: number;
  timestamp: string;
}

export interface MetricFilters {
  name?: string;
  category?: string;
  userId?: string;
  since?: number;
  until?: number;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface AnalyticsReport {
  generatedAt: string;
  dateRange: { from: string; to: string };
  totalMetrics: number;
  summary: MetricSummary[];
  topEvents: string[];
}

export interface MetricSummary {
  name: string;
  count: number;
  total: number;
  average: number;
  min: number;
  max: number;
}

function rowToMetric(row: Record<string, unknown>): Metric {
  return {
    id: row.id as string,
    name: row.name as string,
    value: row.value as number,
    unit: (row.unit as string) ?? undefined,
    category: (row.category as string) ?? undefined,
    userId: (row.user_id as string) ?? undefined,
    metadata: (row.metadata as Record<string, unknown>) ?? undefined,
    ts: row.ts as number,
    timestamp: row.created_at as string,
  };
}

export class AnalyticsEngine {
  async trackMetric(data: MetricData): Promise<Metric> {
    const supabase = getSupabaseAdmin();
    const ts = Date.now();

    const { data: row, error } = await supabase
      .from("analytics_metrics")
      .insert({
        name: data.name,
        value: data.value,
        unit: data.unit ?? null,
        category: data.category ?? null,
        user_id: data.userId ?? null,
        metadata: data.metadata ?? {},
        ts,
      })
      .select()
      .single();

    if (error || !row) {
      console.error("[analytics] trackMetric failed:", error?.message);
      // Return a metric object even on error so callers aren't disrupted
      return {
        ...data,
        id: crypto.randomUUID(),
        ts,
        timestamp: new Date().toISOString(),
      };
    }

    return rowToMetric(row);
  }

  async getMetrics(filters?: MetricFilters): Promise<Metric[]> {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("analytics_metrics").select("*");

    if (filters?.name) query = query.eq("name", filters.name);
    if (filters?.category) query = query.eq("category", filters.category);
    if (filters?.userId) query = query.eq("user_id", filters.userId);
    if (filters?.since !== undefined) query = query.gte("ts", filters.since);
    if (filters?.until !== undefined) query = query.lte("ts", filters.until);

    query = query.order("ts", { ascending: false }).limit(1000);

    const { data, error } = await query;
    if (error) {
      console.error("[analytics] getMetrics failed:", error.message);
      return [];
    }

    return (data ?? []).map(rowToMetric);
  }

  async generateReport(dateRange: DateRange): Promise<AnalyticsReport> {
    const from = dateRange.from.getTime();
    const to = dateRange.to.getTime();

    const rangeMetrics = await this.getMetrics({ since: from, until: to });

    const byName: Record<string, number[]> = {};
    for (const m of rangeMetrics) {
      if (!byName[m.name]) byName[m.name] = [];
      byName[m.name].push(m.value);
    }

    const summary: MetricSummary[] = Object.entries(byName).map(([name, values]) => ({
      name,
      count: values.length,
      total: values.reduce((a, b) => a + b, 0),
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    }));

    const topEvents = summary
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((s) => s.name);

    return {
      generatedAt: new Date().toISOString(),
      dateRange: {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      },
      totalMetrics: rangeMetrics.length,
      summary,
      topEvents,
    };
  }
}

export const analyticsEngine = new AnalyticsEngine();
