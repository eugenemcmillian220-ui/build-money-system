export function applyIntegrations(files: Record<string, string>, integrations: string[] = []): Record<string, string> {
  const newFiles = { ...files };

  if (integrations.includes("stripe")) {
    if (!newFiles["lib/stripe.ts"]) {
      newFiles["lib/stripe.ts"] = `import Stripe from "stripe";

const stripeKey = process.env.STRIPE_SECRET_KEY || "";

export const stripe = new Stripe(stripeKey, {
  apiVersion: "2025-01-27.acacia" as any,
});
`;
    }

    if (!newFiles["app/api/checkout/route.ts"]) {
      newFiles["app/api/checkout/route.ts"] = `import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const { priceId } = await req.json();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: \`\${process.env.NEXT_PUBLIC_SITE_URL}/success\`,
      cancel_url: \`\${process.env.NEXT_PUBLIC_SITE_URL}/cancel\`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
`;
    }
  }

  if (integrations.includes("supabase")) {
    if (!newFiles["lib/supabase.ts"] && !newFiles["lib/db.ts"]) {
      newFiles["lib/supabase.ts"] = `import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
`;
    }
  }

  return newFiles;
}
