import "server-only"; // SECURITY FIX: Prevent client-side bundling
import { supabaseAdmin } from "./supabase/db";
import { AgentEconomy } from "./economy";
import { MARKETPLACE_CONFIG, LIFETIME_LICENSES } from "./stripe";
import { daoEngine } from "./dao-engine";

/**
 * Billing Engine: Synchronizes Stripe events with the internal Credit System
 * Handles subscriptions, lifetime licenses, affiliate commissions, and marketplace transactions
 */
export class BillingEngine {
  private economy = new AgentEconomy();
  private dao = daoEngine;

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

    // 3. Phase 19: Distribute User Governance Tokens (UGT) - 1 UGT per 1000 credits purchased
    // FIX: Use Math.round instead of Math.floor so 500+ credits still earn 1 UGT
    const ugtToGrant = Math.round(credits / 1000);
    if (ugtToGrant > 0) {
      await this.dao.distributeTokens({
        orgId,
        ownerId: orgId, // In this system, Org is the owner
        type: "UGT",
        amount: ugtToGrant
      });
    }
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

    console.warn(`[Billing] Payment failed for org ${orgId}. Subscription ${subId} is now past_due.`);
  }

  /**
   * Processes a lifetime license purchase
   */
  async processLifetimeLicense(orgId: string, licenseId: string, sessionId: string, affiliateCode?: string): Promise<void> {
    if (!supabaseAdmin) throw new Error("Supabase admin not configured");
    console.log(`[Billing] Processing lifetime license ${licenseId} for ${orgId}`);

    const license = LIFETIME_LICENSES[licenseId];
    if (!license) throw new Error(`Unknown license: ${licenseId}`);

    // Determine monthly credit grant based on license type
    const monthlyCredits = licenseId === "lifetime_starter" ? 1000 : licenseId === "lifetime_pro" ? 5000 : 0;

    // Record the license purchase
    await supabaseAdmin.from("lifetime_licenses").upsert({
      org_id: orgId,
      license_id: licenseId,
      license_name: license.name,
      purchase_date: new Date().toISOString(),
      stripe_session_id: sessionId,
      monthly_credits: monthlyCredits,
      status: "active",
    }, { onConflict: "org_id,license_id" });

    // Update organization with lifetime status
    await supabaseAdmin.from("organizations").update({
      has_lifetime_license: true,
      lifetime_license_type: licenseId,
    }).eq("id", orgId);

    // Grant initial monthly credits
    if (monthlyCredits > 0) {
      await supabaseAdmin.from("credit_transactions").insert({
        org_id: orgId,
        amount: monthlyCredits,
        type: "lifetime_grant",
        description: `${license.name} - Monthly Credit Allowance`,
      });
      await this.economy.grantCredits(orgId, monthlyCredits, "lifetime_grant");
    }

    // Process affiliate commission if applicable
    if (affiliateCode) {
      await this.processAffiliateCommission(affiliateCode, orgId, license.price * 100, "lifetime_license");
    }
  }

  /**
   * Processes affiliate commission for a referral
   */
  async processAffiliateCommission(
    affiliateCode: string, 
    referredOrgId: string, 
    amountCents: number, 
    transactionType: string
  ): Promise<void> {
    if (!supabaseAdmin) throw new Error("Supabase admin not configured");
    
    // Look up the affiliate by their code
    const { data: affiliate } = await supabaseAdmin
      .from("affiliates")
      .select("*")
      .eq("affiliate_code", affiliateCode)
      .single();

    if (!affiliate) {
      console.warn(`[Billing] Unknown affiliate code: ${affiliateCode}`);
      return;
    }

    const commission = Math.round(amountCents * MARKETPLACE_CONFIG.affiliateCommissionRate);
    
    console.log(`[Billing] Processing affiliate commission: ${commission} cents for ${affiliate.org_id}`);

    // Record the affiliate commission
    await supabaseAdmin.from("affiliate_commissions").insert({
      affiliate_org_id: affiliate.org_id,
      referred_org_id: referredOrgId,
      transaction_type: transactionType,
      transaction_amount: amountCents,
      commission_amount: commission,
      commission_rate: MARKETPLACE_CONFIG.affiliateCommissionRate,
      status: "pending",
    });

    // Update affiliate's total earnings
    await supabaseAdmin.rpc("increment_affiliate_earnings", {
      p_affiliate_id: affiliate.id,
      p_amount: commission,
    });
  }

  /**
   * Processes a marketplace transaction with commission
   */
  async processMarketplaceTransaction(
    buyerOrgId: string,
    sellerOrgId: string,
    amountCents: number,
    description: string,
    transactionId: string
  ): Promise<{ commission: number; sellerAmount: number }> {
    if (!supabaseAdmin) throw new Error("Supabase admin not configured");
    
    const commission = Math.round(amountCents * MARKETPLACE_CONFIG.commissionRate);
    const sellerAmount = amountCents - commission;

    console.log(`[Billing] Marketplace transaction: ${amountCents} cents, commission: ${commission}, seller gets: ${sellerAmount}`);

    // Record the marketplace transaction
    await supabaseAdmin.from("marketplace_transactions").insert({
      buyer_org_id: buyerOrgId,
      seller_org_id: sellerOrgId,
      transaction_id: transactionId,
      gross_amount: amountCents,
      commission_amount: commission,
      commission_rate: MARKETPLACE_CONFIG.commissionRate,
      seller_amount: sellerAmount,
      description,
      status: "completed",
    });

    // Credit the seller (minus commission)
    await supabaseAdmin.from("credit_transactions").insert({
      org_id: sellerOrgId,
      amount: Math.round(sellerAmount / 100), // Convert to credits (1 cent = 1 credit roughly)
      type: "marketplace_sale",
      description: `Marketplace Sale: ${description} (after 25% commission)`,
    });

    return { commission, sellerAmount };
  }

  /**
   * Gets affiliate stats for an organization
   */
  async getAffiliateStats(orgId: string): Promise<{
    affiliateCode: string | null;
    totalReferrals: number;
    totalEarnings: number;
    pendingPayout: number;
  }> {
    if (!supabaseAdmin) throw new Error("Supabase admin not configured");

    const { data: affiliate } = await supabaseAdmin
      .from("affiliates")
      .select("*")
      .eq("org_id", orgId)
      .single();

    if (!affiliate) {
      return {
        affiliateCode: null,
        totalReferrals: 0,
        totalEarnings: 0,
        pendingPayout: 0,
      };
    }

    const { count: referralCount } = await supabaseAdmin
      .from("affiliate_commissions")
      .select("*", { count: "exact", head: true })
      .eq("affiliate_org_id", orgId);

    return {
      affiliateCode: affiliate.affiliate_code,
      totalReferrals: referralCount || 0,
      totalEarnings: affiliate.total_earnings || 0,
      pendingPayout: affiliate.pending_payout || 0,
    };
  }
}

export const billingEngine = new BillingEngine();
