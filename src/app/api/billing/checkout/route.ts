export const dynamic = "force-dynamic";
import { stripeService } from "@/lib/stripe";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const requestSchema = z.object({
  orgId: z.string().uuid(),
  type: z.enum(["topup", "subscription", "lifetime"]),
  packId: z.string().optional(),
  tier: z.string().optional(),
  licenseId: z.string().optional(),
  interval: z.enum(["monthly", "yearly"]).optional().default("monthly"),
  affiliateCode: z.string().optional(),
});

export async function POST(request: Request): Promise<Response> {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    const body = await request.json();
    const parsed = requestSchema.parse(body);

    // SECURITY FIX: Verify user belongs to this org before creating checkout
    const supabase = getSupabaseAdmin();
    const { data: membership, error: memberErr } = await supabase
      .from("org_members")
      .select("id")
      .eq("org_id", parsed.orgId)
      .eq("user_id", authResult.userId)
      .maybeSingle();

    if (memberErr || !membership) {
      return Response.json(
        { error: "You are not a member of this organization" },
        { status: 403 }
      );
    }

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
