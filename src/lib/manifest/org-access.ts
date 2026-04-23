import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Verifies an authenticated user can act on behalf of an organization.
 * Access is granted if the user is either the org owner (organizations.owner_id)
 * or a row in org_members. Mirrors the RLS policy on manifestations so
 * API routes that go through supabaseAdmin (and therefore bypass RLS) still
 * honour the same access rules.
 */
export async function userCanAccessOrg(userId: string, orgId: string): Promise<boolean> {
  const [ownerCheck, memberCheck] = await Promise.all([
    supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("id", orgId)
      .eq("owner_id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("org_members")
      .select("user_id")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  return Boolean(ownerCheck.data || memberCheck.data);
}
