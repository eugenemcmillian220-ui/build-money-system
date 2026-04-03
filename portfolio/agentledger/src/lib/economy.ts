/**
 * AgentLedger – economy.ts
 * Agent Credit System for AI spend tracking across multiple providers.
 * Inspired by /workspace/build-money-system/src/lib/economy.ts
 */

import { createClient } from "./supabase";

// ─── Provider & Model Types ────────────────────────────────────────────────
export type Provider = "openai" | "anthropic" | "groq";

export type OpenAIModel =
  | "gpt-4o"
  | "gpt-4o-mini"
  | "gpt-4-turbo"
  | "o3-mini"
  | "o1";
export type AnthropicModel =
  | "claude-opus-4"
  | "claude-sonnet-4"
  | "claude-haiku-4";
export type GroqModel =
  | "llama-3.3-70b-versatile"
  | "llama-3.1-8b-instant"
  | "mixtral-8x7b-32768"
  | "gemma2-9b-it";
export type LLMModel = OpenAIModel | AnthropicModel | GroqModel;

export type AgentRole =
  | "Architect"
  | "Developer"
  | "QA"
  | "SecurityAuditor"
  | "DataAnalyst"
  | "ProductManager"
  | "SRE";

// Cost per 1M tokens (USD), input / output
const MODEL_PRICING: Record<LLMModel, { input: number; output: number }> = {
  "gpt-4o": { input: 2.5, output: 10.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4-turbo": { input: 10.0, output: 30.0 },
  "o3-mini": { input: 1.1, output: 4.4 },
  o1: { input: 15.0, output: 60.0 },
  "claude-opus-4": { input: 15.0, output: 75.0 },
  "claude-sonnet-4": { input: 3.0, output: 15.0 },
  "claude-haiku-4": { input: 0.8, output: 4.0 },
  "llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
  "llama-3.1-8b-instant": { input: 0.05, output: 0.08 },
  "mixtral-8x7b-32768": { input: 0.24, output: 0.24 },
  "gemma2-9b-it": { input: 0.2, output: 0.2 },
};

const AGENT_HIRE_COST: Record<AgentRole, number> = {
  Architect: 2.0,
  Developer: 1.5,
  QA: 1.0,
  SecurityAuditor: 2.5,
  DataAnalyst: 1.8,
  ProductManager: 2.0,
  SRE: 3.0,
};

// ─── Transaction & Ledger Types ────────────────────────────────────────────
export type TransactionType =
  | "api_call"
  | "hiring"
  | "resource_cost"
  | "top_up"
  | "budget_reserve"
  | "budget_release";

export interface AgentTransaction {
  orgId: string;
  agentId: string;
  agentRole: AgentRole | "System";
  provider: Provider;
  model: LLMModel;
  inputTokens: number;
  outputTokens: number;
  cost: number; // USD
  type: TransactionType;
  metadata?: Record<string, unknown>;
}

export interface BudgetPolicy {
  agentId: string;
  monthlyLimitUsd: number;
  dailyLimitUsd: number;
  alertThresholdPct: number; // e.g. 80 = alert at 80%
  hardStop: boolean; // reject calls when limit reached
}

export interface SpendSummary {
  agentId: string;
  provider: Provider;
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  callCount: number;
}

export interface AnomalyResult {
  agentId: string;
  provider: Provider;
  severity: "low" | "medium" | "high" | "critical";
  reason: string;
  detectedAt: string;
  costUsd: number;
}

// ─── Core Economy Class ────────────────────────────────────────────────────
export class AgentCreditSystem {
  /** Calculate exact USD cost from token counts */
  static computeCost(
    model: LLMModel,
    inputTokens: number,
    outputTokens: number
  ): number {
    const pricing = MODEL_PRICING[model];
    if (!pricing) throw new Error(`Unknown model: ${model}`);
    const cost =
      (inputTokens / 1_000_000) * pricing.input +
      (outputTokens / 1_000_000) * pricing.output;
    return Math.round(cost * 1_000_000) / 1_000_000; // micro-dollar precision
  }

  /** Record an API call transaction and deduct from agent credit */
  async recordApiCall(tx: AgentTransaction): Promise<{ ok: boolean; newBalance: number }> {
    const supabase = createClient();

    // 1. Check budget policy
    const { data: policy } = await supabase
      .from("budget_policies")
      .select("*")
      .eq("agent_id", tx.agentId)
      .single();

    if (policy?.hardStop) {
      const todaySpend = await this.getDailySpend(tx.agentId);
      if (todaySpend + tx.cost > policy.dailyLimitUsd) {
        return { ok: false, newBalance: await this.getAgentBalance(tx.agentId) };
      }
    }

    // 2. Insert transaction
    const { error } = await supabase.from("agent_transactions").insert({
      org_id: tx.orgId,
      agent_id: tx.agentId,
      agent_role: tx.agentRole,
      provider: tx.provider,
      model: tx.model,
      input_tokens: tx.inputTokens,
      output_tokens: tx.outputTokens,
      cost_usd: tx.cost,
      transaction_type: tx.type,
      metadata: tx.metadata ?? {},
    });

    if (error) throw new Error(`Transaction insert failed: ${error.message}`);

    // 3. Update agent credit balance (deduct cost)
    const newBalance = await this._adjustBalance(tx.agentId, -tx.cost);
    return { ok: true, newBalance };
  }

  /** Top up an agent's credit balance */
  async topUpBalance(agentId: string, amountUsd: number): Promise<number> {
    return this._adjustBalance(agentId, amountUsd);
  }

  /** Get current credit balance for an agent */
  async getAgentBalance(agentId: string): Promise<number> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("agents")
      .select("credit_balance")
      .eq("id", agentId)
      .single();
    if (error) throw new Error(`Balance fetch failed: ${error.message}`);
    return Number(data?.credit_balance ?? 0);
  }

  /** Get today's total spend for an agent */
  async getDailySpend(agentId: string): Promise<number> {
    const supabase = createClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("agent_transactions")
      .select("cost_usd")
      .eq("agent_id", agentId)
      .gte("created_at", `${today}T00:00:00Z`);
    if (error) return 0;
    return (data ?? []).reduce((s, r) => s + Number(r.cost_usd), 0);
  }

  /** Hire another agent role and deduct hiring fee */
  async hireAgent(
    orgId: string,
    from: AgentRole | "System",
    to: AgentRole,
    task: string,
    agentId: string
  ): Promise<boolean> {
    const cost = AGENT_HIRE_COST[to];
    const balance = await this.getAgentBalance(agentId);
    if (balance < cost) return false;

    await this.recordApiCall({
      orgId,
      agentId,
      agentRole: from,
      provider: "openai", // hiring is provider-agnostic; logged under default
      model: "gpt-4o-mini",
      inputTokens: 0,
      outputTokens: 0,
      cost,
      type: "hiring",
      metadata: { hiringTarget: to, task: task.slice(0, 120) },
    });
    return true;
  }

  /** Run anomaly detection over recent transactions */
  async detectAnomalies(orgId: string): Promise<AnomalyResult[]> {
    const supabase = createClient();
    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recentTxns } = await supabase
      .from("agent_transactions")
      .select("agent_id, provider, cost_usd, created_at")
      .eq("org_id", orgId)
      .gte("created_at", windowStart)
      .order("created_at", { ascending: false });

    if (!recentTxns || recentTxns.length === 0) return [];

    // Group by (agent, provider) and check thresholds
    const grouped: Record<string, { costs: number[]; provider: Provider }> = {};
    for (const tx of recentTxns) {
      const key = `${tx.agent_id}::${tx.provider}`;
      if (!grouped[key])
        grouped[key] = { costs: [], provider: tx.provider as Provider };
      grouped[key].costs.push(Number(tx.cost_usd));
    }

    const anomalies: AnomalyResult[] = [];
    for (const [key, { costs, provider }] of Object.entries(grouped)) {
      const [agentId] = key.split("::");
      const total = costs.reduce((a, b) => a + b, 0);
      const mean = total / costs.length;
      const stddev = Math.sqrt(
        costs.reduce((s, c) => s + Math.pow(c - mean, 2), 0) / costs.length
      );

      // Z-score on the most recent call
      const latest = costs[0];
      const zScore = stddev > 0 ? (latest - mean) / stddev : 0;

      let severity: AnomalyResult["severity"] | null = null;
      let reason = "";

      if (total > 50) {
        severity = "critical";
        reason = `24h spend $${total.toFixed(2)} exceeds $50 ceiling`;
      } else if (total > 20) {
        severity = "high";
        reason = `24h spend $${total.toFixed(2)} exceeds $20 threshold`;
      } else if (zScore > 3) {
        severity = "medium";
        reason = `Z-score ${zScore.toFixed(1)} — single call cost spike`;
      } else if (zScore > 2) {
        severity = "low";
        reason = `Z-score ${zScore.toFixed(1)} — unusual cost pattern`;
      }

      if (severity) {
        anomalies.push({
          agentId,
          provider,
          severity,
          reason,
          detectedAt: new Date().toISOString(),
          costUsd: total,
        });
      }
    }

    return anomalies;
  }

  // ── Private helpers ──────────────────────────────────────────────────────
  private async _adjustBalance(agentId: string, delta: number): Promise<number> {
    const supabase = createClient();
    const current = await this.getAgentBalance(agentId);
    const next = Math.max(0, current + delta);
    const { error } = await supabase
      .from("agents")
      .update({ credit_balance: next, updated_at: new Date().toISOString() })
      .eq("id", agentId);
    if (error) throw new Error(`Balance update failed: ${error.message}`);
    return next;
  }
}

// Singleton export (mirrors build-money-system pattern)
export const agentCreditSystem = new AgentCreditSystem();

// Named helpers for edge routes
export { MODEL_PRICING, AGENT_HIRE_COST };
