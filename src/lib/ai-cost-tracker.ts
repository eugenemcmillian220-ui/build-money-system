// src/lib/ai-cost-tracker.ts
// Per-feature AI cost tracking

import 'server-only';
import { createClient as createSvcClient } from '@supabase/supabase-js';

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4o':            { input: 5.00,  output: 15.00 },
  'gpt-4o-mini':       { input: 0.15,  output: 0.60  },
  'claude-3-5-sonnet': { input: 3.00,  output: 15.00 },
  'claude-3-haiku':    { input: 0.25,  output: 1.25  },
  'default':           { input: 1.00,  output: 2.00  },
};

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const rates = MODEL_COSTS[model] ?? MODEL_COSTS['default']!;
  return (inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output;
}

interface TrackParams {
  userId?: string;
  jobId?: string;
  model: string;
  featureName: string;
  inputTokens: number;
  outputTokens: number;
}

function getSupabase() {
  return createSvcClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export function trackAiUsage(params: TrackParams): void {
  const costUsd = estimateCost(params.model, params.inputTokens, params.outputTokens);
  const supabase = getSupabase();
  Promise.resolve(supabase.from('ai_usage_log').insert({
    user_id: params.userId ?? null,
    job_id: params.jobId ?? null,
    model: params.model,
    feature_name: params.featureName,
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
    cost_usd: costUsd,
  })).then(() => {}).catch(console.error);
}

export async function getAiCostSummary(
  userId: string,
  days = 30,
): Promise<{ feature: string; totalCostUsd: number; callCount: number }[]> {
  const supabase = getSupabase();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data } = await supabase
    .from('ai_usage_log')
    .select('feature_name, cost_usd')
    .eq('user_id', userId)
    .gte('created_at', since);

  if (!data) return [];

  const summary = data.reduce<Record<string, { totalCostUsd: number; callCount: number }>>(
    (acc, row) => {
      const key = row.feature_name as string;
      if (!acc[key]) acc[key] = { totalCostUsd: 0, callCount: 0 };
      acc[key]!.totalCostUsd += Number(row.cost_usd);
      acc[key]!.callCount += 1;
      return acc;
    },
    {},
  );

  return Object.entries(summary).map(([feature, stats]) => ({ feature, ...stats }));
}
