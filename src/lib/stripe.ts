import Stripe from "stripe";
import { z } from "zod";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2024-06-20", // Latest version
});

export const priceSchema = z.object({
  amount: z.number().int().min(100), // In cents
  currency: z.string().default("usd"),
  orgId: z.string().uuid(),
});

export interface BillingTier {
  id: string;
  name: string;
  category: "basic" | "elite"; // basic = phases 1-3, elite = phases 1-11
  priceIdMonthly: string;
  priceIdYearly: string;
  monthlyPrice: number;
  yearlyPriceEffective: number;
  creditsPerMonth: number;
  features: string[];
}

export const BILLING_TIERS: Record<string, BillingTier> = {
  // --- Phase 1-3 Basic Tiers ---
  "basic_mini": {
    id: "basic_mini",
    name: "Basic Mini",
    category: "basic",
    priceIdMonthly: process.env.STRIPE_PRICE_BASIC_MINI_MONTHLY || "price_basic_mini_monthly",
    priceIdYearly: process.env.STRIPE_PRICE_BASIC_MINI_YEARLY || "price_basic_mini_yearly",
    monthlyPrice: 5,
    yearlyPriceEffective: 4,
    creditsPerMonth: 300,
    features: ["Phases 1-3 Only", "Single Component Gen", "Basic Multi-file", "300 Credits/mo"],
  },
  "basic_starter": {
    id: "basic_starter",
    name: "Basic Starter",
    category: "basic",
    priceIdMonthly: process.env.STRIPE_PRICE_BASIC_STARTER_MONTHLY || "price_basic_starter_monthly",
    priceIdYearly: process.env.STRIPE_PRICE_BASIC_STARTER_YEARLY || "price_basic_starter_yearly",
    monthlyPrice: 19,
    yearlyPriceEffective: 15,
    creditsPerMonth: 1000,
    features: ["Phases 1-3 Only", "Single Component Gen", "Basic Multi-file", "Supabase Integration", "1,000 Credits/mo"],
  },
  "basic_pro": {
    id: "basic_pro",
    name: "Basic Pro",
    category: "basic",
    priceIdMonthly: process.env.STRIPE_PRICE_BASIC_PRO_MONTHLY || "price_basic_pro_monthly",
    priceIdYearly: process.env.STRIPE_PRICE_BASIC_PRO_YEARLY || "price_basic_pro_yearly",
    monthlyPrice: 49,
    yearlyPriceEffective: 39,
    creditsPerMonth: 3000,
    features: ["Phases 1-3 Only", "Unlimited Basic Projects", "Priority Support", "3,000 Credits/mo"],
  },
  "basic_premium": {
    id: "basic_premium",
    name: "Basic Premium",
    category: "basic",
    priceIdMonthly: process.env.STRIPE_PRICE_BASIC_PREMIUM_MONTHLY || "price_basic_premium_monthly",
    priceIdYearly: process.env.STRIPE_PRICE_BASIC_PREMIUM_YEARLY || "price_basic_premium_yearly",
    monthlyPrice: 99,
    yearlyPriceEffective: 79,
    creditsPerMonth: 7000,
    features: ["Phases 1-3 Only", "Custom Database Templates", "Early Access to UI components", "7,000 Credits/mo"],
  },

  // --- Phase 1-11+ Elite Tiers ---
  "elite_starter": {
    id: "elite_starter",
    name: "Elite Starter",
    category: "elite",
    priceIdMonthly: process.env.STRIPE_PRICE_ELITE_STARTER_MONTHLY || "price_elite_starter_monthly",
    priceIdYearly: process.env.STRIPE_PRICE_ELITE_STARTER_YEARLY || "price_elite_starter_yearly",
    monthlyPrice: 99,
    yearlyPriceEffective: 79,
    creditsPerMonth: 10000,
    features: ["Phases 1-12 Access", "Autonomous Governance (HITL)", "Edge Scale Orchestration", "10,000 Credits/mo"],
  },
  "elite_pro": {
    id: "elite_pro",
    name: "Elite Pro Builder",
    category: "elite",
    priceIdMonthly: process.env.STRIPE_PRICE_ELITE_PRO_MONTHLY || "price_elite_pro_monthly",
    priceIdYearly: process.env.STRIPE_PRICE_ELITE_PRO_YEARLY || "price_elite_pro_yearly",
    monthlyPrice: 249,
    yearlyPriceEffective: 199,
    creditsPerMonth: 35000,
    features: ["Phases 1-14 Access", "Autonomous VC Investment", "Agentic Diplomacy (B2B)", "35,000 Credits/mo"],
  },
  "elite_enterprise": {
    id: "elite_enterprise",
    name: "Elite Enterprise Empire",
    category: "elite",
    priceIdMonthly: process.env.STRIPE_PRICE_ELITE_ENTERPRISE_MONTHLY || "price_elite_enterprise_monthly",
    priceIdYearly: process.env.STRIPE_PRICE_ELITE_ENTERPRISE_YEARLY || "price_elite_enterprise_yearly",
    monthlyPrice: 999,
    yearlyPriceEffective: 799,
    creditsPerMonth: 150000,
    features: ["Full 16-Phase Suite", "The Hive Mind (Collective AI)", "Autonomous M&A Engine", "150,000 Credits/mo"],
  },
};

/**
 * Stripe Utilities for Credits and Subscriptions
 */
export class StripeService {
  /**
   * Create a checkout session for one-time credit top-up
   */
  async createTopUpSession(orgId: string, amountCents: number, credits: number): Promise<string> {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${credits.toLocaleString()} Credits Pack`,
              description: "Credits for AI Agents, Sandboxes, and Vision-to-Code",
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: { orgId, credits: credits.toString(), type: "topup" },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing?canceled=true`,
    });

    return session.url!;
  }

  /**
   * Create a subscription session for plan upgrades - NO FREE TRIAL
   */
  async createSubscriptionSession(orgId: string, tierId: string, interval: "monthly" | "yearly" = "monthly"): Promise<string> {
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
        metadata: { orgId, tier: tierId, interval },
      },
      metadata: { orgId, tier: tierId, type: "subscription", interval },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing?success=true`,
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
}

export const stripeService = new StripeService();
