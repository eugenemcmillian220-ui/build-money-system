"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Zap, ShieldCheck, TrendingUp, Activity, RotateCcw, Cpu } from "lucide-react";
import { analyzeAndProposeEvolution, triggerEvolutionCycle, getEvolutionHistory } from "@/lib/actions/evolution-actions";
import { type EvolutionPatch } from "@/lib/self-evolution";

export function EvolutionDashboard() {
  const [patches, setPatches] = useState<EvolutionPatch[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isEvolving, setIsEvolving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const p = await analyzeAndProposeEvolution();
        const h = await getEvolutionHistory();
        setPatches(p);
        setHistory(h);
      } catch (err) {
        console.error("Failed to load evolution data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const triggerEvolution = async () => {
    setIsEvolving(true);
    try {
      const result = await triggerEvolutionCycle();
      console.log(`Evolution cycle complete: ${result.patchesApplied} patches applied.`);
      // Refresh history
      const h = await getEvolutionHistory();
      setHistory(h);
    } catch (err) {
      console.error("Evolution failed:", err);
    } finally {
      setIsEvolving(false);
    }
  };

  const metrics = [
    { label: "Self-Healing Rate", value: "98.4%", icon: ShieldCheck, color: "text-green-400" },
    { label: "Optimization Gain", value: "+24.1%", icon: TrendingUp, color: "text-blue-400" },
    { label: "Recursive Depth", value: "Level 4", icon: RotateCcw, color: "text-purple-400" },
    { label: "Neural Efficiency", value: "0.92", icon: Zap, color: "text-yellow-400" },
  ];

  return (
    <div className="p-6 space-y-8 bg-black text-white min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-purple-400" />
            Phase 24: Self-Evolution
          </h1>
          <p className="text-zinc-500 mt-1">Autonomous system optimization and recursive self-improvement.</p>
        </div>
        <button
          onClick={triggerEvolution}
          disabled={isEvolving}
          className={`
            px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-3
            ${isEvolving ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-500/20"}
          `}
        >
          {isEvolving ? (
            <>
              <RotateCcw className="w-5 h-5 animate-spin" />
              Evolving System...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 fill-current" />
              Trigger Evolution Cycle
            </>
          )}
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-3 mb-2">
              <metric.icon className={`w-5 h-5 ${metric.color}`} />
              <span className="text-sm text-zinc-500 font-medium">{metric.label}</span>
            </div>
            <div className="text-2xl font-bold">{metric.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pending Evolution Patches */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-400" />
            Pending System Patches
          </h2>
          <div className="space-y-3">
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-zinc-900 rounded-xl" />)}
              </div>
            ) : patches.length === 0 ? (
              <div className="p-12 text-center bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800">
                <p className="text-zinc-500 italic">No patches pending. System is at peak optimization.</p>
              </div>
            ) : (
              patches.map((patch) => (
                <div key={patch.id} className="p-5 bg-zinc-900/80 rounded-2xl border border-zinc-800 hover:border-purple-500/30 transition-all group">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                          patch.type === "bugfix" ? "bg-red-900/30 text-red-400 border border-red-800/50" : 
                          patch.type === "optimization" ? "bg-blue-900/30 text-blue-400 border border-blue-800/50" :
                          "bg-green-900/30 text-green-400 border border-green-800/50"
                        }`}>
                          {patch.type}
                        </span>
                        <span className="text-sm font-bold text-zinc-200">{patch.target}</span>
                      </div>
                      <p className="text-sm text-zinc-500 leading-relaxed">{patch.description}</p>
                      <div className="flex items-center gap-4 pt-1">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                          <Activity className="w-3 h-3" />
                          Impact: <span className="text-zinc-400">{(patch.impactScore * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-mono text-zinc-600 group-hover:text-purple-400 transition-colors">
                      {patch.id}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Evolution History */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-purple-400" />
            Evolution Log
          </h2>
          <div className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
            <div className="space-y-6">
              {history.map((item, i) => (
                <div key={i} className="flex gap-4 relative">
                  {i !== history.length - 1 && (
                    <div className="absolute left-[11px] top-6 bottom-[-24px] w-[1px] bg-zinc-800" />
                  )}
                  <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 z-10">
                    <div className={`w-2 h-2 rounded-full ${item.status === "applied" || item.status === "completed" ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" : "bg-yellow-400"}`} />
                  </div>
                  <div className="space-y-1 pb-4">
                    <p className="text-sm font-bold text-zinc-300">{item.event}</p>
                    <p className="text-[11px] text-zinc-500 font-mono">{new Date(item.timestamp).toLocaleString()}</p>
                    <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
