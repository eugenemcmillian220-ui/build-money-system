export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { billingSystem } from '@/lib/billing';
import { requireAuth, isAuthError } from "@/lib/api-auth";

// SECURITY FIX: Removed mixed session+API key auth. 
// Session auth via requireAuth() is the single source of truth.
// The old code accepted any valid API key alongside a session,
// without verifying the key belonged to the session user.

export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    const { searchParams } = req.nextUrl;
    const userId = searchParams.get('userId');

    if (!userId) {
      const plans = billingSystem.getAvailablePlans();
      return NextResponse.json({ success: true, data: { plans } });
    }

    // SECURITY FIX: Verify user can only access their own billing data
    if (userId !== authResult.userId) {
      return NextResponse.json({ error: 'Cannot access other user billing data' }, { status: 403 });
    }

    const subscription = billingSystem.getSubscription(userId);
    const invoices = billingSystem.getInvoices(userId);
    const payments = billingSystem.getPaymentHistory(userId);

    return NextResponse.json({ success: true, data: { subscription, invoices, payments } });
  } catch (error) {
    console.error('Billing GET Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve billing information' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    const body = await req.json();
    const { action, userId } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'A userId is required' }, { status: 400 });
    }

    // SECURITY FIX: Verify user can only modify their own billing
    if (userId !== authResult.userId) {
      return NextResponse.json({ error: 'Cannot modify other user billing' }, { status: 403 });
    }

    if (action === 'cancel') {
      const subscription = billingSystem.cancelSubscription(userId);
      if (!subscription) {
        return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: subscription });
    }

    if (action === 'payment') {
      const { amount, description } = body;
      if (typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json({ error: 'A positive amount is required' }, { status: 400 });
      }
      const payment = billingSystem.processPayment(userId, amount, description);
      return NextResponse.json({ success: true, data: payment });
    }

    const { planId, billingCycle } = body;
    if (!planId) {
      return NextResponse.json({ error: 'A planId is required' }, { status: 400 });
    }

    const plan = billingSystem.getPlan(planId);
    if (!plan) {
      return NextResponse.json({ error: `Plan '${planId}' not found` }, { status: 404 });
    }

    const subscription = billingSystem.createSubscription(userId, plan, billingCycle ?? 'monthly');
    return NextResponse.json({ success: true, data: subscription }, { status: 201 });
  } catch (error) {
    console.error('Billing POST Error:', error);
    return NextResponse.json({ error: 'Failed to process billing request' }, { status: 500 });
  }
}
