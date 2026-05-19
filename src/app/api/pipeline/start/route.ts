import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 55;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { spec } = await req.json();
  if (!spec) return NextResponse.json({ error: 'Missing spec' }, { status: 400 });

  const { data: job, error } = await supabase.from('pipeline_jobs').insert({
    user_id: user.id,
    status: 'queued',
    spec,
    current_phase: 0,
    completed_phases: [],
    created_at: new Date().toISOString(),
  }).select().single();

  if (error || !job) return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });

  fetch(`${process.env.RAILWAY_BACKEND_URL}/pipeline/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RAILWAY_INTERNAL_SECRET}`,
    },
    body: JSON.stringify({ jobId: job.id, userId: user.id, spec }),
  }).catch((err) => console.error('Railway handoff failed:', err));

  return NextResponse.json({ jobId: job.id }, { status: 202 });
}
