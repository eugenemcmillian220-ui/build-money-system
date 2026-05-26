"use client";

import { useState, useCallback } from "react";
import { Zap, Crown } from "lucide-react";
import { QuickBuildPanel } from "./QuickBuildPanel";
import { SovereignBuildPanel } from "./SovereignBuildPanel";
import { useManifestation } from "@/hooks/use-manifestation";
import { BUILD_MODES, type BuildModeId } from "@/lib/build-modes";

interface BuildModeSelectorProps {
  orgId: string;
  onBuildComplete?: (projectId: string) => void;
  onBuildError?: (error: string) => void;
}

export function BuildModeSelector({ orgId, onBuildComplete, onBuildError }: BuildModeSelectorProps) {
  const [activeMode, setActiveMode] = useState<BuildModeId>("quick");

  const { isProcessing, startManifestation } = useManifestation({
    onSuccess: onBuildComplete,
    onError: onBuildError,
  });

  const handleSubmit = useCallback(
    async (
      prompt: string,
      orgId: string,
      options: Record<string, unknown>,
      onLog: (level: "info" | "error", text: string) => void
    ) => {
      await startManifestation(prompt, orgId, options as never, onLog);
    },
    [startManifestation]
  );

  const modes = [
    {
      id: "quick" as BuildModeId,
      icon: Zap,
      label: BUILD_MODES.quick.label,
      tagline: BUILD_MODES.quick.tagline,
      activeClass: "bg-emerald-500/15 border-emerald-500/30 text-foreground",
      inactiveClass: "bg-white/3 border-white/8 text-muted-foreground hover:border-white/15",
      iconClass: "text-emerald-400",
      indicatorClass: "bg-emerald-400",
    },
    {
      id: "sovereign" as BuildModeId,
      icon: Crown,
      label: BUILD_MODES.sovereign.label,
      tagline: BUILD_MODES.sovereign.tagline,
      activeClass: "bg-amber-500/15 border-amber-500/30 text-foreground",
      inactiveClass: "bg-white/3 border-white/8 text-muted-foreground hover:border-white/15",
      iconClass: "text-amber-400",
      indicatorClass: "bg-amber-400",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2">
        {modes.map((m) => {
          const Icon = m.icon;
          const isActive = activeMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveMode(m.id)}
              disabled={isProcessing}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed ${
                isActive ? m.activeClass : m.inactiveClass
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isActive ? "bg-white/10" : "bg-white/5"
              }`}>
                <Icon size={15} className={isActive ? m.iconClass : "text-muted-foreground"} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{m.label}</div>
                <div className="text-xs text-muted-foreground truncate">{m.tagline}</div>
              </div>
              {isActive && (
                <div className={`w-1.5 h-1.5 rounded-full ml-auto shrink-0 ${m.indicatorClass}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Active panel */}
      <div className="relative">
        {activeMode === "quick" && (
          <QuickBuildPanel orgId={orgId} onSubmit={handleSubmit} isProcessing={isProcessing} />
        )}
        {activeMode === "sovereign" && (
          <SovereignBuildPanel orgId={orgId} onSubmit={handleSubmit} isProcessing={isProcessing} />
        )}
      </div>
    </div>
  );
}
