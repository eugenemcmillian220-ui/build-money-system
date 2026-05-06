import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

let _client: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Lazy singleton for client-side usage.
 * Deferred so the module can be imported during SSR/build without throwing.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    if (!_client) {
      _client = createClient();
    }
    const value = Reflect.get(_client, prop, receiver);
    return typeof value === "function" ? value.bind(_client) : value;
  },
});
