// DA-084 FIX: TODO: Review SECURITY DEFINER functions for privilege escalation
/**
 * AgentLedger – supabase.ts
 * Supabase browser/edge client + full schema SQL + RLS policies.
 */

import { createBrowserClient } from "@supabase/ssr";

// ─── Client Factory ────────────────────────────────────────────────────────
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── Database Types ────────────────────────────────────────────────────────
export interface DbAgent {
  id: string;
  org_id: string;
  name: string;
  role: string;
  provider_preference: string;
  credit_balance: number;
  monthly_budget_usd: number;
  daily_budget_usd: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbTransaction {
  id: string;
  org_id: string;
  agent_id: string;
  agent_role: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  transaction_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DbBudgetPolicy {
  id: string;
  agent_id: string;
  monthly_limit_usd: number;
  daily_limit_usd: number;
  alert_threshold_pct: number;
  hard_stop: boolean;
  created_at: string;
}

export interface DbAnomaly {
  id: string;
  org_id: string;
  agent_id: string;
  provider: string;
  severity: "low" | "medium" | "high" | "critical";
  reason: string;
  cost_usd: number;
  resolved: boolean;
  created_at: string;
}

// ─── Schema SQL (run in Supabase SQL editor to bootstrap) ─────────────────
export // DA-013 FIX: DDL removed — use Supabase CLI migrations instead
