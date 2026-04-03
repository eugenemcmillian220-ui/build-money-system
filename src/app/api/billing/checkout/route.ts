import { stripeService } from "@/lib/stripe";
import { z } from "zod";

export const runtime = "nodejs";

const requestSchema = z.object({
  orgId: z.string().uuid(),
  type: z.enum(["topup", "subscription"]),
  amount: z.number().int().optional(), // In cents (for topup)
  credits: z.number().int().optional(), // For topup
  tier: z.string().optional(), // For subscription
  interval: z.enum(["monthly", "yearly"]).optional().default("monthly"),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = requestSchema.parse(body);

    let checkoutUrl: string;

    if (parsed.type === "topup") {
      if (!parsed.amount || !parsed.credits) {
        return Response.json({ error: "Missing amount or credits for topup" }, { status: 400 });
      }
      checkoutUrl = await stripeService.createTopUpSession(parsed.orgId, parsed.amount, parsed.credits);
    } else {
      if (!parsed.tier) {
        return Response.json({ error: "Missing tier for subscription" }, { status: 400 });
      }
      checkoutUrl = await stripeService.createSubscriptionSession(parsed.orgId, parsed.tier, parsed.interval);
    }

    return Response.json({ url: checkoutUrl });
  } catch (error) {
    console.error("Checkout error:", error);
    const message = error instanceof Error ? error.message : "Failed to create checkout session";
    return Response.json({ error: message }, { status: 500 });
  }
}
