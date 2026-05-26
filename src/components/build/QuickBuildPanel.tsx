"use client";

import { useState } from "react";
import { Zap, Loader2, ArrowRight, Target, DollarSign, FileText } from "lucide-react";
import { BUILD_MODES, REVENUE_MODELS, type RevenueModel } from "@/lib/build-modes";
import type { ManifestOptions } from "@/lib/types";

interface QuickBuildPanelProps {
  orgId: string;
  onSubmit: (prompt: string, orgId: string, options: ManifestOptions, onLog: (level: "info" | "error", text: string) => void) => Promise<void>;
  isProcessing: boolean;
}

export function QuickBuildPanel({ orgId, onSubmit, isProcessing }: QuickBuildPanelProps) {
  const mode = BUILD_MODES.quick;
  const [prompt, setPrompt] = useState("");
  const [revenueModel, setRevenueModel] = useState<RevenueModel>("subscription");
  const [targetUser, setTargetUser] = useState("");
  const [logs, setLogs] = useState<{ level: "info" | "error"; text: string }[]>([]);

  function addLog(level: "info" | "error", text: string) {
    setLogs((prev) => [...prev, { level, text }]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || !targetUser.trim()) return;
    setLogs([]);

    const options: ManifestOptions = {
      mode: "quick",
      revenueModel,
      targetUser,
      quickBuild: true,
      phases: [1, 2, 3, 4, 23], // Generate, Persist, Deploy, Secure, Pulse
    };

    await onSubmit(prompt.trim(), orgId, options, addLog);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4 p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/15">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <Zap size={18} className="text-emerald-400" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground">{mode.label}</h3>
            <span className="text-xs bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
              {mode.estimatedTime}
            </span>
            <span className="text-xs text-muted-foreground">{mode.creditCost} credits</span>
          </div>
          <p className="text-sm text-muted-foreground">{mode.description}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {mode.features.map((f) => (
              <span key={f} className="text-xs text-emerald-400/70 bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10">
                {f}
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
            What are you building?
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
            rows={3}
            placeholder="A SaaS tool that helps indie developers track their MRR, churn, and revenue goals in one dashboard..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition-all resize-none"
          />
        </div>

        {/* Target user */}
        <div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Target size={13} />
            Who is this for?
          </label>
          <input
            type="text"
            value={targetUser}
            onChange={(e) => setTargetUser(e.target.value)}
            required
            placeholder="Indie developers, small SaaS founders..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition-all"
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
                    ? "bg-emerald-500/10 border-emerald-500/30 text-foreground"
                    : "bg-white/3 border-white/8 text-muted-foreground hover:border-white/15"
                }`}
              >
                <div className="text-xs font-medium">{rm.label}</div>
                <div className="text-xs text-muted-foreground/60 mt-0.5">{rm.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isProcessing || !prompt.trim() || !targetUser.trim()}
          className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-4 rounded-xl transition-all text-sm"
        >
          {isProcessing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Building empire…
            </>
          ) : (
            <>
              <Zap size={16} />
              Quick Build — {mode.estimatedTime}
              <ArrowRight size={14} className="ml-auto" />
            </>
          )}
        </button>
      </form>

      {/* Live logs */}
      {logs.length > 0 && (
        <div className="rounded-xl bg-black/40 border border-white/5 overflow-hidden">
          <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-muted-foreground font-mono">Build log</span>
          </div>
          <div className="p-4 space-y-1 max-h-48 overflow-y-auto font-mono text-xs">
            {logs.map((log, i) => (
              <div key={i} className={log.level === "error" ? "text-red-400" : "text-emerald-300/80"}>
                <span className="text-muted-foreground/40 select-none mr-2">{String(i + 1).padStart(2, "0")}</span>
                {log.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
