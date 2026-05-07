"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Settings,
  CreditCard,
  Key,
  Bell,
  Shield,
  Zap,
  Crown,
} from "lucide-react";

type SettingsTab = "general" | "billing" | "api-keys" | "notifications" | "security";

interface BillingInfo {
  tier: string;
  credits_remaining: number;
  executions_remaining: number;
  is_admin: boolean;
  all_plans_free: boolean;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [defaultMode, setDefaultMode] = useState("universal");
  const [maxExecutionTimeout, setMaxExecutionTimeout] = useState(60);
  const [webhookRetries, setWebhookRetries] = useState(3);
  const [billing, setBilling] = useState<BillingInfo | null>(null);

  const loadBilling = useCallback(async () => {
    try {
      const res = await fetch("/api/flowforge/billing");
      if (res.ok) {
        const data = await res.json();
        setBilling(data.current_plan);
      }
    } catch {
      // Graceful fallback
    }
  }, []);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  const tabs: { key: SettingsTab; label: string; icon: typeof Settings }[] = [
    { key: "general", label: "General", icon: Settings },
    { key: "billing", label: "Billing", icon: CreditCard },
    { key: "api-keys", label: "API Keys", icon: Key },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "security", label: "Security", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" data-testid="settings-page">
      <header className="border-b border-gray-800 px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link href="/flowforge/dashboard" className="text-gray-400 hover:text-white">
            <ArrowLeft size={18} />
          </Link>
          <Settings className="text-gray-400" size={20} />
          <span className="font-bold">Settings</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="col-span-3">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeTab === tab.key
                      ? "bg-amber-500/10 text-amber-400"
                      : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="col-span-9">
            {activeTab === "general" && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold">General Settings</h2>
                <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 space-y-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Default Workflow Mode</label>
                    <select
                      value={defaultMode}
                      onChange={(e) => setDefaultMode(e.target.value)}
                      className="w-full max-w-xs rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm"
                    >
                      <option value="elite">Elite — Multi-tenant, governance, audit</option>
                      <option value="universal">Universal — Standard SaaS</option>
                      <option value="nano">Nano — Mobile-first lightweight</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Max Execution Timeout (seconds)</label>
                    <input
                      type="number"
                      value={maxExecutionTimeout}
                      onChange={(e) => setMaxExecutionTimeout(Number(e.target.value))}
                      className="w-full max-w-xs rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm"
                      min={10}
                      max={300}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Webhook Retry Attempts</label>
                    <input
                      type="number"
                      value={webhookRetries}
                      onChange={(e) => setWebhookRetries(Number(e.target.value))}
                      className="w-full max-w-xs rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm"
                      min={0}
                      max={10}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "billing" && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <CreditCard size={20} className="text-amber-500" /> Billing
                </h2>

                {billing?.is_admin && (
                  <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 flex items-center gap-3">
                    <Crown size={24} className="text-amber-400" />
                    <div>
                      <p className="font-bold text-amber-400">Admin Free Access</p>
                      <p className="text-sm text-gray-300">All plans are free for your account. Unlimited credits &amp; executions.</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { tier: "Free", price: billing?.all_plans_free ? "FREE" : "$0/mo", features: ["5 workflows", "1K executions", "Community support"], current: false },
                    { tier: "Pro", price: billing?.all_plans_free ? "FREE" : "$49/mo", features: ["Unlimited workflows", "50K executions", "API access", "Priority support"], current: !billing?.is_admin },
                    { tier: "Enterprise", price: billing?.all_plans_free ? "FREE" : "Custom", features: ["Unlimited everything", "SLA guarantee", "Dedicated support", "Custom integrations"], current: false },
                  ].map((plan) => (
                    <div
                      key={plan.tier}
                      className={`rounded-xl border p-6 ${
                        billing?.is_admin
                          ? "border-amber-500/30 bg-amber-500/5"
                          : plan.current
                            ? "border-amber-500 bg-amber-500/5"
                            : "border-gray-800 bg-gray-900/50"
                      }`}
                    >
                      <h3 className="font-bold text-lg">{plan.tier}</h3>
                      <p className="text-2xl font-bold mt-2 mb-4">{plan.price}</p>
                      <ul className="space-y-2 text-sm text-gray-400">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-2">
                            <Zap size={12} className="text-amber-500" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      {billing?.is_admin ? (
                        <span className="inline-block mt-4 px-3 py-1 rounded-full bg-amber-500/20 text-xs font-bold text-amber-400">
                          Included (Admin)
                        </span>
                      ) : plan.current ? (
                        <span className="inline-block mt-4 px-3 py-1 rounded-full bg-amber-500/20 text-xs font-bold text-amber-400">
                          Current Plan
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "api-keys" && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Key size={20} className="text-amber-500" /> API Keys
                </h2>
                <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                  <p className="text-sm text-gray-400 mb-4">
                    Use API keys to authenticate requests to the FlowForge API.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50">
                      <div>
                        <p className="text-sm font-medium">Production Key</p>
                        <p className="text-xs text-gray-500 font-mono">ff_prod_••••••••••••abcd</p>
                      </div>
                      <span className="text-xs text-green-400">Active</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50">
                      <div>
                        <p className="text-sm font-medium">Development Key</p>
                        <p className="text-xs text-gray-500 font-mono">ff_dev_••••••••••••efgh</p>
                      </div>
                      <span className="text-xs text-green-400">Active</span>
                    </div>
                  </div>
                  <button className="mt-4 flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400">
                    <Key size={14} /> Generate New Key
                  </button>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Bell size={20} className="text-amber-500" /> Notifications
                </h2>
                <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 space-y-4">
                  {[
                    { label: "Workflow execution failures", enabled: true },
                    { label: "Credit balance low", enabled: true },
                    { label: "New governance proposals", enabled: false },
                    { label: "Member invitations", enabled: true },
                    { label: "Security alerts", enabled: true },
                  ].map((notif) => (
                    <div key={notif.label} className="flex items-center justify-between">
                      <span className="text-sm">{notif.label}</span>
                      <div className={`w-10 h-5 rounded-full p-0.5 cursor-pointer transition-colors ${notif.enabled ? "bg-amber-500" : "bg-gray-700"}`}>
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notif.enabled ? "translate-x-5" : "translate-x-0"}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Shield size={20} className="text-amber-500" /> Security
                </h2>
                <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 space-y-4">
                  <div>
                    <h3 className="font-semibold mb-1">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-400">Add an extra layer of security to your account.</p>
                    <button className="mt-2 rounded-lg border border-gray-700 px-4 py-2 text-sm hover:border-gray-500">
                      Enable 2FA
                    </button>
                  </div>
                  <div className="border-t border-gray-800 pt-4">
                    <h3 className="font-semibold mb-1">IP Allowlist</h3>
                    <p className="text-sm text-gray-400">Restrict API access to specific IP addresses (Elite only).</p>
                    <input
                      type="text"
                      placeholder="e.g., 192.168.1.0/24"
                      className="mt-2 w-full max-w-sm rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="border-t border-gray-800 pt-4">
                    <h3 className="font-semibold mb-1">Webhook Signing Secret</h3>
                    <p className="text-sm text-gray-400">Verify webhook payloads with HMAC signatures.</p>
                    <p className="mt-2 text-xs font-mono text-gray-500 bg-gray-800 p-2 rounded">whsec_••••••••••••••••</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
