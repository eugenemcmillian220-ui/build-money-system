"use client";

import { Blueprint, SOVEREIGN_BLUEPRINTS } from "@/lib/blueprints";
import { Box, ChevronRight } from "lucide-react";

interface BlueprintGalleryProps {
  onSelect: (blueprint: Blueprint) => void;
}

export function BlueprintGallery({ onSelect }: BlueprintGalleryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {SOVEREIGN_BLUEPRINTS.map((b) => (
        <div 
          key={b.id}
          className="bg-white/5 border border-white/10 rounded-[2rem] p-8 hover:border-brand-500/30 transition-all group flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                b.mode === 'elite' ? 'bg-brand-500/10 text-brand-400' :
                b.mode === 'universal' ? 'bg-blue-500/10 text-blue-400' :
                'bg-purple-500/10 text-purple-400'
              }`}>
                {b.mode} Mode
              </div>
              <Box size={16} className="text-muted-foreground opacity-20" />
            </div>
            
            <div>
              <h3 className="text-xl font-black uppercase tracking-tighter italic text-white group-hover:text-brand-400 transition-colors">
                {b.name}
              </h3>
              <p className="text-sm text-muted-foreground font-bold italic mt-2 line-clamp-2">
                {b.description}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Expected Outcome</p>
              <p className="text-xs italic text-white/70 leading-relaxed">
                {b.outcomeExpectation}
              </p>
            </div>
          </div>

          <button
            onClick={() => onSelect(b)}
            className="mt-8 w-full py-4 bg-white/5 group-hover:bg-brand-500 group-hover:text-black rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2"
          >
            Launch Manifestation
            <ChevronRight size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
