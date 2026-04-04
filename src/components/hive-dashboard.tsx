"use client";

import { useState, useEffect } from "react";

interface KnowledgeAsset {
  id: string;
  pattern_type: string;
  problem_description: string;
  tags: string[];
  confidence_score: number;
  usage_count: number;
}

export function HiveDashboard() {
  const [assets, setAssets] = useState<KnowledgeAsset[]>([]);

  useEffect(() => {
    // Mock data for global intelligence demo
    setAssets([
      { id: "1", pattern_type: "bug_fix", problem_description: "Hydration mismatch in Next.js 15 async components", tags: ["nextjs-15", "react-19"], confidence_score: 0.95, usage_count: 1240 },
      { id: "2", pattern_type: "architecture", problem_description: "Optimized multi-tenant RLS policy for large datasets", tags: ["supabase", "security"], confidence_score: 0.88, usage_count: 850 },
      { id: "3", pattern_type: "ui_pattern", problem_description: "Accessible AI chat interface with streaming support", tags: ["tailwind", "ux"], confidence_score: 0.92, usage_count: 2100 },
    ]);
  }, []);

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Hive Intelligence</h2>
          <p className="text-muted-foreground text-sm">Synthesized global build patterns across all organizations.</p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-black uppercase tracking-widest animate-pulse">
          Live Sync Active
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {assets.map(asset => (
          <div key={asset.id} className="p-6 rounded-3xl border border-white/10 bg-white/5 hover:border-purple-500/30 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase px-2 py-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {asset.pattern_type.replace('_', ' ')}
              </span>
              <span className="text-xs font-bold text-muted-foreground">Used {asset.usage_count.toLocaleString()} times</span>
            </div>
            <h4 className="text-lg font-bold text-white mb-4 line-clamp-2">{asset.problem_description}</h4>
            <div className="flex flex-wrap gap-2 mb-6">
              {asset.tags.map(tag => (
                <span key={tag} className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">#{tag}</span>
              ))}
            </div>
            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-1">Confidence</p>
                <p className="text-sm font-black text-green-400">{(asset.confidence_score * 100).toFixed(0)}%</p>
              </div>
              <button className="px-4 py-2 rounded-xl bg-white/5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all">
                Recall Logic
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
