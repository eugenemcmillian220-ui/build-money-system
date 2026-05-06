export const dynamic = "force-dynamic";
import { auditProject } from "@/lib/compliance";
import { loadProjectFromStorage } from "@/lib/agent";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/api-auth";

export const runtime = "nodejs";

const requestSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
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

  const { projectId } = parsed.data;

  try {
    const project = await loadProjectFromStorage(projectId);
    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const report = await auditProject(projectId, project.files);
    return Response.json(report);
  } catch (error) {
    console.error("Compliance audit error:", error);
    return Response.json({ error: "Compliance audit failed" }, { status: 500 });
  }
}
