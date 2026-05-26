// src/lib/build-modes.ts
// Canonical build mode definitions — single source of truth for mode names,
// descriptions, and pipeline configuration. Shared between AiTerminal,
// BuildModeSelector, and ManifestOptions to prevent type drift.

export const BUILD_MODES = {
  quick: {
    id: "quick",
    label: "Quick Build",
    tagline: "Ship in under 60 seconds",
    description: "Opinionated 5-phase build. Fastest path from prompt to deployed app. Ideal for MVPs, prototypes, and landing pages.",
    phases: 5,
    estimatedTime: "<60s",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    icon: "Zap",
    creditCost: 5,
    features: [
      "Generate (components + layout)",
      "Persist (Supabase schema)",
      "Deploy (Vercel)",
      "Secure (basic hardening)",
      "Pulse (telemetry)",
    ],
  },
  sovereign: {
    id: "sovereign",
    label: "Full Sovereign Build",
    tagline: "All 25 phases. No compromises.",
    description: "The complete autonomous pipeline. 25 specialized agents build, harden, test, monetize, and deploy your full-stack empire.",
    phases: 25,
    estimatedTime: "5–15 min",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    icon: "Crown",
    creditCost: 10,
    features: [
      "All 25 autonomous phases",
      "Enterprise security hardening",
      "Revenue optimization + Stripe",
      "AI churn prediction",
      "Self-healing + telemetry",
    ],
  },
} as const;

export type BuildModeId = keyof typeof BUILD_MODES;
export type BuildModeConfig = typeof BUILD_MODES[BuildModeId];

// Revenue model options for the pipeline spec
export const REVENUE_MODELS = [
  { value: "subscription", label: "Subscription (SaaS)", description: "Monthly/annual recurring revenue" },
  { value: "credits", label: "Credits / Pay-as-you-go", description: "Usage-based billing" },
  { value: "hybrid", label: "Hybrid", description: "Subscription base + usage top-ups" },
  { value: "marketplace", label: "Marketplace", description: "Commission on transactions" },
] as const;

export type RevenueModel = typeof REVENUE_MODELS[number]["value"];

// Quick build phase subset (phases 1, 2, 3, 4, 23 = Generate, Persist, Deploy, Secure, Pulse)
export const QUICK_BUILD_PHASES = [1, 2, 3, 4, 23] as const;
