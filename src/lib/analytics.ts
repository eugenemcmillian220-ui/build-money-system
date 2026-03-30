/**
 * Analytics Engine Module for Phase 6 - Autonomous AI Company Builder
 * Tracks metrics, generates reports, and provides business intelligence
 */

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

export class AnalyticsEngine {
  private metrics: Metric[] = [];

  trackMetric(data: MetricData): Metric {
    const metric: Metric = {
      ...data,
      id: Math.random().toString(36).substring(2, 11),
      ts: Date.now(),
      timestamp: new Date().toISOString(),
    };
    this.metrics.push(metric);
    return metric;
  }

  getMetrics(filters?: MetricFilters): Metric[] {
    let result = [...this.metrics];

    if (filters?.name) result = result.filter(m => m.name === filters.name);
    if (filters?.category) result = result.filter(m => m.category === filters.category);
    if (filters?.userId) result = result.filter(m => m.userId === filters.userId);
    if (filters?.since !== undefined) result = result.filter(m => m.ts >= filters.since!);
    if (filters?.until !== undefined) result = result.filter(m => m.ts <= filters.until!);

    return result;
  }

  generateReport(dateRange: DateRange): AnalyticsReport {
    const from = dateRange.from.getTime();
    const to = dateRange.to.getTime();
    const rangeMetrics = this.metrics.filter(m => m.ts >= from && m.ts <= to);

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
      .map(s => s.name);

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

  clearMetrics(): void {
    this.metrics = [];
  }
}

export const analyticsEngine = new AnalyticsEngine();
