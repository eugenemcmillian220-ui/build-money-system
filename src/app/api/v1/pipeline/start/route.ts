// src/app/api/v1/pipeline/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createSvcClient } from '@supabase/supabase-js';
import { deductCredits } from '@/lib/credits';
import { apiSuccess, apiError, zodErrorToApiError, unknownErrorToApiError } from '@/lib/api/response';
import { ErrorCode } from '@/lib/error-codes';
import { CreatePipelineJobSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';
export const maxDuration = 55;

const PIPELINE_COST = 10;

function svc() {
  return createSvcClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return apiError(ErrorCode.NOT_AUTHENTICATED);

    const body = await req.json().catch(() => null);
    const parsed = CreatePipelineJobSchema.safeParse(body);
    if (!parsed.success) return zodErrorToApiError(parsed.error);

    const { spec, projectId } = parsed.data;
    const service = svc();

    // Check credits before creating job
    const { data: credits } = await service
      .from('user_credits')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (!credits || credits.balance < PIPELINE_COST) {
      return apiError(ErrorCode.INSUFFICIENT_CREDITS);
    }

    // Create job record
    const { data: job, error: jobError } = await service
      .from('pipeline_jobs')
      .insert({
        user_id: user.id,
        project_id: projectId ?? null,
        spec,
        status: 'pending',
        current_phase: 0,
        completed_phases: [],
      })
      .select('id')
      .single();

    if (jobError || !job) {
      Sentry.captureException(jobError);
      return apiError(ErrorCode.INTERNAL_ERROR);
    }

    // Deduct credits atomically
    try {
      await deductCredits(user.id, PIPELINE_COST, `Pipeline run: ${spec.name}`, job.id);
    } catch {
      // Rollback job on credit failure
      await service.from('pipeline_jobs').delete().eq('id', job.id);
      return apiError(ErrorCode.INSUFFICIENT_CREDITS);
    }

    // Dispatch to Railway (fire and forget)
    const railwayUrl = process.env.RAILWAY_PIPELINE_URL ?? process.env.RAILWAY_BACKEND_URL;
    const railwaySecret = process.env.RAILWAY_SECRET ?? process.env.RAILWAY_INTERNAL_SECRET ?? process.env.WORKER_SHARED_SECRET;
    if (railwayUrl && railwaySecret) {
      fetch(`${railwayUrl}/pipeline/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${railwaySecret}` },
        body: JSON.stringify({ jobId: job.id, userId: user.id, spec }),
      }).catch((err) => {
        Sentry.captureException(err, { extra: { jobId: job.id } });
        console.error('[pipeline/start] Railway dispatch failed:', err);
      });
    }

    return apiSuccess({ jobId: job.id, status: 'pending' }, 202);
  } catch (err) {
    return unknownErrorToApiError(err, 'pipeline/start');
  }
}
