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
  id: "free" | "pro" | "enterprise";
  name: string;
  priceId: string; // Stripe Price ID
  creditsPerMonth: number;
  features: string[];
}

export const BILLING_TIERS: Record<string, BillingTier> = {
  free: {
    id: "free",
    name: "Free Tier",
    priceId: "",
    creditsPerMonth: 100,
    features: ["Phase 1-5 Access", "1 Project/mo", "Community Support"],
  },
  pro: {
    id: "pro",
    name: "Pro Builder",
    priceId: "price_pro_monthly", // Replace with real ID
    creditsPerMonth: 2500,
    features: ["All Phases (1-11)", "Unlimited Projects", "Phase 9-11 Access", "Priority Support"],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise Empire",
    priceId: "price_enterprise_custom", // Replace with real ID
    creditsPerMonth: 10000,
    features: ["White-labeling", "Custom SSO", "SOC2 Compliance Reports", "Dedicated Infrastructure"],
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
      customer_email: undefined, // Or get from org
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
   * Create a subscription session for plan upgrades
   */
  async createSubscriptionSession(orgId: string, tier: string): Promise<string> {
    const plan = BILLING_TIERS[tier];
    if (!plan) throw new Error("Invalid tier");

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      metadata: { orgId, tier, type: "subscription" },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing?canceled=true`,
    });

    return session.url!;
  }

  /**
   * Record metered usage to Stripe (e.g., LLM tokens beyond plan)
   */
  async reportUsage(customerId: string, quantity: number): Promise<void> {
    // Meters API (v2) for usage-based billing
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
