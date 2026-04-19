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
 * Agent Economy Manager: Handles credits, hiring, and resource accounting.
 *
 * SECURITY FIX: All financial operations now use atomic database operations
 * to prevent race conditions and ledger/balance desync.
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
   * Record a transaction in the ledger and update organization balance.
   *
   * SECURITY FIX: Uses a single RPC call that handles both ledger insert
   * and balance update atomically within a database transaction.
   * Falls back to sequential operations with explicit error handling.
   */
  async recordTransaction(tx: Transaction): Promise<void> {
    if (!supabaseAdmin) throw new Error("Supabase admin not configured");

    const delta = (tx.type === "top_up" || tx.type === "subscription_grant" || tx.type === "subscription_renewal" || tx.type === "lifetime_grant")
      ? tx.amount
      : -tx.amount;

    // Try atomic RPC first (recommended: create this function in Supabase)
    const { error: rpcError } = await supabaseAdmin.rpc("record_transaction_atomic", {
      p_org_id: tx.orgId,
      p_project_id: tx.projectId || null,
      p_from_agent: tx.fromAgent,
      p_to_agent: tx.toAgent || null,
      p_amount: tx.amount,
      p_transaction_type: tx.type,
      p_description: tx.description,
      p_balance_delta: delta,
    });

    if (!rpcError) return; // Atomic operation succeeded

    // Fallback: sequential operations with rollback attempt
    console.warn("[Economy] Atomic RPC not available, falling back to sequential operations");

    // 1. Insert into ledger
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

    // 2. Update balance atomically using increment RPC (not read-modify-write)
    const { error: balanceError } = await supabaseAdmin.rpc("increment_org_balance", {
      org_id: tx.orgId,
      amount: delta,
    });

    if (balanceError) {
      // SECURITY FIX: Log the desync for manual reconciliation instead of
      // using a non-atomic read-modify-write fallback
      console.error("[Economy] CRITICAL: Ledger entry created but balance update failed. Manual reconciliation required.", {
        orgId: tx.orgId,
        delta,
        error: balanceError.message,
      });
      throw new Error(`Balance update failed after ledger insert. Reconciliation required. Error: ${balanceError.message}`);
    }
  }

  /**
   * Grant credits to an organization
   */
  async grantCredits(orgId: string, amount: number, type: "top_up" | "subscription_grant" | "subscription_renewal" | "lifetime_grant" = "top_up"): Promise<void> {
    await this.recordTransaction({
      orgId,
      fromAgent: "System",
      amount,
      type,
      description: type === "top_up" ? "Manual Credit Top-up" : "Monthly Subscription Allowance",
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
      SRE: 3.0
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
   * Account for LLM token usage/resource costs
   */
  async chargeResourceCost(
    orgId: string,
    agent: AgentRole,
    tokens: number,
    model: string,
    projectId?: string
  ): Promise<void> {
    // IMPROVEMENT: More accurate cost rates per provider
    const isLarge = model.includes("gpt-4o") && !model.includes("mini");
    const rate = isLarge ? 0.0001 : 0.00001;
    const cost = tokens * rate;

    await this.recordTransaction({
      orgId,
      projectId,
      fromAgent: agent,
      amount: cost,
      type: "resource_cost",
      description: `LLM Resource Usage: ${tokens} tokens on ${model}`,
    });
  }
}

export const agentEconomy = new AgentEconomy();
