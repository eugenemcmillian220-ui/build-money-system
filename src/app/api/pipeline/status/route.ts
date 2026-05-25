import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ok, fail } from '@/lib/api/response'
import { ErrorCode } from '@/lib/error-codes'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail(ErrorCode.NOT_AUTHENTICATED, 'Unauthorized', 401)

  const jobId = req.nextUrl.searchParams.get('jobId')
  if (!jobId) return fail(ErrorCode.INVALID_INPUT, 'Missing jobId', 400)

  const { data, error } = await supabase.from('pipeline_jobs')
    .select('id,status,current_phase,current_phase_name,completed_phases,error,created_at,updated_at,completed_at')
    .eq('id', jobId).eq('user_id', user.id).single()

  if (error || !data) return fail(ErrorCode.FORBIDDEN, 'Job not found', 404)
  return ok(data)
}
