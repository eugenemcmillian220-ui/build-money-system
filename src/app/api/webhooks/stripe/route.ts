import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature || !webhookSecret) {
    console.error("Webhook verification failed: Missing signature or secret.");
    return NextResponse.json({ error: "Missing configuration" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (event.type === "checkout.session.completed") {
    const metadata = session.metadata;
    if (!metadata) return NextResponse.json({ status: "no_metadata" });

    const { orgId, type, credits, tier, licenseId } = metadata;

    if (!orgId) return NextResponse.json({ status: "no_org_id" });

    // Link customer ID to organization
    if (session.customer) {
      await supabaseAdmin
        .from("organizations")
        .update({ stripe_customer_id: session.customer as string })
        .eq("id", orgId);
    }

    // 1. Update Organization Balance & Tier
    if (type === "topup" && credits) {
      const amount = parseInt(credits);
      await supabaseAdmin.rpc("increment_org_balance", { org_id: orgId, amount });
    } else if (type === "subscription" && tier) {
      await supabaseAdmin
        .from("organizations")
        .update({ billing_tier: tier })
        .eq("id", orgId);
      
      // Grant initial credits for subscription based on tier
      let initialCredits = 1000;
      if (tier.includes("pro")) initialCredits = 35000;
      if (tier.includes("enterprise")) initialCredits = 150000;
      
      await supabaseAdmin.rpc("increment_org_balance", { org_id: orgId, amount: initialCredits });
    } else if (type === "lifetime_license" && licenseId) {
      await supabaseAdmin
        .from("organizations")
        .update({ billing_tier: licenseId })
        .eq("id", orgId);
      
      // Lifetime grants
      let lifetimeCredits = 1000;
      if (licenseId === "lifetime_pro") lifetimeCredits = 5000;
      await supabaseAdmin.rpc("increment_org_balance", { org_id: orgId, amount: lifetimeCredits });
    }

    // 2. Record Transaction
    await supabaseAdmin.from("credit_transactions").insert({
      org_id: orgId,
      amount: type === "topup" ? parseInt(credits!) : 0,
      type: type,
      description: `Stripe Payment: ${type}`,
      stripe_session_id: session.id,
      metadata: metadata,
    });

    // 3. Record in Agent Ledger
    await supabaseAdmin.from("agent_ledger").insert({
      org_id: orgId,
      from_agent: "Stripe",
      to_agent: "Empire Treasury",
      amount: type === "topup" ? parseInt(credits!) : 0,
      transaction_type: "top_up",
      description: `Financial Injection: ${type}`,
    });
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    // Reset tier to none on cancellation
    await supabaseAdmin
      .from("organizations")
      .update({ billing_tier: "none" })
      .eq("stripe_customer_id", customerId);
    
    console.log(`Subscription deleted for customer: ${customerId}`);
  }

  return NextResponse.json({ received: true });
}
