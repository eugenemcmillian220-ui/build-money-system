export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { isVercelAvailable } from "@/lib/agent";
import { loadProjectDB, isDatabaseAvailable } from "@/lib/supabase/db";
import { loadProject } from "@/lib/memory";
import { createVercelDeploy, getDeploymentStatus } from "@/lib/deploy";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/api-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const deployRequestSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
});

/**
 * POST /api/deploy
 * Deploy a project to Vercel
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = deployRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { projectId } = parsed.data;

    if (!isVercelAvailable()) {
      return NextResponse.json(
        { error: "Vercel integration not configured. Set VERCEL_TOKEN environment variable." },
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

    // Extract owner/repo from URL if it's a URL
    let githubRepo = project.githubRepo || "";
    if (githubRepo.startsWith("http")) {
      try {
        const url = new URL(githubRepo);
        githubRepo = url.pathname.slice(1); // remove leading slash
        if (githubRepo.endsWith("/")) githubRepo = githubRepo.slice(0, -1);
      } catch {
        // Fallback to raw string
      }
    }

    // Create deployment
    const result = await createVercelDeploy(
      projectId,
      project.files,
      project.name || project.description?.slice(0, 50),
      {
        GITHUB_REPO: githubRepo,
      }
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Deployment failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      deployment: result.deployment 
    });
  } catch (error) {
    console.error("Deployment error:", error);
    return NextResponse.json(
      { error: "Deployment failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/deploy?deploymentId=xxx
 * Get deployment status
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const deploymentId = searchParams.get("deploymentId");

    if (!deploymentId) {
      return NextResponse.json(
        { error: "deploymentId query parameter is required" },
        { status: 400 }
      );
    }

    if (!isVercelAvailable()) {
      return NextResponse.json(
        { error: "Vercel integration not configured" },
        { status: 503 }
      );
    }

    const deployment = await getDeploymentStatus(deploymentId);

    if (!deployment) {
      return NextResponse.json(
        { error: "Deployment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ deployment });
  } catch (error) {
    console.error("Failed to get deployment status:", error);
    return NextResponse.json(
      { error: "Failed to get deployment status" },
      { status: 500 }
    );
  }
}
