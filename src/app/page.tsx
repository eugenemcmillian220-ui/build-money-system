import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sovereign Forge OS — Build Full-Stack Empires in Minutes",
  description:
    "The 25-phase autonomous AI platform that builds, deploys, monitors, and scales production SaaS from a single prompt.",
};

const FEATURES = [
  {
    icon: "⚡",
    title: "Instant Generation",
    desc: "LLM swarm produces production Next.js 15 code in seconds — fully typed and lint-clean.",
  },
  {
    icon: "🛡️",
    title: "Enterprise Security",
    desc: "Automated RLS, CSRF protection, CSP, rate-limiting & path-traversal defences baked in.",
  },
  {
    icon: "📈",
    title: "Revenue Optimized",
    desc: "AI churn prediction and dynamic pricing maximise MRR from day one.",
  },
  {
    icon: "🤖",
    title: "25-Agent Swarm",
    desc: "Architect, Developer, QA, Sentinel, CEO and 20+ specialists collaborate to ship.",
  },
  {
    icon: "🚀",
    title: "One-Click Deploy",
    desc: "Auto-deploy to Vercel with GitHub export and zero-config SSL + Edge caching.",
  },
  {
    icon: "🧠",
    title: "Self-Improving AI",
    desc: "Feedback loops, prompt evolution and vector memory make every build smarter than the last.",
  },
  {
    icon: "📸",
    title: "Vision-to-Code",
    desc: "Turn Figma frames and screenshots into production UI with GPT-4o Vision.",
  },
  {
    icon: "🏪",
    title: "Agent Marketplace",
    desc: "Rent specialised agents, track ROI and settle in credits — a programmable economy.",
  },
  {
    icon: "🤝",
    title: "Autonomous M&A",
    desc: "AI identifies strategic mergers and executes consolidations on your behalf.",
  },
  {
    icon: "💰",
    title: "VC Investment",
    desc: "The platform autonomously invests credits into high-upside projects for RevShare.",
  },
  {
    icon: "🌐",
    title: "Federated Hive Mind",
    desc: "Every empire's learnings back-propagate into a collective intelligence loop.",
  },
  {
    icon: "⚖️",
    title: "Sovereign DAO & Legal",
    desc: "Tokenised governance, treasury management, TOS, patents and LLC/DAO formation.",
  },
];

const PHASES = [
  { num: "01", name: "Generate", desc: "Components & full apps" },
  { num: "02", name: "Persist", desc: "Supabase schema" },
  { num: "03", name: "Deploy", desc: "Vercel + GitHub" },
  { num: "04", name: "Secure", desc: "Sentinel hardening" },
  { num: "05", name: "Grow", desc: "Market presence" },
  { num: "06", name: "Optimize", desc: "Revenue & churn" },
  { num: "07", name: "Heal", desc: "Self-correction" },
  { num: "08", name: "DevOS", desc: "Sandbox + tenants" },
  { num: "09", name: "Vision", desc: "Image → code" },
  { num: "10", name: "Economy", desc: "Agent marketplace" },
  { num: "11", name: "Hype", desc: "Viral growth" },
  { num: "12", name: "Govern", desc: "DAO + HITL" },
  { num: "13", name: "VC", desc: "AI investment" },
  { num: "14", name: "Diplomat", desc: "B2B negotiation" },
  { num: "15", name: "Hive", desc: "Collective intel" },
  { num: "16", name: "M&A", desc: "Consolidation" },
  { num: "17", name: "Legal", desc: "Corporate suite" },
  { num: "18", name: "R&D", desc: "Tech scouting" },
  { num: "19", name: "DAO", desc: "UGT voting" },
  { num: "20", name: "Sovereign", desc: "Phantom UX" },
  { num: "21", name: "Overseer", desc: "Autonomous QA" },
  { num: "22", name: "Mesh", desc: "Swarm federation" },
  { num: "23", name: "Pulse", desc: "Telemetry" },
  { num: "24", name: "Evolve", desc: "Recursive growth" },
  { num: "25", name: "Neural", desc: "Infra consolidation" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Describe the empire",
    body: "Natural-language intent, a screenshot or a Figma file — the Classifier routes you to the right agents.",
  },
  {
    step: "02",
    title: "Swarm engineers it",
    body: "Developer, SQL Forge, Sentinel and 20+ specialists build, harden and test every layer in parallel.",
  },
  {
    step: "03",
    title: "Ship & scale",
    body: "One-click deploy to Vercel, auto-billing via Stripe, live telemetry in the Sovereign Pulse dashboard.",
  },
];

