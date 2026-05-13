// DA-012 FIX: orgId resolved server-side from auth session, not client request
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BILLING_TIERS, LIFETIME_LICENSES, CREDIT_PACKS, BillingTier, LifetimeLicense } from "@/lib/stripe-config";

interface PricingTableProps {
  orgId: string;
  currentTier?: string;
  currentInterval?: "monthly" | "yearly";
  affiliateCode?: string;
  /** When true, buttons redirect to login instead of attempting checkout */
  requiresLogin?: boolean;
}

const PLACEHOLDER_ORG_ID = "00000000-0000-0000-0000-000000000000";

export function PricingTable({ 
  orgId, 
  currentTier, 
  currentInterval = "monthly",
  affiliateCode,
  requiresLogin = false,
}: PricingTableProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [interval, setInterval] = useState<"monthly" | "yearly">(currentInterval);
  const [category, setCategory] = useState<"elite" | "basic" | "lifetime">("elite");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const subscriptionTiers = Object.values(BILLING_TIERS).filter(t => t.category === category);
  const lifetimeLicenses = Object.values(LIFETIME_LICENSES);

  const redirectToLogin = useCallback(() => {
    router.push("/login?redirectTo=/dashboard/billing");
  }, [router]);

  /** Shared checkout call with error handling */
  const checkout = useCallback(async (body: Record<string, unknown>): Promise<void> => {
    setError(null);

    if (requiresLogin || orgId === PLACEHOLDER_ORG_ID) {
      redirectToLogin();
      return;
    }

    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 401) {
        redirectToLogin();
        return;
      }
      throw new Error(data.error || `Checkout failed (${res.status})`);
    }

    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error("No checkout URL returned");
    }
  }, [orgId, requiresLogin, redirectToLogin]);

  const handleSubscribe = async (tier: BillingTier) => {
    setLoading(tier.id);
    try {
      await checkout({
        orgId,
        type: "subscription",
        tier: tier.id,
        interval,
        ...(affiliateCode && { affiliateCode }),
      });
    } catch (err) {
      console.error("Checkout failed:", err);
      setError(err instanceof Error ? err.message : "Failed to start checkout. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const handleLifetimePurchase = async (license: LifetimeLicense) => {
    setLoading(license.id);
    try {
      await checkout({
        orgId,
        type: "lifetime",
        licenseId: license.id,
        ...(affiliateCode && { affiliateCode }),
      });
    } catch (err) {
      console.error("Checkout failed:", err);
      setError(err instanceof Error ? err.message : "Failed to start checkout. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const handleTopUp = async (packId: string) => {
    setLoading(packId);
    try {
      await checkout({ orgId, type: "topup", packId });
    } catch (err) {
      console.error("Top-up failed:", err);
      setError(err instanceof Error ? err.message : "Failed to start checkout. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-12">
      {/* Error Banner */}
      {error && (
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-4 text-center">
          <p className="text-sm font-bold text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-xs text-red-400/70 underline hover:text-red-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Badge */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-amber-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
          Advanced Automated Builder Mode - Active for All Tiers
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
          {category === "elite" && "Full Phases 1-25 Access. Build autonomous AI empires with advanced Automated Builder, Governance, and VC capabilities."}
          {category === "basic" && "Core Phases 1-3 Access. Now with Advanced Automated Builder enabled for rapid component and schema generation."}
          {category === "lifetime" && "One-time payment options. Own your license forever with universal access to the Automated Builder Mode."}
        </p>
      </div>

      {/* Subscription Pricing Cards */}
      {category !== "lifetime" && (
        <div className={`grid gap-8 \${subscriptionTiers.length === 4 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-3"}`}>
          {subscriptionTiers.map((tier) => (
            <div
              key={tier.id}
              className={`p-8 rounded-3xl border \${
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
                  {category === "elite" ? "Phases 1-25" : "Phases 1-3"}
                </p>
                <div className="flex items-baseline gap-1">
                  <p className="text-4xl font-black">
                    \${interval === "monthly" ? tier.monthlyPrice : tier.yearlyPriceEffective}
                  </p>
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </div>
                {interval === "yearly" && (
                  <p className="text-xs text-green-400 mt-1">
                    Billed \${tier.yearlyPriceEffective * 12}/year
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
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all \${
                  currentTier === tier.id
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : tier.id.includes("pro")
                      ? "bg-amber-500 text-black hover:bg-amber-400 active:scale-95"
                      : "bg-white text-black hover:bg-gray-200 active:scale-95"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === tier.id ? "Processing..." : currentTier === tier.id ? "Current Tier" : "Initiate Access"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lifetime Cards */}
      {category === "lifetime" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {lifetimeLicenses.map((license) => (
            <div
              key={license.id}
              className="p-8 rounded-3xl border border-white/10 bg-white/5 flex flex-col relative group transition-all duration-300 hover:scale-[1.02]"
            >
              <div className="mb-6">
                <h3 className="text-xl font-black mb-1 uppercase tracking-tight text-white">{license.name}</h3>
                <p className="text-muted-foreground text-xs mb-4">{license.description}</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-4xl font-black">\${license.price}</p>
                  <span className="text-sm font-normal text-muted-foreground">once</span>
                </div>
              </div>

              <ul className="space-y-4 mb-10 flex-1">
                {license.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-xs text-muted-foreground leading-snug">
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleLifetimePurchase(license)}
                disabled={loading === license.id}
                className="w-full py-4 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading === license.id ? "Processing..." : "Claim License"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
