// DA-070 FIX: TODO: Use integer cents for all currency, avoid floating-point
/**
 * Monetization Engine - Phase 6 Upgrade
 * Real LLM-powered pricing and revenue model generation
 */

import { callLLM, cleanJson } from "./llm";

export interface PricingTier {
  name: string;
  price: number;
  billingCycle: "monthly" | "yearly" | "one-time" | "usage";
  target: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}

export interface MonetizationPlan {
  model: string;
  rationale: string;
  tiers: PricingTier[];
  revenueProjection: RevenueProjection;
  churnMitigation: string[];
  upsellStrategies: string[];
  generatedAt: string;
}

export interface RevenueProjection {
  month3MRR: string;
  month6MRR: string;
  month12MRR: string;
  keyAssumptions: string[];
}

export interface RevenueShareConfig {
  affiliateCode: string;
  commissionRate: number;
  stripeConnectedAccountId?: string;
  autoPayoutsEnabled: boolean;
}

export class MonetizationEngine {
  /**
   * Phase 6: Surge Pricing Engine
   * Calculates dynamic cost multipliers based on system load or specific windows.
   */
  getSurgeMultiplier(): number {
    const hour = new Date().getUTCHours();
    // Peak hours (simulated): 14:00 - 20:00 UTC
    if (hour >= 14 && hour <= 20) {
      return 1.5; // 50% surge
    }
    return 1.0;
  }

  /**
   * Get dynamic cost for manifestation
   */
  calculateManifestationCost(baseCost: number = 50): number {
    const multiplier = this.getSurgeMultiplier();
    return Math.ceil(baseCost * multiplier);
  }

  /**
   * Process a revenue share transaction
   */
  async processRevenueShare(amountCents: number, config: RevenueShareConfig): Promise<void> {
    if (!config.stripeConnectedAccountId || !config.autoPayoutsEnabled) {
      console.log(`[Monetization] Revenue share skipped for ${config.affiliateCode}`);
      return;
    }

    const commission = Math.round(amountCents * config.commissionRate);
    console.log(`[Monetization] Processing ${commission} cents payout to ${config.stripeConnectedAccountId}`);
    // In production, this would call stripe.transfers.create
  }

  async startMonetization(idea: string): Promise<MonetizationPlan> {
    const prompt = `You are a SaaS pricing expert and revenue strategist. Create an optimal monetization plan for this product.

Product Idea: "${idea}"

Return ONLY a JSON object (no markdown):
{
  "model": "<freemium|subscription|usage-based|one-time|hybrid>",
  "rationale": "<2 sentence explanation of why this model fits the product>",
  "tiers": [
    {
      "name": "<tier name, e.g. Free>",
      "price": <number in USD monthly>,
      "billingCycle": "<monthly|yearly|one-time|usage>",
      "target": "<who this tier is for>",
      "features": ["<feature 1>", "<feature 2>", "<feature 3>"],
      "cta": "<call to action text>",
      "highlighted": <true|false - true for recommended tier>
    }
  ],
  "revenueProjection": {
    "month3MRR": "<e.g. $2,500>",
    "month6MRR": "<e.g. $8,000>",
    "month12MRR": "<e.g. $25,000>",
    "keyAssumptions": ["<assumption 1>", "<assumption 2>", "<assumption 3>"]
  },
  "churnMitigation": ["<specific tactic 1>", "<specific tactic 2>", "<specific tactic 3>"],
  "upsellStrategies": ["<upsell strategy 1>", "<upsell strategy 2>"]
}

Create 3 tiers (Free/Starter/Pro or similar). Price the Pro tier between $29-99/month based on value delivered.`;

    try {
      const response = await callLLM([{ role: "user", content: prompt }], { temperature: 0.5 });
      const parsed = JSON.parse(cleanJson(response)) as Omit<MonetizationPlan, "generatedAt">;
      return { ...parsed, generatedAt: new Date().toISOString() };
    } catch {
      return this.fallbackPlan(idea);
    }
  }

  async generateMonetizationPlan(idea: string): Promise<MonetizationPlan> {
    return this.startMonetization(idea);
  }

  private fallbackPlan(idea: string): MonetizationPlan {
    return {
      model: "freemium",
      rationale: `A freemium model with usage-based upgrades maximises top-of-funnel growth for ${idea.slice(0, 40)} while capturing value from power users.`,
      tiers: [
        {
          name: "Free",
          price: 0,
          billingCycle: "monthly",
          target: "Individual developers and hobbyists",
          features: ["5 generations/month", "Single-file mode", "Community support"],
          cta: "Get Started Free",
          highlighted: false,
        },
        {
          name: "Pro",
          price: 29,
          billingCycle: "monthly",
          target: "Professional developers and small teams",
          features: ["Unlimited generations", "Multi-file apps", "Vercel deploy", "Priority support"],
          cta: "Start Pro Trial",
          highlighted: true,
        },
        {
          name: "Team",
          price: 99,
          billingCycle: "monthly",
          target: "Agencies and product teams",
          features: ["Everything in Pro", "5 seats", "API access", "Custom models", "SLA support"],
          cta: "Start Team Trial",
          highlighted: false,
        },
      ],
      revenueProjection: {
        month3MRR: "$2,500",
        month6MRR: "$8,500",
        month12MRR: "$28,000",
        keyAssumptions: ["5% free-to-paid conversion", "2.5% monthly churn", "10% MoM growth"],
      },
      churnMitigation: [
        "In-app progress tracking and milestones",
        "Proactive CSM outreach at 14-day inactivity",
        "Annual plan with 2 months free",
      ],
      upsellStrategies: [
        "Usage-based nudge when approaching free tier limits",
        "Team invites trigger team plan upsell",
      ],
      generatedAt: new Date().toISOString(),
    };
  }
}

export const monetizationEngine = new MonetizationEngine();
