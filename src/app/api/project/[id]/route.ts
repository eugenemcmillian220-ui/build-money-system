import { NextRequest, NextResponse } from "next/server";
import { loadProjectDB, isDatabaseAvailable } from "@/lib/supabase/db";
import { loadProject } from "@/lib/memory";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/project/[id]
 * Get a single project (backward compatible endpoint)
 * 
 * @deprecated Use /api/projects/[id] instead
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  try {
    const { id } = await params;
    let project = null;

    // Try database first
    if (isDatabaseAvailable()) {
      project = await loadProjectDB(id);
    }

    // Fallback to memory
    if (!project) {
      project = loadProject(id) || null;
    }

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Failed to load project:", error);
    return NextResponse.json(
      { error: "Failed to load project" },
      { status: 500 }
    );
  }
}
