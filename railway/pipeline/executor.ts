import { createServiceClient } from '../lib/supabase.js';
import { PIPELINE_PHASES } from './phases.js';
import { callLLM } from '../lib/llm-router.js';
import { refundCredits } from '../lib/credits.js';
import { prepareExpansionPhase } from './expansion/integration.js';

interface PipelineInput { jobId: string; userId: string; spec: Record<string, unknown> }

const PHASE_TIMEOUT_MS = 120_000;
const PIPELINE_COST_CREDITS = 10;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Phase timeout after ' + ms + 'ms: ' + label)), ms)
    ),
  ]);
}

export async function executePipeline({ jobId, userId, spec }: PipelineInput) {
  const supabase = createServiceClient();
  const { data: job } = await supabase
    .from('pipeline_jobs').select('completed_phases,status').eq('id', jobId).single();
  if (job?.status === 'complete') return;

  const completedPhases: number[] = Array.isArray(job?.completed_phases) ? job!.completed_phases : [];
  const startPhase = completedPhases.length ? Math.max(...completedPhases) + 1 : 0;

  const { data: claimedJob } = await supabase
    .from('pipeline_jobs')
    .update({ status: 'running', started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', jobId).neq('status', 'running').neq('status', 'complete')
    .select('id').maybeSingle();
  if (!claimedJob) return;

  await supabase.from('pipeline_phases').delete().eq('job_id', jobId).gte('phase_index', startPhase);

  const { data: priorRows } = await supabase
    .from('pipeline_phases').select('output').eq('job_id', jobId)
    .lt('phase_index', startPhase)
    .order('phase_index', { ascending: true }).order('agent_index', { ascending: true });
  const priorPhaseOutputs = (priorRows ?? []).map((r) => r.output);

  try {
    for (let i = startPhase; i < PIPELINE_PHASES.length; i++) {
      const phase = PIPELINE_PHASES[i];
      const runtime = prepareExpansionPhase(jobId, completedPhases, i);
      await supabase.from('pipeline_jobs')
        .update({ current_phase: i, current_phase_name: phase.name, updated_at: new Date().toISOString() })
        .eq('id', jobId);

      for (let a = 0; a < phase.agents.length; a++) {
        const output = await withTimeout(
          callLLM({
            systemPrompt: `${phase.agents[a].systemPrompt}\n\n[correlation_id=${runtime.correlationId}] [idempotency_key=${runtime.idempotencyKey}]`,
            userPrompt: phase.agents[a].buildPrompt(spec, priorPhaseOutputs),
          }),
          PHASE_TIMEOUT_MS, phase.name + '[' + a + ']'
        );
        if (!output || output.trim().length < 10) {
          throw new Error('Phase ' + phase.name + '[' + a + '] returned empty output');
        }
        await supabase.from('pipeline_phases').insert({
          job_id: jobId, phase_index: i, phase_name: phase.name,
          agent_index: a, output, created_at: new Date().toISOString(),
        });
        priorPhaseOutputs.push(output);
      }
      completedPhases.push(i);
      await supabase.from('pipeline_jobs')
        .update({ completed_phases: completedPhases, current_phase: i, updated_at: new Date().toISOString() })
        .eq('id', jobId);
    }

    const { data: allPhases } = await supabase.from('pipeline_phases').select('*')
      .eq('job_id', jobId).order('phase_index', { ascending: true });
    await supabase.from('job_results').insert({
      job_id: jobId, user_id: userId, result: allPhases ?? [], created_at: new Date().toISOString(),
    });
    await supabase.from('pipeline_jobs')
      .update({ status: 'complete', completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(), current_phase: PIPELINE_PHASES.length - 1 })
      .eq('id', jobId);

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[pipeline] job ' + jobId + ' failed:', message);
    await supabase.from('pipeline_jobs')
      .update({ status: 'failed', error: message, updated_at: new Date().toISOString() })
      .eq('id', jobId);
    try { await refundCredits(userId, PIPELINE_COST_CREDITS); }
    catch (re) { console.error('[pipeline] credit refund failed for ' + userId + ':', re); }
    throw err;
  }
}
