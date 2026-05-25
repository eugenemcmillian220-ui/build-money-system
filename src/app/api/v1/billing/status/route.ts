// src/app/api/v1/billing/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { apiSuccess, apiError, unknownErrorToApiError } from '@/lib/api/response';
import { ErrorCode } from '@/lib/error-codes';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return apiError(ErrorCode.NOT_AUTHENTICATED);

    const [creditsRes, subRes] = await Promise.all([
      supabase.from('user_credits').select('balance,lifetime_used').eq('user_id', user.id).single(),
      supabase.from('subscriptions').select('plan_tier,status,current_period_end').eq('user_id', user.id).is('deleted_at', null).maybeSingle(),
    ]);

    return apiSuccess({
      balance: creditsRes.data?.balance ?? 0,
      lifetimeUsed: creditsRes.data?.lifetime_used ?? 0,
      planTier: subRes.data?.plan_tier ?? 'free',
      subscriptionStatus: subRes.data?.status ?? 'active',
      currentPeriodEnd: subRes.data?.current_period_end ?? null,
    });
  } catch (err) {
    return unknownErrorToApiError(err, 'billing/status');
  }
}
