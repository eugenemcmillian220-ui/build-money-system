import { createServiceClient } from './supabase.js';

export async function refundCredits(userId: string, amount: number): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.rpc('increment_credits', { p_user_id: userId, p_amount: amount });
  if (error) throw new Error('refundCredits RPC failed: ' + error.message);
}
