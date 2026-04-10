import Stripe from "stripe";
import { z } from "zod";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2024-06-20",
  typescript: true,
});

const STRIPE_ACCOUNT_ID = process.env.STRIPE_ACCOUNT_ID;

export const priceSchema = z.object({
  amount: z.number().int().min(100),
  currency: z.string().default("usd"),
  orgId: z.string().uuid(),
});

export interface BillingTier {
  id: string;
  name: string;
  category: "basic" | "elite";
  priceIdMonthly: string;
  priceIdYearly: string;
  monthlyPrice: number;
  yearlyPriceEffective: number;
  creditsPerMonth: number;
  features: string[];
  keyFocus?: string;
}

export interface LifetimeLicense {
  id: string;
  name: string;
  priceId: string;
  price: number; // One-time price
  description: string;
  features: string[];
}

export interface CreditPack {
  id: string;
  credits: number;
  price: number; // In cents
  label: string;
  savings?: string;
}

// === BILLING TIERS (Subscription Plans) ===
export const BILLING_TIERS: Record<string, BillingTier> = {
  // --- Basic Foundation (Phases 1-3) ---
  "basic_mini": {
    id: "basic_mini",
    name: "Basic Mini",
    category: "basic",
    priceIdMonthly: process.env.STRIPE_BASIC_MINI_MONTHLY_PRICE_ID || "price_basic_mini_monthly",
    priceIdYearly: process.env.STRIPE_BASIC_MINI_YEARLY_PRICE_ID || "price_basic_mini_yearly",
    monthlyPrice: 5,
    yearlyPriceEffective: 4,
    creditsPerMonth: 300,
    features: ["Phases 1-3 Access", "Single Component Generation", "Basic Multi-file Output", "300 Credits/mo"],
  },
  "basic_starter": {
    id: "basic_starter",
    name: "Basic Starter",
    category: "basic",
    priceIdMonthly: process.env.STRIPE_BASIC_STARTER_MONTHLY_PRICE_ID || "price_basic_starter_monthly",
    priceIdYearly: process.env.STRIPE_BASIC_STARTER_YEARLY_PRICE_ID || "price_basic_starter_yearly",
    monthlyPrice: 19,
    yearlyPriceEffective: 15,
    creditsPerMonth: 1000,
    features: ["Phases 1-3 Access", "Full Component Generation", "Supabase Integration", "1,000 Credits/mo"],
  },
  "basic_pro": {
    id: "basic_pro",
    name: "Basic Pro",
    category: "basic",
    priceIdMonthly: process.env.STRIPE_BASIC_PRO_MONTHLY_PRICE_ID || "price_basic_pro_monthly",
    priceIdYearly: process.env.STRIPE_BASIC_PRO_YEARLY_PRICE_ID || "price_basic_pro_yearly",
    monthlyPrice: 49,
    yearlyPriceEffective: 39,
    creditsPerMonth: 3000,
    features: ["Phases 1-3 Access", "Unlimited Projects", "Priority Queue", "3,000 Credits/mo"],
  },
  "basic_premium": {
    id: "basic_premium",
    name: "Basic Premium",
    category: "basic",
    priceIdMonthly: process.env.STRIPE_BASIC_PREMIUM_MONTHLY_PRICE_ID || "price_basic_premium_monthly",
    priceIdYearly: process.env.STRIPE_BASIC_PREMIUM_YEARLY_PRICE_ID || "price_basic_premium_yearly",
    monthlyPrice: 99,
    yearlyPriceEffective: 79,
    creditsPerMonth: 7000,
    features: ["Phases 1-3 Access", "Custom Templates", "Early Feature Access", "7,000 Credits/mo"],
  },

  // --- Elite Empire (Phases 1-20) ---
  "elite_starter": {
    id: "elite_starter",
    name: "Elite Starter",
    category: "elite",
    priceIdMonthly: process.env.STRIPE_ELITE_STARTER_MONTHLY_PRICE_ID || "price_elite_starter_monthly",
    priceIdYearly: process.env.STRIPE_ELITE_STARTER_YEARLY_PRICE_ID || "price_elite_starter_yearly",
    monthlyPrice: 99,
    yearlyPriceEffective: 79,
    creditsPerMonth: 10000,
    keyFocus: "Governance & Edge",
    features: ["Full Phases 1-20 Access", "Autonomous Governance (HITL)", "Edge Scale Orchestration", "Global CDN Deployment", "10,000 Credits/mo"],
  },
  "elite_pro": {
    id: "elite_pro",
    name: "Elite Pro",
    category: "elite",
    priceIdMonthly: process.env.STRIPE_ELITE_PRO_MONTHLY_PRICE_ID || "price_elite_pro_monthly",
    priceIdYearly: process.env.STRIPE_ELITE_PRO_YEARLY_PRICE_ID || "price_elite_pro_yearly",
    monthlyPrice: 249,
    yearlyPriceEffective: 199,
    creditsPerMonth: 35000,
    keyFocus: "VC & Diplomacy",
    features: ["Full Phases 1-20 Access", "Autonomous VC Investment Engine", "Agentic B2B Diplomacy", "Revenue Share Intelligence", "35,000 Credits/mo"],
  },
  "elite_enterprise": {
    id: "elite_enterprise",
    name: "Elite Enterprise",
    category: "elite",
    priceIdMonthly: process.env.STRIPE_ELITE_ENTERPRISE_MONTHLY_PRICE_ID || "price_elite_enterprise_monthly",
    priceIdYearly: process.env.STRIPE_ELITE_ENTERPRISE_YEARLY_PRICE_ID || "price_elite_enterprise_yearly",
    monthlyPrice: 999,
    yearlyPriceEffective: 799,
    creditsPerMonth: 150000,
    keyFocus: "Legal, Hive & M&A",
    features: ["Full Phases 1-20 Access", "Sovereign Forge Engine", "Phantom UX Simulation", "Herald Viral Launch Agent", "Hive Mind Intelligence", "Autonomous M&A Engine", "150,000 Credits/mo"],
  },
};

