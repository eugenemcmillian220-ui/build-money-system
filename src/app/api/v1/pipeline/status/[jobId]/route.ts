// src/app/api/v1/pipeline/status/[jobId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { apiSuccess, apiError, unknownErrorToApiError } from '@/lib/api/response';
import { ErrorCode } from '@/lib/error-codes';

export const dynamic = 'force-dynamic';

const TOTAL_PHASES = 25;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  try {
    const { jobId } = await params;
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return apiError(ErrorCode.NOT_AUTHENTICATED);

    const { data: job, error } = await supabase
      .from('pipeline_jobs')
      .select('id,status,current_phase,current_phase_name,completed_phases,error,deliverable_url,started_at,completed_at,created_at')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (error || !job) return apiError(ErrorCode.FORBIDDEN);

    const completedCount = (job.completed_phases as number[] ?? []).length;

    return apiSuccess({
      jobId: job.id,
      status: job.status,
      currentPhase: job.current_phase,
      currentPhaseName: job.current_phase_name,
      completedPhases: job.completed_phases,
      totalPhases: TOTAL_PHASES,
      progressPercent: Math.round((completedCount / TOTAL_PHASES) * 100),
      error: job.error,
      deliverableUrl: job.deliverable_url,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      createdAt: job.created_at,
    });
  } catch (err) {
    return unknownErrorToApiError(err, 'pipeline/status');
  }
}
