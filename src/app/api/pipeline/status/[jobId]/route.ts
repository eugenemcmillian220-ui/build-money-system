
import { createClient } from '@/lib/supabase/server'
import { ok, fail } from '@/lib/api/response'
import { ERROR_CODES } from '@/lib/error-codes';

export const maxDuration = 10;
export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401);

  const { data: job } = await supabase.from('pipeline_jobs')
    .select('id, status, current_phase, current_phase_name, completed_phases, error')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single();

  if (!job) return fail(ERROR_CODES.NOT_FOUND, 'Job not found', 404)
  return ok(job)
}
