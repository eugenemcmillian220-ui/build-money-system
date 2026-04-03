"use client";

import { useState } from "react";
import { BILLING_TIERS, BillingTier } from "@/lib/stripe";

interface PricingTableProps {
  orgId: string;
  currentTier?: string;
}

export function PricingTable({ orgId, currentTier = "free" }: PricingTableProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (tier: BillingTier) => {
    if (tier.id === "free") return;
    setLoading(tier.id);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ orgId, type: "subscription", tier: tier.id }),
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {Object.values(BILLING_TIERS).map((tier) => (
          <div
            key={tier.id}
            className={`p-8 rounded-2xl border ${
              currentTier === tier.id ? "border-green-500 bg-green-500/5" : "border-white/10 bg-white/5"
            } flex flex-col`}
          >
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
              <p className="text-3xl font-black">
                {tier.id === "free" ? "$0" : tier.id === "pro" ? "$29" : "$199"}
                <span className="text-sm font-normal text-muted-foreground ml-2">/month</span>
              </p>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-center gap-2 text-sm text-green-400">
                <span className="font-bold">+{tier.creditsPerMonth.toLocaleString()}</span> Credits/mo
              </li>
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe(tier)}
              disabled={loading === tier.id || currentTier === tier.id || tier.id === "free"}
              className={`w-full py-3 rounded-xl font-bold transition-all ${
                currentTier === tier.id
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-white text-black hover:bg-green-400 hover:text-white"
              } disabled:opacity-50`}
            >
              {currentTier === tier.id ? "Current Plan" : loading === tier.id ? "Processing..." : "Upgrade"}
            </button>
          </div>
        ))}
      </div>

      <div className="p-8 rounded-2xl border border-white/10 bg-white/5">
        <h3 className="text-xl font-bold mb-6">Need more credits?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { credits: 1000, price: 1000 }, // $10
            { credits: 5000, price: 4500 }, // $45
            { credits: 25000, price: 20000 }, // $200
          ].map((pack) => (
            <button
              key={pack.credits}
              onClick={() => handleTopUp(pack.price, pack.credits)}
              disabled={loading === `topup-${pack.credits}`}
              className="p-6 rounded-xl border border-white/10 bg-white/5 hover:border-green-500/50 hover:bg-green-500/5 transition-all text-left group"
            >
              <p className="text-sm text-muted-foreground mb-1 group-hover:text-green-400">Top-up Pack</p>
              <p className="text-2xl font-black mb-1">+{pack.credits.toLocaleString()}</p>
              <p className="text-lg font-bold text-green-400">${pack.price / 100}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
