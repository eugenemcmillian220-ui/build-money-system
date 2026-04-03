import Stripe from "stripe";
import { billingEngine } from "@/lib/billing-engine";
import { headers } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2024-06-20",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature") || "";

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error(`[Stripe Webhook] Error verifying signature:`, err);
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  // Handle the event
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { orgId, type, credits, tier } = session.metadata || {};

        if (orgId) {
          if (type === "topup" && credits) {
            await billingEngine.processTopUp(orgId, parseInt(credits, 10), session.id);
          } else if (type === "subscription" && tier) {
            await billingEngine.processSubscriptionUpdate(orgId, tier, session.subscription as string, "active");
          }
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const { orgId, tier } = subscription.metadata || {};

        if (orgId && tier) {
          await billingEngine.processSubscriptionUpdate(orgId, tier, subscription.id, subscription.status);
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type ${event.type}`);
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error(`[Stripe Webhook] Error processing event ${event.type}:`, err);
    return new Response(`Webhook processing failed`, { status: 500 });
  }
}
