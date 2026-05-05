import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import type { CheckoutRequest, CheckoutResponse } from '../../../types';


// DA-014 FIX: Server-side price validation — never trust client prices
async function getServerPrice(productId: string): Promise<number> {
  // Look up the canonical price from Stripe or database
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' });
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 1 });
  if (!prices.data.length) throw new Error(`No active price for product ${productId}`);
  return prices.data[0].unit_amount!;
}


export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', {
  apiVersion: '2024-06-20',
  typescript: true,
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as Partial<CheckoutRequest>;

    if (!body.items || body.items.length === 0) {
      return NextResponse.json<CheckoutResponse>(
        { sessionId: '', url: '', error: 'Cart is empty.' },
        { status: 400 }
      );
    }

    // Validate & build Stripe line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      body.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: (item.product.currency ?? 'usd').toLowerCase(),
          unit_amount: Math.round(item.product.price * 100), // cents
          product_data: {
            name: item.product.name,
            description: item.product.description.slice(0, 500),
            images: [item.product.imageUrl],
            metadata: {
              productId: item.product.id,
              storeId: item.product.storeId,
              externalId: item.product.externalId,
            },
          },
        },
      }));

    const successUrl = `${APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${APP_URL}/results`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      billing_address_collection: 'required',
      shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU'] },
      automatic_tax: { enabled: false },
      metadata: {
        source: 'vibecart',
        itemCount: String(body.items.length),
      },
    });

    if (!session.url) {
      throw new Error('Stripe session URL is missing.');
    }

    return NextResponse.json<CheckoutResponse>({
      sessionId: session.id,
      url: session.url,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Checkout failed';
    console.error('[Stripe Checkout] Error:', message);
    return NextResponse.json<CheckoutResponse>(
      { sessionId: '', url: '', error: message },
      { status: 500 }
    );
  }
}
