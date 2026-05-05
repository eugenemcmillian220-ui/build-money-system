"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white/5 border border-white/10 p-12 rounded-[3rem] text-center space-y-8">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
          <AlertTriangle className="text-red-500" size={40} />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-3xl font-black uppercase tracking-tighter italic">System Fault</h2>
          <p className="text-muted-foreground font-bold italic text-sm">
            A critical error has occurred in the neural bridge.
          </p>
        </div>

        <div className="p-4 bg-black/40 rounded-2xl border border-white/5 text-left">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1">Error Signature</p>
          <p className="text-xs font-mono text-white/50 break-all">{error.message || "Unknown anomaly"}</p>
        </div>

        <button
          onClick={() => reset()}
          className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-brand-500 hover:text-white transition-all"
        >
          <RefreshCcw size={16} />
          Reboot Bridge
        </button>
      </div>
    </div>
  );
}
