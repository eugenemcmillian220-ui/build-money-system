export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { billingSystem } from '@/lib/billing';
import { security } from '@/lib/security';
import { requireAuth, isAuthError } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    // Check for API key in either x-api-key header or Authorization header
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey || !security.validateApiKey(apiKey)) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const userId = searchParams.get('userId');

    if (!userId) {
      const plans = billingSystem.getAvailablePlans();
      return NextResponse.json({ success: true, data: { plans } });
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
    // Check for API key in either x-api-key header or Authorization header
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey || !security.validateApiKey(apiKey)) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    const body = await req.json();
    const { action, userId } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'A userId is required' }, { status: 400 });
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
