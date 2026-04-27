// DA-031 FIX: TODO: Use SELECT ... FOR UPDATE or atomic RPC for balance check + deduction
export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { agentEconomy } from "@/lib/economy";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ADMIN_FREE_TIER } from "@/lib/admin-emails";

export const runtime = "nodejs";

const subscribeSchema = z.object({
  skillId: z.string().uuid(),
  orgId: z.string().uuid(),
});

import { requireAuth, isAuthError } from "@/lib/api-auth";

export async function POST(request: Request): Promise<Response> {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    const supabase = await createClient();
    const body = await request.json();
    const { skillId, orgId } = subscribeSchema.parse(body);

    // 1. Fetch skill details
    const { data: skill, error: skillError } = await supabase
      .from("agent_skills")
      .select("*")
      .eq("id", skillId)
      .single();

    if (skillError || !skill) return Response.json({ error: "Skill not found" }, { status: 404 });

    // 2. Check balance and charge (admin accounts bypass)
    const { data: orgData } = await supabaseAdmin
      .from("organizations")
      .select("billing_tier")
      .eq("id", orgId)
      .single();
    const isAdmin = orgData?.billing_tier === ADMIN_FREE_TIER;

    if (!isAdmin) {
      const balance = await agentEconomy.getBalance(orgId);
      if (balance < skill.price) {
        return Response.json({ error: "Insufficient credits" }, { status: 402 });
      }
    }

    // 3. Record transaction (skip credit deduction for admin accounts)
    if (!isAdmin) {
      await agentEconomy.recordTransaction({
        orgId,
        fromAgent: "System",
        amount: skill.price,
        type: "hiring",
        description: `Subscription to agent skill: ${skill.name}`,
      });
    }

    // 4. Increment usage count
    await supabase.rpc("increment_skill_usage", { skill_id: skillId });

    return Response.json({ success: true, message: `Subscribed to ${skill.name}` });
  } catch (error) {
    console.error("Subscription error:", error);
    return Response.json({ error: "Failed to process subscription" }, { status: 500 });
  }
}
