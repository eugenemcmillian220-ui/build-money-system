"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { AiTerminal } from "@/components/dashboard/AiTerminal";
import { ProjectList } from "@/components/dashboard/ProjectList";
import { SystemStatus } from "@/components/dashboard/SystemStatus";
import { supabase } from "@/lib/supabase/client";
import { Project, ManifestOptions } from "@/lib/types";
import {

  Zap, 
  BarChart3, 
  Users, 
  Crown,
  Loader2,
  AlertTriangle
} from "lucide-react";

interface Org {
  id: string;
  billing_tier?: string;
  credit_balance?: number;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);

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

      if (orgError) throw orgError;
      setOrg(orgData);

      // Fetch projects
      const { data: projectsData, error: projError } = await supabase
        .from("projects")
        .select("*")
        .eq("org_id", orgData.id)
        .order("created_at", { ascending: false });

      if (projError) throw projError;
      setProjects(projectsData || []);

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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin text-brand-500 mx-auto" size={40} />
          <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">Synchronizing Neural Link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-brand-500/30">
      <Sidebar />

      <main className="lg:ml-64 p-4 md:p-8 lg:p-12">
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic">Command Center</h1>
                <span className="px-3 py-1 bg-brand-500 text-black text-[10px] font-black uppercase tracking-widest rounded-full transform -rotate-2">Phase 20</span>
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
                  <p className="text-sm font-black uppercase tracking-tighter text-brand-400">{org.billing_tier || "Elite"}</p>
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
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-3xl rounded-full" />
              <div className="relative z-10">
                <Zap size={24} className="text-brand-400 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Neural Credits</p>
                <p className="text-4xl font-black text-white">{(org?.credit_balance || 0).toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-3xl rounded-full" />
              <div className="relative z-10">
                <BarChart3 size={24} className="text-green-400 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Active Projects</p>
                <p className="text-4xl font-black text-white">{projects.length}</p>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full" />
              <div className="relative z-10">
                <Users size={24} className="text-blue-400 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Org Members</p>
                <p className="text-4xl font-black text-white">1</p>
              </div>
            </div>
          </section>

          {/* Main Action Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <section>
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground mb-6 flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-ping" />
                  Neural Manifestation
                </h2>
                <AiTerminal onManifest={handleManifest} />
              </section>

              <section>
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground mb-6">Manifested Empires</h2>
                <ProjectList projects={projects} onDelete={handleDeleteProject} />
              </section>
            </div>

            <div className="space-y-8">
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
      </main>
    </div>
  );
}
