import { createClient } from '@supabase/supabase-js';

export function createServiceClient() {
  // Railway uses SUPABASE_URL, not NEXT_PUBLIC_SUPABASE_URL
  // Set both in Railway dashboard to be safe during transition
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase service role configuration');
  return createClient(url, key, { auth: { persistSession: false } });
}
