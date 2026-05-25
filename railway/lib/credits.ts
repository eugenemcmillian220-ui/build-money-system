// railway/lib/credits.ts
// Credit management for Railway pipeline worker
import { createServiceClient } from './supabase.js';

/**
 * Refund credits to a user after a failed pipeline run.
 * Uses the increment_credits RPC for atomic update.
 */
export async function refundCredits(userId: string, amount: number): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.rpc('increment_credits', {
    p_user_id: userId,
    p_amount: amount,
  });
  if (error) throw new Error(`refundCredits RPC failed: ${error.message}`);
}

/**
 * Deduct credits from a user atomically.
 * Returns the new balance or throws if insufficient.
 */
export async function deductCredits(
  userId: string,
  amount: number,
  description: string,
  jobId?: string
): Promise<{ newBalance: number }> {
  const supabase = createServiceClient();

  // Use a transaction-safe RPC to deduct credits atomically
  const { data, error } = await supabase.rpc('deduct_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_description: description,
    p_job_id: jobId ?? null,
  });

  if (error) throw new Error(`deductCredits RPC failed: ${error.message}`);
  if (!data || typeof data !== 'object') throw new Error('deductCredits: unexpected RPC response');

  const result = data as { success: boolean; new_balance: number; error?: string };
  if (!result.success) throw new Error(result.error ?? 'Insufficient credits');

  return { newBalance: result.new_balance };
}
