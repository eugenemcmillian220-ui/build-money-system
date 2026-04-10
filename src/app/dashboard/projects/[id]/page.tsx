"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase/client";
import { Project } from "@/lib/types";
import { 
  Loader2, 
  ArrowLeft, 
  FileText, 
  ShieldCheck, 
  Rocket, 
  Eye, 
  Globe, 
  Code2, 
  ChevronRight,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

export default function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"strategy" | "docs" | "marketing" | "simulation" | "security">("strategy");

  useEffect(() => {
    async function fetchProject() {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();
      
      if (data) setProject(data);
      setLoading(false);
    }
    fetchProject();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-500" size={40} />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-12 text-center">
        <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
        <h2 className="text-2xl font-black uppercase tracking-tighter italic">Empire Not Found</h2>
        <Link href="/dashboard/projects" className="text-brand-400 hover:underline mt-4 block">Return to Dashboard</Link>
      </div>
    );
  }

  const manifest = project.manifest;

  const tabs = [
    { id: "strategy", name: "Strategy", icon: Globe },
    { id: "docs", name: "Documentation", icon: FileText },
    { id: "marketing", name: "Marketing", icon: Rocket },
    { id: "simulation", name: "UX Simulation", icon: Eye },
    { id: "security", name: "Security Audit", icon: ShieldCheck },
  ];

  return (
    <div className="p-8 md:p-12">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Breadcrumb */}
        <Link href="/dashboard/projects" className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest">Back to Projects</span>
        </Link>

        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic">{project.name || "Manifested Empire"}</h1>
              <span className="px-3 py-1 bg-brand-500 text-black text-[10px] font-black uppercase tracking-widest rounded-full">
                {manifest?.mode || "Standard"}
              </span>
            </div>
            <p className="text-xl text-muted-foreground font-bold italic max-w-2xl">{project.description}</p>
          </div>

          <div className="flex gap-4">
            {project.deployment?.url && (
              <a 
                href={project.deployment.url} 
                target="_blank" 
                className="px-6 py-3 bg-white text-black rounded-xl font-black uppercase text-xs tracking-widest hover:bg-brand-500 transition-colors flex items-center gap-2"
              >
                View Live Deployment
                <ChevronRight size={14} />
              </a>
            )}
            <a 
              href={project.githubRepo} 
              target="_blank" 
              className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <Code2 size={14} />
              Repository
            </a>
          </div>
        </header>

        {/* Manifest Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-white/10 pb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
                  isActive ? "border-brand-500 text-white bg-brand-500/5" : "border-transparent text-muted-foreground hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon size={14} />
                {tab.name}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="min-h-[500px]">
          {activeTab === "strategy" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="prose prose-invert max-w-none">
                <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem]">
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-6 flex items-center gap-3">
                    <Globe size={24} className="text-brand-400" />
                    Sovereign Strategy
                  </h3>
                  <div className="whitespace-pre-wrap font-bold italic text-muted-foreground leading-relaxed">
                    {manifest?.strategy || "No strategy generated."}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "docs" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] space-y-6">
                <h3 className="text-xl font-black uppercase tracking-tighter italic flex items-center gap-3">
                  <FileText size={20} className="text-blue-400" />
                  System Architecture
                </h3>
                <div className="bg-black/40 rounded-2xl p-6 font-mono text-xs whitespace-pre-wrap text-white/80 border border-white/5">
                  {(manifest?.docs as any)?.architecture || "Architecture specs not available."}
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] space-y-6">
                <h3 className="text-xl font-black uppercase tracking-tighter italic flex items-center gap-3">
                  <Code2 size={20} className="text-green-400" />
                  API Blueprint
                </h3>
                <div className="bg-black/40 rounded-2xl p-6 font-mono text-xs whitespace-pre-wrap text-white/80 border border-white/5">
                  {(manifest?.docs as any)?.apiDocs || "API documentation not available."}
                </div>
              </div>
            </div>
          )}

          {activeTab === "marketing" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-400">X (Twitter) Thread</p>
                  <div className="space-y-4">
                    <div className="p-4 bg-black/40 rounded-xl border border-white/5 text-sm italic font-bold">
                      {(manifest?.launch as any)?.twitterThread?.hook || "No hook available."}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-black uppercase">
                      <TrendingUp size={12} />
                      <span>{ (manifest?.launch as any)?.twitterThread?.posts?.length || 0 } Posts Manifested</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-400">Product Hunt Launch</p>
                  <div className="space-y-2">
                    <p className="text-lg font-black italic">{(manifest?.launch as any)?.productHunt?.tagline || "Tagline pending..."}</p>
                    <p className="text-xs text-muted-foreground line-clamp-3">{(manifest?.launch as any)?.productHunt?.description}</p>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-400">Viral SEO Engine</p>
                  <div className="space-y-2">
                    <p className="text-sm font-bold italic">{(manifest?.launch as any)?.seoArticle?.title || "Article not generated."}</p>
                    <div className="flex flex-wrap gap-2">
                      {(manifest?.launch as any)?.seoArticle?.keywords?.slice(0, 3).map((k: string) => (
                        <span key={k} className="px-2 py-0.5 bg-white/5 rounded-md text-[9px] font-black uppercase tracking-widest text-white/50 border border-white/10">
                          #{k}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "simulation" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] flex flex-col md:flex-row gap-12 items-center">
                <div className="text-center space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">UX Efficiency Score</p>
                  <div className="relative">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                      <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" 
                        strokeDasharray={364.4}
                        strokeDashoffset={364.4 - (364.4 * (manifest?.simulation?.uxScore || 0)) / 100}
                        className="text-brand-500" 
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-3xl font-black">{manifest?.simulation?.uxScore || 0}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-400 mb-3">Phantom UX Audit</h4>
                    <ul className="space-y-2">
                      {(manifest?.simulation as any)?.frictionPoints?.map((p: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 text-sm italic font-bold text-muted-foreground">
                          <span className="text-red-400 mt-1">●</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-green-400 mb-3">Recommendations</h4>
                    <ul className="space-y-2">
                      {(manifest?.simulation as any)?.recommendations?.map((r: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 text-sm italic font-bold text-white/80">
                          <span className="text-green-400 mt-1">✓</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-3">
                    <ShieldCheck size={24} className="text-brand-400" />
                    Deep Security Audit
                  </h3>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Security Score</p>
                    <p className={`text-4xl font-black ${manifest?.security?.score && manifest.security.score > 80 ? "text-green-400" : "text-amber-400"}`}>
                      {manifest?.security?.score || 0}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Audit Log</p>
                  <div className="space-y-3">
                    {manifest?.security?.auditLog?.map((log, i) => (
                      <div key={i} className="p-4 bg-black/40 rounded-xl border border-white/5 text-xs font-mono flex items-center gap-4">
                        <span className="text-muted-foreground">[{i + 1}]</span>
                        <span className="text-white/80">{log}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
