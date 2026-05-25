// src/app/api/webhooks/stripe/route.ts
// Production-grade idempotent Stripe webhook handler

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import * as Sentry from '@sentry/nextjs';
import { createClient as createSvcClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
// Required: disable body parsing so we can verify signature
export const config = { api: { bodyParser: false } };

const WEBHOOK_TOLERANCE_SECONDS = 300;

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key, { apiVersion: '2026-04-22.dahlia' as const });
}

function svc() {
  return createSvcClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ─── Signature verification ───────────────────────────────────
async function verifyStripeSignature(req: NextRequest): Promise<Stripe.Event | null> {
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    console.error('[webhook/stripe] Missing signature or secret');
    return null;
  }

  const body = await req.text();
  try {
    const stripe = getStripe();
    return stripe.webhooks.constructEvent(body, sig, secret, WEBHOOK_TOLERANCE_SECONDS);
  } catch (err) {
    Sentry.captureException(err, { extra: { sig, headers: Object.fromEntries(req.headers) } });
    console.error('[webhook/stripe] Signature verification failed:', err);
    return null;
  }
}

// ─── Idempotency check ────────────────────────────────────────
async function markEventProcessed(stripeEventId: string, type: string, payload: unknown): Promise<boolean> {
  const supabase = svc();

  // Try to insert — will fail on unique constraint if already processed
  const { error } = await supabase.from('stripe_events').insert({
    stripe_event_id: stripeEventId,
    type,
    payload,
  });

  if (error?.code === '23505') {
    // Duplicate — already processed
    return false;
  }
  if (error) throw new Error(`Failed to record stripe event: ${error.message}`);
  return true;
}

async function markEventComplete(stripeEventId: string): Promise<void> {
  await svc().from('stripe_events')
    .update({ processed_at: new Date().toISOString() })
    .eq('stripe_event_id', stripeEventId);
}

async function markEventFailed(stripeEventId: string, error: string): Promise<void> {
  await svc().from('stripe_events')
    .update({ processing_error: error })
    .eq('stripe_event_id', stripeEventId);
}

// ─── Event handlers ───────────────────────────────────────────
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.client_reference_id ?? session.metadata?.user_id;
  if (!userId) return;

  const supabase = svc();
  const stripe = getStripe();

  if (session.subscription) {
    const sub = await stripe.subscriptions.retrieve(session.subscription as string);
    const priceId = sub.items.data[0]?.price.id ?? '';

    await supabase.from('subscriptions').upsert({
      user_id: userId,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: sub.id,
      stripe_price_id: priceId,
      status: sub.status,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      current_period_start: new Date(((sub as any).current_period_start ?? 0) * 1000).toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      current_period_end: new Date(((sub as any).current_period_end ?? 0) * 1000).toISOString(),
      plan_tier: getPlanTierFromPriceId(priceId),
    }, { onConflict: 'user_id' });

    // Provision credits based on plan
    const creditsToAdd = getCreditsForPlan(getPlanTierFromPriceId(priceId));
    if (creditsToAdd > 0) {
      await supabase.rpc('add_credits_atomic', { p_user_id: userId, p_amount: creditsToAdd });
    }
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;
  const supabase = svc();

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('user_id, plan_tier')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!sub) return;

  await supabase.from('subscriptions').update({ status: 'active' }).eq('stripe_customer_id', customerId);

  // Provision monthly credits
  const creditsToAdd = getCreditsForPlan(sub.plan_tier as string);
  if (creditsToAdd > 0) {
    await supabase.rpc('add_credits_atomic', { p_user_id: sub.user_id, p_amount: creditsToAdd });
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;
  await svc().from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_customer_id', customerId);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id ?? '';

  await svc().from('subscriptions').update({
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    status: subscription.status,
    plan_tier: getPlanTierFromPriceId(priceId),
    current_period_start: new Date((subscription as unknown as { current_period_start: number }).current_period_start * 1000 || Date.now()).toISOString(),
    current_period_end: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000 || Date.now() + 30*86400*1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
  }).eq('stripe_customer_id', customerId);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;
  await svc().from('subscriptions').update({
    status: 'canceled',
    plan_tier: 'free',
  }).eq('stripe_customer_id', customerId);
}

