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
  id: "starter" | "pro" | "enterprise";
  name: string;
  priceIdMonthly: string;
  priceIdYearly: string;
  monthlyPrice: number;
  yearlyPriceEffective: number;
  creditsPerMonth: number;
  features: string[];
}

export const BILLING_TIERS: Record<string, BillingTier> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceIdMonthly: "price_starter_monthly",
    priceIdYearly: "price_starter_yearly",
    monthlyPrice: 49,
    yearlyPriceEffective: 39,
    creditsPerMonth: 5000,
    features: ["All Phases (1-11)", "Standard LLM Router", "Mobile App Gen", "Vision-to-Code", "5,000 Credits/mo"],
  },
  pro: {
    id: "pro",
    name: "Pro Builder",
    priceIdMonthly: "price_pro_monthly",
    priceIdYearly: "price_pro_yearly",
    monthlyPrice: 149,
    yearlyPriceEffective: 119,
    creditsPerMonth: 20000,
    features: [
      "Everything in Starter",
      "Multi-tenant Workspaces",
      "Real-time Collaboration",
      "Autonomous SRE",
      "Compliance Vault",
      "20,000 Credits/mo"
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise Empire",
    priceIdMonthly: "price_enterprise_monthly",
    priceIdYearly: "price_enterprise_yearly",
    monthlyPrice: 499,
    yearlyPriceEffective: 399,
    creditsPerMonth: 100000,
    features: [
      "Everything in Pro",
      "SSO/SAML/OIDC",
      "White-label branding",
      "Multi-cloud IaC",
      "Dedicated Hype Instances",
      "100,000 Credits/mo"
    ],
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
   * Create a subscription session for plan upgrades with 14-day trial
   */
  async createSubscriptionSession(orgId: string, tier: string, interval: "monthly" | "yearly" = "monthly"): Promise<string> {
    const plan = BILLING_TIERS[tier];
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
        trial_period_days: 14,
        metadata: { orgId, tier, interval },
      },
      metadata: { orgId, tier, type: "subscription", interval },
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
