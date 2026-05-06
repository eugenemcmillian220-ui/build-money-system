"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Zap,
  Plus,
  BarChart3,
  Activity,
  Workflow,
  Crown,
  Globe,
  Smartphone,
  Clock,
  TrendingUp,
  Shield,
  Settings,
  ChevronRight,
} from "lucide-react";
import type { FlowForgeAnalytics, WorkflowTemplate } from "@/lib/flowforge/types";
import { FLOWFORGE_TEMPLATES } from "@/lib/flowforge/engine";

type ActiveTab = "overview" | "workflows" | "analytics" | "templates";

interface WorkflowSummary {
  id: string;
  name: string;
  status: string;
  mode: string;
  execution_count: number;
  updated_at: string;
}

export default function FlowForgeDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [analytics, setAnalytics] = useState<FlowForgeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/flowforge/analytics");
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data.analytics);
        setWorkflows(data.workflows ?? []);
      }
    } catch {
      // Graceful fallback for initial load
      setAnalytics({
        total_workflows: 0,
        active_workflows: 0,
        total_executions: 0,
        success_rate: 0,
        avg_execution_time_ms: 0,
        credits_consumed: 0,
        revenue_generated: 0,
        top_workflows: [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const modeIcon = (mode: string) => {
    switch (mode) {
      case "elite": return <Crown size={14} className="text-amber-500" />;
      case "nano": return <Smartphone size={14} className="text-green-500" />;
      default: return <Globe size={14} className="text-blue-500" />;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500/20 text-green-400";
      case "paused": return "bg-yellow-500/20 text-yellow-400";
      case "error": return "bg-red-500/20 text-red-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" data-testid="flowforge-dashboard">
      {/* Top Nav */}
      <nav className="border-b border-gray-800 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/flowforge" className="flex items-center gap-2">
              <Zap className="text-amber-500" size={22} />
              <span className="font-bold">FlowForge</span>
            </Link>
            <div className="flex gap-1">
              {(["overview", "workflows", "analytics", "templates"] as ActiveTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? "bg-amber-500/10 text-amber-400"
                      : "text-gray-400 hover:text-white"
                  }`}
                  data-testid={`tab-${tab}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/flowforge/governance"
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <Shield size={14} /> Governance
            </Link>
            <Link
              href="/flowforge/settings"
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <Settings size={14} /> Settings
            </Link>
            <Link
              href="/flowforge/workflows"
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 transition-colors"
              data-testid="new-workflow-btn"
            >
              <Plus size={14} /> New Workflow
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Activity className="animate-spin text-amber-500" size={32} />
          </div>
        ) : (
          <>
            {/* Stats */}
            {activeTab === "overview" && analytics && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <StatCard
                    label="Total Workflows"
                    value={analytics.total_workflows}
                    icon={<Workflow size={18} className="text-blue-400" />}
                  />
                  <StatCard
                    label="Active"
                    value={analytics.active_workflows}
                    icon={<Activity size={18} className="text-green-400" />}
                  />
                  <StatCard
                    label="Executions"
                    value={analytics.total_executions}
                    icon={<Zap size={18} className="text-amber-400" />}
                  />
                  <StatCard
                    label="Success Rate"
                    value={`${(analytics.success_rate * 100).toFixed(1)}%`}
                    icon={<TrendingUp size={18} className="text-emerald-400" />}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
                  <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 col-span-2">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <BarChart3 size={16} className="text-amber-500" /> Recent Workflows
                    </h3>
                    {workflows.length > 0 ? (
                      <div className="space-y-3">
                        {workflows.slice(0, 5).map((wf) => (
                          <div key={wf.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50">
                            <div className="flex items-center gap-3">
                              {modeIcon(wf.mode)}
                              <span className="font-medium text-sm">{wf.name}</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor(wf.status)}`}>
                                {wf.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>{wf.execution_count} runs</span>
                              <ChevronRight size={14} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Workflow size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No workflows yet. Create your first one!</p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Clock size={16} className="text-amber-500" /> Quick Actions
                    </h3>
                    <div className="space-y-2">
                      <QuickAction href="/flowforge/workflows" label="Create Workflow" icon={<Plus size={14} />} />
                      <QuickAction href="/flowforge/nano" label="Nano Triggers" icon={<Smartphone size={14} />} />
                      <QuickAction href="/flowforge/governance" label="Governance Hub" icon={<Shield size={14} />} />
                      <QuickAction href="/flowforge/api-hub" label="API Documentation" icon={<Globe size={14} />} />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Templates Tab */}
            {activeTab === "templates" && (
              <div>
                <h2 className="text-xl font-bold mb-6">Workflow Templates</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {FLOWFORGE_TEMPLATES.map((tpl) => (
                    <TemplateCard key={tpl.id} template={tpl} />
                  ))}
                </div>
              </div>
            )}

            {/* Workflows Tab */}
            {activeTab === "workflows" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Your Workflows</h2>
                  <Link
                    href="/flowforge/workflows"
                    className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black"
                  >
                    <Plus size={14} /> New Workflow
                  </Link>
                </div>
                {workflows.length > 0 ? (
                  <div className="space-y-3">
                    {workflows.map((wf) => (
                      <div key={wf.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-800 bg-gray-900/50">
                        <div className="flex items-center gap-3">
                          {modeIcon(wf.mode)}
                          <div>
                            <span className="font-medium">{wf.name}</span>
                            <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${statusColor(wf.status)}`}>
                              {wf.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-gray-500">
                          <span>{wf.execution_count} executions</span>
                          <span>{new Date(wf.updated_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-500">
                    <Workflow size={48} className="mx-auto mb-4 opacity-30" />
                    <p>No workflows created yet.</p>
                    <p className="text-sm mt-2">Start from a template or build one from scratch.</p>
                  </div>
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === "analytics" && analytics && (
              <div>
                <h2 className="text-xl font-bold mb-6">Analytics</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                  <StatCard label="Avg Execution Time" value={`${analytics.avg_execution_time_ms.toFixed(0)}ms`} icon={<Clock size={18} className="text-blue-400" />} />
                  <StatCard label="Credits Used" value={analytics.credits_consumed} icon={<Zap size={18} className="text-amber-400" />} />
                  <StatCard label="Revenue" value={`${analytics.revenue_generated} credits`} icon={<TrendingUp size={18} className="text-green-400" />} />
                </div>
                {analytics.top_workflows.length > 0 && (
                  <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                    <h3 className="font-semibold mb-4">Top Workflows</h3>
                    {analytics.top_workflows.map((tw, i) => (
                      <div key={tw.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                        <span className="text-sm">
                          <span className="text-amber-500 font-bold mr-2">#{i + 1}</span>
                          {tw.name}
                        </span>
                        <span className="text-sm text-gray-500">{tw.executions} runs</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-gray-500">{label}</span></div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function QuickAction({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors text-sm"
    >
      <span className="text-amber-500">{icon}</span>
      <span>{label}</span>
      <ChevronRight size={14} className="ml-auto text-gray-600" />
    </Link>
  );
}

function TemplateCard({ template }: { template: WorkflowTemplate }) {
  const modeColors = {
    elite: "border-amber-500/30 bg-amber-500/5",
    universal: "border-blue-500/30 bg-blue-500/5",
    nano: "border-green-500/30 bg-green-500/5",
  };

  return (
    <div className={`rounded-xl border p-6 ${modeColors[template.mode]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{template.mode}</span>
        <span className="text-xs text-gray-600">• {template.category}</span>
      </div>
      <h3 className="font-semibold mb-2">{template.name}</h3>
      <p className="text-sm text-gray-400 mb-4">{template.description}</p>
      <div className="flex flex-wrap gap-1 mb-4">
        {template.phases_exercised.map((p) => (
          <span key={p} className="px-1.5 py-0.5 rounded bg-gray-800 text-xs text-amber-400 font-mono">
            P{p}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {template.tags.map((tag) => (
          <span key={tag} className="px-2 py-0.5 rounded-full bg-gray-800 text-xs text-gray-400">
            #{tag}
          </span>
        ))}
      </div>
    </div>
  );
}
