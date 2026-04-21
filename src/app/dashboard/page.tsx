"use client";

import { useEffect, useState } from "react";
import { AiTerminal } from "@/components/dashboard/AiTerminal";
import { ProjectList } from "@/components/dashboard/ProjectList";
import { SystemStatus } from "@/components/dashboard/SystemStatus";
import { supabase } from "@/lib/supabase/client";
import { Project, ManifestOptions } from "@/lib/types";
import { CeoReport } from "@/lib/agents/ceo";
import { TrendResult } from "@/lib/agents/trend-hunter";
import { repairOrganization } from "@/lib/auth-actions";
import {

  Zap,
  BarChart3,
  Users,
  Crown,
  Loader2,
  AlertTriangle,
  LayoutGrid,
} from "lucide-react";
import { ADMIN_FREE_TIER } from "@/lib/admin-emails";

interface Org {
  id: string;
  billing_tier?: string;
  credit_balance?: number;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [ceoReport, setCeoReport] = useState<CeoReport | null>(null);
  const [trends, setTrends] = useState<TrendResult | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch personal org
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (orgError) {
        if (orgError.code === "PGRST116") {
          // No org found, attempt self-healing
          console.log("No organization found for user, initiating repair...");
          const repair = await repairOrganization();
          if (repair.success) {
            // Retry fetch after repair
            const { data: retryOrg, error: retryError } = await supabase
              .from("organizations")
              .select("*")
              .eq("owner_id", user.id)
              .single();
            
            if (retryError) throw retryError;
            setOrg(retryOrg);
            return fetchDashboardData(); // Reload projects with new org ID
          } else {
            throw new Error("Failed to initialize workspace. Please contact support.");
          }
        }
        throw orgError;
      }
      setOrg(orgData);

      // Fetch projects
      const { data: projectsData, error: projError } = await supabase
        .from("projects")
        .select("*")
        .eq("org_id", orgData.id)
        .order("created_at", { ascending: false });

      if (projError) throw projError;
      setProjects(projectsData || []);

      // Fetch CEO Report
      const ceoRes = await fetch(`/api/ceo/report?orgId=${orgData.id}`);
      if (ceoRes.ok) setCeoReport(await ceoRes.json());

