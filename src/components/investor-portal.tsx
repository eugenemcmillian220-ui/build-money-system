"use client";

import { useState, useEffect } from "react";

interface Investment {
  id: string;
  project_name: string;
  amount_credits: number;
  equity_share: number;
  status: string;
  roi_projected: number;
}

export function InvestorPortal() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for demo
    setInvestments([
      { id: "1", project_name: "DevGuard AI", amount_credits: 50000, equity_share: 0.05, status: "active", roi_projected: 3.2 },
      { id: "2", project_name: "VibeCart", amount_credits: 25000, equity_share: 0.03, status: "proposed", roi_projected: 1.8 },
    ]);
    setLoading(false);
  }, []);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Synchronizing ledger...</div>;

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Autonomous VC Dashboard</h2>
          <p className="text-muted-foreground text-sm">Portfolio overview of platform-backed autonomous companies.</p>
        </div>
        <div className="flex gap-4">
          <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-center">
            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Portfolio Value</p>
            <p className="text-xl font-black text-green-400">75,000 <span className="text-xs font-normal">CR</span></p>
          </div>
          <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-center">
            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Avg. ROI</p>
            <p className="text-xl font-black text-blue-400">2.5x</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {investments.map(inv => (
          <div key={inv.id} className="p-8 rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/5 to-transparent flex items-center justify-between group hover:border-green-500/30 transition-all">
            <div className="flex items-center gap-8">
              <div className="w-16 h-16 rounded-[1.5rem] bg-green-500/10 flex items-center justify-center text-2xl shadow-inner">
                🚀
              </div>
              <div>
                <h4 className="text-2xl font-black text-white uppercase tracking-tight mb-1">{inv.project_name}</h4>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    RevShare: <span className="text-white">{(inv.equity_share * 100).toFixed(0)}%</span>
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-black uppercase ${
                    inv.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                  }`}>
                    {inv.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-12 text-right">
              <div>
                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Investment</p>
                <p className="text-xl font-black text-white">{inv.amount_credits.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">Credits</span></p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Projected ROI</p>
                <p className="text-xl font-black text-blue-400">{inv.roi_projected}x</p>
              </div>
              <button className="px-8 py-4 rounded-2xl bg-white text-black text-xs font-black uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all shadow-xl active:scale-95">
                View Performance
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
