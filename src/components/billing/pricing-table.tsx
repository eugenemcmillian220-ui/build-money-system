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
      {/* Interval Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-white/5 border border-white/10 p-1 rounded-xl flex items-center">
          <button
            onClick={() => setInterval("monthly")}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              interval === "monthly" ? "bg-white text-black" : "text-muted-foreground hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval("yearly")}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              interval === "yearly" ? "bg-white text-black" : "text-muted-foreground hover:text-white"
            }`}
          >
            Yearly
            <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded-md uppercase tracking-wider">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {Object.values(BILLING_TIERS).map((tier) => (
          <div
            key={tier.id}
            className={`p-8 rounded-2xl border ${
              currentTier === tier.id ? "border-green-500 bg-green-500/5 shadow-[0_0_30px_rgba(34,197,94,0.1)]" : "border-white/10 bg-white/5"
            } flex flex-col relative overflow-hidden`}
          >
            {tier.id === "pro" && (
              <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-xl uppercase tracking-tighter">
                Most Popular
              </div>
            )}
            
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-2 uppercase tracking-tight">{tier.name}</h3>
              <p className="text-4xl font-black flex items-baseline gap-1">
                ${interval === "monthly" ? tier.monthlyPrice : tier.yearlyPriceEffective}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
              {interval === "yearly" && (
                <p className="text-[11px] text-green-400 mt-1 font-bold">Billed annually (${tier.yearlyPriceEffective * 12}/year)</p>
              )}
            </div>

            <div className="mb-6 py-3 px-4 rounded-xl bg-white/5 border border-white/5">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Monthly Allowance</p>
              <p className="text-xl font-black text-green-400">{tier.creditsPerMonth.toLocaleString()} <span className="text-xs font-normal">Credits</span></p>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-muted-foreground leading-snug">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500/50 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe(tier)}
              disabled={loading === tier.id || currentTier === tier.id}
              className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${
                currentTier === tier.id
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-white text-black hover:bg-green-500 hover:text-white"
              } disabled:opacity-50`}
            >
              {currentTier === tier.id ? "Current Plan" : loading === tier.id ? "Processing..." : "Start 14-Day Trial"}
            </button>
          </div>
        ))}
      </div>

      {/* Credit Top-ups */}
      <div className="p-10 rounded-3xl border border-white/10 bg-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 blur-[100px] pointer-events-none" />
        <div className="relative z-10">
          <h3 className="text-2xl font-black mb-2 uppercase tracking-tight">Need more credits?</h3>
          <p className="text-muted-foreground text-sm mb-8 max-w-lg">Scale your autonomous empire instantly. Top-up credits are added to your ledger immediately after purchase.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { credits: 5000, price: 2000 }, // $20
              { credits: 15000, price: 5000 }, // $50 (Bulk Discount)
              { credits: 50000, price: 15000 }, // $150 (Deep Discount)
            ].map((pack) => (
              <button
                key={pack.credits}
                onClick={() => handleTopUp(pack.price, pack.credits)}
                disabled={loading === `topup-${pack.credits}`}
                className="p-8 rounded-2xl border border-white/10 bg-white/5 hover:border-green-500/50 hover:bg-green-500/5 transition-all text-left group flex flex-col justify-between h-48"
              >
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1 group-hover:text-green-400 transition-colors">Boost Pack</p>
                  <p className="text-3xl font-black">+{pack.credits.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Credits</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xl font-bold text-green-400">${pack.price / 100}</p>
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-all">
                    →
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
