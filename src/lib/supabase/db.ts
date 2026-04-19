import "server-only"; // SECURITY FIX: Prevent client-side bundling of service role key
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import { Project, FileMap, ProjectStatus, DeploymentInfo, ProjectManifest } from "@/lib/types";

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
  manifest?: ProjectManifest;
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
 * Load a project from the database.
 * SECURITY FIX: Added optional orgId parameter to enforce tenant isolation.
 * When orgId is provided, the query filters on both id AND org_id.
 */
export async function loadProjectDB(id: string, orgId?: string): Promise<Project | null> {
  if (!supabaseAdmin) {
    throw new DatabaseError("Database not configured. Set SUPABASE_SERVICE_ROLE_KEY.");
  }

  let query = supabaseAdmin
    .from("projects")
    .select("*")
    .eq("id", id);

  // SECURITY FIX: Filter by org_id when provided to prevent cross-tenant access
  if (orgId) {
    query = query.eq("org_id", orgId);
  }

  const { data, error } = await query.single();

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
 * List projects from the database.
 * SECURITY FIX: Added optional orgId to scope listing to a single tenant.
 */
export async function listProjectsDB(limit = 100, offset = 0, orgId?: string): Promise<Project[]> {
  if (!supabaseAdmin) {
    throw new DatabaseError("Database not configured. Set SUPABASE_SERVICE_ROLE_KEY.");
  }

  // SECURITY FIX: Guard against invalid limit values
  const safeLimit = Math.max(1, limit);

  let query = supabaseAdmin
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + safeLimit - 1);

  if (orgId) {
    query = query.eq("org_id", orgId);
  }

  const { data, error } = await query;

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
 *
 * SECURITY FIX: Replaced "Allow all" policy with proper org-based RLS policies.
 * These require the user's JWT to contain an org_id claim or use auth.uid().
 */
export const CREATE_PROJECTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  org_id UUID REFERENCES organizations(id),
  files JSONB NOT NULL DEFAULT '{}'::jsonb,
  schema TEXT,
  integrations TEXT[] DEFAULT \'{}\',
  status JSONB,
  deployment JSONB,
  github_repo TEXT,
  manifest JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster listing by org
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON projects(org_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop the old "Allow all" policy if it exists
DROP POLICY IF EXISTS "Allow all" ON projects;

-- Proper RLS: Users can only access projects belonging to their organization
CREATE POLICY "Users can view own org projects" ON projects
  FOR SELECT USING (
    org_id IN (
      SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own org projects" ON projects
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own org projects" ON projects
  FOR UPDATE USING (
    org_id IN (
      SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own org projects" ON projects
  FOR DELETE USING (
    org_id IN (
      SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid()
    )
  );
`;
