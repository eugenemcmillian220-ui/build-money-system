import { createClient } from '@supabase/supabase-js'

// Uses service role for atomic credit operations
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { persistSession: false } })
}

export interface CreditResult {
  success: boolean
  remainingCredits: number
  error?: string
}

/**
 * Atomically checks and deducts credits before pipeline starts.
 * Uses a Supabase RPC function with row-level locking to prevent
 * race conditions from concurrent pipeline triggers.
 */
export async function checkAndDeductCredits(
  userId: string,
  amount: number
): Promise<CreditResult> {
  const supabase = getServiceClient()

  const { data, error } = await supabase.rpc('deduct_credits', {
    p_user_id: userId,
    p_amount: amount,
  })

  if (error) {
    // Supabase surfaces the RAISE EXCEPTION message here
    const isInsufficient = error.message?.includes('Insufficient credits')
    return {
      success: false,
      remainingCredits: 0,
      error: isInsufficient ? 'Insufficient credits' : error.message,
    }
  }

  return {
    success: true,
    remainingCredits: data as number,
  }
}

/**
 * Refunds credits if pipeline fails before phase 1 completes.
 * Call this from error recovery logic.
 */
export async function refundCredits(
  userId: string,
  amount: number
): Promise<void> {
  const supabase = getServiceClient()
  await supabase
    .from('user_credits')
    .update({
      balance: supabase.rpc('increment_credits', {
        p_user_id: userId,
        p_amount: amount,
      }),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
}

/**
 * Get current credit balance for display in UI.
 * Use anon client since RLS allows users to read own balance.
 */
export async function getCreditBalance(userId: string): Promise<number> {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', userId)
    .single()
  return data?.balance ?? 0
}
