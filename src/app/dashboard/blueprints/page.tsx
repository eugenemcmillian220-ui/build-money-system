"use client";

import { BlueprintGallery } from "@/components/dashboard/BlueprintGallery";
import { Blueprint } from "@/lib/blueprints";
import { useRouter } from "next/navigation";
import { Book, Rocket, Info } from "lucide-react";

export default function BlueprintsPage() {
  const router = useRouter();

  const handleLaunch = (blueprint: Blueprint) => {
    // Store blueprint in session storage to pre-fill terminal
    sessionStorage.setItem("sovereign_manifest_prefill", JSON.stringify({
      prompt: blueprint.prompt,
      options: {
        mode: blueprint.mode,
        protocol: blueprint.protocol
      }
    }));
    router.push("/dashboard/terminal");
  };

  return (
    <div className="p-4 md:p-8 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic">Empire Blueprints</h1>
              <span className="px-3 py-1 bg-brand-500 text-black text-[10px] font-black uppercase tracking-widest rounded-full transform rotate-2">Plug & Play</span>
            </div>
            <p className="text-muted-foreground font-bold italic tracking-tight">Select a pre-engineered blueprint to manifest your business empire instantly.</p>
          </div>
          
          <div className="flex items-center gap-4 bg-brand-500/5 border border-brand-500/20 p-4 rounded-2xl">
            <Info size={20} className="text-brand-400" />
            <p className="text-[10px] font-black uppercase tracking-widest text-white/80 max-w-[200px]">
              Blueprints are production-hardened templates optimized for 2026 scalability.
            </p>
          </div>
        </header>

        {/* How-to-Sovereign Quick Guide */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
              <span className="text-purple-400 font-black">01</span>
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest">Pick a Blueprint</h3>
            <p className="text-xs text-muted-foreground font-bold italic">Browse our library of pre-built empire structures designed for specific market categories.</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <span className="text-blue-400 font-black">02</span>
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest">Customize Intent</h3>
            <p className="text-xs text-muted-foreground font-bold italic">Adjust the prompt in the Neural Terminal to fit your specific vision while keeping the elite core.</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center border border-brand-500/30">
              <span className="text-brand-400 font-black">03</span>
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest">Manifest Empire</h3>
            <p className="text-xs text-muted-foreground font-bold italic">Watch as 17 agents engineer, secure, and legalize your business in under 60 seconds.</p>
          </div>
        </section>

        <section className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">Active Blueprints Library</h2>
          </div>
          <BlueprintGallery onSelect={handleLaunch} />
        </section>

        {/* Outcome Expectations Guide */}
        <section className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] space-y-8">
          <div className="flex items-center gap-3">
            <Book size={24} className="text-brand-400" />
            <h2 className="text-xl font-black uppercase tracking-tighter italic">Sovereign Mode Outcomes</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <p className="text-sm font-black text-white uppercase tracking-widest border-b border-white/10 pb-2">Nano Mode</p>
              <p className="text-xs text-muted-foreground italic font-bold">Fastest build. Outcome is a single-purpose high-performance utility. Perfect for micro-tools and MVP validation.</p>
              <ul className="text-[10px] space-y-1 text-white/60 font-mono">
                <li>• Instant TTFB</li>
                <li>• Zero Bloat</li>
                <li>• Core RLS Secured</li>
              </ul>
            </div>
            <div className="space-y-4">
              <p className="text-sm font-black text-blue-400 uppercase tracking-widest border-b border-blue-400/20 pb-2">Universal Mode</p>
              <p className="text-xs text-muted-foreground italic font-bold">The Standard. Outcome is a multi-feature application with complete user flows and real-time persistence.</p>
              <ul className="text-[10px] space-y-1 text-white/60 font-mono">
                <li>• Multi-Tab Dashboard</li>
                <li>• Role-Based Access</li>
                <li>• Edge Persistence</li>
              </ul>
            </div>
            <div className="space-y-4">
              <p className="text-sm font-black text-brand-400 uppercase tracking-widest border-b border-brand-400/20 pb-2">Elite Mode</p>
              <p className="text-xs text-muted-foreground italic font-bold">Maximum Dominance. Outcome includes billing engines, governance logs, IP vaults, and 17-agent hardening.</p>
              <ul className="text-[10px] space-y-1 text-white/60 font-mono">
                <li>• Stripe / Crypto Billing</li>
                <li>• Legal Patent Drafts</li>
                <li>• M&A Synergy Audit</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
