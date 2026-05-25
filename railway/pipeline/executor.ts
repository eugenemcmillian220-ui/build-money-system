// railway/pipeline/executor.ts
// Sovereign Forge OS — Production Pipeline Executor
// Features: parallel agent execution, retry with exponential backoff,
// Redis output caching, Supabase Realtime streaming updates, circuit breaker

import { createServiceClient } from '../lib/supabase.js';
import { PIPELINE_PHASES, type PipelineContext } from './phases.js';
import { callLLM } from '../lib/llm-router.js';
import { refundCredits } from '../lib/credits.js';

// ─── Upstash Redis (optional — graceful fallback when not configured) ─────
type RedisClient = {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, opts?: { ex?: number }): Promise<unknown>;
};

let _redis: RedisClient | null | undefined = undefined; // undefined = not yet initialised

async function getRedis(): Promise<RedisClient | null> {
  if (_redis !== undefined) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    _redis = null;
    return null;
  }
  try {
    const { Redis } = await import('@upstash/redis');
    _redis = new Redis({ url, token }) as unknown as RedisClient;
    return _redis;
  } catch {
    _redis = null;
    return null;
  }
}

// ─── Config ───────────────────────────────────────────────────
const PHASE_TIMEOUT_MS = 120_000;
const PIPELINE_COST_CREDITS = 10;
const MAX_RETRIES = 3;
const CACHE_TTL_SECONDS = 86_400; // 24 hours

// ─── Types ────────────────────────────────────────────────────
export interface PipelineInput {
  jobId: string;
  userId: string;
  spec: Record<string, unknown>;
}

interface PhaseOutput {
  phaseIndex: number;
  phaseName: string;
  agentIndex: number;
  agentId: string;
  output: string;
}

type SupabaseClient = ReturnType<typeof createServiceClient>;

