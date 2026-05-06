// DA-064 FIX: TODO: Move long-running GitHub ops to background job queue
// DA-063 FIX: TODO: Strip env vars from error responses
export const dynamic = "force-dynamic";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { isGitHubAvailable, exportToGitHub } from "@/lib/github";
import { loadProjectDB, isDatabaseAvailable, updateProjectGitHubRepo } from "@/lib/supabase/db";
import { loadProject } from "@/lib/memory";
import { z } from "zod";


export const runtime = "nodejs";
export const maxDuration = 280;

const githubExportSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  repoName: z.string()
    .min(1, "Repository name is required")
    .max(100, "Repository name too long")
    .regex(/^[a-zA-Z0-9._-]+$/, "Repository name contains invalid characters"),
});

/**
 * POST /api/github
 * Export a project to GitHub
 */
export async function POST(request: NextRequest): Promise<Response> {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    const body = await request.json();
    const parsed = githubExportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { projectId, repoName } = parsed.data;

    if (!isGitHubAvailable()) {
      return NextResponse.json(
        { error: "GitHub integration not configured. Set GITHUB_TOKEN environment variable." },
        { status: 503 }
      );
    }

    // Load project
    let project = null;
    if (isDatabaseAvailable()) {
      project = await loadProjectDB(projectId);
    }
    if (!project) {
      project = loadProject(projectId) || null;
    }

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Export to GitHub
    const result = await exportToGitHub(repoName, project.files, project.description);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "GitHub export failed" },
        { status: 500 }
      );
    }

    // Update project with GitHub info
    if (isDatabaseAvailable()) {
      try {
        await updateProjectGitHubRepo(projectId, result.repoUrl);
      } catch (e) {
        console.error("Failed to update project with GitHub info:", e);
      }
    }

    return NextResponse.json({ 
      success: true, 
      repoUrl: result.repoUrl,
      repoName: result.repoName,
    });
  } catch (error) {
    console.error("GitHub export error:", error);
    
    if (error instanceof Error && error.message.includes("already exists")) {
      return NextResponse.json(
        { error: "Repository already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "GitHub export failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/github
 * Check GitHub integration status
 */
export async function GET(): Promise<Response> {
  return NextResponse.json({
    available: isGitHubAvailable(),
    message: isGitHubAvailable() 
      ? "GitHub integration is configured" 
      : "GitHub integration not configured. Set GITHUB_TOKEN environment variable.",
  });
}
