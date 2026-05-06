import "server-only"; // SECURITY FIX: Prevent client-side bundling
import { supabaseAdmin } from "./supabase/db";

export type AgentRole = "Architect" | "Developer" | "QA" | "SecurityAuditor" | "ProductManager" | "SRE";

export interface Transaction {
  orgId: string;
  projectId?: string;
  fromAgent: AgentRole | "System";
  toAgent?: AgentRole;
  amount: number;
  type: "hiring" | "resource_cost" | "top_up" | "subscription_grant" | "subscription_renewal" | "lifetime_grant";
  description: string;
}

/**
 * Per-model cost rates (credits per token).
 * 
 * Pricing tiers:
 * - free:   0 credits (free-tier models on OpenRouter, Cloudflare)
 * - micro:  0.000005 credits/token (~$0.01/1M tokens equivalent)
 * - small:  0.00001  credits/token (~$0.02/1M tokens)
 * - medium: 0.00005  credits/token (~$0.10/1M tokens)
 * - large:  0.0001   credits/token (~$0.20/1M tokens)
 * - xl:     0.0003   credits/token (~$0.60/1M tokens)
 *
 * Update this table when adding new models to llm-router.ts FREE_MODELS.
 */
const MODEL_COST_TABLE: Record<string, number> = {
  // === OpenCode Zen Free-Tier ===
  "deepseek-v4-flash": 0,
  "glm-5": 0,
  "mimo-v2.5": 0,
  "qwen3.5-plus": 0,
  "kimi-k2.5": 0,
  "minimax-m2.5": 0,
  // === OpenCode Zen Paid-Tier (Go/Pro plans) ===
  "kimi-k2.6": 0.00003,
  "glm-5.1": 0.00003,
  "mimo-v2-pro": 0.00004,
  "mimo-v2-omni": 0.00004,
  "mimo-v2.5-pro": 0.00005,
  "minimax-m2.7": 0.00004,
  "qwen3.6-plus": 0.00004,
  "deepseek-v4-pro": 0.00005,
};

/** Default rate when a model isn't in the table */
const DEFAULT_COST_RATE = 0.00005; // medium tier

/**
 * Look up cost rate for a model. Tries exact match first,
 * then partial match (for versioned model identifiers).
 */
function getModelCostRate(model: string): number {
  // Exact match
  if (model in MODEL_COST_TABLE) return MODEL_COST_TABLE[model];

  // Partial match: check if any key is a prefix of the model string
  for (const [key, rate] of Object.entries(MODEL_COST_TABLE)) {
    if (model.startsWith(key) || model.includes(key)) return rate;
  }

  console.warn(`[Economy] Unknown model "${model}" — using default rate ${DEFAULT_COST_RATE}`);
  return DEFAULT_COST_RATE;
}

/**
 * Agent Economy Manager: Handles credits, hiring, and resource accounting
 */
export class AgentEconomy {
  /**
   * Get the current credit balance for an organization
   */
  async getBalance(orgId: string): Promise<number> {
    if (!supabaseAdmin) throw new Error("Supabase admin not configured");
    const { data, error } = await supabaseAdmin
      .from("organizations")
      .select("credit_balance")
      .eq("id", orgId)
      .single();

    if (error) throw new Error(`Failed to fetch balance: ${error.message}`);
    return Number(data.credit_balance);
  }

  /**
   * Record a transaction in the ledger and update organization balance atomically.
   */
  async recordTransaction(tx: Transaction): Promise<void> {
    if (!supabaseAdmin) throw new Error("Supabase admin not configured");

    // Use atomic RPC (created in migration)
    const delta = (tx.type === "top_up" || tx.type === "subscription_grant" || tx.type === "subscription_renewal" || tx.type === "lifetime_grant")
      ? tx.amount
      : -tx.amount;

    const { error: rpcError } = await supabaseAdmin.rpc("record_transaction_atomic", {
      p_org_id: tx.orgId,
      p_project_id: tx.projectId ?? null,
      p_from_agent: tx.fromAgent,
      p_to_agent: tx.toAgent ?? null,
      p_amount: tx.amount,
      p_transaction_type: tx.type,
      p_description: tx.description,
      p_balance_delta: delta,
    });

    if (rpcError) {
      // Fallback: separate insert + update (non-atomic but functional)
      console.warn("[Economy] Atomic RPC failed, falling back to separate operations:", rpcError.message);

      const { error: ledgerError } = await supabaseAdmin
        .from("agent_ledger")
        .insert({
          org_id: tx.orgId,
          project_id: tx.projectId,
          from_agent: tx.fromAgent,
          to_agent: tx.toAgent,
          amount: tx.amount,
          transaction_type: tx.type,
          description: tx.description,
        });

      if (ledgerError) throw new Error(`Ledger error: ${ledgerError.message}`);

      const { error: balanceError } = await supabaseAdmin.rpc("increment_org_balance", {
        p_org_id: tx.orgId,
        p_amount: delta,
      });

      if (balanceError) {
        // Last resort: read-then-write (non-atomic)
        const currentBalance = await this.getBalance(tx.orgId);
        await supabaseAdmin
          .from("organizations")
          .update({ credit_balance: currentBalance + delta })
          .eq("id", tx.orgId);
      }
    }
  }

  /**
   * Grant credits to an organization (e.g., from top-up or subscription)
   */
  async grantCredits(
    orgId: string,
    amount: number,
    type: "top_up" | "subscription_grant" | "subscription_renewal" | "lifetime_grant" = "top_up"
  ): Promise<void> {
    const descriptions: Record<string, string> = {
      top_up: "Manual Credit Top-up",
      subscription_grant: "Monthly Subscription Allowance",
      subscription_renewal: "Subscription Renewal Allowance",
      lifetime_grant: "Lifetime License Monthly Grant",
    };
    await this.recordTransaction({
      orgId,
      fromAgent: "System",
      amount,
      type,
      description: descriptions[type] || "Credit Grant",
    });
  }

  /**
   * Negotiate and hire another agent for a subtask
   */
  async hireAgent(
    orgId: string,
    from: AgentRole | "System",
    to: AgentRole,
    task: string,
    projectId?: string
  ): Promise<boolean> {
    const costMap: Record<AgentRole, number> = {
      Architect: 2.0,
      Developer: 1.5,
      QA: 1.0,
      SecurityAuditor: 2.5,
      ProductManager: 2.0,
      SRE: 3.0,
    };

    const cost = costMap[to];
    const balance = await this.getBalance(orgId);

    if (balance < cost) {
      console.warn(`[Economy] Insufficient funds for ${from} to hire ${to} for: ${task}`);
      return false;
    }

    await this.recordTransaction({
      orgId,
      projectId,
      fromAgent: from,
      toAgent: to,
      amount: cost,
      type: "hiring",
      description: `Hiring ${to} for subtask: ${task.slice(0, 50)}...`,
    });

    return true;
  }

  /**
   * Account for LLM token usage/resource costs using per-model pricing table.
   */
  async chargeResourceCost(
    orgId: string,
    agent: AgentRole,
    tokens: number,
    model: string,
    projectId?: string
  ): Promise<number> {
    const rate = getModelCostRate(model);
    const cost = tokens * rate;

    // Skip recording for free models (0 cost)
    if (cost === 0) return 0;

    await this.recordTransaction({
      orgId,
      projectId,
      fromAgent: agent,
      amount: cost,
      type: "resource_cost",
      description: `LLM: ${tokens} tokens on ${model} @ ${rate}/tok`,
    });

    return cost;
  }
}

export const agentEconomy = new AgentEconomy();
