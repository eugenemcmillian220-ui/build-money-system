import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 55

const PIPELINE_COST_CREDITS = 10
const STUCK_MINUTES = 30

function svc() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } })
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = svc()
  const cutoff = new Date(Date.now() - STUCK_MINUTES * 60 * 1000).toISOString()

  const { data: stuck, error } = await supabase.from('pipeline_jobs')
    .select('id,user_id,status').in('status', ['queued', 'running']).lt('updated_at', cutoff).limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!stuck || stuck.length === 0) return NextResponse.json({ cleaned: 0 })

  let cleaned = 0, refunded = 0
  const errors: string[] = []

  for (const job of stuck) {
    const { error: ue } = await supabase.from('pipeline_jobs')
      .update({ status: 'failed', error: 'Timed out after ' + STUCK_MINUTES + 'min in ' + job.status, updated_at: new Date().toISOString() })
      .eq('id', job.id).in('status', ['queued', 'running'])
    if (ue) { errors.push(job.id + ': ' + ue.message); continue; }
    cleaned++
    const { error: re } = await supabase.rpc('increment_credits', { p_user_id: job.user_id, p_amount: PIPELINE_COST_CREDITS })
    if (re) errors.push('refund ' + job.id + ': ' + re.message); else refunded++
  }

  console.log('[cron/pipeline-cleanup] cleaned=' + cleaned + ' refunded=' + refunded)
  return NextResponse.json({ cleaned, refunded, errors: errors.length ? errors : undefined })
}