// === LIFETIME LICENSES (One-Time Purchases) ===
export const LIFETIME_LICENSES: Record<string, LifetimeLicense> = {
  "lifetime_starter": {
    id: "lifetime_starter",
    name: "Lifetime Starter",
    priceId: process.env.STRIPE_LIFETIME_STARTER_PRICE_ID || "price_lifetime_starter",
    price: 790,
    description: "One-time payment, lifetime access to Basic features",
    features: ["Phases 1-3 Lifetime Access", "1,000 Credits/mo Forever", "All Basic Features", "No Recurring Fees"],
  },
  "lifetime_pro": {
    id: "lifetime_pro",
    name: "Lifetime Pro",
    priceId: process.env.STRIPE_LIFETIME_PRO_PRICE_ID || "price_lifetime_pro",
    price: 2390,
    description: "One-time payment, lifetime access to Elite features",
    features: ["Phases 1-20 Lifetime Access", "5,000 Credits/mo Forever", "All Elite Features", "Priority Support Forever"],
  },
  "onprem_perpetual": {
    id: "onprem_perpetual",
    name: "On-Prem Perpetual",
    priceId: process.env.STRIPE_ON_PREM_PERPETUAL_PRICE_ID || "price_onprem_perpetual",
    price: 4999,
    description: "Self-hosted, unlimited internal use",
    features: ["Full Source Code Access", "Unlimited Internal Users", "Self-Hosted Deployment", "No Cloud Dependency", "1 Year Updates Included"],
  },
};

// === CREDIT TOP-UP PACKS (5 Packs) ===
export const CREDIT_PACKS: CreditPack[] = [
  { id: "credits_5k", credits: 5000, price: 2000, label: "Starter Pack" },
  { id: "credits_10k", credits: 10000, price: 3800, label: "Pro Boost", savings: "5% off" },
  { id: "credits_25k", credits: 25000, price: 9000, label: "Empire Surge", savings: "10% off" },
  { id: "credits_50k", credits: 50000, price: 17000, label: "Empire Overdrive", savings: "15% off" },
  { id: "credits_100k", credits: 100000, price: 32000, label: "Empire Titan", savings: "20% off" },
];

