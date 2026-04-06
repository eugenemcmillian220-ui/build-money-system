"use client";

import { useState, useEffect } from "react";

interface Trend {
  id: string;
  tech_name: string;
  category: string;
  star_velocity: number;
  adoption_status: string;
}

export function RDLab() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [scouting, setScouting] = useState(false);

  useEffect(() => {
    // Mock data for demo
    setTrends([
      { id: "1", tech_name: "Llama-4-Scout", category: "LLM", star_velocity: 2450, adoption_status: "testing" },
      { id: "2", tech_name: "Tailwind CSS v5 Alpha", category: "Framework", star_velocity: 1800, adoption_status: "monitoring" },
      { id: "3", tech_name: "MCP - Agent Gateway", category: "Protocol", star_velocity: 3200, adoption_status: "integrated" },
    ]);
  }, []);

  const runScout = async () => {
    setScouting(true);
    await new Promise(r => setTimeout(r, 2000));
    setScouting(false);
  };

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Autonomous R&D Lab</h2>
          <p className="text-muted-foreground text-sm">Tech scouting and automated adoption of 2026 breakthroughs.</p>
        </div>
        <button
          onClick={runScout}
          disabled={scouting}
          className="px-8 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-brand-500 hover:text-white transition-all shadow-xl disabled:opacity-50"
        >
          {scouting ? "Scouting..." : "Trigger Tech Scout"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {trends.map(trend => (
          <div key={trend.id} className="p-6 rounded-3xl border border-white/10 bg-white/5 hover:border-brand-500/30 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase px-2 py-1 rounded-md bg-brand-500/10 text-brand-400 border border-brand-500/20">
                {trend.category}
              </span>
              <div className="flex items-center gap-1 text-green-400 text-xs font-bold">
                <span>↑</span> {trend.star_velocity}
              </div>
            </div>
            <h4 className="text-xl font-bold text-white mb-2">{trend.tech_name}</h4>
            <p className="text-xs text-muted-foreground mb-6 uppercase tracking-widest font-bold">Status: {trend.adoption_status}</p>
            <div className="pt-4 border-t border-white/5">
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-brand-500 h-full transition-all duration-1000" 
                  style={{ width: trend.adoption_status === 'integrated' ? '100%' : trend.adoption_status === 'testing' ? '60%' : '20%' }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
