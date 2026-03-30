import { Project } from "./types";

/**
 * @deprecated Use supabase/db.ts for persistent storage. This module is kept for development fallback.
 * 
 * In-memory project storage for development and fallback.
 * For production, use the Supabase database layer in supabase/db.ts
 */

const store: Record<string, Project> = {};

/**
 * @deprecated Use saveProjectDB from supabase/db.ts instead
 */
export function saveProject(project: Omit<Project, "createdAt">): Project {
  const newProject: Project = {
    ...project,
    createdAt: new Date().toISOString(),
  };
  store[project.id] = newProject;
  return newProject;
}

/**
 * @deprecated Use loadProjectDB from supabase/db.ts instead
 */
export function loadProject(id: string): Project | undefined {
  return store[id];
}

/**
 * @deprecated Use listProjectsDB from supabase/db.ts instead
 */
export function getAllProjects(): Project[] {
  return Object.values(store).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * @deprecated Use deleteProjectDB from supabase/db.ts instead
 */
export function deleteProject(id: string): boolean {
  if (store[id]) {
    delete store[id];
    return true;
  }
  return false;
}

/**
 * Clear all projects from memory (useful for testing)
 * @deprecated Only use for testing
 */
export function clearAllProjects(): void {
  Object.keys(store).forEach(key => delete store[key]);
}
