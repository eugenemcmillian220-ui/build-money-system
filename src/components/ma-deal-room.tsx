"use client";

import { useState, useEffect } from "react";

interface MergerDeal {
  id: string;
  source_name: string;
  target_name: string;
  synergy_score: number;
  reasoning: string;
  equity_split: { source: number; target: number };
  status: string;
}

export function MADealRoom() {
  const [deals, setDeals] = useState<MergerDeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for demo
    setDeals([
      { 
        id: "1", 
        source_name: "DevGuard AI", 
        target_name: "ComplianceVault", 
        synergy_score: 0.94, 
        reasoning: "DevGuard's PR scanning complements ComplianceVault's SOC2 reporting loop perfectly.",
        equity_split: { source: 0.55, target: 0.45 },
        status: "proposed"
      },
      { 
        id: "2", 
        source_name: "VibeCart", 
        target_name: "StyleSync", 
        synergy_score: 0.82, 
        reasoning: "Consolidating visual commerce and recommendation engines into a single shopping OS.",
        equity_split: { source: 0.6, target: 0.4 },
        status: "under_review"
      }
    ]);
    setLoading(false);
  }, []);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Analyzing synergy graphs...</div>;

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-white">M&A Deal Room</h2>
          <p className="text-muted-foreground text-sm">Autonomous project consolidation and strategic mergers.</p>
        </div>
        <div className="flex gap-4">
          <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-center">
            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Active Synergies</p>
            <p className="text-xl font-black text-blue-400">12 High-Confidence</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {deals.map(deal => (
          <div key={deal.id} className="p-8 rounded-[2.5rem] border border-white/10 bg-white/5 hover:border-blue-500/30 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${
                deal.status === 'proposed' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}>
                {deal.status.replace('_', ' ')}
              </span>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center font-black text-xl">A</div>
                <div className="text-2xl font-bold text-white">+</div>
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center font-black text-xl">B</div>
              </div>

              <div className="flex-1">
                <h4 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
                  {deal.source_name} <span className="text-muted-foreground mx-2">&</span> {deal.target_name}
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mb-4">{deal.reasoning}</p>
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Synergy Score</p>
                    <p className="text-lg font-black text-green-400">{(deal.synergy_score * 100).toFixed(0)}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Equity Split</p>
                    <p className="text-lg font-black text-white">{deal.equity_split.source * 100}% / {deal.equity_split.target * 100}%</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="px-8 py-4 rounded-2xl border border-white/10 text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-all">
                  Due Diligence
                </button>
                <button className="px-8 py-4 rounded-2xl bg-white text-black text-xs font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all shadow-2xl active:scale-95">
                  Execute Merger
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
