import { 
  Zap, Database, Rocket, ShieldCheck, TrendingUp, BarChart3, 
  Activity, Box, Eye, CreditCard, Globe, Lock, Users, 
  Handshake, Brain, Merge, FileText, Search, Code2, 
  Cpu, Terminal, Gavel, Network, Sparkles, Link2
} from "lucide-react";

export interface PhaseTool {
  name: string;
  description: string;
  action: string;
  endpoint?: string;
  method?: "GET" | "POST";
}

export interface Phase {
  id: number;
  name: string;
  mission: string;
  icon: any;
  features: string[];
  tools: PhaseTool[];
  expectation: string;
}

export const SOVEREIGN_PHASES: Phase[] = [
  {
    id: 1,
    name: "Component Forge",
    mission: "Rapid UI Manifestation",
    icon: Zap,
    features: ["Single-file generation", "Tailwind v4 styling", "shadcn/ui integration"],
    tools: [
      { name: "Generate Component", description: "Create a standalone React component.", action: "generate", endpoint: "/api/generate", method: "POST" }
    ],
    expectation: "A high-performance, ready-to-copy React component."
  },
  {
    id: 2,
    name: "SQL Forge",
    mission: "Database Schema Engineering",
    icon: Database,
    features: ["Autonomous schema design", "Supabase migration generation", "RLS policy drafting"],
    tools: [
      { name: "Forge Schema", description: "Generate SQL for your app intent.", action: "sculpt", endpoint: "/api/sculpt", method: "POST" }
    ],
    expectation: "A robust PostgreSQL schema with secure RLS policies."
  },
  {
    id: 3,
    name: "Deployment Engine",
    mission: "Global Edge Provisioning",
    icon: Rocket,
    features: ["One-click Vercel deploy", "GitHub repository export", "Auto-SSL & Edge Caching"],
    tools: [
      { name: "Trigger Deploy", description: "Push your project to the live web.", action: "deploy", endpoint: "/api/deploy", method: "POST" }
    ],
    expectation: "A live URL and a clean GitHub repository."
  },
  {
    id: 4,
    name: "The Sentinel",
    mission: "Security Hardening",
    icon: ShieldCheck,
    features: ["Penetration simulation", "Vulnerability patching", "Input sanitization audit"],
    tools: [
      { name: "Run Audit", description: "Audit your project files for leaks.", action: "audit", endpoint: "/api/governance/check", method: "POST" }
    ],
    expectation: "A hardened codebase with a detailed security score."
  },
  {
    id: 5,
    name: "Growth Lab",
    mission: "Autonomous Market Presence",
    icon: Rocket,
    features: ["Social media automation", "SEO article generation", "Viral hook engineering"],
    tools: [
      { name: "Generate Posts", description: "Create marketing assets for your empire.", action: "growth", endpoint: "/api/growth", method: "POST" }
    ],
    expectation: "A complete marketing suite ready for global distribution."
  },
  {
    id: 6,
    name: "Revenue Engine",
    mission: "Monetization Optimization",
    icon: BarChart3,
    features: ["Surge pricing logic", "A/B test deployment", "Churn prediction audit"],
    tools: [
      { name: "Optimize Pricing", description: "Run AI revenue optimization.", action: "revenue", endpoint: "/api/revenue-optimize", method: "POST" }
    ],
    expectation: "Maximised MRR through dynamic pricing and conversion tuning."
  },
  {
    id: 7,
    name: "The Healer",
    mission: "Autonomous Self-Correction",
    icon: Activity,
    features: ["Runtime error diagnosis", "Self-healing code patches", "Agent log auditing"],
    tools: [
      { name: "Heal System", description: "Diagnose and fix platform issues.", action: "heal", endpoint: "/api/heal", method: "POST" }
    ],
    expectation: "A self-correcting platform with 100% uptime reliability."
  },
  {
    id: 8,
    name: "DevOS Sandbox",
    mission: "Virtual Engineering Environment",
    icon: Box,
    features: ["Containerized execution", "Real-time logs", "Multi-tenant isolation"],
    tools: [
      { name: "Create Sandbox", description: "Initialize a virtual dev environment.", action: "sandbox", endpoint: "/api/sandbox/create", method: "POST" }
    ],
    expectation: "A secure playground for testing experimental agent code."
  },
  {
    id: 9,
    name: "Enterprise Vision",
    mission: "Visual Intelligence Loop",
    icon: Eye,
    features: ["Screenshot-to-code", "Figma design ingestion", "UX pattern recognition"],
    tools: [
      { name: "Analyze Vision", description: "Extract code from visual assets.", action: "vision", endpoint: "/api/vision", method: "POST" }
    ],
    expectation: "Production-ready UI code derived from images or designs."
  },
  {
    id: 10,
    name: "Sovereign Economy",
    mission: "Agentic Financial Layer",
    icon: CreditCard,
    features: ["Agent marketplace", "Transaction ledger", "Credit allocation"],
    tools: [
      { name: "Check Ledger", description: "Audit agent-to-agent transactions.", action: "economy", endpoint: "/api/economy", method: "GET" }
    ],
    expectation: "Transparent financial tracking of all agent activities."
  },
  {
    id: 11,
    name: "Hype Engine",
    mission: "Viral Market Infiltration",
    icon: Globe,
    features: ["Product Hunt launch prep", "Viral hook engineering", "Trend hijacking"],
    tools: [
      { name: "Launch Hype", description: "Initiate viral marketing sequence.", action: "hype", endpoint: "/api/hype", method: "POST" }
    ],
    expectation: "Maximum market visibility and high-velocity user acquisition."
  },
  {
    id: 12,
    name: "Governance Hub",
    mission: "HITL & Global Oversight",
    icon: ShieldCheck,
    features: ["Permission overrides", "Audit log transparency", "Human-in-the-loop approvals"],
    tools: [
      { name: "Check Compliance", description: "Verify empire regulatory status.", action: "governance", endpoint: "/api/governance", method: "POST" }
    ],
    expectation: "Full operational transparency and regulatory compliance."
  },
  {
    id: 13,
    name: "Autonomous VC",
    mission: "Credit Injection & RevShare",
    icon: TrendingUp,
    features: ["Investment scouting", "Revenue share negotiation", "Automated deal flow"],
    tools: [
      { name: "Scan for Deals", description: "Find high-potential investment targets.", action: "scout", endpoint: "/api/vc/propose", method: "GET" }
    ],
    expectation: "A list of investment opportunities with ROI projections."
  },
  {
    id: 14,
    name: "Chief Diplomat",
    mission: "B2B Vendor Negotiation",
    icon: Handshake,
    features: ["Vendor price auditing", "Automated cost reduction", "SLA incident detection"],
    tools: [
      { name: "Negotiate Costs", description: "Audit vendors and initiate negotiations.", action: "negotiate", endpoint: "/api/diplomat", method: "GET" }
    ],
    expectation: "Reduced operational costs and optimized vendor relations."
  },
  {
    id: 15,
    name: "The Hive Mind",
    mission: "Collective Intelligence Loop",
    icon: Brain,
    features: ["Global pattern matching", "Knowledge asset sharing", "Collaborative debugging"],
    tools: [
      { name: "Sync Hive", description: "Synchronize local knowledge with the Hive.", action: "hive", endpoint: "/api/hive/sync", method: "POST" }
    ],
    expectation: "A platform that grows smarter with every build across the network."
  },
  {
    id: 16,
    name: "Autonomous M&A",
    mission: "Strategic Asset Merger",
    icon: Merge,
    features: ["Project synergy audit", "Automated technical merger", "Equity split negotiation"],
    tools: [
      { name: "Analyze Merger", description: "Find strategic merger opportunities.", action: "ma", endpoint: "/api/ma/analyze", method: "POST" }
    ],
    expectation: "Consolidated business empires with maximized technical synergy."
  },
  {
    id: 17,
    name: "Legal Vault",
    mission: "Autonomous Corporate Suite",
    icon: Lock,
    features: ["LLC/DAO formation", "Patent draft generation", "TOS/Privacy automation"],
    tools: [
      { name: "Generate Docs", description: "Manifest legal and corporate documents.", action: "legal", endpoint: "/api/compliance", method: "POST" }
    ],
    expectation: "A legally-protected business entity with all required filings."
  },
  {
    id: 18,
    name: "R&D Scout",
    mission: "Emerging Tech Research",
    icon: Search,
    features: ["GitHub trend analysis", "arXiv tech scouting", "Alpha-tech verification"],
    tools: [
      { name: "Scout Trends", description: "Discover emerging 2026 tech stacks.", action: "scout", endpoint: "/api/rd/scout", method: "GET" }
    ],
    expectation: "A strategic briefing on high-velocity emerging technologies."
  },
  {
    id: 19,
    name: "Sovereign DAO",
    mission: "Autonomous Governance & Profit Share",
    icon: Gavel,
    features: ["Tokenized voting (AGT/UGT)", "Automated treasury management", "On-chain entity integration"],
    tools: [
      { name: "Create Proposal", description: "Submit a new governance proposal.", action: "propose", endpoint: "/api/dao/propose", method: "POST" },
      { name: "Check Treasury", description: "Audit the swarm's managed assets.", action: "treasury", endpoint: "/api/dao/treasury", method: "GET" }
    ],
    expectation: "A decentralized, indestructible, and profitable autonomous empire."
  },
  {
    id: 20,
    name: "Lifecycle Engine",
    mission: "Sovereign UX & Launch",
    icon: Activity,
    features: ["Phantom UX simulation", "Herald launch agent", "Smart git-flow"],
    tools: [
      { name: "Run Lifecycle", description: "Simulate and prepare launch assets.", action: "lifecycle", endpoint: "/api/manifest", method: "POST" }
    ],
    expectation: "A production-hardened app with verified UX and launch readiness."
  },
  {
    id: 21,
    name: "The Overseer",
    mission: "Autonomous QA Audit",
    icon: Eye,
    features: ["E2E browser testing", "Visual regression audit", "Performance benchmarking"],
    tools: [
      { name: "Run QA Audit", description: "Perform a full browser flow test.", action: "test", endpoint: "/api/overseer", method: "POST" }
    ],
    expectation: "A detailed QA pass/fail report with visual drift logs."
  },
  {
    id: 22,
    name: "Swarm Mesh",
    mission: "Federation & Mesh Governance",
    icon: Network,
    features: ["Cross-empire agent lending", "Intelligence sharing protocol", "Mesh trust scoring"],
    tools: [
      { name: "Scan Mesh", description: "Discover available federation resources.", action: "mesh", endpoint: "/api/mesh/scan", method: "GET" }
    ],
    expectation: "A robust connection to the global Sovereign Federation."
  },
  {
    id: 23,
    name: "Sovereign Pulse",
    mission: "Telemetry & Neural Observability",
    icon: Activity,
    features: ["Error clustering", "Conversion funnels", "Neural impact scoring"],
    tools: [
      { name: "Run Pulse Audit", description: "Audit project telemetry for anomalies.", action: "pulse", endpoint: "/api/pulse/ingest", method: "POST" }
    ],
    expectation: "100% system awareness and predictive error detection."
  },
  {
    id: 24,
    name: "Self-Evolution",
    mission: "Autonomous Recursive Growth",
    icon: Sparkles,
    features: ["Autonomous self-healing", "Performance self-tuning", "Prompt evolution engine"],
    tools: [
      { name: "Trigger Evolution", description: "Initiate autonomous system improvement cycle.", action: "evolution", endpoint: "/api/evolution", method: "POST" }
    ],
    expectation: "A system that grows more efficient and powerful with every hour."
  },
  {
    id: 25,
    name: "Neural Link",
    mission: "Infrastructure Consolidation",
    icon: Link2,
    features: ["Semantic vector memory", "Metric-driven auto-scaling", "Edge-to-Edge orchestration"],
    tools: [
      { name: "Migrate Infrastructure", description: "Consolidate simulation to real production infra.", action: "migration", endpoint: "/api/infrastructure/migrate", method: "POST" }
    ],
    expectation: "A production-grade platform with real-time scaling and semantic intelligence."
  }
];
