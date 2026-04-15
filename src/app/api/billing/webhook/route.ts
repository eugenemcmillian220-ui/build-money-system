import Stripe from "stripe";
import { billingEngine } from "@/lib/billing-engine";
import { headers } from "next/headers";
import { logger } from "@/lib/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
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
    logger.error("Stripe webhook signature verification failed", { error: err });
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  // Handle the event
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { orgId, type, credits, tier, licenseId, affiliateCode } = session.metadata || {};

        if (orgId) {
          if (type === "topup" && credits) {
            await billingEngine.processTopUp(orgId, parseInt(credits, 10), session.id);
          } else if (type === "subscription" && tier) {
            await billingEngine.processSubscriptionUpdate(orgId, tier, session.subscription as string, "active");
            // Process affiliate commission for subscription
            if (affiliateCode && session.amount_total) {
              await billingEngine.processAffiliateCommission(affiliateCode, orgId, session.amount_total, "subscription");
            }
          } else if (type === "lifetime_license" && licenseId) {
            await billingEngine.processLifetimeLicense(orgId, licenseId, session.id, affiliateCode);
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

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Handle subscription renewal payments
        const subscriptionId = (invoice as unknown as { subscription?: string }).subscription;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const { orgId, tier } = subscription.metadata || {};

          if (orgId && tier && subscription.status === "active") {
            await billingEngine.processSubscriptionRenewal(orgId, tier, subscription.id);
          }
        }
        
        // Handle one-time payments (fallback for top-ups not caught by checkout.session.completed)
        if (invoice.metadata?.orgId && invoice.metadata?.credits) {
          await billingEngine.processTopUp(
            invoice.metadata.orgId, 
            parseInt(invoice.metadata.credits, 10), 
            invoice.id
          );
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        
        const subscriptionId = (invoice as unknown as { subscription?: string }).subscription;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const { orgId } = subscription.metadata || {};

          if (orgId) {
            await billingEngine.processPaymentFailure(orgId, subscription.id, invoice.id);
          }
        }
        break;
      }

      default:
        logger.info("Stripe webhook unhandled event type", { eventType: event.type });
    }

    return Response.json({ received: true });
  } catch (err) {
    logger.error("Stripe webhook processing failed", { eventType: event.type, error: err });
    return new Response(`Webhook processing failed`, { status: 500 });
  }
}
