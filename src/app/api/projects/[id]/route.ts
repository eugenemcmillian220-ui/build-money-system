// DA-060 FIX: TODO: Use Promise.all for parallel DB + memory lookups
// DA-061 FIX: TODO: Consolidate data source (DB-only or memory-only, not both)
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { loadProjectDB, saveProjectDB, deleteProjectDB, isDatabaseAvailable } from "@/lib/supabase/db";
import { loadProject, saveProject } from "@/lib/memory";
import { Project } from "@/lib/types";
import { requireAuth, isAuthError } from "@/lib/api-auth";

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
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Failed to load project:", error);
    return NextResponse.json(
      { error: "Failed to load project" },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
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

    return NextResponse.json({ project: updatedProject });
  } catch (error) {
    console.error("Failed to update project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
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
  try {
    const { id } = await params;
    
    if (isDatabaseAvailable()) {
      await deleteProjectDB(id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
