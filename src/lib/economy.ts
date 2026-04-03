import { createClient } from "./supabase/server";

export type AgentRole = "Architect" | "Developer" | "QA" | "SecurityAuditor" | "ProductManager" | "SRE";

export interface Transaction {
  orgId: string;
  projectId?: string;
  fromAgent: AgentRole | "System";
  toAgent?: AgentRole;
  amount: number;
  type: "hiring" | "resource_cost" | "top_up";
  description: string;
}

/**
 * Agent Economy Manager: Handles credits, hiring, and resource accounting
 */
export class AgentEconomy {
  /**
   * Get the current credit balance for an organization
   */
  async getBalance(orgId: string): Promise<number> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("organizations")
      .select("credit_balance")
      .eq("id", orgId)
      .single();

    if (error) throw new Error(`Failed to fetch balance: ${error.message}`);
    return Number(data.credit_balance);
  }

  /**
   * Record a transaction in the ledger and update organization balance
   */
  async recordTransaction(tx: Transaction): Promise<void> {
    const supabase = await createClient();

    // 1. Insert into ledger
    const { error: ledgerError } = await supabase
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

    // 2. Update organization balance
    // If it's a top_up, we add. If it's hiring or resource_cost, we subtract.
    const delta = tx.type === "top_up" ? tx.amount : -tx.amount;

    const { error: balanceError } = await supabase.rpc("increment_org_balance", {
      org_id: tx.orgId,
      amount: delta,
    });

    if (balanceError) {
      // Fallback if RPC isn't defined yet
      const currentBalance = await this.getBalance(tx.orgId);
      await supabase
        .from("organizations")
        .update({ credit_balance: currentBalance + delta })
        .eq("id", tx.orgId);
    }
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
    // Basic calculation: 1 credit per 100k tokens for mini, 10 credits for large
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
