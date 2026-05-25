"use client";

import { useState } from "react";
import { PipelineProgress } from "@/components/dashboard/PipelineProgress";
import Link from "next/link";
import {
  Zap,
  Workflow,
  Shield,
  BarChart3,
  Globe,
  Smartphone,
  Crown,
  ArrowRight,
  Sparkles,
  Users,
  Lock,
  Activity,
  Bot,
  GitBranch,
} from "lucide-react";

const FEATURES = [
  {
    icon: Workflow,
    title: "Visual Workflow Builder",
    description: "Drag-and-drop AI workflow design with 8 node types including AI agents, conditions, and webhooks.",
    phase: "Phase 1-3",
  },
  {
    icon: Bot,
    title: "AI Agent Nodes",
    description: "Embed specialized AI agents directly into your workflows for intelligent automation.",
    phase: "Phase 5-7",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Sentinel-hardened execution with penetration testing and input sanitization on every run.",
    phase: "Phase 4",
  },
  {
    icon: Users,
    title: "Multi-Tenant Orgs",
    description: "Elite-grade org isolation with role-based permissions: Viewer, Editor, Admin, Owner.",
    phase: "Phase 8",
  },
  {
    icon: Lock,
    title: "Governance & Audit",
    description: "Immutable audit logs, compliance exports, and DAO-style governance proposals.",
    phase: "Phase 12, 19",
  },
  {
    icon: BarChart3,
    title: "Revenue Engine",
    description: "Monetize your workflows in the marketplace. Dynamic pricing with Neural Credits.",
    phase: "Phase 6, 10",
  },
  {
    icon: Globe,
    title: "Hive Mind Network",
    description: "Share workflow patterns across the federation for collective intelligence growth.",
    phase: "Phase 15, 22",
  },
  {
    icon: Activity,
    title: "Real-Time Analytics",
    description: "Pulse-grade telemetry with execution tracking, success rates, and cost optimization.",
    phase: "Phase 23-25",
  },
  {
    icon: Smartphone,
    title: "Nano Mobile Triggers",
    description: "One-tap workflow triggers from your phone via lightweight TMA interface.",
    phase: "Nano Mode",
  },
];

const MODE_CARDS = [
  {
    mode: "Elite",
    icon: Crown,
    color: "from-amber-500 to-orange-600",
    features: ["Multi-tenant organizations", "Governance & audit logs", "Complex RBAC permissions", "Sentinel security hardening", "DAO voting on workflows"],
  },
  {
    mode: "Universal",
    icon: Globe,
    color: "from-blue-500 to-cyan-600",
    features: ["SaaS dashboard", "REST API layers", "Stripe billing integration", "Workflow marketplace", "Standard analytics"],
  },
  {
    mode: "Nano",
    icon: Smartphone,
    color: "from-green-500 to-emerald-600",
    features: ["Mobile-first TMA", "One-tap triggers", "Minimal bundle size", "Instant execution", "Quick alert workflows"],
  },
];

const PHASE_BADGES = Array.from({ length: 25 }, (_, i) => i + 1);

export default function FlowForgeLanding() {
  const [activeMode, setActiveMode] = useState<string>("Elite");

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" data-testid="flowforge-landing">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent" />
        <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <Zap className="text-amber-500" size={28} />
            <span className="text-xl font-bold tracking-tight">FlowForge</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </nav>

        <div className="relative z-10 max-w-4xl mx-auto text-center px-6 pt-20 pb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 mb-6">
            <Sparkles size={14} className="text-amber-500" />
            <span className="text-xs font-medium text-amber-400">All 25 Sovereign Phases Active</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6">
            AI Workflow
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent"> Automation </span>
            Hub
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
            Design, automate, and monetize custom AI workflows.
            Elite multi-tenant governance. Universal SaaS power. Nano mobile triggers.
            Built on the Sovereign Forge 25-phase engine.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/flowforge/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 font-semibold text-black hover:opacity-90 transition-opacity"
              data-testid="cta-dashboard"
            >
              Open Dashboard <ArrowRight size={16} />
            </Link>
            <Link
              href="/flowforge/nano"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-6 py-3 font-medium hover:border-gray-500 transition-colors"
              data-testid="cta-nano"
            >
              <Smartphone size={16} /> Try Nano Mode
            </Link>
          </div>
        </div>
      </header>

      {/* Phase Badges */}
      <section className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <PipelineProgress currentPhase={25} totalPhases={25} />
        </div>
        <p className="text-center text-xs text-gray-500 uppercase tracking-widest mb-4">
          Exercising All 25 Sovereign Phases
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {PHASE_BADGES.map((phase) => (
            <span
              key={phase}
              className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-gray-800/80 border border-gray-700 text-xs font-bold text-amber-400"
            >
              {phase}
            </span>
          ))}
        </div>
      </section>

      {/* Mode Cards */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-2">Three Modes. Total Coverage.</h2>
        <p className="text-gray-400 text-center mb-10">Every workflow mode maps to a distinct deployment architecture.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MODE_CARDS.map((card) => (
            <button
              key={card.mode}
              onClick={() => setActiveMode(card.mode)}
              className={`text-left rounded-xl border p-6 transition-all ${
                activeMode === card.mode
                  ? "border-amber-500/50 bg-amber-500/5"
                  : "border-gray-800 bg-gray-900/50 hover:border-gray-700"
              }`}
              data-testid={`mode-card-${card.mode.toLowerCase()}`}
            >
              <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${card.color} mb-4`}>
                <card.icon size={20} className="text-white" />
              </div>
              <h3 className="text-lg font-bold mb-3">{card.mode} Mode</h3>
              <ul className="space-y-2">
                {card.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-gray-400">
                    <GitBranch size={12} className="text-amber-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-2">Full-Spectrum AI Automation</h2>
        <p className="text-gray-400 text-center mb-10">Every feature powered by a specific Sovereign Phase.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <feature.icon size={20} className="text-amber-500" />
                <span className="text-xs font-mono text-gray-500">{feature.phase}</span>
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Forge Your Workflows?</h2>
        <p className="text-gray-400 mb-8">
          Start building AI-powered automations today. Free tier includes 5 workflows and 1,000 executions/month.
        </p>
        <Link
          href="/flowforge/dashboard"
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-8 py-4 font-bold text-black hover:bg-amber-400 transition-colors"
        >
          Launch FlowForge <Zap size={18} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Zap size={16} className="text-amber-500" />
            <span className="text-sm">FlowForge — AI Workflow Automation Hub</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/flowforge/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            <Link href="/flowforge/workflows" className="hover:text-white transition-colors">Workflows</Link>
            <Link href="/flowforge/governance" className="hover:text-white transition-colors">Governance</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
