/**
 * Stripe billing configuration — types and constants only.
 * Safe to import from client components.
 * For Stripe SDK operations, use stripe.ts (server-only).
 *
 * ⚠️ KNOWN ISSUE: priceId fields are empty strings here because this file
 * is client-safe and cannot access server env vars. The actual price IDs
 * are resolved in stripe.ts (server-only) via env vars with hardcoded fallbacks.
 * This file is used only for display/UI purposes (feature lists, pricing).
 * Do NOT use priceId from this file for checkout — use stripe.ts BILLING_TIERS instead.
 */

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
  price: number;
  description: string;
  features: string[];
}

export interface CreditPack {
  id: string;
  credits: number;
  price: number;
  label: string;
  savings?: string;
}

export const BILLING_TIERS: Record<string, BillingTier> = {
  "basic_mini": {
    id: "basic_mini", name: "Basic Mini", category: "basic",
    priceIdMonthly: "price_demo_basic_mini_mo", priceIdYearly: "price_demo_basic_mini_yr",
    monthlyPrice: 5, yearlyPriceEffective: 4, creditsPerMonth: 300,
    features: ["Phases 1-3 Access", "Single Component Generation", "Basic Multi-file Output", "300 Credits/mo"],
  },
  "basic_starter": {
    id: "basic_starter", name: "Basic Starter", category: "basic",
    priceIdMonthly: "price_demo_basic_starter_mo", priceIdYearly: "price_demo_basic_starter_yr",
    monthlyPrice: 19, yearlyPriceEffective: 15, creditsPerMonth: 1000,
    features: ["Phases 1-3 Access", "Full Component Generation", "Supabase Integration", "1,000 Credits/mo"],
  },
  "basic_pro": {
    id: "basic_pro", name: "Basic Pro", category: "basic",
    priceIdMonthly: "price_demo_basic_pro_mo", priceIdYearly: "price_demo_basic_pro_yr",
    monthlyPrice: 49, yearlyPriceEffective: 39, creditsPerMonth: 3000,
    features: ["Phases 1-3 Access", "Unlimited Projects", "Priority Queue", "3,000 Credits/mo"],
  },
  "basic_premium": {
    id: "basic_premium", name: "Basic Premium", category: "basic",
    priceIdMonthly: "price_demo_basic_premium_mo", priceIdYearly: "price_demo_basic_premium_yr",
    monthlyPrice: 99, yearlyPriceEffective: 79, creditsPerMonth: 7000,
    features: ["Phases 1-3 Access", "Custom Templates", "Early Feature Access", "7,000 Credits/mo"],
  },
  "elite_starter": {
    id: "elite_starter", name: "Elite Starter", category: "elite",
    priceIdMonthly: "price_demo_elite_starter_mo", priceIdYearly: "price_demo_elite_starter_yr",
    monthlyPrice: 99, yearlyPriceEffective: 79, creditsPerMonth: 10000,
    keyFocus: "Governance & Edge",
    features: ["Full Phases 1-20 Access", "Autonomous Governance (HITL)", "Edge Scale Orchestration", "Global CDN Deployment", "10,000 Credits/mo"],
  },
  "elite_pro": {
    id: "elite_pro", name: "Elite Pro", category: "elite",
    priceIdMonthly: "price_demo_elite_pro_mo", priceIdYearly: "price_demo_elite_pro_yr",
    monthlyPrice: 249, yearlyPriceEffective: 199, creditsPerMonth: 35000,
    keyFocus: "VC & Diplomacy",
    features: ["Full Phases 1-20 Access", "Autonomous VC Investment Engine", "Agentic B2B Diplomacy", "Revenue Share Intelligence", "35,000 Credits/mo"],
  },
  "elite_enterprise": {
    id: "elite_enterprise", name: "Elite Enterprise", category: "elite",
    priceIdMonthly: "price_demo_elite_enterprise_mo", priceIdYearly: "price_demo_elite_enterprise_yr",
    monthlyPrice: 999, yearlyPriceEffective: 799, creditsPerMonth: 150000,
    keyFocus: "Legal, Hive & M&A",
    features: ["Full Phases 1-20 Access", "Sovereign Forge Engine", "Phantom UX Simulation", "Herald Viral Launch Agent", "Hive Mind Intelligence", "Autonomous M&A Engine", "150,000 Credits/mo"],
  },
};

export const LIFETIME_LICENSES: Record<string, LifetimeLicense> = {
  "lifetime_starter": {
    id: "lifetime_starter", name: "Lifetime Starter",
    priceId: "price_demo_lifetime_starter", price: 790,
    description: "One-time payment, lifetime access to Basic features",
    features: ["Phases 1-3 Lifetime Access", "1,000 Credits/mo Forever", "All Basic Features", "No Recurring Fees"],
  },
  "lifetime_pro": {
    id: "lifetime_pro", name: "Lifetime Pro",
    priceId: "price_demo_lifetime_pro", price: 2390,
    description: "One-time payment, lifetime access to Elite features",
    features: ["Phases 1-20 Lifetime Access", "5,000 Credits/mo Forever", "All Elite Features", "Priority Support Forever"],
  },
  "onprem_perpetual": {
    id: "onprem_perpetual", name: "On-Prem Perpetual",
    priceId: "price_demo_onprem_perpetual", price: 4999,
    description: "Self-hosted, unlimited internal use",
    features: ["Full Source Code Access", "Unlimited Internal Users", "Self-Hosted Deployment", "No Cloud Dependency", "1 Year Updates Included"],
  },
};

/**
 * Credit packs — prices are in CENTS (consistent with Stripe API).
 * createTopUpSession passes price directly to Stripe (already in cents) ✅
 */
export const CREDIT_PACKS: CreditPack[] = [
  { id: "credits_5k", credits: 5000, price: 2000, label: "Starter Pack" },
  { id: "credits_10k", credits: 10000, price: 3800, label: "Pro Boost", savings: "5% off" },
  { id: "credits_25k", credits: 25000, price: 9000, label: "Empire Surge", savings: "10% off" },
  { id: "credits_50k", credits: 50000, price: 17000, label: "Empire Overdrive", savings: "15% off" },
  { id: "credits_100k", credits: 100000, price: 32000, label: "Empire Titan", savings: "20% off" },
];

export const MARKETPLACE_CONFIG = {
  commissionRate: 0.25,
  affiliateCommissionRate: 0.20,
  minPayoutThreshold: 5000,
};
