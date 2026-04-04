"use client";

import { useState } from "react";

const MOCK_VENDORS = [
  { id: "1", name: "OpenRouter", type: "LLM", health: 0.98, status: "active", savings: 0 },
  { id: "2", name: "Vercel", type: "Deployment", health: 0.92, status: "active", savings: 0 },
  { id: "3", name: "Supabase", type: "Database", health: 0.71, status: "at_risk", savings: 240 },
  { id: "4", name: "Stripe", type: "Payments", health: 0.99, status: "active", savings: 0 },
  { id: "5", name: "E2B", type: "Sandbox", health: 0.65, status: "negotiating", savings: 1200 },
];

export function DiplomatDashboard() {
  const [vendors, setVendors] = useState(MOCK_VENDORS);
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const runAudit = async () => {
    setRunning(true);
    setLog(["🤖 Diplomat Agent activated...", "🔍 Scanning vendor relationships..."]);
    await new Promise(r => setTimeout(r, 1200));
    setLog(prev => [...prev, "⚠️ E2B: Health score 0.65 — Initiating rate limit negotiation..."]);
    await new Promise(r => setTimeout(r, 1000));
    setLog(prev => [...prev, "⚠️ Supabase: Contract expires in 22 days — Starting renewal negotiation..."]);
    await new Promise(r => setTimeout(r, 1000));
    setLog(prev => [...prev, "📨 Sending negotiation to E2B: Requesting 20% volume discount..."]);
    await new Promise(r => setTimeout(r, 900));
    setLog(prev => [...prev, "✅ E2B responded: Credit of $1,200 approved for downtime SLA breach."]);
    await new Promise(r => setTimeout(r, 800));
    setLog(prev => [...prev, "📨 Sending Supabase renewal offer: Locking in 15% multi-year discount..."]);
    await new Promise(r => setTimeout(r, 1000));
    setLog(prev => [...prev, "✅ Supabase responded: Rate locked at $240/yr savings. Contract renewed."]);
    setLog(prev => [...prev, "🏁 Audit complete. Total savings secured: $1,440/yr"]);
    setVendors(prev => prev.map(v =>
      v.id === "5" ? { ...v, status: "active", health: 0.97, savings: 1200 } :
      v.id === "3" ? { ...v, status: "active", health: 0.98, savings: 240 } : v
    ));
    setRunning(false);
  };

  const healthColor = (h: number) => h > 0.9 ? "text-green-400" : h > 0.7 ? "text-orange-400" : "text-red-400";
  const statusBadge = (s: string) => ({
    active: "bg-green-500/10 text-green-400 border-green-500/20",
    at_risk: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    negotiating: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  }[s] || "bg-white/5 text-muted-foreground border-white/10");

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Agentic Diplomacy</h2>
          <p className="text-muted-foreground text-sm">The Diplomat Agent monitors and negotiates all vendor relationships autonomously.</p>
        </div>
        <button
          onClick={runAudit}
          disabled={running}
          className="px-8 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-blue-500 hover:text-white transition-all shadow-xl disabled:opacity-50 active:scale-95"
        >
          {running ? "Negotiating..." : "Run Vendor Audit"}
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Vendors", value: vendors.length.toString() },
          { label: "Annual Savings", value: `$${vendors.reduce((s, v) => s + v.savings, 0).toLocaleString()}` },
          { label: "At Risk", value: vendors.filter(v => v.status === "at_risk").length.toString() },
        ].map(s => (
          <div key={s.label} className="p-6 rounded-2xl border border-white/10 bg-white/5 text-center">
            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-2">{s.label}</p>
            <p className="text-3xl font-black text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Vendor Grid */}
      <div className="grid gap-4">
        {vendors.map(v => (
          <div key={v.id} className="p-6 rounded-3xl border border-white/10 bg-white/5 flex items-center justify-between hover:border-blue-500/30 transition-all">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-xl font-black text-white">{v.name[0]}</div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h4 className="text-lg font-black text-white">{v.name}</h4>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{v.type}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold ${healthColor(v.health)}`}>Health {(v.health * 100).toFixed(0)}%</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md border font-black uppercase ${statusBadge(v.status)}`}>{v.status.replace("_", " ")}</span>
                </div>
              </div>
            </div>
            {v.savings > 0 && (
              <div className="text-right">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Savings Secured</p>
                <p className="text-xl font-black text-green-400">${v.savings.toLocaleString()}/yr</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Negotiation Log */}
      {log.length > 0 && (
        <div className="p-6 rounded-3xl border border-white/10 bg-black/40 font-mono text-sm space-y-2">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-4">Negotiation Log</p>
          {log.map((entry, i) => <p key={i} className="text-muted-foreground">{entry}</p>)}
        </div>
      )}
    </div>
  );
}
