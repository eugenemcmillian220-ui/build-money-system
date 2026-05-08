/**
 * FlowForge Blueprint — Pre-built business template
 * Exercises all 25 Sovereign Phases across Elite/Universal/Nano modes.
 *
 * Phase Coverage:
 *   1-3:   Component Forge, SQL Forge, Deployment Engine
 *   4:     Sentinel Security Hardening
 *   5-7:   Growth Lab, Revenue Engine, The Healer
 *   8:     DevOS Sandbox (Multi-Tenancy)
 *   9:     Enterprise Vision
 *   10:    Sovereign Economy
 *   11:    Hype Engine
 *   12:    Governance Hub
 *   13:    Autonomous VC
 *   14:    Chief Diplomat
 *   15:    Hive Mind
 *   16:    Autonomous M&A
 *   17:    Legal Vault
 *   18:    R&D Scout
 *   19:    Sovereign DAO
 *   20:    Lifecycle Engine
 *   21:    The Overseer
 *   22:    Swarm Mesh
 *   23:    Sovereign Pulse
 *   24:    Self-Evolution
 *   25:    Neural Link
 */

export const FLOWFORGE_BLUEPRINT = {
  id: "blueprint-flowforge",
  name: "FlowForge — AI Workflow Automation Hub",
  description:
    "A complete SaaS platform for designing, automating, and monetizing custom AI workflows. " +
    "Exercises all 25 Sovereign Phases across Elite (multi-tenant, governance, audit), " +
    "Universal (SaaS dashboard, API layers, billing), and Nano (mobile-first TMA triggers) modes.",
  category: "SaaS / AI Automation",
  version: "1.0.0",
  phases_exercised: Array.from({ length: 25 }, (_, i) => i + 1),
  modes: ["elite", "universal", "nano"] as const,
  features: {
    elite: [
      "Multi-tenant organization isolation with RBAC",
      "Immutable audit log with CSV compliance export",
      "DAO-style governance proposals and voting",
      "Sentinel security hardening on every execution",
      "Complex permission hierarchy: Viewer → Editor → Admin → Owner",
    ],
    universal: [
      "Visual drag-and-drop workflow builder",
      "8 node types: trigger, action, condition, transform, ai-agent, webhook, delay, loop",
      "REST API layer with Bearer token authentication",
      "Stripe billing integration with credit system",
      "Real-time analytics and execution tracking",
      "Workflow marketplace for monetization",
      "5 pre-built workflow templates",
    ],
    nano: [
      "Mobile-first one-tap workflow triggers",
      "Lightweight TMA interface under 50KB",
      "Instant execution feedback",
      "Minimal 2-node workflow support",
      "Touch-optimized grid layout",
    ],
  },
  tech_stack: {
    framework: "Next.js 15 (App Router)",
    language: "TypeScript",
    styling: "Tailwind CSS v4",
    database: "Supabase (PostgreSQL + RLS)",
    auth: "Supabase Auth with email-OTP",
    payments: "Stripe (Neural Credits)",
    ai: "OpenCode Zen API",
    deployment: "Vercel Edge Runtime",
  },
  routes: {
    pages: [
      "/flowforge — Landing page with mode selection",
      "/flowforge/dashboard — Main SaaS dashboard with analytics",
      "/flowforge/workflows — Visual workflow builder",
      "/flowforge/nano — Mobile-first Nano trigger interface",
      "/flowforge/governance — Elite governance hub with proposals and audit",
      "/flowforge/api-hub — REST API documentation",
      "/flowforge/settings — Configuration (billing, API keys, security)",
    ],
    api: [
      "POST /api/flowforge/workflows — Create/update workflows",
      "POST /api/flowforge/execute — Execute a workflow",
      "GET  /api/flowforge/analytics — Workflow analytics and metrics",
      "POST /api/flowforge/nano-trigger — Nano mobile trigger",
      "POST /api/flowforge/governance — Governance proposals and voting",
      "GET  /api/flowforge/audit — Query audit logs (CSV export)",
      "POST /api/flowforge/billing — Billing and credit management",
    ],
  },
  phase_mapping: {
    "Phase 1-3 (Foundation)": "Component generation, SQL schema, Vercel deployment",
    "Phase 4 (Sentinel)": "Security hardening on workflow execution, input sanitization",
    "Phase 5 (Growth Lab)": "Workflow marketplace for viral distribution",
    "Phase 6 (Revenue Engine)": "Dynamic credit pricing, monetization of shared workflows",
    "Phase 7 (Healer)": "Self-healing error recovery in workflow execution",
    "Phase 8 (Multi-Tenancy)": "Org-isolated workflow storage with RBAC",
    "Phase 9 (Vision)": "Visual workflow builder with node-graph UI",
    "Phase 10 (Economy)": "Credit-based execution billing and agent costs",
    "Phase 11 (Hype Engine)": "Workflow template gallery for user acquisition",
    "Phase 12 (Governance)": "Audit logs, compliance export, HITL approvals",
    "Phase 13 (VC)": "Credit injection for workflow execution",
    "Phase 14 (Diplomat)": "API key management for B2B integrations",
    "Phase 15 (Hive Mind)": "Cross-org workflow pattern sharing",
    "Phase 16 (M&A)": "Workflow merging and template composition",
    "Phase 17 (Legal Vault)": "TOS and privacy policy for workflow marketplace",
    "Phase 18 (R&D Scout)": "Template recommendations based on trends",
    "Phase 19 (DAO)": "Governance proposals with quorum-based voting",
    "Phase 20 (Lifecycle)": "Workflow versioning and lifecycle management",
    "Phase 21 (Overseer)": "Autonomous E2E browser and visual QA enforcement",
    "Phase 22 (Swarm Mesh)": "Federation-ready workflow sharing protocol",
    "Phase 23 (Pulse)": "Execution analytics, success rates, cost tracking",
    "Phase 24 (Self-Evolution)": "Adaptive timeout and retry configuration",
    "Phase 25 (Neural Link)": "Infrastructure consolidation with semantic search",
  },
} as const;
