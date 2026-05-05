export const dynamic = "force-dynamic";
import Stripe from "stripe";
import { billingEngine } from "@/lib/billing-engine";
import { headers } from "next/headers";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: "STRIPE_SECRET_KEY not configured" }, { status: 503 });
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ error: "STRIPE_WEBHOOK_SECRET not configured" }, { status: 503 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-04-22.dahlia",
  });
  const webhookSecret: string = process.env.STRIPE_WEBHOOK_SECRET;

  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  // SECURITY FIX: Reject requests with no signature header
  if (!signature) {
    logger.warn("Stripe webhook received without stripe-signature header");
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    // SECURITY FIX: Only log error message, not full object (may contain sensitive metadata)
    logger.error("Stripe webhook signature verification failed", {
      message: (err as Error).message,
    });
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
            if (affiliateCode && session.amount_total) {
              await billingEngine.processAffiliateCommission(affiliateCode, orgId, session.amount_total, "subscription");
            }
          } else if (type === "lifetime_license" && licenseId) {
            await billingEngine.processLifetimeLicense(orgId, licenseId, session.id, affiliateCode);
          } else {
            logger.warn("checkout.session.completed: unhandled metadata combination", {
              orgId, type, eventId: event.id,
            });
          }
        } else {
          logger.warn("checkout.session.completed: missing orgId in metadata", { eventId: event.id });
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const { orgId, tier } = subscription.metadata || {};

        if (orgId && tier) {
          await billingEngine.processSubscriptionUpdate(orgId, tier, subscription.id, subscription.status);
        } else {
          logger.warn(`${event.type}: missing orgId or tier in metadata`, { eventId: event.id });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | { id: string } | null };

        // Handle subscription renewal payments
        const subscriptionId = typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const { orgId, tier } = subscription.metadata || {};

          if (orgId && tier && subscription.status === "active") {
            await billingEngine.processSubscriptionRenewal(orgId, tier, subscription.id);
          }
        }

        // Handle one-time payments (fallback for top-ups not caught by checkout.session.completed)
        if (invoice.metadata?.orgId && invoice.metadata?.credits && invoice.id) {
          await billingEngine.processTopUp(
            invoice.metadata.orgId,
            parseInt(invoice.metadata.credits, 10),
            invoice.id
          );
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | { id: string } | null };

        const subscriptionId = typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const { orgId } = subscription.metadata || {};

          if (orgId && invoice.id) {
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
    logger.error("Stripe webhook processing failed", {
      eventType: event.type,
      message: (err as Error).message,
    });
    return new Response(`Webhook processing failed`, { status: 500 });
  }
}
