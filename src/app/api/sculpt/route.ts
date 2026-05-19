import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/response";
import { loadProjectDB, saveProjectDB } from "@/lib/supabase/db";
import { callLLM, parseMultiFileJson } from "@/lib/llm";
import { traced } from "@/lib/telemetry";
import { requireAuth, isAuthError } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 1: The Sculptor - Real-time AI Refinement API
 * Allows 'sculpting' an existing manifestation with specific UI or logic changes.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  return traced("sculptor.refinement", { "agent.role": "Sculptor" }, async (span) => {
    try {
      const { projectId, refinementPrompt } = await request.json();

      if (!projectId || !refinementPrompt) {
        return fail("VALIDATION_ERROR", "projectId and refinementPrompt required", 400);
      }

      const project = await loadProjectDB(projectId);
      if (!project) return fail("PROJECT_NOT_FOUND", "Project not found", 404);

      span.attributes["project.id"] = projectId;
      span.attributes["refinement.prompt"] = refinementPrompt;

      const fileList = Object.keys(project.files).join(", ");
      const systemPrompt = `You are 'The Sculptor'. Refine the existing codebase based on the user's request.
Return ONLY the updated files in JSON format: {"files": {"path": "content"}}.

Current Files: ${fileList}
Refinement Request: "${refinementPrompt}"

Maintain the existing architecture and style. Update only what is necessary.`;

      const response = await callLLM([
        { role: "system", content: systemPrompt },
        { role: "user", content: "Apply the refinement to the codebase." }
      ], { temperature: 0.2, timeout: 25000 });

      const { files: updatedFiles } = parseMultiFileJson(response);

      // Merge updated files
      const mergedFiles = { ...project.files, ...updatedFiles };
      
      const updatedProject = {
        ...project,
        files: mergedFiles,
        updatedAt: new Date().toISOString()
      };

      await saveProjectDB(updatedProject);

      return ok({ project: updatedProject });

    } catch (error) {
      console.error("[Sculptor] Refinement failed:", error);
      return fail("SCULPTOR_FAILED", (error as Error).message, 500);
    }
  });
}
