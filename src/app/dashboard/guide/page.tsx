"use client";

import { Book, ShieldCheck, Zap, TrendingUp, Users, Lock, Globe } from "lucide-react";

export default function GuidePage() {
  const sections = [
    {
      title: "1. The Neural Terminal",
      icon: Zap,
      content: "The heart of Sovereign Forge. You can talk to the terminal in plain English. Just describe what you want to build (e.g., 'Build a fitness tracker with user goals and progress charts'). The system will automatically classify your intent and choose the best mode and protocol.",
      tips: ["Type 'help' to see advanced commands.", "Use blueprints for instant pre-engineered structures."]
    },
    {
      title: "2. Manifestation Modes",
      icon: ShieldCheck,
      content: "Choose between Nano, Universal, or Elite. Nano is for micro-tools, Universal is for standard apps, and Elite is for full-scale business empires with legal and financial layers.",
      tips: ["Elite mode requires more credits but includes auto-legalization.", "Universal mode is best for most SaaS applications."]
    },
    {
      title: "3. The 17-Agent Swarm",
      icon: Users,
      content: "When you manifest a project, 17 specialized AI agents collaborate. The Scout researches the market, the Architect designs the UI, the Developer writes the code, the Sentinel hardens security, and the Overseer performs E2E browser tests.",
      tips: ["Check the 'Governance' tab in your project to see agent logs.", "The 'Healer' agent automatically fixes runtime errors."]
    },
    {
      title: "4. Empire Economics",
      icon: TrendingUp,
      content: "Your organization uses Neural Credits to manifest projects. Elite mode and advanced agent skills consume more credits. You can top up credits in the 'Billing' section.",
      tips: ["Surge pricing applies during high network load.", "Higher tiers grant more monthly credits and faster build speeds."]
    }
  ];

  return (
    <div className="p-4 md:p-8 lg:p-12">
      <div className="max-w-5xl mx-auto space-y-12">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic">Sovereign Guide</h1>
            <Book className="text-brand-500" size={32} />
          </div>
          <p className="text-muted-foreground font-bold italic tracking-tight">Master the Absolute Dominance of Sovereign Forge OS.</p>
        </header>

        <div className="grid gap-12">
          {sections.map((s, i) => (
            <section key={i} className="bg-white/5 border border-white/10 p-10 rounded-[2.5rem] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 blur-3xl rounded-full -mr-20 -mt-20 group-hover:bg-brand-500/10 transition-all duration-700" />
              
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/20 flex items-center justify-center border border-brand-500/30">
                    <s.icon size={24} className="text-brand-400" />
                  </div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter italic">{s.title}</h2>
                </div>
                
                <p className="text-muted-foreground font-bold italic leading-relaxed">
                  {s.content}
                </p>

                <div className="pt-6 border-t border-white/5 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-400">Pro Tips</p>
                  <ul className="space-y-2">
                    {s.tips.map((tip, j) => (
                      <li key={j} className="flex items-start gap-3 text-xs italic font-bold text-white/70">
                        <span className="text-brand-500">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          ))}
        </div>

        <section className="bg-brand-500 p-12 rounded-[2.5rem] text-black text-center space-y-6">
          <h2 className="text-3xl font-black uppercase tracking-tighter italic">Ready to Dominate?</h2>
          <p className="text-sm font-black uppercase tracking-widest opacity-80">Launch your first manifestation from the blueprints library.</p>
          <a 
            href="/dashboard/blueprints"
            className="inline-block px-10 py-5 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-2xl"
          >
            Go to Blueprints →
          </a>
        </section>
      </div>
    </div>
  );
}
