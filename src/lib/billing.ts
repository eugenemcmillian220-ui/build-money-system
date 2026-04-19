/**
 * @deprecated This module is a legacy facade. New code should use:
 * - billing-engine.ts for Supabase-backed billing operations
 * - stripe.ts for Stripe SDK operations
 * 
 * This file wraps billing-engine.ts to maintain backward compatibility
 * with /api/billing/route.ts. It will be removed in a future release.
 */
import "server-only";
import { billingEngine } from "./billing-engine";
import { stripeService, BILLING_TIERS, CREDIT_PACKS } from "./stripe";

export interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
}

export interface Subscription {
  id: string;
  userId: string;
  plan: Plan;
  status: "active" | "cancelled" | "past_due" | "trialing";
  billingCycle: "monthly" | "yearly";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  createdAt: string;
  cancelledAt?: string;
}

export interface PaymentResult {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: "succeeded" | "failed" | "pending";
  processedAt: string;
  description: string;
}

export interface Invoice {
  id: string;
  userId: string;
  subscriptionId: string;
  amount: number;
  status: "paid" | "unpaid" | "void";
  dueDate: string;
  paidAt?: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  description: string;
  amount: number;
  quantity: number;
}

/**
 * Maps Stripe BILLING_TIERS to the legacy Plan interface.
 * Used by /api/billing/route.ts GET for plan listing.
 */
function toLegacyPlans(): Plan[] {
  return Object.values(BILLING_TIERS).map((tier) => ({
    id: tier.id,
    name: tier.name,
    priceMonthly: tier.monthlyPrice,
    priceYearly: tier.yearlyPriceEffective * 12,
    features: tier.features,
  }));
}

/**
 * @deprecated Use billing-engine.ts or stripe.ts directly.
 */
export class BillingSystem {
  getAvailablePlans(): Plan[] {
    return toLegacyPlans();
  }

  getPlan(planId: string): Plan | null {
    const plans = toLegacyPlans();
    return plans.find((p) => p.id === planId) ?? null;
  }

  /**
   * @deprecated Subscriptions are managed via Stripe webhooks → billing-engine.ts
   */
  createSubscription(
    _userId: string,
    plan: Plan,
    _billingCycle: "monthly" | "yearly" = "monthly"
  ): Subscription {
    console.warn(
      "[billing.ts] createSubscription called on deprecated facade. " +
      "Subscriptions should be created via Stripe Checkout → webhook → billing-engine.ts"
    );
    // Return a stub — the real subscription is created by Stripe webhook handler
    return {
      id: crypto.randomUUID(),
      userId: _userId,
      plan,
      status: "active",
      billingCycle: _billingCycle,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  getSubscription(_userId: string): Subscription | null {
    console.warn(
      "[billing.ts] getSubscription called on deprecated facade. " +
      "Use Supabase billing_subscriptions table via billing-engine.ts instead."
    );
    return null;
  }

  cancelSubscription(_userId: string): Subscription | null {
    console.warn(
      "[billing.ts] cancelSubscription called on deprecated facade."
    );
    return null;
  }

  processPayment(
    userId: string,
    amount: number,
    description = "Subscription payment"
  ): PaymentResult {
    console.warn(
      "[billing.ts] processPayment called on deprecated facade. " +
      "Payments should flow through Stripe → webhook → billing-engine.ts"
    );
    return {
      id: crypto.randomUUID(),
      userId,
      amount,
      currency: "USD",
      status: amount > 0 ? "succeeded" : "failed",
      processedAt: new Date().toISOString(),
      description,
    };
  }

  getPaymentHistory(_userId: string): PaymentResult[] {
    return [];
  }

  getInvoices(_userId: string): Invoice[] {
    return [];
  }

  clearAll(): void {
    // No-op — data lives in Supabase now
  }
}

export const billingSystem = new BillingSystem();
