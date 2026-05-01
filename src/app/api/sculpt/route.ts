import { NextRequest, NextResponse } from "next/server";
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
        return NextResponse.json({ error: "projectId and refinementPrompt required" }, { status: 400 });
      }

      const project = await loadProjectDB(projectId);
      if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

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
      ], { temperature: 0.2, timeout: 90000 });

      const { files: updatedFiles } = parseMultiFileJson(response);

      // Merge updated files
      const mergedFiles = { ...project.files, ...updatedFiles };
      
      const updatedProject = {
        ...project,
        files: mergedFiles,
        updatedAt: new Date().toISOString()
      };

      await saveProjectDB(updatedProject);

      return NextResponse.json({ success: true, project: updatedProject });

    } catch (error) {
      console.error("[Sculptor] Refinement failed:", error);
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}
