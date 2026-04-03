import { supabaseAdmin } from "./supabase/db";
import { AgentEconomy } from "./economy";

/**
 * Billing Engine: Synchronizes Stripe events with the internal Credit System
 */
export class BillingEngine {
  private economy = new AgentEconomy();

  /**
   * Processes a successful one-time credit top-up
   */
  async processTopUp(orgId: string, credits: number, sessionId: string): Promise<void> {
    if (!supabaseAdmin) throw new Error("Supabase admin not configured");
    console.log(`[Billing] Processing top-up of ${credits} credits for ${orgId}`);

    // 1. Record the credit transaction in our specific table (for auditing)
    await supabaseAdmin.from("credit_transactions").insert({
      org_id: orgId,
      amount: credits,
      type: "topup",
      description: `Credit Pack Top-up (${credits.toLocaleString()} Credits)`,
      stripe_session_id: sessionId,
    });

    // 2. Update the organization balance in the economy ledger
    await this.economy.grantCredits(orgId, credits, "top_up");
  }

  /**
   * Processes a new or updated subscription
   */
  async processSubscriptionUpdate(orgId: string, tier: string, subId: string, status: string): Promise<void> {
    if (!supabaseAdmin) throw new Error("Supabase admin not configured");
    console.log(`[Billing] Updating subscription for ${orgId} to ${tier} (${status})`);

    // 1. Update the organization billing tier
    await supabaseAdmin
      .from("organizations")
      .update({
        billing_tier: tier,
      })
      .eq("id", orgId);

    // 2. Record the subscription in the DB
    await supabaseAdmin.from("billing_subscriptions").upsert({
      org_id: orgId,
      stripe_subscription_id: subId,
      status,
      tier,
      updated_at: new Date().toISOString(),
    }, { onConflict: "stripe_subscription_id" });

    // 3. Optional: Grant monthly allowance for new/renewed subscriptions
    if (status === "active") {
      const allowanceMap: Record<string, number> = { free: 100, pro: 2500, enterprise: 10000 };
      const allowance = allowanceMap[tier] || 0;
      await this.processMonthlyGrant(orgId, allowance);
    }
  }

  /**
   * Grants the monthly subscription allowance
   */
  async processMonthlyGrant(orgId: string, allowance: number): Promise<void> {
    if (!supabaseAdmin) throw new Error("Supabase admin not configured");
    
    // Check if grant already issued for this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await supabaseAdmin
      .from("credit_transactions")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("type", "subscription_grant")
      .gte("created_at", startOfMonth.toISOString());

    if (count === 0) {
      await supabaseAdmin.from("credit_transactions").insert({
        org_id: orgId,
        amount: allowance,
        type: "subscription_grant",
        description: `Monthly Plan Allowance (${allowance.toLocaleString()} Credits)`,
      });

      await this.economy.grantCredits(orgId, allowance, "subscription_grant");
    }
  }
}

export const billingEngine = new BillingEngine();