      // Fetch Trends
      const trendRes = await fetch("/api/rd/scout");
      if (trendRes.ok) setTrends(await trendRes.json());

    } catch (err) {
      console.error("Dashboard error:", err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const handleManifest = async (prompt: string, options: ManifestOptions) => {
    if (!org) throw new Error("Organization not loaded");
    const res = await fetch("/api/manifest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, orgId: org.id, options }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Manifestation failed");
    }

    await fetchDashboardData(); // Refresh list
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this empire?")) return;

    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      alert(`Delete failed: ${error.message}`);
    } else {
      setProjects(projects.filter(p => p.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin text-brand-500 mx-auto" size={40} />
          <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">Synchronizing Neural Link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-12">

          
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic">Command Center</h1>
                <span className="px-3 py-1 bg-brand-500 text-black text-[10px] font-black uppercase tracking-widest rounded-full transform -rotate-2">25 Phases Live</span>
                {org?.billing_tier === ADMIN_FREE_TIER && (
                  <span className="px-3 py-1 bg-gradient-to-r from-brand-500 to-accent text-black text-[10px] font-black uppercase tracking-widest rounded-full">
                    Admin · Free
                  </span>
                )}
              </div>
              <p className="text-muted-foreground font-bold italic tracking-tight">Welcome back, Sovereign. Your empire is operating at peak efficiency.</p>
            </div>

            {org && (
              <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center border border-brand-500/30">
                  <Crown size={20} className="text-brand-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sovereign Tier</p>
                  <p className="text-sm font-black uppercase tracking-tighter text-brand-400">
                    {org.billing_tier === ADMIN_FREE_TIER ? "Admin (Free, Unlimited)" : (org.billing_tier || "Elite")}
                  </p>
                </div>
              </div>
            )}
          </header>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-[2rem] flex items-center gap-4 text-red-400">
              <AlertTriangle size={24} />
              <p className="font-bold italic uppercase tracking-tight">Warning: {error}</p>
            </div>
          )}

          {/* Stats Grid */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-3xl rounded-full" />
              <div className="relative z-10">
                <Zap size={22} className="text-brand-400 mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Neural Credits</p>
                <p className="text-3xl md:text-4xl font-black text-white">
                  {org?.billing_tier === ADMIN_FREE_TIER ? "∞" : (org?.credit_balance || 0).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-3xl rounded-full" />
              <div className="relative z-10">
                <BarChart3 size={22} className="text-green-400 mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Active Projects</p>
                <p className="text-3xl md:text-4xl font-black text-white">{projects.length}</p>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full" />
              <div className="relative z-10">
                <Users size={22} className="text-blue-400 mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Org Members</p>
                <p className="text-3xl md:text-4xl font-black text-white">1</p>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full" />
              <div className="relative z-10">
                <LayoutGrid size={22} className="text-purple-400 mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Phases Active</p>
                <p className="text-3xl md:text-4xl font-black text-white">25 / 25</p>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* CEO Strategic Brief */}
              {ceoReport && (
                <section className="bg-brand-500/5 border border-brand-500/20 p-8 rounded-[2.5rem] space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black uppercase tracking-tighter italic flex items-center gap-3">
                      <Crown size={24} className="text-brand-400" />
                      CEO Strategic Briefing
                    </h2>
                    <span className="px-3 py-1 bg-brand-500/20 text-brand-400 text-[10px] font-black uppercase rounded-full">
                      Empire Health: {ceoReport.empireHealth}%
                    </span>
                  </div>
                  <p className="text-sm italic font-bold text-white/80 leading-relaxed">{ceoReport.summary}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Strategic Tasks</p>
                      <div className="space-y-2">
                        {ceoReport.strategicTasks.map((t, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-black/40 rounded-xl border border-white/5">
                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                              t.priority === 'critical' ? 'bg-red-500 animate-pulse' : 
                              t.priority === 'high' ? 'bg-amber-500' : 'bg-brand-500'
                            }`} />
                            <p className="text-xs font-bold text-white/70">{t.task}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Revenue Optimization</p>
                      <div className="p-4 bg-black/40 rounded-2xl border border-white/5 text-xs italic text-brand-400/80 leading-relaxed">
                        {ceoReport.revenueOptimization}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              <section>
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground mb-6 flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-ping" />
                  Neural Manifestation
                </h2>
                <AiTerminal onManifest={handleManifest} orgId={org?.id} />
              </section>

              <section>
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground mb-6">Manifested Empires</h2>
                <ProjectList projects={projects} onDelete={handleDeleteProject} />
              </section>
            </div>

            <div className="space-y-8">
              {/* Market R&D Scouting */}
              {trends && (
                <section className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] space-y-6">
                  <h2 className="text-xl font-black uppercase tracking-tighter italic flex items-center gap-3">
                    <Zap size={20} className="text-amber-400" />
                    Market R&D Scout
                  </h2>
                  <div className="space-y-4">
                    {trends.trends.slice(0, 5).map((t, i) => (
                      <div key={i} className="flex items-center justify-between group">
                        <div className="space-y-0.5">
                          <p className="text-sm font-black text-white group-hover:text-brand-400 transition-colors">{t.name}</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t.category} | {t.source}</p>
                        </div>
                        <div className="text-right">
                          <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500" style={{ width: `${t.velocity}%` }} />
                          </div>
                          <p className="text-[8px] font-black text-brand-500 mt-1">{t.velocity}% VELOCITY</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground mb-6">Sovereignty Status</h2>
                <SystemStatus />
              </section>
              
              <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-brand-500/20 to-transparent border border-brand-500/30">
                <h3 className="text-xl font-black uppercase tracking-tighter italic mb-4">Upgrade Empire</h3>
                <p className="text-sm text-muted-foreground font-bold italic mb-6">Unlock autonomous VC engines, Hive Mind memory, and Sovereign legal vaults.</p>
                <a href="/dashboard/billing" className="block w-full py-4 bg-brand-500 text-black text-center rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-brand-400 transition-colors">
                  View Elite Tiers
                </a>
              </div>
            </div>
          </div>

        </div>
    </div>
  );
}
