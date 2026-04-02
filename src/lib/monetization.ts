/**
 * Monetization Engine - Phase 6 Upgrade
 * Real LLM-powered pricing and revenue model generation
 */

import { generateText } from "./openrouter";

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

export class MonetizationEngine {
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
      const response = await generateText(prompt);
      const cleaned = response.replace(/^```json\n?/g, "").replace(/\n?```$/g, "").trim();
      const parsed = JSON.parse(cleaned) as Omit<MonetizationPlan, "generatedAt">;
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