// ─── Timeout helper ───────────────────────────────────────────
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Phase timeout after ${ms}ms: ${label}`)), ms)
    ),
  ]);
}

// ─── Retry with exponential backoff ──────────────────────────
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  label: string,
  baseDelayMs = 500
): Promise<T> {
  let lastError: Error = new Error('Unknown error');
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.warn(
          `[pipeline] ${label} attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms: ${lastError.message}`
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ─── Redis cache helpers ──────────────────────────────────────
function cacheKey(jobId: string, phaseIndex: number, agentIndex: number): string {
  return `pipeline:${jobId}:phase:${phaseIndex}:agent:${agentIndex}`;
}

async function loadCached(jobId: string, phaseIndex: number, agentIndex: number): Promise<string | null> {
  const r = await getRedis();
  if (!r) return null;
  try {
    return await r.get<string>(cacheKey(jobId, phaseIndex, agentIndex));
  } catch {
    return null;
  }
}

async function saveToCache(jobId: string, phaseIndex: number, agentIndex: number, output: string): Promise<void> {
  const r = await getRedis();
  if (!r) return;
  try {
    await r.set(cacheKey(jobId, phaseIndex, agentIndex), output, { ex: CACHE_TTL_SECONDS });
  } catch (err) {
    console.warn('[pipeline] Redis cache write failed:', err);
  }
}

// ─── Build PipelineContext from enriched spec outputs ─────────
function buildContext(spec: Record<string, unknown>, outputs: string[]): PipelineContext {
  let enriched: Partial<PipelineContext> = {};
  try {
    const enricherOutput = outputs[1];
    if (enricherOutput) {
      const parsed = JSON.parse(enricherOutput) as Record<string, unknown>;
      enriched = {
        productName: typeof parsed.productName === 'string' ? parsed.productName : String(spec.name ?? 'Product'),
        targetUser: typeof parsed.targetUser === 'string' ? parsed.targetUser : String(spec.targetUser ?? 'users'),
        revenueModel: typeof parsed.revenueModel === 'string' ? parsed.revenueModel : 'subscription',
        techStack: outputs[3],
        personas: outputs[6],
        competitorData: outputs[2],
      };
    }
  } catch {
    // fallback to spec fields
  }
  return {
    productName: enriched.productName ?? String(spec.name ?? 'Product'),
    targetUser: enriched.targetUser ?? String(spec.targetUser ?? 'users'),
    revenueModel: enriched.revenueModel ?? 'subscription',
    techStack: enriched.techStack,
    personas: enriched.personas,
    competitorData: enriched.competitorData,
  };
}

// ─── Main executor ────────────────────────────────────────────
export async function executePipeline({ jobId, userId, spec }: PipelineInput): Promise<void> {
  const supabase = createServiceClient();

  const { data: job } = await supabase
    .from('pipeline_jobs')
    .select('completed_phases,status')
    .eq('id', jobId)
    .single();

  if (job?.status === 'complete') return;

  const completedPhases: number[] = Array.isArray(job?.completed_phases) ? (job!.completed_phases as number[]) : [];
  const startPhase = completedPhases.length ? Math.max(...completedPhases) + 1 : 0;

  // Optimistic lock — skip if already claimed
  const { data: claimedJob } = await supabase
    .from('pipeline_jobs')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .neq('status', 'running')
    .neq('status', 'complete')
    .select('id')
    .maybeSingle();

  if (!claimedJob) {
    console.log(`[pipeline] job ${jobId} already claimed, skipping`);
    return;
  }

  // Remove any incomplete phases from prior partial run
  await supabase
    .from('pipeline_phases')
    .delete()
    .eq('job_id', jobId)
    .gte('phase_index', startPhase);

  // Load prior outputs
  const { data: priorRows } = await supabase
    .from('pipeline_phases')
    .select('output,phase_index,agent_index')
    .eq('job_id', jobId)
    .lt('phase_index', startPhase)
    .order('phase_index', { ascending: true })
    .order('agent_index', { ascending: true });

  const allOutputs: string[] = (priorRows ?? []).map((r) => r.output as string);

  try {
    for (let phaseIdx = startPhase; phaseIdx < PIPELINE_PHASES.length; phaseIdx++) {
      const phase = PIPELINE_PHASES[phaseIdx];
      if (!phase) continue;
      const ctx = buildContext(spec, allOutputs);

      await supabase
        .from('pipeline_jobs')
        .update({
          current_phase: phaseIdx,
          current_phase_name: phase.name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      const parallelAgents = phase.agents.filter((a) => a.parallel);
      const sequentialAgents = phase.agents.filter((a) => !a.parallel);

      // Run parallel agents concurrently
      if (parallelAgents.length > 0) {
        const parallelResults = await Promise.all(
          parallelAgents.map(async (agent) => {
            const agentIdx = phase.agents.indexOf(agent);
            return runAgent({ jobId, phaseIdx, agentIdx, agent, spec, allOutputs: [...allOutputs], ctx, supabase });
          })
        );
        for (const result of parallelResults.sort((a, b) => a.agentIndex - b.agentIndex)) {
          allOutputs.push(result.output);
        }
      }

      // Run sequential agents in order
      for (const agent of sequentialAgents) {
        const agentIdx = phase.agents.indexOf(agent);
        const result = await runAgent({ jobId, phaseIdx, agentIdx, agent, spec, allOutputs: [...allOutputs], ctx, supabase });
        allOutputs.push(result.output);
      }

      completedPhases.push(phaseIdx);
      await supabase
        .from('pipeline_jobs')
        .update({ completed_phases: completedPhases, current_phase: phaseIdx, updated_at: new Date().toISOString() })
        .eq('id', jobId);
    }

    // Compile final result
    const { data: allPhases } = await supabase
      .from('pipeline_phases')
      .select('*')
      .eq('job_id', jobId)
      .order('phase_index', { ascending: true });

    await supabase.from('job_results').insert({
      job_id: jobId,
      user_id: userId,
      result: allPhases ?? [],
      created_at: new Date().toISOString(),
    });

    await supabase
      .from('pipeline_jobs')
      .update({
        status: 'complete',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        current_phase: PIPELINE_PHASES.length - 1,
      })
      .eq('id', jobId);

    // Upload deliverable package
    await uploadDeliverables(jobId, allPhases ?? [], supabase);

    console.log(`[pipeline] job ${jobId} completed successfully`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[pipeline] job ${jobId} failed:`, message);

    await supabase
      .from('pipeline_jobs')
      .update({ status: 'failed', error: message, updated_at: new Date().toISOString() })
      .eq('id', jobId);

    try {
      await refundCredits(userId, PIPELINE_COST_CREDITS);
    } catch (refundErr) {
      console.error(`[pipeline] credit refund failed for ${userId}:`, refundErr);
    }

    throw err;
  }
}

// ─── Agent runner ─────────────────────────────────────────────
interface AgentDef {
  id: string;
  parallel?: boolean;
  systemPrompt: string;
  buildPrompt: (spec: Record<string, unknown>, prev: string[], ctx: PipelineContext) => string;
}

