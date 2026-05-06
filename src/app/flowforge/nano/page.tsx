"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Zap,
  ArrowLeft,
  Bell,
  Mail,
  Shield,
  Smartphone,
  Activity,
  Plus,
  Check,
} from "lucide-react";
import type { NanoTrigger } from "@/lib/flowforge/types";

const DEFAULT_TRIGGERS: NanoTrigger[] = [
  {
    id: "nano-1",
    workflow_id: "wf-alert",
    label: "Send Alert",
    icon: "bell",
    color: "#f59e0b",
    tap_count: 0,
    last_triggered: null,
  },
  {
    id: "nano-2",
    workflow_id: "wf-email",
    label: "Quick Email",
    icon: "mail",
    color: "#3b82f6",
    tap_count: 0,
    last_triggered: null,
  },
  {
    id: "nano-3",
    workflow_id: "wf-security",
    label: "Security Scan",
    icon: "shield",
    color: "#ef4444",
    tap_count: 0,
    last_triggered: null,
  },
  {
    id: "nano-4",
    workflow_id: "wf-pulse",
    label: "System Pulse",
    icon: "activity",
    color: "#10b981",
    tap_count: 0,
    last_triggered: null,
  },
];

const ICON_MAP: Record<string, typeof Zap> = {
  bell: Bell,
  mail: Mail,
  shield: Shield,
  activity: Activity,
  zap: Zap,
};

export default function NanoTriggerPage() {
  const [triggers, setTriggers] = useState<NanoTrigger[]>(DEFAULT_TRIGGERS);
  const [activeTrigger, setActiveTrigger] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<string | null>(null);

  const handleTap = async (trigger: NanoTrigger) => {
    setActiveTrigger(trigger.id);
    setFeedbackText(`Triggering ${trigger.label}...`);

    try {
      await fetch("/api/flowforge/nano-trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggerId: trigger.id, workflowId: trigger.workflow_id }),
      });

      setTriggers((prev) =>
        prev.map((t) =>
          t.id === trigger.id
            ? { ...t, tap_count: t.tap_count + 1, last_triggered: new Date().toISOString() }
            : t,
        ),
      );
      setFeedbackText(`${trigger.label} executed!`);
    } catch {
      setFeedbackText("Failed to trigger");
    }

    setTimeout(() => {
      setActiveTrigger(null);
      setFeedbackText(null);
    }, 2000);
  };

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] text-white flex flex-col"
      data-testid="nano-triggers"
    >
      {/* Mobile-optimized header */}
      <header className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/flowforge/dashboard" className="text-gray-400 hover:text-white">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <Smartphone className="text-green-500" size={18} />
            <span className="font-bold text-sm">Nano Triggers</span>
          </div>
        </div>
        <button className="text-gray-400 hover:text-white">
          <Plus size={18} />
        </button>
      </header>

      {/* Feedback bar */}
      {feedbackText && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20">
          <p className="text-xs text-amber-400 text-center font-medium">{feedbackText}</p>
        </div>
      )}

      {/* Trigger grid — optimized for touch */}
      <div className="flex-1 px-4 py-6">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-4 text-center">
          Tap to trigger workflow
        </p>
        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
          {triggers.map((trigger) => {
            const IconComponent = ICON_MAP[trigger.icon] || Zap;
            const isActive = activeTrigger === trigger.id;

            return (
              <button
                key={trigger.id}
                onClick={() => handleTap(trigger)}
                disabled={isActive}
                className={`relative flex flex-col items-center justify-center p-6 rounded-2xl border transition-all active:scale-95 ${
                  isActive
                    ? "border-green-500 bg-green-500/10 scale-95"
                    : "border-gray-800 bg-gray-900/50 hover:border-gray-700"
                }`}
                style={{
                  boxShadow: isActive ? `0 0 20px ${trigger.color}33` : undefined,
                }}
                data-testid={`nano-trigger-${trigger.id}`}
              >
                {isActive ? (
                  <Check size={28} className="text-green-400 mb-2" />
                ) : (
                  <IconComponent
                    size={28}
                    className="mb-2"
                    style={{ color: trigger.color }}
                  />
                )}
                <span className="text-sm font-semibold">{trigger.label}</span>
                <span className="text-xs text-gray-500 mt-1">
                  {trigger.tap_count} taps
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom stats */}
      <footer className="px-4 py-4 border-t border-gray-800">
        <div className="flex justify-between text-xs text-gray-500 max-w-sm mx-auto">
          <span>
            Total taps: {triggers.reduce((sum, t) => sum + t.tap_count, 0)}
          </span>
          <span>
            {triggers.length} triggers active
          </span>
        </div>
      </footer>
    </div>
  );
}
