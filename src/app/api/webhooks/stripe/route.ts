/**
 * DEPRECATED: This route is superseded by /api/billing/webhook.
 * 
 * Redirecting webhook processing to the canonical billing webhook handler
 * to prevent duplicate event processing (double charges, duplicate fulfillment).
 * 
 * Update your Stripe Dashboard webhook endpoint URL to:
 *   https://your-domain.com/api/billing/webhook
 * 
 * This stub remains to handle any in-flight events during migration.
 */

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing configuration" }, { status: 400 });
  }

  // Verify signature to prevent spoofed requests
  try {
    stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[webhooks/stripe] Invalid signature:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Log deprecation warning so we know when to remove this route
  console.warn(
    "[webhooks/stripe] DEPRECATED: This webhook endpoint received an event. " +
    "Update your Stripe Dashboard to use /api/billing/webhook instead."
  );

  // Return 200 to acknowledge receipt but DO NOT process the event.
  // The canonical /api/billing/webhook handler processes all events.
  return NextResponse.json({ 
    received: true, 
    warning: "deprecated_endpoint",
    message: "Please update webhook URL to /api/billing/webhook" 
  });
}
