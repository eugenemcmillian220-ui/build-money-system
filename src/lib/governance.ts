import { supabaseAdmin } from "./supabase/db";

export type ActionStatus = "pending" | "approved" | "rejected";

export interface AgentAction {
  id?: string;
  orgId: string;
  projectId?: string;
  agentId: string;
  actionType: string;
  payload: Record<string, unknown>;
  riskScore?: number;
}

/**
 * Governance Engine: Manages Human-in-the-Loop (HITL) approvals
 */
export class GovernanceEngine {
  /**
   * Submits an action for approval. 
   * Returns the action ID if pending, or "approved" if low risk.
   */
  async requestApproval(action: AgentAction): Promise<{ status: ActionStatus; actionId?: string }> {
    if (!supabaseAdmin) throw new Error("Supabase admin not configured");

    // 1. Simple Risk Assessment: If cost > 50 credits or it's a deployment, require approval
    const isHighRisk = action.riskScore && action.riskScore > 0.7;
    const isSensitive = ["deploy_infra", "hiring_sre", "bulk_seo"].includes(action.actionType);

    if (!isHighRisk && !isSensitive) {
      return { status: "approved" };
    }

    // 2. Persist pending action
    const { data, error } = await supabaseAdmin
      .from("pending_actions")
      .insert({
        org_id: action.orgId,
        project_id: action.projectId,
        agent_id: action.agentId,
        action_type: action.actionType,
        payload: action.payload,
        risk_score: action.riskScore || 0.5,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) throw new Error(`Failed to create pending action: ${error.message}`);

    console.log(`[Governance] Action ${data.id} is PENDING human approval.`);
    return { status: "pending", actionId: data.id };
  }

  /**
   * Checks the status of a pending action
   */
  async checkActionStatus(actionId: string): Promise<ActionStatus> {
    if (!supabaseAdmin) throw new Error("Supabase admin not configured");

    const { data, error } = await supabaseAdmin
      .from("pending_actions")
      .select("status")
      .eq("id", actionId)
      .single();

    if (error || !data) return "pending";
    return data.status as ActionStatus;
  }

  /**
   * Resolves a pending action (Called by UI/API)
   */
  async resolveAction(actionId: string, status: "approved" | "rejected", reason?: string): Promise<void> {
    if (!supabaseAdmin) throw new Error("Supabase admin not configured");

    await supabaseAdmin
      .from("pending_actions")
      .update({
        status,
        reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", actionId);
  }
}

export const governance = new GovernanceEngine();
