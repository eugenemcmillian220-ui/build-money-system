"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2, Loader2, XCircle, Clock, ChevronDown, ChevronUp,
  RefreshCw, AlertTriangle, Terminal, Cpu
} from "lucide-react";

interface PhaseLog {
  ts: string;
  level: "info" | "warn" | "error";
  text: string;
}

interface PhaseDetail {
  id: number;
  name: string;
  description: string;
  agentName: string;
  status: "pending" | "running" | "complete" | "failed" | "skipped";
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  logs?: PhaseLog[];
  output?: Record<string, unknown>;
  error?: string;
}

interface PhaseEditorProps {
  jobId: string;
  /** Pass pre-loaded phases or let the component fetch them */
  initialPhases?: PhaseDetail[];
  onRetryPhase?: (jobId: string, phaseId: number) => Promise<void>;
}

const PHASE_META: Record<number, { description: string; agentName: string }> = {
  1: { description: "Generates React components, layouts, and full app scaffolding from your spec.", agentName: "Developer Agent" },
  2: { description: "Designs and provisions the Supabase PostgreSQL schema with RLS policies.", agentName: "SQL Forge Agent" },
  3: { description: "Deploys to Vercel with GitHub export and zero-config SSL.", agentName: "Deploy Agent" },
  4: { description: "Hardens the app: CSRF, CSP, rate-limiting, path-traversal defences.", agentName: "Sentinel Agent" },
  5: { description: "Builds market presence, SEO metadata, and growth channels.", agentName: "Growth Agent" },
  6: { description: "Optimizes revenue, pricing, and churn prediction models.", agentName: "Revenue Agent" },
  7: { description: "Self-corrects build errors and applies automated patches.", agentName: "Healer Agent" },
  8: { description: "Provisions multi-tenant sandbox environments.", agentName: "DevOS Agent" },
  9: { description: "Converts screenshots and Figma files into code.", agentName: "Vision Agent" },
  10: { description: "Sets up the agent marketplace and credit economy.", agentName: "Economy Agent" },
  11: { description: "Generates viral growth mechanics and social hooks.", agentName: "Hype Agent" },
  12: { description: "Implements DAO governance and human-in-the-loop controls.", agentName: "Govern Agent" },
  13: { description: "Structures the product for VC investment readiness.", agentName: "VC Agent" },
  14: { description: "Handles B2B negotiation and partnership automation.", agentName: "Diplomat Agent" },
  15: { description: "Builds collective intelligence and knowledge sharing.", agentName: "Hive Agent" },
  16: { description: "Manages M&A consolidation and acquisition flows.", agentName: "M&A Agent" },
  17: { description: "Generates corporate legal suite and compliance docs.", agentName: "Legal Agent" },
  18: { description: "Scouts emerging technologies and integration opportunities.", agentName: "R&D Agent" },
  19: { description: "Implements DAO voting and UGT token mechanics.", agentName: "DAO Agent" },
  20: { description: "Creates phantom UX experiences and immersive interfaces.", agentName: "Sovereign Agent" },
  21: { description: "Runs autonomous QA across the full application.", agentName: "Overseer Agent" },
  22: { description: "Federates the app into the swarm mesh network.", agentName: "Mesh Agent" },
  23: { description: "Sets up telemetry, monitoring, and Pulse dashboard.", agentName: "Pulse Agent" },
  24: { description: "Applies recursive growth algorithms and self-improvement.", agentName: "Evolve Agent" },
  25: { description: "Consolidates neural infrastructure and final optimizations.", agentName: "Neural Agent" },
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

const STATUS_CONFIG = {
  pending:  { icon: null,        color: "text-muted-foreground", bg: "bg-white/3",         border: "border-white/8",        label: "Pending" },
  running:  { icon: "spinner",   color: "text-brand-400",        bg: "bg-brand-500/8",     border: "border-brand-500/20",   label: "Running" },
  complete: { icon: "check",     color: "text-green-400",        bg: "bg-green-500/5",     border: "border-green-500/15",   label: "Complete" },
  failed:   { icon: "x",         color: "text-red-400",          bg: "bg-red-500/5",       border: "border-red-500/15",     label: "Failed" },
  skipped:  { icon: "skip",      color: "text-muted-foreground", bg: "bg-white/2",         border: "border-white/5",        label: "Skipped" },
};

export function PhaseEditor({ jobId, initialPhases, onRetryPhase }: PhaseEditorProps) {
  const [phases, setPhases] = useState<PhaseDetail[]>(initialPhases ?? []);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [retrying, setRetrying] = useState<number | null>(null);
  const [loading, setLoading] = useState(!initialPhases);
  const [filter, setFilter] = useState<"all" | "complete" | "failed" | "running">("all");

  useEffect(() => {
    if (initialPhases) { setPhases(initialPhases); return; }
    // Build a phase list from the pipeline status
    async function loadPhases() {
      try {
        const res = await fetch(`/api/pipeline/status?jobId=${jobId}`);
        if (!res.ok) return;
        const { data } = await res.json();
        const completed: number[] = data.completed_phases ?? [];
        const built: PhaseDetail[] = Array.from({ length: 25 }, (_, i) => {
          const num = i + 1;
          const meta = PHASE_META[num] ?? { description: "", agentName: `Agent ${num}` };
          const isComplete = completed.includes(num);
          const isCurrent = num === data.current_phase;
          const isFailed = data.status === "failed" && isCurrent;
          return {
            id: num,
            name: `${String(num).padStart(2, "0")} ${["Generate","Persist","Deploy","Secure","Grow","Optimize","Heal","DevOS","Vision","Economy","Hype","Govern","VC","Diplomat","Hive","M&A","Legal","R&D","DAO","Sovereign","Overseer","Mesh","Pulse","Evolve","Neural"][i]}`,
            description: meta.description,
            agentName: meta.agentName,
            status: isFailed ? "failed" : isComplete ? "complete" : isCurrent ? "running" : "pending",
          };
        });
        setPhases(built);
      } catch (e) {
        console.warn("[PhaseEditor] load error:", e);
      } finally {
        setLoading(false);
      }
    }
    loadPhases();
  }, [jobId, initialPhases]);

  async function handleRetry(phaseId: number) {
    if (!onRetryPhase) return;
    setRetrying(phaseId);
    try {
      await onRetryPhase(jobId, phaseId);
    } finally {
      setRetrying(null);
    }
  }

  const filteredPhases = phases.filter((p) => {
    if (filter === "all") return true;
    return p.status === filter;
  });

  const stats = {
    complete: phases.filter((p) => p.status === "complete").length,
    running: phases.filter((p) => p.status === "running").length,
    failed: phases.filter((p) => p.status === "failed").length,
    pending: phases.filter((p) => p.status === "pending").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Loading phase data…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { key: "complete", label: "Done", color: "text-green-400", bg: "bg-green-500/10" },
          { key: "running",  label: "Active", color: "text-brand-400", bg: "bg-brand-500/10" },
          { key: "failed",   label: "Failed", color: "text-red-400",   bg: "bg-red-500/10" },
          { key: "pending",  label: "Pending", color: "text-muted-foreground", bg: "bg-white/5" },
        ].map(({ key, label, color, bg }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(filter === key ? "all" : key as typeof filter)}
            className={`p-3 rounded-xl text-center transition-all ${
              filter === key ? `${bg} ring-1 ring-white/10` : "bg-white/3 hover:bg-white/5"
            }`}
          >
            <div className={`text-lg font-bold ${color}`}>{stats[key as keyof typeof stats]}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </button>
        ))}
      </div>

      {/* Phase list */}
      <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
        {filteredPhases.map((phase) => {
          const cfg = STATUS_CONFIG[phase.status];
          const isExpanded = expanded === phase.id;

          return (
            <div key={phase.id} className="rounded-xl overflow-hidden">
              {/* Phase row */}
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? null : phase.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${cfg.bg} border ${cfg.border}`}
              >
                {/* Status icon */}
                <div className="shrink-0 w-4 flex items-center justify-center">
                  {phase.status === "running" && <Loader2 size={13} className="animate-spin text-brand-400" />}
                  {phase.status === "complete" && <CheckCircle2 size={13} className="text-green-400" />}
                  {phase.status === "failed" && <XCircle size={13} className="text-red-400" />}
                  {phase.status === "pending" && <span className="w-1.5 h-1.5 rounded-full bg-white/15" />}
                  {phase.status === "skipped" && <span className="w-1.5 h-1.5 rounded-full bg-white/10" />}
                </div>

                {/* Name */}
                <span className={`flex-1 text-sm font-medium ${cfg.color}`}>{phase.name}</span>

                {/* Agent */}
                <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground/50 shrink-0">
                  <Cpu size={10} />
                  {phase.agentName}
                </span>

                {/* Duration */}
                {phase.durationMs && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground/50 shrink-0">
                    <Clock size={10} />
                    {formatDuration(phase.durationMs)}
                  </span>
                )}

                {/* Status badge */}
                <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                  {cfg.label}
                </span>

                {/* Expand */}
                <span className="text-muted-foreground/30 shrink-0">
                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </span>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className={`px-4 py-4 border-x border-b ${cfg.border} bg-black/20 space-y-3`}>
                  {/* Description */}
                  <p className="text-sm text-muted-foreground">{phase.description}</p>

                  {/* Timing */}
                  {(phase.startedAt || phase.completedAt) && (
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      {phase.startedAt && <span>Started: <span className="text-foreground">{new Date(phase.startedAt).toLocaleTimeString()}</span></span>}
                      {phase.completedAt && <span>Completed: <span className="text-foreground">{new Date(phase.completedAt).toLocaleTimeString()}</span></span>}
                    </div>
                  )}

                  {/* Error */}
                  {phase.error && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                      <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                      <span>{phase.error}</span>
                    </div>
                  )}

                  {/* Logs */}
                  {phase.logs && phase.logs.length > 0 && (
                    <div className="rounded-xl bg-black/40 border border-white/5 overflow-hidden">
                      <div className="px-3 py-1.5 border-b border-white/5 flex items-center gap-2">
                        <Terminal size={11} className="text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-mono">Phase logs</span>
                      </div>
                      <div className="p-3 space-y-0.5 max-h-40 overflow-y-auto font-mono text-xs">
                        {phase.logs.map((log, i) => (
                          <div key={i} className={
                            log.level === "error" ? "text-red-400" :
                            log.level === "warn" ? "text-amber-400" : "text-green-300/70"
                          }>
                            <span className="text-muted-foreground/30 mr-2 select-none">
                              {new Date(log.ts).toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </span>
                            {log.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Retry button */}
                  {phase.status === "failed" && onRetryPhase && (
                    <button
                      type="button"
                      onClick={() => handleRetry(phase.id)}
                      disabled={retrying === phase.id}
                      className="flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50"
                    >
                      {retrying === phase.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <RefreshCw size={12} />
                      )}
                      Retry phase
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
