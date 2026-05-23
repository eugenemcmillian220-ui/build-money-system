// DA-060 FIX: TODO: Use Promise.all for parallel DB + memory lookups
// DA-061 FIX: TODO: Consolidate data source (DB-only or memory-only, not both)
export const dynamic = "force-dynamic";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { ok, fail } from "@/lib/api/response";
import { NextRequest } from "next/server";
import { loadProjectDB, saveProjectDB, deleteProjectDB, isDatabaseAvailable } from "@/lib/supabase/db";
import { loadProject, saveProject } from "@/lib/memory";
import { Project } from "@/lib/types";


export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/[id]
 * Get a single project
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  try {
    const { id } = await params;
    let project: Project | null = null;

    if (isDatabaseAvailable()) {
      project = await loadProjectDB(id);
    }
    
    // Fallback to memory
    if (!project) {
      project = loadProject(id) || null;
    }

    if (!project) {
      return fail("PROJECT_NOT_FOUND", "Project not found", 404);
    }

    return ok({ project });
  } catch (error) {
    console.error("Failed to load project:", error);
    return fail("PROJECT_LOAD_FAILED", "Failed to load project", 500);
  }
}

/**
 * PUT /api/projects/[id]
 * Update a project
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    const { id } = await params;
    const body = await request.json();
    const { files, description, schema, integrations, status, deployment, githubRepo } = body;

    // Load existing project
    let project: Project | null = null;
    if (isDatabaseAvailable()) {
      project = await loadProjectDB(id);
    }
    if (!project) {
      project = loadProject(id) || null;
    }

    if (!project) {
      return fail("PROJECT_NOT_FOUND", "Project not found", 404);
    }

    // Update fields
    const updatedProject: Project = {
      ...project,
      files: files || project.files,
      description: description !== undefined ? description : project.description,
      schema: schema !== undefined ? schema : project.schema,
      integrations: integrations || project.integrations,
      status: status || project.status,
      deployment: deployment || project.deployment,
      githubRepo: githubRepo !== undefined ? githubRepo : project.githubRepo,
    };

    if (isDatabaseAvailable()) {
      await saveProjectDB(updatedProject);
    } else {
      saveProject(updatedProject);
    }

    return ok({ project: updatedProject });
  } catch (error) {
    console.error("Failed to update project:", error);
    return fail("PROJECT_UPDATE_FAILED", "Failed to update project", 500);
  }
}

/**
 * DELETE /api/projects/[id]
 * Delete a project
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    const { id } = await params;
    
    if (isDatabaseAvailable()) {
      await deleteProjectDB(id);
    }

    return ok({ deleted: true });
  } catch (error) {
    console.error("Failed to delete project:", error);
    return fail("PROJECT_DELETE_FAILED", "Failed to delete project", 500);
  }
}
