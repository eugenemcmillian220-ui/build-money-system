"use client";

import { useParams } from "next/navigation";
import { SOVEREIGN_PHASES } from "@/lib/phases";
import { useState } from "react";
import { 
  ChevronLeft, 
  Activity, 
  Terminal, 
  Play, 
  CheckCircle2, 
  AlertTriangle,
  Loader2
} from "lucide-react";
import Link from "next/link";

export default function PhasePage() {
  const { id } = useParams();
  const phaseId = parseInt(id as string);
  const phase = SOVEREIGN_PHASES.find(p => p.id === phaseId);

  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!phase) {
    return (
      <div className="p-12 text-center space-y-6">
        <h2 className="text-2xl font-black uppercase italic">Phase {id} Not Yet Initialized</h2>
        <p className="text-muted-foreground">This phase is currently being synchronized with the Hive Mind.</p>
        <Link href="/dashboard" className="inline-block px-6 py-3 bg-brand-500 text-black rounded-xl font-black uppercase text-xs">Return to Dashboard</Link>
      </div>
    );
  }

  const handleToolExecution = async (toolName: string, endpoint: string, method: string) => {
    setLoading(toolName);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(endpoint, {
        method: method,
        headers: { "Content-Type": "application/json" },
        ...(method === "POST" && { body: JSON.stringify({ prompt: "Standalone Phase Execution", orgId: "default" }) })
      });

      if (!res.ok) throw new Error(`Execution failed: ${res.statusText}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const Icon = phase.icon;

  return (
    <div className="p-4 md:p-8 lg:p-12">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="space-y-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors group w-fit">
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Back to Forge</span>
          </Link>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-500/20 flex items-center justify-center border border-brand-500/30">
                  <Icon size={24} className="text-brand-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-500">Phase {phase.id}</p>
                  <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic">{phase.name}</h1>
                </div>
              </div>
              <p className="text-xl text-muted-foreground font-bold italic max-w-2xl">{phase.mission}</p>
            </div>
            
            <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full flex items-center gap-2">
              <Activity size={14} className="text-green-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-green-400">Production Active</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Features & Expectation */}
          <div className="space-y-8">
            <section className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">Capabilities</h3>
              <ul className="space-y-4">
                {phase.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm font-bold text-white/80 italic">
                    <CheckCircle2 size={16} className="text-brand-400 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </section>

            <section className="bg-brand-500/5 border border-brand-500/20 p-8 rounded-[2.5rem] space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-brand-400">Expected Outcome</h3>
              <p className="text-sm font-bold italic text-white/70 leading-relaxed">
                {phase.expectation}
              </p>
            </section>
          </div>

          {/* Interactive Tools */}
          <div className="lg:col-span-2 space-y-8">
            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">Functional Tools</h3>
              <div className="grid gap-4">
                {phase.tools.map((tool, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-3xl group hover:border-brand-500/30 transition-all">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="space-y-1">
                        <h4 className="text-lg font-black uppercase tracking-tight text-white group-hover:text-brand-400 transition-colors">{tool.name}</h4>
                        <p className="text-xs text-muted-foreground font-bold italic">{tool.description}</p>
                      </div>
                      <button 
                        disabled={!!loading}
                        onClick={() => tool.endpoint && handleToolExecution(tool.name, tool.endpoint, tool.method || "GET")}
                        className="px-6 py-3 bg-white/5 hover:bg-brand-500 hover:text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {loading === tool.name ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Play size={14} fill="currentColor" />
                        )}
                        Execute Tool
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Execution Result Terminal */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <Terminal size={16} className="text-muted-foreground" />
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">Execution Output</h3>
              </div>
              <div className="bg-black border border-white/10 rounded-2xl p-6 font-mono text-xs min-h-[300px] overflow-auto custom-scrollbar">
                {loading ? (
                  <div className="flex items-center gap-2 text-brand-400">
                    <span className="animate-pulse">_</span>
                    <span>Processing sovereign request...</span>
                  </div>
                ) : error ? (
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertTriangle size={14} />
                    <span>Error: {error}</span>
                  </div>
                ) : result ? (
                  <pre className="text-green-400/80 leading-relaxed">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                ) : (
                  <div className="text-muted-foreground/40 italic">
                    Waiting for tool initialization...
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
