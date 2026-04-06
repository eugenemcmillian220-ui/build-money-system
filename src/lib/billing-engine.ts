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
      const allowanceMap: Record<string, number> = {
        basic_mini: 300,
        basic_starter: 1000,
        basic_pro: 3000,
        basic_premium: 7000,
        elite_starter: 10000,
        elite_pro: 35000,
        elite_enterprise: 150000
      };
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

  /**
   * Processes a successful subscription renewal payment
   * Grants monthly credits for the new billing period
   */
  async processSubscriptionRenewal(orgId: string, tier: string, subId: string): Promise<void> {
    if (!supabaseAdmin) throw new Error("Supabase admin not configured");
    console.log(`[Billing] Processing subscription renewal for ${orgId} (${tier})`);

    // Update subscription status to active
    await supabaseAdmin.from("billing_subscriptions").upsert({
      org_id: orgId,
      stripe_subscription_id: subId,
      status: "active",
      tier,
      updated_at: new Date().toISOString(),
    }, { onConflict: "stripe_subscription_id" });

    // Grant monthly allowance for the new period
    const allowanceMap: Record<string, number> = {
      basic_mini: 300,
      basic_starter: 1000,
      basic_pro: 3000,
      basic_premium: 7000,
      elite_starter: 10000,
      elite_pro: 35000,
      elite_enterprise: 150000
    };
    const allowance = allowanceMap[tier] || 0;
    
    await supabaseAdmin.from("credit_transactions").insert({
      org_id: orgId,
      amount: allowance,
      type: "subscription_renewal",
      description: `Subscription Renewal - Monthly Allowance (${allowance.toLocaleString()} Credits)`,
    });

    await this.economy.grantCredits(orgId, allowance, "subscription_renewal");
  }

  /**
   * Processes a failed subscription payment
   * Records the failure and may suspend services
   */
  async processPaymentFailure(orgId: string, subId: string, invoiceId: string): Promise<void> {
    if (!supabaseAdmin) throw new Error("Supabase admin not configured");
    console.log(`[Billing] Processing payment failure for ${orgId}, invoice: ${invoiceId}`);

    // Record the payment failure
    await supabaseAdmin.from("credit_transactions").insert({
      org_id: orgId,
      amount: 0,
      type: "payment_failed",
      description: `Payment Failed - Invoice ${invoiceId}`,
    });

    // Update subscription status to past_due
    await supabaseAdmin.from("billing_subscriptions").update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    }).eq("stripe_subscription_id", subId);

    // Optionally notify the organization admin
    console.warn(`[Billing] Payment failed for org ${orgId}. Subscription ${subId} is now past_due.`);
  }
}

export const billingEngine = new BillingEngine();
