"use client";

import { useState } from "react";
import { BILLING_TIERS, LIFETIME_LICENSES, CREDIT_PACKS, BillingTier, LifetimeLicense } from "@/lib/stripe";

interface PricingTableProps {
  orgId: string;
  currentTier?: string;
  currentInterval?: "monthly" | "yearly";
  affiliateCode?: string;
}

export function PricingTable({ 
  orgId, 
  currentTier, 
  currentInterval = "monthly",
  affiliateCode 
}: PricingTableProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [interval, setInterval] = useState<"monthly" | "yearly">(currentInterval);
  const [category, setCategory] = useState<"elite" | "basic" | "lifetime">("elite");

  const subscriptionTiers = Object.values(BILLING_TIERS).filter(t => t.category === category);
  const lifetimeLicenses = Object.values(LIFETIME_LICENSES);

  const handleSubscribe = async (tier: BillingTier) => {
    setLoading(tier.id);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          orgId, 
          type: "subscription", 
          tier: tier.id, 
          interval,
          ...(affiliateCode && { affiliateCode })
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error("Checkout failed:", err);
    } finally {
      setLoading(null);
    }
  };

  const handleLifetimePurchase = async (license: LifetimeLicense) => {
    setLoading(license.id);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          orgId, 
          type: "lifetime", 
          licenseId: license.id,
          ...(affiliateCode && { affiliateCode })
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error("Checkout failed:", err);
    } finally {
      setLoading(null);
    }
  };

  const handleTopUp = async (packId: string, price: number, credits: number) => {
    setLoading(packId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, type: "topup", amount: price, credits }),
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
      {/* Header Badge */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-amber-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
          Premium Only - No Free Tier
        </div>
      </div>

      {/* Category & Interval Selectors */}
      <div className="flex flex-col items-center gap-6 mb-12">
        <div className="flex bg-white/5 border border-white/10 p-1.5 rounded-2xl">
          <button
            onClick={() => setCategory("elite")}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              category === "elite" ? "bg-white text-black shadow-lg" : "text-muted-foreground hover:text-white"
            }`}
          >
            Elite Empire
          </button>
          <button
            onClick={() => setCategory("basic")}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              category === "basic" ? "bg-white text-black shadow-lg" : "text-muted-foreground hover:text-white"
            }`}
          >
            Basic Foundation
          </button>
          <button
            onClick={() => setCategory("lifetime")}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              category === "lifetime" ? "bg-white text-black shadow-lg" : "text-muted-foreground hover:text-white"
            }`}
          >
            Lifetime Licenses
          </button>
        </div>

        {category !== "lifetime" && (
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
              Annual
              <span className="text-[9px] bg-green-500 text-white px-1.5 py-0.5 rounded-md uppercase">Save 20%</span>
            </button>
          </div>
        )}

        {/* Category Description */}
        <p className="text-sm text-muted-foreground text-center max-w-xl">
          {category === "elite" && "Full Phases 1-17 Access. Build autonomous AI empires with governance, VC, diplomacy, and M&A capabilities."}
          {category === "basic" && "Core Phases 1-3 Access. Perfect for getting started with component generation and database integration."}
          {category === "lifetime" && "One-time payment options. Own your license forever with no recurring fees."}
        </p>
      </div>

      {/* Subscription Pricing Cards */}
      {category !== "lifetime" && (
        <div className={`grid gap-8 ${subscriptionTiers.length === 4 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-3"}`}>
          {subscriptionTiers.map((tier) => (
            <div
              key={tier.id}
              className={`p-8 rounded-3xl border ${
                currentTier === tier.id 
                  ? "border-green-500 bg-green-500/5 shadow-2xl shadow-green-500/20" 
                  : tier.id.includes("pro") 
                    ? "border-amber-500/50 bg-amber-500/5" 
                    : "border-white/10 bg-white/5"
              } flex flex-col relative group transition-all duration-300 hover:scale-[1.02]`}
            >
              {tier.id.includes("pro") && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter">
                  Most Popular
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-xl font-black mb-1 uppercase tracking-tight text-white">{tier.name}</h3>
                {tier.keyFocus && (
                  <p className="text-xs text-amber-400 font-bold mb-2">{tier.keyFocus}</p>
                )}
                <p className="text-muted-foreground text-xs mb-4">
                  {category === "elite" ? "Phases 1-17" : "Phases 1-3"}
                </p>
                <div className="flex items-baseline gap-1">
                  <p className="text-4xl font-black">
                    ${interval === "monthly" ? tier.monthlyPrice : tier.yearlyPriceEffective}
                  </p>
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </div>
                {interval === "yearly" && (
                  <p className="text-xs text-green-400 mt-1">
                    Billed ${tier.yearlyPriceEffective * 12}/year
                  </p>
                )}
              </div>

              <div className="mb-6 py-4 px-5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-0.5">Monthly Credits</p>
                  <p className="text-2xl font-black text-green-400">{tier.creditsPerMonth.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 text-lg">
                  +
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
                    : tier.id.includes("pro")
                      ? "bg-amber-500 text-black hover:bg-amber-400 active:scale-95"
                      : "bg-white text-black hover:bg-green-500 hover:text-white active:scale-95"
                } disabled:opacity-50`}
              >
                {currentTier === tier.id ? "Current Plan" : loading === tier.id ? "Processing..." : "Subscribe Now"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lifetime License Cards */}
      {category === "lifetime" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {lifetimeLicenses.map((license) => (
            <div
              key={license.id}
              className={`p-8 rounded-3xl border ${
                license.id === "lifetime_pro" 
                  ? "border-amber-500/50 bg-amber-500/5" 
                  : license.id === "onprem_perpetual"
                    ? "border-purple-500/50 bg-purple-500/5"
                    : "border-white/10 bg-white/5"
              } flex flex-col relative group transition-all duration-300 hover:scale-[1.02]`}
            >
              {license.id === "onprem_perpetual" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter">
                  Enterprise
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-xl font-black mb-2 uppercase tracking-tight text-white">{license.name}</h3>
                <p className="text-muted-foreground text-xs mb-4">{license.description}</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-4xl font-black">${license.price.toLocaleString()}</p>
                  <span className="text-sm font-normal text-muted-foreground">one-time</span>
                </div>
              </div>

              <ul className="space-y-4 mb-10 flex-1">
                {license.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-xs text-muted-foreground leading-snug">
                    <div className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      license.id === "onprem_perpetual" ? "bg-purple-500" : "bg-green-500"
                    }`} />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleLifetimePurchase(license)}
                disabled={loading === license.id}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 disabled:opacity-50 ${
                  license.id === "onprem_perpetual"
                    ? "bg-purple-500 text-white hover:bg-purple-400"
                    : "bg-white text-black hover:bg-green-500 hover:text-white"
                }`}
              >
                {loading === license.id ? "Processing..." : "Purchase License"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Credit Top-ups */}
      <div className="mt-20 p-12 rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-white/5 to-transparent relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-500/5 blur-[120px] pointer-events-none group-hover:bg-green-500/10 transition-all duration-700" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <h3 className="text-3xl font-black mb-3 uppercase tracking-tighter text-white">Credit Top-ups</h3>
              <p className="text-muted-foreground text-sm max-w-lg leading-relaxed">
                Need more power? Add credits instantly. Base rate: $20 for 5,000 credits with bulk discounts available.
              </p>
            </div>
            <div className="bg-green-500/10 text-green-400 px-4 py-2 rounded-xl border border-green-500/20 text-xs font-black uppercase tracking-widest">
              Instant Delivery
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CREDIT_PACKS.map((pack) => (
              <button
                key={pack.id}
                onClick={() => handleTopUp(pack.id, pack.price, pack.credits)}
                disabled={loading === pack.id}
                className="p-8 rounded-[2rem] border border-white/10 bg-white/5 hover:border-green-500/50 hover:bg-green-500/10 transition-all duration-300 text-left group/btn flex flex-col justify-between h-56 disabled:opacity-50"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest group-hover/btn:text-green-400 transition-colors">{pack.label}</p>
                    {pack.savings && (
                      <span className="text-[9px] bg-green-500 text-white px-2 py-0.5 rounded-full uppercase font-black">
                        {pack.savings}
                      </span>
                    )}
                  </div>
                  <p className="text-4xl font-black text-white">+{pack.credits.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1 font-bold">Credits</p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <p className="text-2xl font-black text-green-400">${pack.price / 100}</p>
                  <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center group-hover/btn:bg-green-500 group-hover/btn:text-white transition-all duration-500 rotate-[-15deg] group-hover/btn:rotate-0">
                    <span className="font-black text-white">&rarr;</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Marketplace & Affiliate Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        <div className="p-8 rounded-3xl border border-white/10 bg-white/5">
          <h4 className="text-lg font-black uppercase tracking-tight text-white mb-3">Marketplace Commission</h4>
          <p className="text-muted-foreground text-sm mb-4">
            Sell your AI agents and skills in our marketplace. We take a 25% commission on all agent-to-agent transactions.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black text-amber-400">25%</span>
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Platform Fee</span>
          </div>
        </div>
        
        <div className="p-8 rounded-3xl border border-white/10 bg-white/5">
          <h4 className="text-lg font-black uppercase tracking-tight text-white mb-3">Affiliate Program</h4>
          <p className="text-muted-foreground text-sm mb-4">
            Refer new users and earn recurring commissions on all their payments. Forever.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black text-green-400">20%</span>
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Recurring Commission</span>
          </div>
        </div>
      </div>
    </div>
  );
}
