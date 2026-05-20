import { createServiceClient } from '../lib/supabase.js';
import { PIPELINE_PHASES } from './phases.js';
import { callLLM } from '../lib/llm-router.js';

interface PipelineInput { jobId: string; userId: string; spec: Record<string, unknown> }

export async function executePipeline({ jobId, userId, spec }: PipelineInput) {
  const supabase = createServiceClient();
  const { data: job } = await supabase.from('pipeline_jobs').select('completed_phases,status').eq('id', jobId).single();
  if (job?.status === 'complete') return;

  const completedPhases: number[] = Array.isArray(job?.completed_phases) ? job!.completed_phases : [];
  const startPhase = completedPhases.length ? Math.max(...completedPhases) + 1 : 0;

  const { data: claimedJob } = await supabase
    .from('pipeline_jobs')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', jobId)
    .neq('status', 'running')
    .neq('status', 'complete')
    .select('id')
    .maybeSingle();
  if (!claimedJob) return;

  await supabase
    .from('pipeline_phases')
    .delete()
    .eq('job_id', jobId)
    .gte('phase_index', startPhase);

  const { data: priorPhaseRows } = await supabase
    .from('pipeline_phases')
    .select('output')
    .eq('job_id', jobId)
    .lt('phase_index', startPhase)
    .order('phase_index', { ascending: true })
    .order('agent_index', { ascending: true });

  const priorPhaseOutputs = (priorPhaseRows ?? []).map((row) => row.output);

  const { data: priorPhaseRows } = await supabase
    .from('pipeline_phases')
    .select('output')
    .eq('job_id', jobId)
    .lt('phase_index', startPhase)
    .order('phase_index', { ascending: true })
    .order('agent_index', { ascending: true });

  const priorPhaseOutputs = (priorPhaseRows ?? []).map((row) => row.output);

  for (let i = startPhase; i < PIPELINE_PHASES.length; i++) {
    const phase = PIPELINE_PHASES[i];
    await supabase.from('pipeline_jobs').update({ current_phase: i, current_phase_name: phase.name }).eq('id', jobId);
    for (let a = 0; a < phase.agents.length; a++) {
      const output = await callLLM({
        systemPrompt: phase.agents[a].systemPrompt,
        userPrompt: phase.agents[a].buildPrompt(spec, priorPhaseOutputs),
      });
      await supabase.from('pipeline_phases').insert({ job_id: jobId, phase_index: i, phase_name: phase.name, agent_index: a, output, created_at: new Date().toISOString() });
      priorPhaseOutputs.push(output);
    }
    completedPhases.push(i);
    await supabase.from('pipeline_jobs').update({ completed_phases: completedPhases, current_phase: i }).eq('id', jobId);
  }

  const { data: allPhases } = await supabase.from('pipeline_phases').select('*').eq('job_id', jobId).order('phase_index', { ascending: true });
  await supabase.from('job_results').insert({ job_id: jobId, user_id: userId, result: allPhases ?? [], created_at: new Date().toISOString() });
  await supabase.from('pipeline_jobs').update({ status: 'complete', completed_at: new Date().toISOString(), current_phase: PIPELINE_PHASES.length - 1 }).eq('id', jobId);
}
