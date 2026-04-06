"use client";

import { useState } from "react";

interface ERDVisualizerProps {
  schema?: string;
}

export function ERDVisualizer({ schema }: ERDVisualizerProps) {
  if (!schema) return null;

  // Simple parser for SQL CREATE TABLE statements
  const tables = schema.split("CREATE TABLE").slice(1).map(t => {
    const lines = t.split("\n");
    const tableName = lines[0].trim().replace(/IF NOT EXISTS\s+/i, "").replace(/[(|{]/, "").trim();
    const columns = lines.slice(1).filter(l => l.trim() && !l.trim().startsWith(")") && !l.trim().startsWith("CREATE")).map(l => {
      const parts = l.trim().split(/\s+/);
      return {
        name: parts[0],
        type: parts[1],
        isPK: l.toLowerCase().includes("primary key"),
        isFK: l.toLowerCase().includes("references")
      };
    });
    return { name: tableName, columns };
  });

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-400">📊</div>
        <h3 className="text-lg font-black uppercase tracking-tight text-white">Database Blueprint</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tables.map((table, i) => (
          <div key={i} className="glass-card rounded-2xl overflow-hidden border border-white/10 hover:border-brand-500/30 transition-all">
            <div className="bg-brand-500/10 px-4 py-2 border-b border-white/5">
              <span className="text-xs font-black uppercase text-brand-400 tracking-widest">{table.name}</span>
            </div>
            <div className="p-4 space-y-2">
              {table.columns.map((col, ci) => (
                <div key={ci} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={col.isPK ? "text-yellow-400" : col.isFK ? "text-purple-400" : "text-muted-foreground"}>
                      {col.isPK ? "🔑" : col.isFK ? "🔗" : "•"}
                    </span>
                    <span className="font-bold text-white">{col.name}</span>
                  </div>
                  <span className="text-[10px] uppercase font-mono text-muted-foreground/60">{col.type}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
