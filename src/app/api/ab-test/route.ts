export const dynamic = "force-dynamic";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { productManager } from "@/lib/product-manager";
import { loadProjectFromStorage } from "@/lib/agent";
import { saveProjectDB } from "@/lib/supabase/db";
import { Project } from "@/lib/types";
import { z } from "zod";


export const runtime = "nodejs";

const requestSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  goal: z.string().min(1, "Goal is required"),
});

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { projectId, goal } = parsed.data;

  try {
    const project = await loadProjectFromStorage(projectId);
    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const abTest = await productManager.generateVariant(project as Project, goal);
    
    // Save Variant B as a new project or update existing with metadata
    const updatedProject: Project = {
      ...project,
      abTest: {
        name: abTest.testName,
        hypothesis: abTest.hypothesis,
        variantB: abTest.variants.B
      }
    } as Project;

    await saveProjectDB(updatedProject);

    return Response.json({
      success: true,
      testName: abTest.testName,
      hypothesis: abTest.hypothesis,
      projectId: updatedProject.id
    });
  } catch (error) {
    console.error("A/B Test generation error:", error);
    return Response.json({ error: "A/B Test generation failed" }, { status: 500 });
  }
}
