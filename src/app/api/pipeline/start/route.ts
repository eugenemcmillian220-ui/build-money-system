import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ok, fail } from '@/lib/api/response'
import { ERROR_CODES } from '@/lib/error-codes'
import { pipelineStartSchema } from '@/lib/schemas'
import { checkAndDeductCredits, refundCredits } from '@/lib/credits'
import { createClient as createSvcClient } from '@supabase/supabase-js'

export const maxDuration = 55
export const dynamic = 'force-dynamic'

const PIPELINE_COST_CREDITS = 10
const HANDOFF_TIMEOUT_MS = 10_000

function svc() {
  return createSvcClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401)

  const body = await req.json().catch(() => null)
  const parsed = pipelineStartSchema.safeParse({ projectId: crypto.randomUUID(), spec: body?.spec })
  if (!parsed.success) return fail(ERROR_CODES.VALIDATION_FAILED, 'Invalid pipeline start payload', 400, parsed.error.flatten())
  const { spec } = parsed.data

  const railwayUrl = process.env.RAILWAY_BACKEND_URL
  const railwaySecret = process.env.RAILWAY_INTERNAL_SECRET || process.env.WORKER_SHARED_SECRET
  if (!railwayUrl || !railwaySecret) {
    console.error('[pipeline/start] RAILWAY_BACKEND_URL or secret not set')
    return fail(ERROR_CODES.INTERNAL_ERROR, 'Pipeline service not configured', 503)
  }

  const creditResult = await checkAndDeductCredits(user.id, PIPELINE_COST_CREDITS)
  if (!creditResult.success) {
    return fail(ERROR_CODES.FORBIDDEN, creditResult.error ?? 'Insufficient credits', 402, { remainingCredits: 0 })
  }

  const { data: job, error: jobError } = await supabase.from('pipeline_jobs').insert({
    user_id: user.id, status: 'queued', spec, current_phase: 0,
    completed_phases: [], created_at: new Date().toISOString(),
  }).select().single()

  if (jobError || !job) {
    await refundCredits(user.id, PIPELINE_COST_CREDITS).catch((e) =>
      console.error('[pipeline/start] refund after job create failure:', e))
    return fail(ERROR_CODES.INTERNAL_ERROR, 'Failed to create job', 500)
  }

  try {
    const ctrl = new AbortController()
    const tid = setTimeout(() => ctrl.abort(), HANDOFF_TIMEOUT_MS)
    const railwayRes = await fetch(railwayUrl + '/pipeline/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + railwaySecret },
      body: JSON.stringify({ jobId: job.id, userId: user.id, spec }),
      signal: ctrl.signal,
    })
    clearTimeout(tid)
    if (!railwayRes.ok) {
      const errText = await railwayRes.text().catch(() => '')
      throw new Error('Railway ' + railwayRes.status + ': ' + errText.slice(0, 200))
    }
  } catch (handoffErr) {
    const msg = handoffErr instanceof Error ? handoffErr.message : String(handoffErr)
    console.error('[pipeline/start] Railway handoff failed:', msg)
    await svc().from('pipeline_jobs')
      .update({ status: 'failed', error: 'Railway handoff failed: ' + msg, updated_at: new Date().toISOString() })
      .eq('id', job.id)
    await refundCredits(user.id, PIPELINE_COST_CREDITS).catch((e) =>
      console.error('[pipeline/start] refund after handoff failure:', e))
    return fail(ERROR_CODES.INTERNAL_ERROR, 'Pipeline service unavailable. Credits refunded.', 503, { jobId: job.id })
  }

  return ok({ jobId: job.id, remainingCredits: creditResult.remainingCredits }, 202)
}
