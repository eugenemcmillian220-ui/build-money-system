import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body?.spec) return NextResponse.json({ error: 'Missing spec' }, { status: 400 })
  const { spec } = body

  const railwayUrl = process.env.RAILWAY_BACKEND_URL
  const railwaySecret = process.env.RAILWAY_INTERNAL_SECRET || process.env.WORKER_SHARED_SECRET
  if (!railwayUrl || !railwaySecret) {
    console.error('[pipeline/start] RAILWAY_BACKEND_URL or secret not set')
    return NextResponse.json({ error: 'Pipeline service not configured' }, { status: 503 })
  }

  const creditResult = await checkAndDeductCredits(user.id, PIPELINE_COST_CREDITS)
  if (!creditResult.success) {
    return NextResponse.json({ error: creditResult.error ?? 'Insufficient credits', remainingCredits: 0 }, { status: 402 })
  }

  const { data: job, error: jobError } = await supabase.from('pipeline_jobs').insert({
    user_id: user.id, status: 'queued', spec, current_phase: 0,
    completed_phases: [], created_at: new Date().toISOString(),
  }).select().single()

  if (jobError || !job) {
    await refundCredits(user.id, PIPELINE_COST_CREDITS).catch((e) =>
      console.error('[pipeline/start] refund after job create failure:', e))
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
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
    return NextResponse.json({ error: 'Pipeline service unavailable. Credits refunded.', jobId: job.id }, { status: 503 })
  }

  return NextResponse.json({ jobId: job.id, remainingCredits: creditResult.remainingCredits }, { status: 202 })
}
