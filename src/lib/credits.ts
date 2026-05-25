// src/lib/credits.ts
// Credit management with atomic updates and transaction logging

import 'server-only';
import { createClient as createSvcClient } from '@supabase/supabase-js';
import { AppError, ErrorCode } from './error-codes';

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createSvcClient(url, key, { auth: { persistSession: false } });
}

export async function deductCredits(
  userId: string,
  amount: number,
  description: string,
  jobId?: string,
): Promise<{ newBalance: number }> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc('deduct_credits_atomic', {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) {
    if (error.message?.includes('insufficient')) {
      throw new AppError(ErrorCode.INSUFFICIENT_CREDITS);
    }
    throw new AppError(ErrorCode.INTERNAL_ERROR, error.message);
  }

  const newBalance = data as number;

  // Log transaction (non-blocking)
  Promise.resolve(supabase.from('credit_transactions').insert({
    user_id: userId,
    amount: -amount,
    balance_after: newBalance,
    description,
    job_id: jobId ?? null,
  })).then(() => {}).catch(console.error);

  return { newBalance };
}

export async function checkAndDeductCredits(
  userId: string,
  amount: number,
): Promise<{ success: boolean; error?: string; remainingCredits: number }> {
  try {
    const result = await deductCredits(userId, amount, 'Pipeline credit deduction');
    return { success: true, remainingCredits: result.newBalance };
  } catch (err) {
    if (err instanceof AppError && err.code === ErrorCode.INSUFFICIENT_CREDITS) {
      return { success: false, error: 'Insufficient credits', remainingCredits: 0 };
    }
    return { success: false, error: 'Credit deduction failed', remainingCredits: 0 };
  }
}

export async function refundCredits(
  userId: string,
  amount: number,
  description = 'Pipeline refund',
): Promise<void> {
  const supabase = createServiceClient();

  await supabase.rpc('add_credits_atomic', {
    p_user_id: userId,
    p_amount: amount,
  });

  Promise.resolve(supabase.from('credit_transactions').insert({
    user_id: userId,
    amount,
    balance_after: 0,
    description,
  })).then(() => {}).catch(console.error);
}

export async function getCreditsBalance(userId: string): Promise<number> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', userId)
    .single();
  return data?.balance ?? 0;
}
