"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, Loader2, XCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";

interface PhaseStatus {
  id: number;
  name: string;
  status: "pending" | "running" | "complete" | "failed";
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
}

interface PipelineProgressProps {
  jobId: string;
  totalPhases: number;
  onComplete?: (jobId: string) => void;
  onError?: (error: string) => void;
  /** Poll interval in ms. Default 2000. */
  pollIntervalMs?: number;
}

const PHASE_NAMES: Record<number, string> = {
  1: "Generate", 2: "Persist", 3: "Deploy", 4: "Secure", 5: "Grow",
  6: "Optimize", 7: "Heal", 8: "DevOS", 9: "Vision", 10: "Economy",
  11: "Hype", 12: "Govern", 13: "VC", 14: "Diplomat", 15: "Hive",
  16: "M&A", 17: "Legal", 18: "R&D", 19: "DAO", 20: "Sovereign",
  21: "Overseer", 22: "Mesh", 23: "Pulse", 24: "Evolve", 25: "Neural",
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export function PipelineProgress({
  jobId,
  totalPhases,
  onComplete,
  onError,
  pollIntervalMs = 2000,
}: PipelineProgressProps) {
  const [phases, setPhases] = useState<PhaseStatus[]>([]);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"running" | "complete" | "failed">("running");
  const [error, setError] = useState<string | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [startTime] = useState(() => Date.now());

  // Elapsed timer
  useEffect(() => {
    if (status !== "running") return;
    const interval = setInterval(() => setElapsedMs(Date.now() - startTime), 1000);
    return () => clearInterval(interval);
  }, [status, startTime]);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/pipeline/status?jobId=${jobId}`);
      if (!res.ok) {
        if (res.status === 404) return; // Job not created yet
        throw new Error(`Status check failed: ${res.status}`);
      }
      const { data } = await res.json();

      setCurrentPhase(data.current_phase ?? 0);
      setProgress(data.progressPercent ?? 0);

      // Build phase list from completed + current
      const completed: number[] = data.completed_phases ?? [];
      const built: PhaseStatus[] = Array.from({ length: totalPhases }, (_, i) => {
        const phaseNum = i + 1;
        const isComplete = completed.includes(phaseNum);
        const isCurrent = phaseNum === data.current_phase;
        const isFailed = data.status === "failed" && isCurrent;
        return {
          id: phaseNum,
          name: PHASE_NAMES[phaseNum] ?? `Phase ${phaseNum}`,
          status: isFailed ? "failed" : isComplete ? "complete" : isCurrent ? "running" : "pending",
        };
      });
      setPhases(built);

      if (data.status === "complete") {
        setStatus("complete");
        setProgress(100);
        onComplete?.(jobId);
      } else if (data.status === "failed") {
        setStatus("failed");
        const errMsg = data.error ?? "Pipeline failed.";
        setError(errMsg);
        onError?.(errMsg);
      }
    } catch (err) {
      console.warn("[PipelineProgress] poll error:", err);
    }
  }, [jobId, totalPhases, onComplete, onError]);

  useEffect(() => {
    if (status !== "running") return;
    poll(); // immediate first poll
    const interval = setInterval(poll, pollIntervalMs);
    return () => clearInterval(interval);
  }, [poll, pollIntervalMs, status]);

  const completedCount = phases.filter((p) => p.status === "complete").length;

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status === "running" && <Loader2 size={14} className="animate-spin text-brand-400" />}
          {status === "complete" && <CheckCircle2 size={14} className="text-green-400" />}
          {status === "failed" && <XCircle size={14} className="text-red-400" />}
          <span className="text-sm font-medium text-foreground">
            {status === "running" && `Phase ${currentPhase} — ${PHASE_NAMES[currentPhase] ?? "Processing"}`}
            {status === "complete" && "Build complete"}
            {status === "failed" && "Build failed"}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{completedCount}/{totalPhases} phases</span>
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {formatDuration(elapsedMs)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            status === "complete" ? "bg-green-400" : status === "failed" ? "bg-red-400" : "bg-brand-400"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Phase list */}
      {phases.length > 0 && (
        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {phases.map((phase) => (
            <div key={phase.id}>
              <button
                type="button"
                onClick={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${
                  phase.status === "running"
                    ? "bg-brand-500/10 border border-brand-500/20"
                    : phase.status === "complete"
                    ? "bg-green-500/5 border border-green-500/10 hover:bg-green-500/10"
                    : phase.status === "failed"
                    ? "bg-red-500/5 border border-red-500/10"
                    : "bg-white/2 border border-white/5 opacity-50"
                }`}
              >
                {/* Status icon */}
                <div className="shrink-0 w-5 flex items-center justify-center">
                  {phase.status === "running" && <Loader2 size={12} className="animate-spin text-brand-400" />}
                  {phase.status === "complete" && <CheckCircle2 size={12} className="text-green-400" />}
                  {phase.status === "failed" && <XCircle size={12} className="text-red-400" />}
                  {phase.status === "pending" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  )}
                </div>

                {/* Phase number + name */}
                <span className="text-xs font-mono text-muted-foreground/60 shrink-0 w-6">
                  {String(phase.id).padStart(2, "0")}
                </span>
                <span className={`text-xs font-medium flex-1 ${
                  phase.status === "running" ? "text-brand-300" :
                  phase.status === "complete" ? "text-foreground" :
                  phase.status === "failed" ? "text-red-400" : "text-muted-foreground"
                }`}>
                  {phase.name}
                </span>

                {/* Duration */}
                {phase.durationMs && (
                  <span className="text-xs text-muted-foreground/50 shrink-0">
                    {formatDuration(phase.durationMs)}
                  </span>
                )}

                {/* Expand chevron */}
                {phase.status !== "pending" && (
                  <span className="text-muted-foreground/30 shrink-0">
                    {expandedPhase === phase.id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </span>
                )}
              </button>

              {/* Expanded detail */}
              {expandedPhase === phase.id && phase.status !== "pending" && (
                <div className="mx-3 px-3 py-2 bg-black/20 rounded-b-xl border-x border-b border-white/5 text-xs text-muted-foreground space-y-1">
                  <div>Status: <span className="text-foreground">{phase.status}</span></div>
                  {phase.startedAt && <div>Started: <span className="text-foreground">{new Date(phase.startedAt).toLocaleTimeString()}</span></div>}
                  {phase.completedAt && <div>Completed: <span className="text-foreground">{new Date(phase.completedAt).toLocaleTimeString()}</span></div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
