"use client";

import { Project } from "@/lib/types";
import Link from "next/link";
import {

  Package, 
  ExternalLink, 
  Code2, 
  Trash2, 
  TrendingUp,
  BarChart3,
  ShieldCheck,
  Palette
} from "lucide-react";

interface ProjectListProps {
  projects: Project[];
  onDelete: (id: string) => Promise<void>;
}

export function ProjectList({ projects, onDelete }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-20 bg-white/5 border border-white/10 rounded-[2.5rem] border-dashed">
        <Package className="mx-auto mb-4 text-muted-foreground opacity-20" size={48} />
        <p className="text-muted-foreground font-bold italic tracking-tighter uppercase">No empires manifested yet.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
      {projects.map((project) => (
        <div key={project.id} className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 hover:border-brand-500/30 transition-all group">
          <div className="flex justify-between items-start mb-6">
            <Link href={`/dashboard/projects/${project.id}`} className="hover:opacity-80 transition-opacity flex-1">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-black uppercase tracking-tighter text-white">{project.name || "Untitled Empire"}</h3>
                  {project.manifest?.mode && (
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${
                      project.manifest?.mode === "elite" ? "bg-brand-500/10 text-brand-400 border border-brand-500/20" : "bg-white/10 text-white/50"
                    }`}>
                      {project.manifest.mode}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 max-w-md">{project.description}</p>
              </div>
            </Link>
            <div className="flex gap-2">
              {project.deployment?.url && (
                <a href={project.deployment.url} target="_blank" className="p-2 bg-white/5 rounded-xl hover:bg-brand-500 hover:text-white transition-all">
                  <ExternalLink size={18} />
                </a>
              )}
              <button onClick={() => onDelete(project.id)} className="p-2 bg-white/5 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
              <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-1">UX Score</p>
              <div className="flex items-center gap-2">
                <BarChart3 size={14} className="text-green-400" />
                <span className="text-lg font-black text-white">{project.manifest?.simulation?.uxScore || "--"}</span>
              </div>
            </div>
            <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
              <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-1">Security</p>
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className={project.manifest?.security?.score && project.manifest.security.score > 80 ? "text-green-400" : "text-amber-400"} />
                <span className="text-lg font-black text-white">{project.manifest?.security?.score || "--"}</span>
              </div>
            </div>
            <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
              <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-1">Hardening</p>
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-brand-400" />
                <span className="text-lg font-black text-white">{project.manifest?.sentinel?.hardeningScore || "--"}</span>
              </div>
            </div>
            <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
              <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-1">ROI</p>
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-green-400" />
                <span className="text-lg font-black text-white">{project.manifest?.economy?.agentRoi || "--"}x</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-white/5">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center border-2 border-[#0a0a0a] text-[10px] font-black">S</div>
              <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center border-2 border-[#0a0a0a] text-[10px] font-black">H</div>
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center border-2 border-[#0a0a0a] text-[10px] font-black">P</div>
            </div>
            <div className="flex gap-4">
              {project.manifest?.launch && (
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-400">
                  <TrendingUp size={12} />
                  <span>Launch Ready</span>
                </div>
              )}
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{new Date(project.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
