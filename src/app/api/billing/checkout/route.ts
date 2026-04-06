import { stripeService } from "@/lib/stripe";
import { z } from "zod";

export const runtime = "nodejs";

const requestSchema = z.object({
  orgId: z.string().uuid(),
  type: z.enum(["topup", "subscription", "lifetime"]),
  packId: z.string().optional(), // For topup - use pack ID instead of amount/credits
  tier: z.string().optional(), // For subscription
  licenseId: z.string().optional(), // For lifetime license
  interval: z.enum(["monthly", "yearly"]).optional().default("monthly"),
  affiliateCode: z.string().optional(), // For affiliate tracking
});

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = requestSchema.parse(body);

    let checkoutUrl: string;

    if (parsed.type === "topup") {
      if (!parsed.packId) {
        return Response.json({ error: "Missing packId for credit topup" }, { status: 400 });
      }
      checkoutUrl = await stripeService.createTopUpSession(parsed.orgId, parsed.packId, parsed.affiliateCode);
    } else if (parsed.type === "lifetime") {
      if (!parsed.licenseId) {
        return Response.json({ error: "Missing licenseId for lifetime purchase" }, { status: 400 });
      }
      checkoutUrl = await stripeService.createLifetimeLicenseSession(
        parsed.orgId, 
        parsed.licenseId, 
        parsed.affiliateCode
      );
    } else {
      if (!parsed.tier) {
        return Response.json({ error: "Missing tier for subscription" }, { status: 400 });
      }
      checkoutUrl = await stripeService.createSubscriptionSession(
        parsed.orgId, 
        parsed.tier, 
        parsed.interval,
        parsed.affiliateCode
      );
    }

    return Response.json({ url: checkoutUrl });
  } catch (error) {
    console.error("Checkout error:", error);
    const message = error instanceof Error ? error.message : "Failed to create checkout session";
    return Response.json({ error: message }, { status: 500 });
  }
}
