"use server";

import { listProjectsDB } from "@/lib/supabase/db";
import { Project } from "@/lib/types";

export async function getQAProjects(): Promise<Project[]> {
  try {
    // In a real app, you would add auth checks here.
    // For now, we reuse the existing listProjectsDB which uses the service role key.
    return await listProjectsDB(100);
  } catch (error) {
    console.error("Error fetching QA projects:", error);
    return [];
  }
}
