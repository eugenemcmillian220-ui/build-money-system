import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import { Project, FileMap, ProjectStatus, DeploymentInfo } from "@/lib/types";

// Use service role key for admin operations (server-side only)
const supabaseUrl = serverEnv.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = serverEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("Supabase service role key not configured. Database persistence will be unavailable.");
}

export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

export interface DatabaseProject {
  id: string;
  name: string;
  description: string;
  prompt?: string;
  org_id?: string;
  files: FileMap;
  schema?: string;
  integrations?: string[];
  status?: ProjectStatus;
  deployment?: DeploymentInfo;
  github_repo?: string;
  manifest?: any;
  created_at: string;
  updated_at: string;
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = "DatabaseError";
  }
}

/**
 * Check if database persistence is available
 */
export function isDatabaseAvailable(): boolean {
  return !!supabaseAdmin;
}

/**
 * Convert Project to database format
 */
function toDatabaseProject(project: Project): DatabaseProject {
  return {
    id: project.id,
    name: project.description?.split("\n")[0].slice(0, 100) || "Untitled Project",
    description: project.description || "",
    prompt: project.prompt,
    org_id: project.orgId,
    files: project.files,
    schema: project.schema,
    integrations: project.integrations,
    status: project.status,
    deployment: project.deployment,
    github_repo: project.githubRepo,
    manifest: project.manifest,
    created_at: project.createdAt,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Convert database format to Project
 */
function fromDatabaseProject(dbProject: DatabaseProject): Project {
  return {
    id: dbProject.id,
    files: dbProject.files,
    description: dbProject.description,
    prompt: dbProject.prompt,
    orgId: dbProject.org_id,
    timestamp: new Date(dbProject.created_at).getTime(),
    schema: dbProject.schema,
    integrations: dbProject.integrations,
    createdAt: dbProject.created_at,
    status: dbProject.status,
    deployment: dbProject.deployment,
    githubRepo: dbProject.github_repo,
    manifest: dbProject.manifest,
  };
}

/**
 * Save a project to the database
 */
export async function saveProjectDB(project: Project): Promise<Project> {
  if (!supabaseAdmin) {
    throw new DatabaseError("Database not configured. Set SUPABASE_SERVICE_ROLE_KEY.");
  }

  const dbProject = toDatabaseProject(project);

  const { data, error } = await supabaseAdmin
    .from("projects")
    .upsert(dbProject, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    console.error("Failed to save project:", error);
    throw new DatabaseError(`Failed to save project: ${error.message}`, error.code);
  }

  return fromDatabaseProject(data);
}

/**
 * Load a project from the database
 */
export async function loadProjectDB(id: string): Promise<Project | null> {
  if (!supabaseAdmin) {
    throw new DatabaseError("Database not configured. Set SUPABASE_SERVICE_ROLE_KEY.");
  }

  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    console.error("Failed to load project:", error);
    throw new DatabaseError(`Failed to load project: ${error.message}`, error.code);
  }

  return fromDatabaseProject(data);
}

/**
 * List all projects from the database
 */
export async function listProjectsDB(limit = 100, offset = 0): Promise<Project[]> {
  if (!supabaseAdmin) {
    throw new DatabaseError("Database not configured. Set SUPABASE_SERVICE_ROLE_KEY.");
  }

  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Failed to list projects:", error);
    throw new DatabaseError(`Failed to list projects: ${error.message}`, error.code);
  }

  return (data || []).map(fromDatabaseProject);
}

/**
 * Update project status
 */
export async function updateProjectStatus(
  id: string,
  status: ProjectStatus
): Promise<void> {
  if (!supabaseAdmin) {
    throw new DatabaseError("Database not configured. Set SUPABASE_SERVICE_ROLE_KEY.");
  }

  const { error } = await supabaseAdmin
    .from("projects")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Failed to update project status:", error);
    throw new DatabaseError(`Failed to update status: ${error.message}`, error.code);
  }
}

/**
 * Update project deployment info
 */
export async function updateProjectDeployment(
  id: string,
  deployment: DeploymentInfo
): Promise<void> {
  if (!supabaseAdmin) {
    throw new DatabaseError("Database not configured. Set SUPABASE_SERVICE_ROLE_KEY.");
  }

  const { error } = await supabaseAdmin
    .from("projects")
    .update({ deployment, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Failed to update project deployment:", error);
    throw new DatabaseError(`Failed to update deployment: ${error.message}`, error.code);
  }
}

/**
 * Update project GitHub repo
 */
export async function updateProjectGitHubRepo(
  id: string,
  githubRepo: string
): Promise<void> {
  if (!supabaseAdmin) {
    throw new DatabaseError("Database not configured. Set SUPABASE_SERVICE_ROLE_KEY.");
  }

  const { error } = await supabaseAdmin
    .from("projects")
    .update({ github_repo: githubRepo, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Failed to update project GitHub repo:", error);
    throw new DatabaseError(`Failed to update GitHub repo: ${error.message}`, error.code);
  }
}

/**
 * Delete a project from the database
 */
export async function deleteProjectDB(id: string): Promise<boolean> {
  if (!supabaseAdmin) {
    throw new DatabaseError("Database not configured. Set SUPABASE_SERVICE_ROLE_KEY.");
  }

  const { error } = await supabaseAdmin
    .from("projects")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Failed to delete project:", error);
    throw new DatabaseError(`Failed to delete project: ${error.message}`, error.code);
  }

  return true;
}

/**
 * SQL to create the projects table (run this in Supabase SQL editor)
 */
export const CREATE_PROJECTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  files JSONB NOT NULL DEFAULT '{}',
  schema TEXT,
  integrations TEXT[] DEFAULT '{}',
  status JSONB,
  deployment JSONB,
  github_repo TEXT,
  manifest JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster listing
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Enable Row Level Security (optional - customize for your auth needs)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Allow all operations (customize for your auth needs)
CREATE POLICY "Allow all" ON projects
  FOR ALL USING (true) WITH CHECK (true);
`;
