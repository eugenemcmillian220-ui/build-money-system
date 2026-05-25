// src/app/api/v1/billing/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createSvcClient } from '@supabase/supabase-js';
import { apiSuccess, apiError, zodErrorToApiError, unknownErrorToApiError } from '@/lib/api/response';
import { ErrorCode } from '@/lib/error-codes';
import { BillingCheckoutSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

function getStripe() {
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return apiError(ErrorCode.NOT_AUTHENTICATED);

    const body = await req.json().catch(() => null);
    const parsed = BillingCheckoutSchema.safeParse(body);
    if (!parsed.success) return zodErrorToApiError(parsed.error);

    const { priceId, successUrl, cancelUrl } = parsed.data;
    const stripe = getStripe();
    const service = svc();

    // Get or create Stripe customer
    const { data: sub } = await service
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    let customerId = sub?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      // Store customer ID
      await service.from('subscriptions').upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        plan_tier: 'free',
        status: 'active',
      }, { onConflict: 'user_id' });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: user.id,
      automatic_tax: { enabled: true },
      customer_update: { address: 'auto' },
      metadata: { user_id: user.id },
    });

    return apiSuccess({ url: session.url, sessionId: session.id });
  } catch (err) {
    return unknownErrorToApiError(err, 'billing/checkout');
  }
}
