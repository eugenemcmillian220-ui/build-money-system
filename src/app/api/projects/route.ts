export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { listProjectsDB, saveProjectDB, isDatabaseAvailable } from "@/lib/supabase/db";
import { getAllProjects, saveProject } from "@/lib/memory";
import { Project } from "@/lib/types";
import crypto from "crypto";
import { requireAuth, isAuthError } from "@/lib/api-auth";

export const runtime = "nodejs";

/**
 * GET /api/projects
 * List all projects (from database if available, otherwise memory)
 */
export async function GET(): Promise<Response> {
  try {
    let projects: Project[];
    
    if (isDatabaseAvailable()) {
      projects = await listProjectsDB();
    } else {
      projects = getAllProjects();
    }

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Failed to list projects:", error);
    return NextResponse.json(
      { error: "Failed to list projects" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 * Create a new project (manually)
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { files, description, schema, integrations } = body;

    if (!files || typeof files !== "object") {
      return NextResponse.json(
        { error: "files object is required" },
        { status: 400 }
      );
    }

    const project: Project = {
      id: crypto.randomUUID(),
      files,
      description,
      timestamp: Date.now(),
      schema,
      integrations,
      createdAt: new Date().toISOString(),
    };

    if (isDatabaseAvailable()) {
      await saveProjectDB(project);
    } else {
      saveProject(project);
    }

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("Failed to create project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
