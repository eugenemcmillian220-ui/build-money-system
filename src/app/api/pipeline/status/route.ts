import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const jobId = req.nextUrl.searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })

  const { data, error } = await supabase.from('pipeline_jobs')
    .select('id,status,current_phase,current_phase_name,completed_phases,error,created_at,updated_at,completed_at')
    .eq('id', jobId).eq('user_id', user.id).single()

  if (error || !data) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  return NextResponse.json(data)
}
