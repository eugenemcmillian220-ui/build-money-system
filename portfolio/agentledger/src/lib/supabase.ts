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
export const SCHEMA_SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Organizations ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  owner_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Agents ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                 UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                   TEXT NOT NULL,
  role                   TEXT NOT NULL DEFAULT 'Developer',
  provider_preference    TEXT NOT NULL DEFAULT 'openai',
  credit_balance         NUMERIC(18,6) NOT NULL DEFAULT 10.0,
  monthly_budget_usd     NUMERIC(12,2) NOT NULL DEFAULT 50.0,
  daily_budget_usd       NUMERIC(12,2) NOT NULL DEFAULT 5.0,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Agent Transactions ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_transactions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id         UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  agent_role       TEXT NOT NULL DEFAULT 'Developer',
  provider         TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'groq')),
  model            TEXT NOT NULL,
  input_tokens     BIGINT NOT NULL DEFAULT 0,
  output_tokens    BIGINT NOT NULL DEFAULT 0,
  cost_usd         NUMERIC(18,8) NOT NULL DEFAULT 0,
  transaction_type TEXT NOT NULL DEFAULT 'api_call',
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_txn_org_id        ON agent_transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_txn_agent_id      ON agent_transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_txn_provider      ON agent_transactions(provider);
CREATE INDEX IF NOT EXISTS idx_txn_created_at    ON agent_transactions(created_at DESC);

-- ─── Budget Policies ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budget_policies (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id             UUID NOT NULL UNIQUE REFERENCES agents(id) ON DELETE CASCADE,
  monthly_limit_usd    NUMERIC(12,2) NOT NULL DEFAULT 50.0,
  daily_limit_usd      NUMERIC(12,2) NOT NULL DEFAULT 5.0,
  alert_threshold_pct  INTEGER NOT NULL DEFAULT 80,
  hard_stop            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Anomalies ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS anomalies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id    UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  provider    TEXT NOT NULL,
  severity    TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  reason      TEXT NOT NULL,
  cost_usd    NUMERIC(18,8) NOT NULL DEFAULT 0,
  resolved    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Row Level Security ──────────────────────────────────────────────────
ALTER TABLE organizations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents               ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_policies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies            ENABLE ROW LEVEL SECURITY;

-- Organizations: owners can read/write their own org
CREATE POLICY "org_owner_all" ON organizations
  FOR ALL USING (owner_id = auth.uid());

-- Agents: members of the org can read/write
CREATE POLICY "agents_org_member" ON agents
  FOR ALL USING (
    org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
  );

-- Transactions: org-scoped read/write
CREATE POLICY "txn_org_member" ON agent_transactions
  FOR ALL USING (
    org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
  );

-- Budget policies: follow agent ownership
CREATE POLICY "budget_follow_agent" ON budget_policies
  FOR ALL USING (
    agent_id IN (SELECT id FROM agents WHERE org_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    ))
  );

-- Anomalies: org-scoped read
CREATE POLICY "anomaly_org_member" ON anomalies
  FOR ALL USING (
    org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
  );

-- ─── Helper RPC: increment_org_balance ──────────────────────────────────
CREATE OR REPLACE FUNCTION increment_agent_balance(agent_id UUID, delta NUMERIC)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_balance NUMERIC;
BEGIN
  UPDATE agents SET credit_balance = GREATEST(0, credit_balance + delta),
                    updated_at = NOW()
  WHERE id = agent_id
  RETURNING credit_balance INTO new_balance;
  RETURN new_balance;
END;
$$;
`;
