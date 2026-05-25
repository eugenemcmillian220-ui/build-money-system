// src/components/dashboard/PipelineProgress.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { PhaseOutputCard } from './PhaseOutputCard';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';

interface PhaseRow {
  id: string;
  phase_index: number;
  phase_name: string;
  agent_index: number;
  agent_id: string;
  output: string;
}

interface PipelineProgressProps {
  jobId: string;
  initialStatus: string;
  initialPhase: number;
  totalPhases: number;
}

export function PipelineProgress({
  jobId,
  initialStatus,
  initialPhase,
  totalPhases,
}: PipelineProgressProps) {
  const [status, setStatus] = useState(initialStatus);
  const [currentPhase, setCurrentPhase] = useState(initialPhase);
  const [phases, setPhases] = useState<PhaseRow[]>([]);
  const supabase = createBrowserClient();

  useEffect(() => {
    supabase
      .from('pipeline_phases')
      .select('*')
      .eq('job_id', jobId)
      .order('phase_index', { ascending: true })
      .order('agent_index', { ascending: true })
      .then(({ data }: { data: PhaseRow[] | null }) => setPhases((data ?? []) as PhaseRow[]));

    const phaseChannel = supabase
      .channel(`pipeline_phases:${jobId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'pipeline_phases',
        filter: `job_id=eq.${jobId}`,
      }, (payload: { new: Record<string, unknown> }) => {
        setPhases((prev) => {
          const exists = prev.some((p) => p.id === (payload.new as unknown as PhaseRow).id);
          if (exists) return prev;
          return [...prev, payload.new as unknown as PhaseRow].sort((a, b) =>
            a.phase_index !== b.phase_index ? a.phase_index - b.phase_index : a.agent_index - b.agent_index
          );
        });
      })
      .subscribe();

    const jobChannel = supabase
      .channel(`pipeline_jobs:${jobId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'pipeline_jobs',
        filter: `id=eq.${jobId}`,
      }, (payload: { new: Record<string, unknown> }) => {
        setStatus(payload.new.status as string);
        setCurrentPhase((payload.new.current_phase as number) ?? 0);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(phaseChannel);
      supabase.removeChannel(jobChannel);
    };
  }, [jobId, supabase]);

  const progress = Math.round((currentPhase / totalPhases) * 100);
  const isRunning = status === 'running' || status === 'pending' || status === 'queued';

  return (
    <div className="space-y-6" role="region" aria-label="Pipeline progress">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {status === 'complete' && <CheckCircle className="h-5 w-5 text-green-500" aria-hidden="true" />}
          {status === 'failed' && <XCircle className="h-5 w-5 text-red-500" aria-hidden="true" />}
          {isRunning && <Loader2 className="h-5 w-5 animate-spin text-blue-500" aria-label="Running" />}
          {status === 'pending' && <Clock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />}
          <span className="font-medium capitalize">{status}</span>
          <Badge variant="secondary">Phase {currentPhase + 1} / {totalPhases}</Badge>
        </div>
        <span className="text-sm text-muted-foreground" aria-label={`${progress}% complete`}>{progress}%</span>
      </div>

      <Progress value={progress} className="h-2" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} />

      <div className="space-y-3" aria-label="Phase outputs">
        {phases.map((phase) => (
          <PhaseOutputCard
            key={`${phase.phase_index}-${phase.agent_index}`}
            phaseIndex={phase.phase_index}
            phaseName={phase.phase_name}
            agentId={phase.agent_id ?? `agent-${phase.agent_index}`}
            output={phase.output}
          />
        ))}
      </div>
    </div>
  );
}
