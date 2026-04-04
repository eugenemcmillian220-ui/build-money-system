import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AI App Builder | Build Full-Stack Apps with AI",
  description:
    "The autonomous AI platform that builds, deploys, and scales your SaaS in minutes.",
};

const FEATURES = [
  {
    icon: "⚡",
    title: "Instant Generation",
    desc: "LLM swarm generates production Next.js 15 code in seconds.",
  },
  {
    icon: "🛡️",
    title: "Enterprise Security",
    desc: "Automated RLS, input sanitization, and path-traversal protection built in.",
  },
  {
    icon: "📈",
    title: "Revenue Optimized",
    desc: "AI churn prediction and pricing optimization baked directly in.",
  },
  {
    icon: "🤖",
    title: "Agent Swarm",
    desc: "Architect, Developer & QA agents collaborate to ship production-grade code.",
  },
  {
    icon: "🚀",
    title: "One-Click Deploy",
    desc: "Auto-deploy to Vercel and export to GitHub with zero configuration.",
  },
  {
    icon: "🧠",
    title: "Self-Improving AI",
    desc: "Feedback loop trains the platform to write better code every generation.",
  },
  {
    icon: "📸",
    title: "Vision-to-Code",
    desc: "Generate apps from screenshots and Figma designs with GPT-4o Vision.",
  },
  {
    icon: "🏪",
    title: "Agent Marketplace",
    desc: "Hire specialized AI agents and track usage in the agent ledger.",
  },
  {
    icon: "🧑‍💻",
    title: "Hype Agent",
    desc: "Auto-generate viral X threads and LinkedIn posts for your projects.",
  },
];

const PHASES = [
  { num: "01", name: "Generate", desc: "Single components or full apps" },
  { num: "02", name: "Persist", desc: "Supabase database integration" },
  { num: "03", name: "Deploy", desc: "Vercel + GitHub in one click" },
  { num: "04", name: "Secure", desc: "Production systems & RLS" },
  { num: "05", name: "Grow", desc: "AI company builder pipeline" },
  { num: "06", name: "Optimize", desc: "Revenue & churn AI engine" },
  { num: "07", name: "Automate", desc: "Fully autonomous operations" },
  { num: "08", name: "DevOS", desc: "Sandbox & multi-tenant" },
  { num: "09", name: "Enterprise", desc: "Vision-to-code & SRE" },
  { num: "10", name: "Economy", desc: "Agent marketplace & ledger" },
  { num: "11", name: "Growth Lab", desc: "Hype agent & viral SEO" },
];

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute left-1/2 top-0 -z-10 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[140px]" />
      <div className="absolute right-0 top-[40%] -z-10 h-[400px] w-[400px] rounded-full bg-accent/5 blur-[100px]" />

      {/* Nav */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-7 lg:px-8">
        <div className="flex items-center gap-2 font-black text-2xl tracking-tighter">
          <span className="h-9 w-9 rounded-xl bg-brand-500 flex items-center justify-center text-white font-black">A</span>
          <span className="text-gradient">AppBuilder</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-semibold text-muted-foreground transition-colors hover:text-white"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-brand-500/30 transition-all hover:scale-105 hover:bg-brand-400"
          >
            Start Free →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-28 text-center lg:px-8">
        <div className="animate-glow mb-8 inline-flex items-center gap-3 rounded-full border border-brand-500/30 bg-brand-500/5 px-5 py-2 text-xs font-bold uppercase tracking-widest text-brand-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
          </span>
          11-Phase Autonomous AI Platform
        </div>

        <h1 className="mx-auto max-w-5xl text-6xl font-black tracking-tight sm:text-8xl lg:text-9xl">
          <span className="text-gradient">From Idea</span>
          <br />
          <span className="text-brand-500">To Revenue.</span>
        </h1>

        <p className="mx-auto mt-8 max-w-2xl text-xl leading-relaxed text-muted-foreground">
          The world&apos;s first autonomous platform that builds, deploys, monitors, and 
          optimizes full-stack applications — all from a single sentence.
        </p>

        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-brand-500 px-10 py-5 text-base font-black text-white shadow-2xl shadow-brand-500/40 transition-all hover:scale-105"
          >
            <span className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-400 to-brand-600 opacity-0 transition-opacity group-hover:opacity-100" />
            BUILD FOR FREE
            <span className="text-xl">→</span>
          </Link>
          <Link
            href="/login"
            className="glass-card inline-flex items-center gap-2 rounded-2xl px-10 py-5 text-base font-bold text-white transition-all hover:border-brand-500/50"
          >
            Sign In
          </Link>
        </div>

        <p className="mt-5 text-xs text-muted-foreground/60">No credit card required · Free tier available</p>
      </section>

      {/* Phase Ribbon */}
      <section className="border-y border-border/40 bg-black/30 py-12 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6 lg:grid-cols-11">
            {PHASES.map((p) => (
              <div key={p.num} className="text-center">
                <div className="mb-1 text-2xl font-black text-brand-500/50">{p.num}</div>
                <div className="text-sm font-bold text-white">{p.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-32 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="text-4xl font-black tracking-tight sm:text-6xl">
            <span className="text-gradient">Elite Capabilities</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">Everything you need to build, ship, and scale.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="glass-card group rounded-2xl p-8 transition-all hover:-translate-y-1 hover:border-brand-500/40"
            >
              <div className="mb-4 text-3xl transition-transform group-hover:scale-110">{f.icon}</div>
              <h3 className="mb-2 text-xl font-bold text-white">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-28 text-center lg:px-8">
        <div className="glass-card rounded-3xl p-14">
          <h2 className="text-4xl font-black tracking-tight sm:text-6xl">
            Ready to build
            <br />
            <span className="text-brand-500">something elite?</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-lg text-muted-foreground">
            Join builders who ship full-stack apps in minutes, not months.
          </p>
          <Link
            href="/signup"
            className="mt-10 inline-flex items-center gap-3 rounded-2xl bg-brand-500 px-10 py-5 text-base font-black text-white shadow-2xl shadow-brand-500/40 transition-all hover:scale-105"
          >
            START BUILDING FREE →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10 text-center text-xs tracking-widest text-muted-foreground">
        BUILT WITH NEXT.JS 15 · REACT 19 · TAILWIND CSS v4 · SUPABASE · OPENROUTER
      </footer>
    </main>
  );
}
