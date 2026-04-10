"use client";

import { ShieldCheck, Zap, Database, Activity } from "lucide-react";

export function SystemStatus() {
  const systems = [
    { name: "Neural Link", status: "Optimal", icon: Zap, color: "text-brand-400" },
    { name: "Sovereign DB", status: "Healthy", icon: Database, color: "text-green-400" },
    { name: "Security Auditor", status: "Auditing", icon: ShieldCheck, color: "text-blue-400" },
    { name: "Agent Swarm", status: "Active", icon: Activity, color: "text-amber-400" },
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <ShieldCheck size={16} className="text-brand-400" />
          System Sovereignty
        </h3>
        <span className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-green-400 animate-pulse">
          Live
        </span>
      </div>

      <div className="space-y-6">
        {systems.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.name} className="flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-brand-500/20 transition-all">
                  <Icon size={18} className={s.color} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">{s.name}</p>
                  <p className="text-xs font-bold text-white/80">{s.status}</p>
                </div>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            </div>
          );
        })}
      </div>

      <div className="mt-10 pt-8 border-t border-white/5">
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-4">Phase Progress</p>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-[9px] font-black uppercase">
              <span className="text-brand-400">Empire Sovereignty</span>
              <span className="text-white">100%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 w-full shadow-[0_0_12px_rgba(245,158,11,0.4)]" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[9px] font-black uppercase">
              <span className="text-muted-foreground">Self-Evolution</span>
              <span className="text-white">85%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-white/20 w-[85%]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