async function handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;
  const { data: sub } = await svc()
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (sub) {
    // Create notification
    await svc().from('notifications').insert({
      user_id: sub.user_id,
      type: 'trial_ending',
      title: 'Your trial ends in 3 days',
      body: 'Add a payment method to continue using the service.',
      action_url: '/dashboard/billing',
    });
  }
}

async function handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
  const chargeId = dispute.charge as string;
  const supabase = svc();

  // Look up user by charge
  const stripe = getStripe();
  let userId: string | undefined;
  try {
    const charge = await stripe.charges.retrieve(chargeId);
    const customerId = charge.customer as string;
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single();
    userId = sub?.user_id as string | undefined;
  } catch {}

  // Log dispute
  await supabase.from('disputes').insert({
    user_id: userId ?? null,
    stripe_dispute_id: dispute.id,
    stripe_charge_id: chargeId,
    amount_cents: dispute.amount,
    currency: dispute.currency,
    reason: dispute.reason,
    status: dispute.status,
    evidence_due_by: dispute.evidence_details?.due_by
      ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
      : null,
  });

  // Flag user account
  if (userId) {
    await supabase.from('subscriptions').update({ account_flagged: true, status: 'paused' }).eq('user_id', userId);
  }

  // Notify admin via Slack
  const slackUrl = process.env.SLACK_WEBHOOK_URL;
  if (slackUrl) {
    await fetch(slackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `⚠️ *Stripe Dispute Created*\nDispute ID: ${dispute.id}\nAmount: ${dispute.amount / 100} ${dispute.currency.toUpperCase()}\nReason: ${dispute.reason}\nUser ID: ${userId ?? 'unknown'}`,
      }),
    }).catch(console.error);
  }
}

async function handlePaymentRequiresAction(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  console.log(`[webhook/stripe] Payment requires action: ${paymentIntent.id}`);
  // Notification handled by Stripe's built-in email
}

// ─── Helpers ──────────────────────────────────────────────────
function getPlanTierFromPriceId(priceId: string): string {
  const env = process.env;
  if (priceId === env.STRIPE_BASIC_PRO_MONTHLY_PRICE_ID || priceId === env.STRIPE_BASIC_PRO_YEARLY_PRICE_ID) return 'pro';
  if (priceId === env.STRIPE_BASIC_STARTER_MONTHLY_PRICE_ID || priceId === env.STRIPE_BASIC_STARTER_YEARLY_PRICE_ID) return 'starter';
  if (priceId === env.STRIPE_ELITE_ENTERPRISE_MONTHLY_PRICE_ID) return 'enterprise';
  return 'starter';
}

function getCreditsForPlan(planTier: string): number {
  const map: Record<string, number> = { starter: 50, pro: 200, enterprise: 1000, free: 0 };
  return map[planTier] ?? 0;
}

// ─── Main handler ─────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  const event = await verifyStripeSignature(req);
  if (!event) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Idempotency check — store event before processing
  let isNew: boolean;
  try {
    isNew = await markEventProcessed(event.id, event.type, event);
  } catch (err) {
    Sentry.captureException(err, { extra: { eventId: event.id } });
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
  }

  if (!isNew) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;
      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object as Stripe.Dispute);
        break;
      case 'payment_intent.requires_action':
        await handlePaymentRequiresAction(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        console.log(`[webhook/stripe] Unhandled event type: ${event.type}`);
    }

    await markEventComplete(event.id);
    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    Sentry.captureException(err, { extra: { eventId: event.id, eventType: event.type } });
    await markEventFailed(event.id, message);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
