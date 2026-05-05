"use client";

import { AgentSkill } from "@/lib/marketplace";

export function SkillCard({ skill, onSubscribe }: { skill: AgentSkill; onSubscribe: (id: string) => void }) {
  return (
    <div className="group glass-card overflow-hidden rounded-2xl border border-white/5 bg-black/40 p-6 transition-all hover:border-brand-500/30 hover:bg-black/60">
      <div className="flex items-start justify-between mb-4">
        <div className="h-12 w-12 rounded-xl bg-brand-500/10 flex items-center justify-center text-2xl">
          {skill.category === 'ui' ? '🎨' : skill.category === 'logic' ? '🧠' : skill.category === 'security' ? '🛡️' : '📊'}
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-brand-400 uppercase tracking-tighter">{skill.category}</p>
          <div className="flex items-center gap-1 mt-1 justify-end text-yellow-500 text-xs font-bold">
            <span>⭐ {skill.rating.toFixed(1)}</span>
            <span className="text-muted-foreground font-normal">({skill.usageCount})</span>
          </div>
        </div>
      </div>

      <h3 className="text-lg font-black text-white mb-2 group-hover:text-brand-300 transition-colors">
        {skill.name}
      </h3>
      <p className="text-sm text-muted-foreground line-clamp-2 mb-6 h-10">
        {skill.description}
      </p>

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Price</span>
          <span className="text-xl font-black text-white">{skill.price === 0 ? 'FREE' : `${skill.price} CR`}</span>
        </div>
        <button
          onClick={() => onSubscribe(skill.id)}
          className="rounded-xl bg-brand-500 px-6 py-2.5 text-xs font-black text-white shadow-lg shadow-brand-500/20 transition-all hover:scale-105 active:scale-95"
        >
          SUBSCRIBE
        </button>
      </div>
    </div>
  );
}
