/**
 * Billing System Module for Phase 6 - Autonomous AI Company Builder
 * Manages subscriptions, payments, and invoicing
 */

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
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  billingCycle: 'monthly' | 'yearly';
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
  status: 'succeeded' | 'failed' | 'pending';
  processedAt: string;
  description: string;
}

export interface Invoice {
  id: string;
  userId: string;
  subscriptionId: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'void';
  dueDate: string;
  paidAt?: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  description: string;
  amount: number;
  quantity: number;
}

const DEFAULT_PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 9,
    priceYearly: 90,
    features: ['5 projects', 'Basic AI features', 'Email support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 29,
    priceYearly: 290,
    features: ['Unlimited projects', 'Advanced AI', 'Priority support', 'API access'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthly: 99,
    priceYearly: 990,
    features: ['Everything in Pro', 'Custom AI models', 'Dedicated support', 'SLA', 'SSO'],
  },
];

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

export class BillingSystem {
  private subscriptions: Subscription[] = [];
  private payments: PaymentResult[] = [];
  private invoices: Invoice[] = [];

  getAvailablePlans(): Plan[] {
    return [...DEFAULT_PLANS];
  }

  getPlan(planId: string): Plan | null {
    return DEFAULT_PLANS.find(p => p.id === planId) ?? null;
  }

  createSubscription(userId: string, plan: Plan, billingCycle: 'monthly' | 'yearly' = 'monthly'): Subscription {
    const existing = this.subscriptions.find(s => s.userId === userId && s.status === 'active');
    if (existing) {
      existing.status = 'cancelled';
      existing.cancelledAt = new Date().toISOString();
    }

    const now = new Date();
    const periodEnd = billingCycle === 'yearly' ? addYears(now, 1) : addMonths(now, 1);

    const subscription: Subscription = {
      id: Math.random().toString(36).substring(2, 11),
      userId,
      plan,
      status: 'active',
      billingCycle,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      createdAt: now.toISOString(),
    };

    this.subscriptions.push(subscription);
    return subscription;
  }

  getSubscription(userId: string): Subscription | null {
    return this.subscriptions.find(s => s.userId === userId && s.status === 'active') ?? null;
  }

  cancelSubscription(userId: string): Subscription | null {
    const subscription = this.subscriptions.find(s => s.userId === userId && s.status === 'active');
    if (!subscription) return null;

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date().toISOString();
    return subscription;
  }

  processPayment(userId: string, amount: number, description = 'Subscription payment'): PaymentResult {
    const success = amount > 0;

    const payment: PaymentResult = {
      id: Math.random().toString(36).substring(2, 11),
      userId,
      amount,
      currency: 'USD',
      status: success ? 'succeeded' : 'failed',
      processedAt: new Date().toISOString(),
      description,
    };

    this.payments.push(payment);
    return payment;
  }

  getPaymentHistory(userId: string): PaymentResult[] {
    return this.payments.filter(p => p.userId === userId);
  }

  generateInvoice(userId: string, subscriptionId: string, items: InvoiceItem[]): Invoice {
    const total = items.reduce((sum, item) => sum + item.amount * item.quantity, 0);
    const dueDate = addMonths(new Date(), 0);
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice: Invoice = {
      id: Math.random().toString(36).substring(2, 11),
      userId,
      subscriptionId,
      amount: total,
      status: 'unpaid',
      dueDate: dueDate.toISOString(),
      items,
    };

    this.invoices.push(invoice);
    return invoice;
  }

  getInvoices(userId: string): Invoice[] {
    return this.invoices.filter(i => i.userId === userId);
  }

  clearAll(): void {
    this.subscriptions = [];
    this.payments = [];
    this.invoices = [];
  }
}

export const billingSystem = new BillingSystem();
