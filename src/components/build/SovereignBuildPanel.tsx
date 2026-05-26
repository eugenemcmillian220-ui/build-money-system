"use client";

import { useState } from "react";
import { Crown, Loader2, ArrowRight, Target, DollarSign, FileText, Settings2, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { BUILD_MODES, REVENUE_MODELS, type RevenueModel } from "@/lib/build-modes";
import type { ManifestOptions } from "@/lib/types";

interface SovereignBuildPanelProps {
  orgId: string;
  onSubmit: (prompt: string, orgId: string, options: ManifestOptions, onLog: (level: "info" | "error", text: string) => void) => Promise<void>;
  isProcessing: boolean;
}

const PHASE_NAMES: Record<number, string> = {
  1: "Generate", 2: "Persist", 3: "Deploy", 4: "Secure", 5: "Grow",
  6: "Optimize", 7: "Heal", 8: "DevOS", 9: "Vision", 10: "Economy",
  11: "Hype", 12: "Govern", 13: "VC", 14: "Diplomat", 15: "Hive",
  16: "M&A", 17: "Legal", 18: "R&D", 19: "DAO", 20: "Sovereign",
  21: "Overseer", 22: "Mesh", 23: "Pulse", 24: "Evolve", 25: "Neural",
};

export function SovereignBuildPanel({ orgId, onSubmit, isProcessing }: SovereignBuildPanelProps) {
  const mode = BUILD_MODES.sovereign;
  const [prompt, setPrompt] = useState("");
  const [revenueModel, setRevenueModel] = useState<RevenueModel>("subscription");
  const [targetUser, setTargetUser] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [techConstraints, setTechConstraints] = useState<string[]>([]);
  const [constraintInput, setConstraintInput] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [logs, setLogs] = useState<{ level: "info" | "error"; text: string }[]>([]);

  function addLog(level: "info" | "error", text: string) {
    setLogs((prev) => [...prev, { level, text }]);
  }

  function addConstraint() {
    const val = constraintInput.trim();
    if (val && techConstraints.length < 10 && !techConstraints.includes(val)) {
      setTechConstraints((prev) => [...prev, val]);
      setConstraintInput("");
    }
  }

  function removeConstraint(c: string) {
    setTechConstraints((prev) => prev.filter((x) => x !== c));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || !targetUser.trim()) return;
    setLogs([]);

    const options: ManifestOptions = {
      mode: "sovereign",
      revenueModel,
      targetUser,
      additionalContext: additionalContext.trim() || undefined,
      techConstraints: techConstraints.length > 0 ? techConstraints : undefined,
      quickBuild: false,
    };

    await onSubmit(prompt.trim(), orgId, options, addLog);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4 p-5 rounded-2xl bg-amber-500/5 border border-amber-500/15">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center shrink-0">
          <Crown size={18} className="text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-foreground">{mode.label}</h3>
            <span className="text-xs bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
              {mode.phases} phases
            </span>
            <span className="text-xs bg-amber-500/10 text-amber-400/70 px-2 py-0.5 rounded-full border border-amber-500/15">
              {mode.estimatedTime}
            </span>
            <span className="text-xs text-muted-foreground">{mode.creditCost} credits</span>
          </div>
          <p className="text-sm text-muted-foreground">{mode.description}</p>

          {/* Phase grid */}
          <div className="mt-3 flex flex-wrap gap-1">
            {Object.entries(PHASE_NAMES).map(([num, name]) => (
              <span key={num} className="text-xs text-amber-400/50 bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/10 font-mono">
                {num.padStart(2, "0")} {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Prompt */}
        <div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <FileText size={13} />
            Describe your empire
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
            rows={4}
            placeholder="An AI-powered SaaS platform that automates cold outreach for B2B sales teams, with built-in CRM, email sequencing, and revenue analytics..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/30 transition-all resize-none"
          />
        </div>

        {/* Target user */}
        <div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Target size={13} />
            Target user
          </label>
          <input
            type="text"
            value={targetUser}
            onChange={(e) => setTargetUser(e.target.value)}
            required
            placeholder="B2B sales teams at Series A–C startups, 10–200 employees..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/30 transition-all"
          />
        </div>

        {/* Revenue model */}
        <div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <DollarSign size={13} />
            Revenue model
          </label>
          <div className="grid grid-cols-2 gap-2">
            {REVENUE_MODELS.map((rm) => (
              <button
                key={rm.value}
                type="button"
                onClick={() => setRevenueModel(rm.value)}
                className={`text-left p-3 rounded-xl border transition-all ${
                  revenueModel === rm.value
                    ? "bg-amber-500/10 border-amber-500/30 text-foreground"
                    : "bg-white/3 border-white/8 text-muted-foreground hover:border-white/15"
                }`}
              >
                <div className="text-xs font-medium">{rm.label}</div>
                <div className="text-xs text-muted-foreground/60 mt-0.5">{rm.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced options toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-1"
        >
          <Settings2 size={13} />
          Advanced options
          {showAdvanced ? <ChevronUp size={13} className="ml-auto" /> : <ChevronDown size={13} className="ml-auto" />}
        </button>

        {showAdvanced && (
          <div className="space-y-4 pl-4 border-l border-white/10">
            {/* Additional context */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Additional context (optional)</label>
              <textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                rows={3}
                maxLength={5000}
                placeholder="Integration requirements, compliance needs, design preferences, competitor references..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/30 transition-all resize-none"
              />
              <p className="text-xs text-muted-foreground/40 mt-1">{additionalContext.length}/5000</p>
            </div>

            {/* Tech constraints */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Tech constraints (optional, max 10)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={constraintInput}
                  onChange={(e) => setConstraintInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addConstraint(); } }}
                  placeholder="e.g. Must use PostgreSQL, No vendor lock-in..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
                />
                <button
                  type="button"
                  onClick={addConstraint}
                  disabled={!constraintInput.trim() || techConstraints.length >= 10}
                  className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 disabled:opacity-40 transition-all"
                >
                  <Plus size={14} />
                </button>
              </div>
              {techConstraints.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {techConstraints.map((c) => (
                    <span key={c} className="flex items-center gap-1 text-xs bg-amber-500/10 text-amber-300 px-2 py-1 rounded-lg border border-amber-500/20">
                      {c}
                      <button type="button" onClick={() => removeConstraint(c)} className="hover:text-red-400 transition-colors">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isProcessing || !prompt.trim() || !targetUser.trim()}
          className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-3.5 px-4 rounded-xl transition-all text-sm"
        >
          {isProcessing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Manifesting empire…
            </>
          ) : (
            <>
              <Crown size={16} />
              Launch Full Sovereign Build
              <ArrowRight size={14} className="ml-auto" />
            </>
          )}
        </button>
      </form>

      {/* Live logs */}
      {logs.length > 0 && (
        <div className="rounded-xl bg-black/40 border border-white/5 overflow-hidden">
          <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs text-muted-foreground font-mono">Sovereign pipeline log</span>
          </div>
          <div className="p-4 space-y-1 max-h-64 overflow-y-auto font-mono text-xs">
            {logs.map((log, i) => (
              <div key={i} className={log.level === "error" ? "text-red-400" : "text-amber-300/80"}>
                <span className="text-muted-foreground/40 select-none mr-2">{String(i + 1).padStart(3, "0")}</span>
                {log.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
