import type { Metadata } from "next";
import { GeneratorForm } from "@/components/generator-form";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AI App Builder | Elite Production Suite",
  description:
    "The world's first autonomous AI platform for building, deploying, and optimizing full-stack applications.",
};

export default function HomePage() {
  return (
    <main className="relative mx-auto min-h-dvh max-w-7xl overflow-hidden px-6 py-20 sm:py-32 lg:px-8">
      {/* Background Orbs */}
      <div className="absolute left-1/2 top-0 -z-10 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[120px]" />
      <div className="absolute right-0 top-1/2 -z-10 h-[400px] w-[400px] rounded-full bg-accent/5 blur-[100px]" />

      <header className="relative mb-20 text-center">
        <div className="mb-12 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold tracking-tighter text-2xl">
            <span className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center text-white text-xl">
              A
            </span>
            <span className="text-gradient">AppBuilder</span>
          </div>
          <Link
            href="/dashboard"
            className="glass-card inline-flex items-center gap-2 rounded-full px-6 py-2 text-sm font-semibold text-white transition-all hover:border-brand-500/50 hover:bg-brand-500/10"
          >
            📊 Project Dashboard
          </Link>
        </div>

        <div
          className="animate-glow mb-8 inline-flex items-center gap-3 rounded-full border border-brand-500/30 bg-brand-500/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-300"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
          </span>
          Phase 7: Autonomous Elite Suite
        </div>

        <h1 className="mb-6 text-6xl font-black tracking-tight sm:text-8xl">
          <span className="text-gradient">Build the Future</span>
          <br />
          <span className="text-brand-500">Autonomously.</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          From natural language to a production-ready, revenue-optimized company. 
          The first autonomous platform that builds, deploys, and scales for you.
        </p>
      </header>

      <div className="relative mx-auto max-w-4xl">
        <div className="glass-card overflow-hidden rounded-3xl p-1 shadow-2xl">
          <div className="rounded-[22px] bg-background/50 p-6 md:p-10">
            <GeneratorForm />
          </div>
        </div>
      </div>

      <section className="mt-32 grid gap-6 sm:grid-cols-3">
        {[
          { icon: "⚡", title: "Instant Generation", desc: "Proprietary LLM-swarm generates production Next.js 15 code in seconds." },
          { icon: "🛡️", title: "Elite Security", desc: "Automated RLS policies, input sanitization, and path-traversal protection." },
          { icon: "📈", title: "Revenue Optimized", desc: "Built-in AI churn prediction and pricing optimization for your SaaS." }
        ].map((feature, i) => (
          <div key={i} className="glass-card group relative rounded-2xl p-8 transition-all hover:-translate-y-1 hover:border-brand-500/50">
            <div className="mb-4 text-3xl transition-transform group-hover:scale-110">{feature.icon}</div>
            <h3 className="mb-2 text-xl font-bold text-white">{feature.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {feature.desc}
            </p>
          </div>
        ))}
      </section>

      <footer className="mt-32 border-t border-border/50 pt-10 text-center text-sm text-muted-foreground">
        <p className="tracking-widest">
          BUILT FOR THE 1% · POWERED BY AI SWARM · DEPLOYED ON VERCEL
        </p>
      </footer>
    </main>
  );
}
