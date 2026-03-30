/**
 * Monetization Engine Module for Phase 6 - Autonomous AI Company Builder
 * Generates monetization plans, pricing tiers, and upsell strategies
 */

export interface PricingTier {
  name: string;
  price: string;
  priceMonthly: number;
  features: string[];
  recommended: boolean;
}

export interface Upsell {
  name: string;
  description: string;
  additionalRevenue: string;
}

export interface MonetizationPlan {
  idea: string;
  models: string[];
  pricingTiers: PricingTier[];
  pricing: string;
  upsells: Upsell[];
  projectedMRR: string;
  revenueStreams: string[];
  timestamp: string;
}

const SAAS_TIERS: PricingTier[] = [
  {
    name: 'Starter',
    price: '$9/month',
    priceMonthly: 9,
    features: ['5 projects', 'Basic AI features', 'Email support'],
    recommended: false,
  },
  {
    name: 'Pro',
    price: '$29/month',
    priceMonthly: 29,
    features: ['Unlimited projects', 'Advanced AI features', 'Priority support', 'API access'],
    recommended: true,
  },
  {
    name: 'Enterprise',
    price: '$99/month',
    priceMonthly: 99,
    features: ['Everything in Pro', 'Custom AI models', 'Dedicated support', 'SLA', 'SSO'],
    recommended: false,
  },
];

const API_TIERS: PricingTier[] = [
  {
    name: 'Developer',
    price: 'Free',
    priceMonthly: 0,
    features: ['100 API calls/day', 'Public endpoints', 'Community support'],
    recommended: false,
  },
  {
    name: 'Growth',
    price: '$49/month',
    priceMonthly: 49,
    features: ['10k API calls/day', 'Webhooks', 'Analytics', 'Email support'],
    recommended: true,
  },
  {
    name: 'Scale',
    price: '$199/month',
    priceMonthly: 199,
    features: ['Unlimited API calls', 'Custom rate limits', 'Dedicated infra', 'SLA'],
    recommended: false,
  },
];

const COMMON_UPSELLS: Upsell[] = [
  {
    name: 'AI Pro Add-on',
    description: 'Access to GPT-4, Claude, and premium models',
    additionalRevenue: '+$20/month per user',
  },
  {
    name: 'Automation Pack',
    description: 'Pre-built workflows and integrations',
    additionalRevenue: '+$15/month per user',
  },
  {
    name: 'White Label',
    description: 'Custom branding and domain',
    additionalRevenue: '+$50/month per account',
  },
];

export class MonetizationEngine {
  startMonetization(idea: string): MonetizationPlan {
    const lower = idea.toLowerCase();
    const isApiFirst = lower.includes('api') || lower.includes('developer');
    const tiers = isApiFirst ? API_TIERS : SAAS_TIERS;
    const models = this.selectModels(idea);
    const upsells = this.generateUpsells(idea);

    const avgMonthlyRevenue = tiers.find(t => t.recommended)?.priceMonthly ?? 29;

    return {
      idea,
      models,
      pricingTiers: tiers,
      pricing: `$${tiers[0].priceMonthly}-$${tiers[tiers.length - 1].priceMonthly}/month`,
      upsells,
      projectedMRR: `$${avgMonthlyRevenue * 100} - $${avgMonthlyRevenue * 500} at 100-500 customers`,
      revenueStreams: ['Subscriptions', 'Usage-based billing', 'Marketplace commissions'],
      timestamp: new Date().toISOString(),
    };
  }

  determinePricing(model: string): PricingTier[] {
    const lower = model.toLowerCase();
    return lower.includes('api') ? API_TIERS : SAAS_TIERS;
  }

  generateUpsells(idea: string): Upsell[] {
    const lower = idea.toLowerCase();
    const upsells = [...COMMON_UPSELLS];

    if (lower.includes('marketplace') || lower.includes('shop')) {
      upsells.push({
        name: 'Transaction Fee Reduction',
        description: 'Reduce platform commission from 10% to 2%',
        additionalRevenue: '+$30/month per seller',
      });
    }

    return upsells;
  }

  private selectModels(idea: string): string[] {
    const lower = idea.toLowerCase();
    const models = ['SaaS subscription'];

    if (lower.includes('api')) models.push('API usage billing');
    if (lower.includes('marketplace')) models.push('Marketplace commission (10%)');
    if (lower.includes('enterprise') || lower.includes('b2b')) models.push('Annual enterprise contracts');

    models.push('Freemium → paid conversion');
    return models;
  }
}

export const monetizationEngine = new MonetizationEngine();
