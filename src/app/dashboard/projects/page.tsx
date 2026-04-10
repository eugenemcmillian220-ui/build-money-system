"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { ProjectList } from "@/components/dashboard/ProjectList";
import { supabase } from "@/lib/supabase/client";
import { Project } from "@/lib/types";
import { Loader2 } from "lucide-react";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (org) {
        const { data } = await supabase
          .from("projects")
          .select("*")
          .eq("org_id", org.id)
          .order("created_at", { ascending: false });
        setProjects(data || []);
      }
    }
    setLoading(false);
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this empire?")) return;
    await supabase.from("projects").delete().eq("id", id);
    setProjects(projects.filter(p => p.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-500" size={40} />
      </div>
    );
  }

  return (
    <div className="p-8 md:p-12">
      <div className="max-w-7xl mx-auto space-y-12">
          <header>
            <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">Manifested Empires</h1>
            <p className="text-muted-foreground font-bold italic">Review and manage your sovereign codebase assets.</p>
          </header>

          <ProjectList projects={projects} onDelete={handleDelete} />
        </div>
    </div>
  );
}
