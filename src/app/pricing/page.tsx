import type { Metadata } from "next";
import Link from "next/link";
import { PricingTableClient } from "./pricing-client";

export const metadata: Metadata = {
  title: "Pricing | Build Money System",
  description: "Premium pricing plans for the Build Money System autonomous AI platform. Elite Empire and Basic Foundation tiers with lifetime license options.",
};

// For the public pricing page, we use a placeholder orgId
// Users will be redirected to sign up/login before checkout

export default function PricingPage() {
  return (
    <main className="relative overflow-hidden min-h-screen">
      {/* Background */}
      <div className="absolute left-1/2 top-0 -z-10 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[140px]" />
      <div className="absolute right-0 top-[40%] -z-10 h-[400px] w-[400px] rounded-full bg-accent/5 blur-[100px]" />

      {/* Nav */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-7 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-black text-2xl tracking-tighter">
          <span className="h-9 w-9 rounded-xl bg-brand-500 flex items-center justify-center text-white font-black">A</span>
          <span className="text-gradient">AppBuilder</span>
        </Link>
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
            Get Started
          </Link>
        </div>
      </nav>

      {/* Header */}
      <section className="mx-auto max-w-6xl px-6 py-16 text-center lg:px-8">
        <h1 className="text-5xl font-black tracking-tight sm:text-7xl">
          <span className="text-gradient">Premium Pricing</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-muted-foreground">
          Choose the plan that matches your ambition. No free tiers. No limitations on what you can build.
        </p>
      </section>

      {/* Pricing Table */}
      <section className="mx-auto max-w-7xl px-6 pb-32 lg:px-8">
        <PricingTableClient />
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10 text-center text-xs tracking-widest text-muted-foreground">
        BUILD MONEY SYSTEM - AUTONOMOUS AI PLATFORM
      </footer>
    </main>
  );
}