// === MARKETPLACE & AFFILIATE CONFIG ===
export const MARKETPLACE_CONFIG = {
  commissionRate: 0.25, // 25% on all agent-to-agent transactions
  affiliateCommissionRate: 0.20, // 20% recurring commission on referrals
  minPayoutThreshold: 5000, // Minimum $50 to request payout
};

/**
 * Stripe Utilities for Credits, Subscriptions, Lifetime Licenses, and Affiliate Tracking
 */
export class StripeService {
  /**
   * Create a checkout session for one-time credit top-up
   */
  async createTopUpSession(orgId: string, packId: string, affiliateCode?: string): Promise<string> {
    const pack = CREDIT_PACKS.find(p => p.id === packId);
    if (!pack) throw new Error("Invalid credit pack");

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${pack.credits.toLocaleString()} Credits Pack`,
              description: "Credits for AI Agents, Sandboxes, and Vision-to-Code",
            },
            unit_amount: pack.price,
          },
          quantity: 1,
        },
      ],
      metadata: { orgId, credits: pack.credits.toString(), type: "topup", packId, ...(affiliateCode && { affiliateCode }) },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing?canceled=true`,
    });

    return session.url!;
  }

  /**
   * Create a subscription session for plan upgrades - NO FREE TRIAL
   */
  async createSubscriptionSession(
    orgId: string,
    tierId: string,
    interval: "monthly" | "yearly" = "monthly",
    affiliateCode?: string
  ): Promise<string> {
    const plan = BILLING_TIERS[tierId];
    if (!plan) throw new Error("Invalid tier");

    const priceId = interval === "monthly" ? plan.priceIdMonthly : plan.priceIdYearly;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: { orgId, tier: tierId, interval, ...(affiliateCode && { affiliateCode }) },
      },
      metadata: { orgId, tier: tierId, type: "subscription", interval, ...(affiliateCode && { affiliateCode }) },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing?canceled=true`,
    });

    return session.url!;
  }

  /**
   * Create a checkout session for lifetime license purchase
   */
  async createLifetimeLicenseSession(orgId: string, licenseId: string, affiliateCode?: string): Promise<string> {
    const license = LIFETIME_LICENSES[licenseId];
    if (!license) throw new Error("Invalid lifetime license");

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: license.name,
              description: license.description,
            },
            unit_amount: license.price * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        orgId,
        licenseId,
        type: "lifetime_license",
        ...(affiliateCode && { affiliateCode }),
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing?success=true&license=${licenseId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing?canceled=true`,
    });

    return session.url!;
  }

  /**
   * Record metered usage to Stripe (e.g., LLM tokens beyond plan)
   */
  async reportUsage(customerId: string, quantity: number): Promise<void> {
    await stripe.billing.meterEvents.create({
      event_name: "ai_token_usage",
      payload: {
        value: quantity.toString(),
        stripe_customer_id: customerId,
      },
    });
  }

  /**
   * Create a marketplace transaction with commission
   */
  async createMarketplaceTransaction(
    buyerOrgId: string,
    sellerOrgId: string,
    amountCents: number,
    description: string
  ): Promise<{ transactionId: string; commission: number; sellerAmount: number }> {
    const commission = Math.round(amountCents * MARKETPLACE_CONFIG.commissionRate);
    const sellerAmount = amountCents - commission;

    // Create a payment intent for transaction
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      metadata: {
        type: "marketplace_transaction",
        buyerOrgId,
        sellerOrgId,
        commission: commission.toString(),
        sellerAmount: sellerAmount.toString(),
        description,
      },
    });

    return {
      transactionId: paymentIntent.id,
      commission,
      sellerAmount,
    };
  }
}

export const stripeService = new StripeService();
