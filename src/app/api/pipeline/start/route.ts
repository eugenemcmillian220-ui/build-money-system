import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAndDeductCredits } from '@/lib/credits'

export const maxDuration = 55
export const dynamic = 'force-dynamic'

// Credits required to run one full pipeline
const PIPELINE_COST_CREDITS = 10

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse request body
  const body = await req.json().catch(() => null)
  if (!body?.spec) {
    return NextResponse.json({ error: 'Missing spec' }, { status: 400 })
  }
  const { spec } = body

  // 3. Credit check — atomic deduction before job creation
  // Uses Supabase RPC with row lock — safe against concurrent triggers
  const creditResult = await checkAndDeductCredits(user.id, PIPELINE_COST_CREDITS)
  if (!creditResult.success) {
    return NextResponse.json(
      {
        error: creditResult.error ?? 'Insufficient credits',
        remainingCredits: 0,
      },
      { status: 402 }
    )
  }

  // 4. Create job in Supabase
  const { data: job, error: jobError } = await supabase
    .from('pipeline_jobs')
    .insert({
      user_id: user.id,
      status: 'queued',
      spec,
      current_phase: 0,
      completed_phases: [],
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (jobError || !job) {
    // Refund credits if job creation fails
    // Best-effort — log if refund itself fails
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    await service
      .from('user_credits')
      .update({ balance: creditResult.remainingCredits + PIPELINE_COST_CREDITS })
      .eq('user_id', user.id)
      .then(({ error }) => { if (error) console.error('Credit refund failed:', error) })

    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }

  // 5. Hand off to Railway — fire and forget
  // Vercel does NOT await this — returns immediately after
  const railwayUrl = process.env.RAILWAY_BACKEND_URL
  const railwaySecret = process.env.RAILWAY_INTERNAL_SECRET

  if (!railwayUrl || !railwaySecret) {
    console.error('Railway env vars missing — RAILWAY_BACKEND_URL or RAILWAY_INTERNAL_SECRET not set')
  } else {
    fetch(`${railwayUrl}/pipeline/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${railwaySecret}`,
      },
      body: JSON.stringify({ jobId: job.id, userId: user.id, spec }),
    }).catch((err) => console.error('Railway handoff failed:', err))
  }

  // 6. Return immediately — frontend polls Supabase for real-time status
  return NextResponse.json(
    {
      jobId: job.id,
      remainingCredits: creditResult.remainingCredits,
    },
    { status: 202 }
  )
}
