"use client";

import { useState } from "react";
import { BILLING_TIERS, BillingTier } from "@/lib/stripe";

interface PricingTableProps {
  orgId: string;
  currentTier?: string;
  currentInterval?: "monthly" | "yearly";
}

export function PricingTable({ 
  orgId, 
  currentTier, 
  currentInterval = "monthly" 
}: PricingTableProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [interval, setInterval] = useState<"monthly" | "yearly">(currentInterval);
  const [category, setCategory] = useState<"basic" | "elite">("elite");

  const tiers = Object.values(BILLING_TIERS).filter(t => t.category === category);

  const handleSubscribe = async (tier: BillingTier) => {
    setLoading(tier.id);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ orgId, type: "subscription", tier: tier.id, interval }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error("Checkout failed:", err);
    } finally {
      setLoading(null);
    }
  };

  const handleTopUp = async (amount: number, credits: number) => {
    setLoading(`topup-${credits}`);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ orgId, type: "topup", amount, credits }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error("Top-up failed:", err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-12">
      {/* Category & Interval Selectors */}
      <div className="flex flex-col items-center gap-6 mb-12">
        <div className="flex bg-white/5 border border-white/10 p-1.5 rounded-2xl">
          <button
            onClick={() => setCategory("basic")}
            className={`px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
              category === "basic" ? "bg-white text-black shadow-lg" : "text-muted-foreground hover:text-white"
            }`}
          >
            Basic (Phases 1-3)
          </button>
          <button
            onClick={() => setCategory("elite")}
            className={`px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
              category === "elite" ? "bg-white text-black shadow-lg" : "text-muted-foreground hover:text-white"
            }`}
          >
            Elite (Phases 1-11)
          </button>
        </div>

        <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl">
          <button
            onClick={() => setInterval("monthly")}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${
              interval === "monthly" ? "bg-white text-black" : "text-muted-foreground hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval("yearly")}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              interval === "yearly" ? "bg-white text-black" : "text-muted-foreground hover:text-white"
            }`}
          >
            Yearly
            <span className="text-[9px] bg-green-500 text-white px-1.5 py-0.5 rounded-md uppercase">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={`p-8 rounded-3xl border ${
              currentTier === tier.id ? "border-green-500 bg-green-500/5 shadow-2xl" : "border-white/10 bg-white/5"
            } flex flex-col relative group transition-all duration-300 hover:scale-[1.02]`}
          >
            {tier.id.includes("pro") && (
              <div className="absolute top-0 right-0 bg-green-500 text-white text-[9px] font-black px-4 py-1.5 rounded-bl-xl uppercase tracking-tighter">
                Best Value
              </div>
            )}
            
            <div className="mb-6">
              <h3 className="text-xl font-black mb-1 uppercase tracking-tight text-white">{tier.name}</h3>
              <p className="text-muted-foreground text-xs mb-4">{category === 'basic' ? 'Core Foundation (Phases 1-3)' : 'Global AI Empire (Phases 1-16)'}</p>
              <p className="text-4xl font-black flex items-baseline gap-1">
                ${interval === "monthly" ? tier.monthlyPrice : tier.yearlyPriceEffective}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
            </div>

            <div className="mb-6 py-4 px-5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-0.5">Monthly Credits</p>
                <p className="text-2xl font-black text-green-400">{tier.creditsPerMonth.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-400">
                ⚡
              </div>
            </div>

            <ul className="space-y-4 mb-10 flex-1">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-xs text-muted-foreground leading-snug">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe(tier)}
              disabled={loading === tier.id || currentTier === tier.id}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all ${
                currentTier === tier.id
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-white text-black hover:bg-green-500 hover:text-white active:scale-95"
              } disabled:opacity-50`}
            >
              {currentTier === tier.id ? "Current Plan" : loading === tier.id ? "Syncing..." : "Subscribe Now"}
            </button>
          </div>
        ))}
      </div>

      {/* Credit Top-ups */}
      <div className="mt-20 p-12 rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-white/5 to-transparent relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-500/5 blur-[120px] pointer-events-none group-hover:bg-green-500/10 transition-all duration-700" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <h3 className="text-3xl font-black mb-3 uppercase tracking-tighter text-white">Instant Credit Injection</h3>
              <p className="text-muted-foreground text-sm max-w-lg leading-relaxed">Everything in this app has a cost. Fuel your agents, vision calls, and multi-cloud deployments with instant top-ups. No free handouts.</p>
            </div>
            <div className="bg-green-500/10 text-green-400 px-4 py-2 rounded-xl border border-green-500/20 text-xs font-black uppercase tracking-widest">
              Secured by Stripe
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { credits: 5000, price: 2000, label: "Starter Boost" }, // $20
              { credits: 15000, price: 5000, label: "Pro Surge" }, // $50
              { credits: 50000, price: 15000, label: "Empire Overdrive" }, // $150
            ].map((pack) => (
              <button
                key={pack.credits}
                onClick={() => handleTopUp(pack.price, pack.credits)}
                disabled={loading === `topup-${pack.credits}`}
                className="p-8 rounded-[2rem] border border-white/10 bg-white/5 hover:border-green-500/50 hover:bg-green-500/10 transition-all duration-300 text-left group/btn flex flex-col justify-between h-56"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest group-hover/btn:text-green-400 transition-colors">{pack.label}</p>
                    <span className="text-lg">💰</span>
                  </div>
                  <p className="text-4xl font-black text-white">+{pack.credits.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1 font-bold">Credits</p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <p className="text-2xl font-black text-green-400">${pack.price / 100}</p>
                  <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center group-hover/btn:bg-green-500 group-hover/btn:text-white transition-all duration-500 rotate-[-15deg] group-hover/btn:rotate-0">
                    <span className="font-black">→</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
