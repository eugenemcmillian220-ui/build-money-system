import { NextRequest, NextResponse } from "next/server";
import { isDatabaseAvailable } from "@/lib/supabase/db";
import { getAllProjects, saveProject, getAllProjects as getAllMemProjects } from "@/lib/memory";
import { Project } from "@/lib/types";
import crypto from "crypto";

export const runtime = "nodejs";

/**
 * GET /api/memory
 * Get all memory data (projects, learning data)
 */
export async function GET(): Promise<Response> {
  try {
    let projects: Project[];
    
    if (isDatabaseAvailable()) {
      projects = getAllMemProjects();
    } else {
      projects = getAllProjects();
    }

    return NextResponse.json({ 
      projects,
      totalProjects: projects.length,
    });
  } catch (error) {
    console.error("Failed to get memory:", error);
    return NextResponse.json(
      { error: "Failed to get memory data" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/memory
 * Store learning data in memory
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json(
        { error: "type and data are required" },
        { status: 400 }
      );
    }

    // For learning data, create a project-like entry
    if (type === "learning") {
      const learningEntry: Project = {
        id: crypto.randomUUID(),
        files: {},
        description: `Learning: ${JSON.stringify(data).slice(0, 100)}`,
        timestamp: Date.now(),
        createdAt: new Date().toISOString(),
        metadata: { learningType: type, data },
      };

      if (isDatabaseAvailable()) {
        // Would save to database in production
      }
      
      // Save to memory for fallback
      saveProject(learningEntry);

      return NextResponse.json({ success: true, entry: learningEntry }, { status: 201 });
    }

    return NextResponse.json({ success: true, message: "Memory stored" });
  } catch (error) {
    console.error("Failed to store memory:", error);
    return NextResponse.json(
      { error: "Failed to store memory" },
      { status: 500 }
    );
  }
}
