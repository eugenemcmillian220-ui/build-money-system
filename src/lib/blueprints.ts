export interface Blueprint {
  id: string;
  name: string;
  description: string;
  prompt: string;
  mode: "nano" | "universal" | "elite";
  protocol: string;
  category: "SaaS" | "E-commerce" | "Finance" | "Social" | "Utility";
  outcomeExpectation: string;
}

export const SOVEREIGN_BLUEPRINTS: Blueprint[] = [
  {
    id: "saas-starter",
    name: "Elite SaaS Foundation",
    description: "Full-stack SaaS with auth, dashboard, and Stripe integration.",
    prompt: "Build a modern SaaS platform with user authentication, a beautiful dark-mode dashboard, and Stripe subscription integration for monthly plans.",
    mode: "elite",
    protocol: "Sovereign-SaaS-v1",
    category: "SaaS",
    outcomeExpectation: "A production-ready SaaS core with secure auth, user profiles, and a billing system ready for revenue."
  },
  {
    id: "market-nexus",
    name: "Marketplace Nexus",
    description: "Multi-vendor marketplace with agentic product discovery.",
    prompt: "Create a multi-vendor marketplace where users can list digital assets. Include a search engine and a buyer/seller dashboard.",
    mode: "elite",
    protocol: "Empire-Commerce-v2",
    category: "E-commerce",
    outcomeExpectation: "A complex multi-tenant marketplace with transactional logic, vendor management, and AI-optimized product search."
  },
  {
    id: "finance-vault",
    name: "Sovereign Finance Vault",
    description: "Secure fintech dashboard with real-time tracking.",
    prompt: "Build a financial tracking app that monitors expenses, sets budgets, and provides visual analytics of spending habits.",
    mode: "universal",
    protocol: "Fin-Secure-v3",
    category: "Finance",
    outcomeExpectation: "A secure, data-rich financial app with interactive charts, budget alerts, and high-performance data handling."
  },
  {
    id: "social-hive",
    name: "Social Hive Mind",
    description: "Community platform with real-time interactions.",
    prompt: "Design a community platform with user feeds, real-time messaging, and profile customization.",
    mode: "universal",
    protocol: "Hive-Social-v1",
    category: "Social",
    outcomeExpectation: "A dynamic social platform with real-time feed updates, direct messaging capabilities, and user engagement metrics."
  },
  {
    id: "nano-tool",
    name: "Nano Productivity Suite",
    description: "Lightweight, focused utility for rapid execution.",
    prompt: "Develop a lightweight task manager with drag-and-drop support and offline persistence.",
    mode: "nano",
    protocol: "Nano-Core-v1",
    category: "Utility",
    outcomeExpectation: "A blazing fast, single-purpose tool optimized for performance and zero-latency user interactions."
  }
];
