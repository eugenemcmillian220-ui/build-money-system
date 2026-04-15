import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Supabase Admin client (service role — bypasses RLS).
 * 
 * Fails loud at import time if credentials are missing in production,
 * instead of silently returning null and crashing at random call sites.
 * In development/build, returns null gracefully to avoid blocking local work.
 */
function createAdminClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) {
    const isProduction = process.env.NODE_ENV === "production";
    const isBuildTime = process.env.NEXT_PHASE === "phase-production-build";

    if (isProduction && !isBuildTime) {
      throw new Error(
        "FATAL: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in production. " +
        "Set them in your Vercel environment variables."
      );
    }

    console.warn(
      "[supabase/admin] Missing credentials — admin client unavailable. " +
      "This is OK during build or local dev without Supabase."
    );
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

const _adminClient = createAdminClient();

/**
 * Use this getter instead of the raw client.
 * Throws immediately with a clear message if the client isn't available,
 * instead of failing with "Cannot read properties of null" deep in a call stack.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!_adminClient) {
    throw new Error(
      "Supabase admin client is not initialized. " +
      "Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
    );
  }
  return _adminClient;
}

/**
 * Legacy export for backward compatibility.
 * Prefer getSupabaseAdmin() in new code for explicit null safety.
 */
export const supabaseAdmin: SupabaseClient = _adminClient as SupabaseClient;