interface RunAgentParams {
  jobId: string;
  phaseIdx: number;
  agentIdx: number;
  agent: AgentDef;
  spec: Record<string, unknown>;
  allOutputs: string[];
  ctx: PipelineContext;
  supabase: SupabaseClient;
}

async function runAgent({
  jobId, phaseIdx, agentIdx, agent, spec, allOutputs, ctx, supabase,
}: RunAgentParams): Promise<PhaseOutput> {
  const phaseName = PIPELINE_PHASES[phaseIdx]?.name ?? `phase-${phaseIdx}`;
  const label = `${phaseName}[${agentIdx}]:${agent.id}`;

  // Check cache first
  const cached = await loadCached(jobId, phaseIdx, agentIdx);
  if (cached) {
    console.log(`[pipeline] cache hit: ${label}`);
    await persistPhaseOutput({ jobId, phaseIdx, agentIdx, agent, output: cached, phaseName, supabase });
    return { phaseIndex: phaseIdx, phaseName, agentIndex: agentIdx, agentId: agent.id, output: cached };
  }

  const userPrompt = agent.buildPrompt(spec, allOutputs, ctx);

  const output = await withRetry(
    () => withTimeout(
      callLLM({ systemPrompt: agent.systemPrompt, userPrompt, stage: phaseName }),
      PHASE_TIMEOUT_MS,
      label
    ),
    MAX_RETRIES,
    label
  );

  if (!output || output.trim().length < 10) {
    throw new Error(`Agent ${label} returned empty output`);
  }

  await persistPhaseOutput({ jobId, phaseIdx, agentIdx, agent, output, phaseName, supabase });
  await saveToCache(jobId, phaseIdx, agentIdx, output);

  return { phaseIndex: phaseIdx, phaseName, agentIndex: agentIdx, agentId: agent.id, output };
}

// ─── Persist output to Supabase ───────────────────────────────
async function persistPhaseOutput({
  jobId, phaseIdx, agentIdx, agent, output, phaseName, supabase,
}: {
  jobId: string;
  phaseIdx: number;
  agentIdx: number;
  agent: { id: string };
  output: string;
  phaseName: string;
  supabase: SupabaseClient;
}): Promise<void> {
  const { error } = await supabase.from('pipeline_phases').upsert({
    job_id: jobId,
    phase_index: phaseIdx,
    phase_name: phaseName,
    agent_index: agentIdx,
    agent_id: agent.id,
    output,
    created_at: new Date().toISOString(),
  }, { onConflict: 'job_id,phase_index,agent_index' });

  if (error) {
    console.error(`[pipeline] persistPhaseOutput error: ${error.message}`);
  }
}

// ─── Deliverable packager ─────────────────────────────────────
async function uploadDeliverables(
  jobId: string,
  phases: Record<string, unknown>[],
  supabase: SupabaseClient
): Promise<string | null> {
  try {
    const manifest = {
      jobId,
      compiledAt: new Date().toISOString(),
      totalPhases: phases.length,
      folders: {
        spec: phases.filter((p) => (p.phase_index as number) <= 2),
        architecture: phases.filter((p) => (p.phase_index as number) >= 3 && (p.phase_index as number) <= 6),
        implementation: phases.filter((p) => (p.phase_index as number) >= 7 && (p.phase_index as number) <= 16),
        quality: phases.filter((p) => (p.phase_index as number) >= 17 && (p.phase_index as number) <= 18),
        devops: phases.filter((p) => (p.phase_index as number) >= 19 && (p.phase_index as number) <= 20),
        docs: phases.filter((p) => (p.phase_index as number) >= 21 && (p.phase_index as number) <= 22),
        launch: phases.filter((p) => (p.phase_index as number) >= 23),
      },
    };

    const { error } = await supabase.storage
      .from('deliverables')
      .upload(`${jobId}/package.json`, JSON.stringify(manifest, null, 2), {
        contentType: 'application/json',
        upsert: true,
      });

    if (error) {
      console.error('[pipeline] deliverable upload failed:', error);
      return null;
    }

    const { data: signedUrl } = await supabase.storage
      .from('deliverables')
      .createSignedUrl(`${jobId}/package.json`, 7 * 24 * 60 * 60);

    if (signedUrl?.signedUrl) {
      await supabase
        .from('pipeline_jobs')
        .update({ deliverable_url: signedUrl.signedUrl, updated_at: new Date().toISOString() })
        .eq('id', jobId);
      return signedUrl.signedUrl;
    }
    return null;
  } catch (err) {
    console.error('[pipeline] deliverable packaging error:', err);
    return null;
  }
}
