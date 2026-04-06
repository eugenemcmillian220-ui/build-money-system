import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "./env";

/**
 * Supabase Sync: Autonomously applies SQL schemas to the database
 */
export async function syncDatabaseSchema(schema: string) {
  if (!serverEnv.SUPABASE_SERVICE_ROLE_KEY || !serverEnv.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn("[SupabaseSync] Credentials missing. Skipping schema application.");
    return;
  }

  const supabase = createClient(
    serverEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log("[SupabaseSync] Applying autonomous schema migration...");

  // Execute the schema via Supabase RPC or direct SQL if enabled
  // For production safety, we use a custom 'exec_sql' RPC if available
  const { error } = await supabase.rpc("exec_sql", { sql_query: schema });

  if (error) {
    console.error("[SupabaseSync] Migration error:", error.message);
    // Fallback: Log the schema for manual application if RPC fails
    console.info("[SupabaseSync] Please ensure 'exec_sql' RPC is enabled or apply manually.");
  } else {
    console.log("[SupabaseSync] Schema applied successfully.");
  }
}
