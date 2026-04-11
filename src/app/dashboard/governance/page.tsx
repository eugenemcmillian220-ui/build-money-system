"use client";

import { ShieldCheck, Lock, History } from "lucide-react";

export default function GovernancePage() {
  return (
    <div className="p-8 md:p-12">
      <div className="max-w-7xl mx-auto space-y-12">
          <header>
            <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">Empire Governance</h1>
            <p className="text-muted-foreground font-bold italic">Audit logs, permission overrides, and sovereign security vaults.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 flex flex-col justify-between">
              <div>
                <ShieldCheck size={32} className="text-brand-400 mb-6" />
                <h3 className="text-xl font-black uppercase mb-2">Sovereign Audit</h3>
                <p className="text-sm text-muted-foreground font-bold italic">Trace every agent decision across your multi-key LLM router.</p>
              </div>
              <button className="mt-10 w-full py-4 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all">
                Access Audit Logs
              </button>
            </div>

            <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 flex flex-col justify-between">
              <div>
                <Lock size={32} className="text-amber-400 mb-6" />
                <h3 className="text-xl font-black uppercase mb-2">IP Vault</h3>
                <p className="text-sm text-muted-foreground font-bold italic">Secure your generated codebase with encrypted legal-ready snapshots.</p>
              </div>
              <button className="mt-10 w-full py-4 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all">
                Open IP Vault
              </button>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
            <div className="flex items-center gap-3 mb-8">
              <History size={20} className="text-blue-400" />
              <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Recent Activity</h3>
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-4 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-brand-500" />
                    <p className="text-xs font-bold text-white/80 uppercase tracking-tight italic">Agent &quot;Scout&quot; initiated research pass for new project.</p>
                  </div>
                  <span className="text-[10px] font-black text-muted-foreground">2H AGO</span>
                </div>
              ))}
            </div>
          </div>
        </div>
    </div>
  );
}