const STATS = [
  { value: "25", label: "Autonomous Phases" },
  { value: "22", label: "Specialised Agents" },
  { value: "<60s", label: "First Production Build" },
  { value: "100%", label: "RLS & Security Audited" },
];

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute left-1/2 top-0 -z-10 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[140px]" />
      <div className="absolute right-0 top-[40%] -z-10 h-[400px] w-[400px] rounded-full bg-accent/5 blur-[100px]" />
      <div className="absolute bottom-[10%] left-0 -z-10 h-[500px] w-[500px] rounded-full bg-brand-500/5 blur-[120px]" />

      {/* Nav */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-7 lg:px-8">
        <div className="flex items-center gap-2 font-black text-2xl tracking-tighter">
          <span className="h-9 w-9 rounded-xl bg-brand-500 flex items-center justify-center text-white font-black">
            A
          </span>
          <span className="text-gradient">Sovereign Forge</span>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/pricing"
            className="hidden sm:inline text-sm font-semibold text-muted-foreground transition-colors hover:text-white"
          >
            Pricing
          </Link>
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
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center lg:px-8">
        <div className="animate-glow mb-8 inline-flex items-center gap-3 rounded-full border border-brand-500/30 bg-brand-500/5 px-5 py-2 text-xs font-bold uppercase tracking-widest text-brand-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
          </span>
          v2.8 · 25-Phase Sovereign AI Empire
        </div>

        <h1 className="mx-auto max-w-5xl text-6xl font-black tracking-tight sm:text-8xl lg:text-9xl">
          <span className="text-gradient">From Idea</span>
          <br />
          <span className="text-brand-500">To Revenue.</span>
        </h1>

        <p className="mx-auto mt-8 max-w-2xl text-xl leading-relaxed text-muted-foreground">
          The world&apos;s first 25-phase autonomous platform that builds, deploys, secures and
          monetises full-stack applications — all from a single sentence.
        </p>

        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-brand-500 px-10 py-5 text-base font-black text-white shadow-2xl shadow-brand-500/40 transition-all hover:scale-105"
          >
            <span className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-400 to-brand-600 opacity-0 transition-opacity group-hover:opacity-100" />
            START BUILDING
            <span className="text-xl">→</span>
          </Link>
          <Link
            href="/login"
            className="glass-card inline-flex items-center gap-2 rounded-2xl px-10 py-5 text-base font-bold text-white transition-all hover:border-brand-500/50"
          >
            Sign In
          </Link>
        </div>

        <p className="mt-5 text-xs text-muted-foreground/60 uppercase tracking-[0.2em] font-black">
          Production-Hardened · Stripe + Supabase + Vercel · 25 Phases Live
        </p>

        {/* Stats row */}
        <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="glass-card rounded-2xl px-5 py-6 text-center"
            >
              <div className="text-3xl font-black text-white sm:text-4xl">{s.value}</div>
              <div className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Phase Ribbon */}
      <section className="border-y border-border/40 bg-black/30 py-12 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between gap-4">
            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground">
              The 25-Phase Sovereign Lifecycle
            </h3>
            <span className="hidden text-[10px] font-black uppercase tracking-[0.25em] text-brand-400 sm:inline">
              All phases live in v2.8
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5">
            {PHASES.map((p) => (
              <div
                key={p.num}
                className="group rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-all hover:border-brand-500/40 hover:bg-brand-500/5"
              >
                <div className="mb-1 text-2xl font-black text-brand-500/50 group-hover:text-brand-400">
                  {p.num}
                </div>
                <div className="text-xs font-black uppercase tracking-tight text-white">
                  {p.name}
                </div>
                <div className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                  {p.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-28 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="text-4xl font-black tracking-tight sm:text-6xl">
            <span className="text-gradient">How it works</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">Three steps from idea to live revenue.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {HOW_IT_WORKS.map((s) => (
            <div
              key={s.step}
              className="glass-card relative rounded-3xl p-8"
            >
              <div className="mb-6 text-xs font-black uppercase tracking-[0.3em] text-brand-400">
                Step {s.step}
              </div>
              <h3 className="mb-3 text-2xl font-black tracking-tight text-white">{s.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-28 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="text-4xl font-black tracking-tight sm:text-6xl">
            <span className="text-gradient">Elite Capabilities</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need to build, ship, secure and scale.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="glass-card group rounded-2xl p-8 transition-all hover:-translate-y-1 hover:border-brand-500/40"
            >
              <div className="mb-4 text-3xl transition-transform group-hover:scale-110">
                {f.icon}
              </div>
              <h3 className="mb-2 text-xl font-bold text-white">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center lg:px-8">
        <div className="glass-card rounded-3xl p-14">
          <h2 className="text-4xl font-black tracking-tight sm:text-6xl">
            Ready to build
            <br />
            <span className="text-brand-500">something elite?</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-lg text-muted-foreground">
            Join the builders shipping full-stack apps in minutes, not months.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center gap-3 rounded-2xl bg-brand-500 px-10 py-5 text-base font-black text-white shadow-2xl shadow-brand-500/40 transition-all hover:scale-105"
            >
              ENTER THE EMPIRE →
            </Link>
            <Link
              href="/pricing"
              className="glass-card inline-flex items-center gap-2 rounded-2xl px-10 py-5 text-base font-bold text-white transition-all hover:border-brand-500/50"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12 text-center">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
          <div className="flex items-center gap-2 font-black text-lg tracking-tighter">
            <span className="h-7 w-7 rounded-lg bg-brand-500 flex items-center justify-center text-white text-xs">
              A
            </span>
            <span className="text-gradient">Sovereign Forge</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
            <Link href="/pricing" className="hover:text-white">
              Pricing
            </Link>
            <Link href="/login" className="hover:text-white">
              Sign in
            </Link>
            <Link href="/signup" className="hover:text-white">
              Sign up
            </Link>
            <span>© {new Date().getFullYear()} Sovereign Forge OS</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
