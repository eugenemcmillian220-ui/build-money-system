"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, AlertCircle, CheckCircle2, ChevronRight, Activity } from "lucide-react";
import { getQAProjects } from "@/lib/actions/qa-actions";
import { Project } from "@/lib/types";
import Link from "next/link";

export default function QADashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getQAProjects();
        setProjects(data as unknown as Project[]);
      } catch (err) {
        console.error("Failed to load QA data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-12">
        <div className="flex items-center gap-3 mb-2 text-brand-500">
          <ShieldCheck size={24} />
          <span className="font-black uppercase tracking-tighter text-sm">Phase 21: The Overseer</span>
        </div>
        <h1 className="text-5xl font-black text-white tracking-tight uppercase italic italic-none">
          QA Audit <span className="text-brand-500">Control Center</span>
        </h1>
        <p className="text-muted-foreground mt-4 max-w-2xl text-lg">
          Autonomous E2E browser testing and visual regression reports. Ensure zero-regression deployments across your empire.
        </p>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
          <Activity className="animate-spin text-brand-500 mb-4" size={48} />
          <p className="text-white font-black uppercase tracking-widest text-xs">Synchronizing Audit Logs...</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.filter(p => p.manifest?.qa).map((project) => {
            const qa = project.manifest?.qa;
            const isPass = qa?.status === "pass";

            return (
              <div 
                key={project.id}
                className="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-6">
                  <div className={`p-4 rounded-xl ${isPass ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                    {isPass ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">{project.name || "Untitled Empire"}</h3>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-white/5 px-2 py-0.5 rounded">
                        ID: {project.id.slice(0, 8)}
                      </span>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${isPass ? "text-emerald-500" : "text-rose-500"}`}>
                        {isPass ? "Audit Passed" : "Critical Failures Detected"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right hidden md:block">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Last Audit</p>
                    <p className="text-sm text-white font-mono">{qa?.lastRunAt ? new Date(qa.lastRunAt).toLocaleString() : "Never"}</p>
                  </div>
                  <Link 
                    href={`/dashboard/projects/${project.id}`}
                    className="p-3 bg-white/5 rounded-xl text-white hover:bg-brand-500 hover:text-black transition-all"
                  >
                    <ChevronRight size={20} />
                  </Link>
                </div>
              </div>
            );
          })}

          {projects.filter(p => p.manifest?.qa).length === 0 && (
            <div className="py-20 text-center bg-white/5 rounded-3xl border border-white/10">
              <ShieldCheck className="mx-auto text-white/20 mb-4" size={64} />
              <p className="text-muted-foreground font-medium italic">No QA reports generated yet. Manifest a project to trigger The Overseer.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
