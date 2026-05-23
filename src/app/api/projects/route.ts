export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/response";
import { listProjectsDB, saveProjectDB, isDatabaseAvailable } from "@/lib/supabase/db";
import { getAllProjects, saveProject } from "@/lib/memory";
import { Project } from "@/lib/types";
import crypto from "crypto";
import { requireAuth, isAuthError } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    let projects: Project[];
    if (isDatabaseAvailable()) {
      projects = await listProjectsDB();
    } else {
      projects = getAllProjects();
    }
    return ok({ projects });
  } catch (error) {
    console.error("Failed to list projects:", error);
    return fail("PROJECT_LIST_FAILED", "Failed to list projects", 500);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    const body = await request.json();
    const { files, description, schema, integrations } = body;

    if (!files || typeof files !== "object") {
      return fail("VALIDATION_ERROR", "files object is required", 400);
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
    return ok({ project }, 201);
  } catch (error) {
    console.error("Failed to create project:", error);
    return fail("PROJECT_CREATE_FAILED", "Failed to create project", 500);
  }
}
