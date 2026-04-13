import { NextRequest, NextResponse } from "next/server";
import { runOverseerAgent } from "@/lib/agents/overseer";
import { Project } from "@/lib/types";
import { traced } from "@/lib/telemetry";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return traced("overseerStandalone", {}, async (span) => {
    try {
      const body = await request.json().catch(() => ({}));
      const { prompt, files, projectDescription } = body;

      if (!prompt) {
        return NextResponse.json({ error: "Prompt is required for mission command" }, { status: 400 });
      }

      span.attributes["overseer.prompt"] = prompt;

      // Simulate a project context for the Overseer
      const project: Project = {
        id: "standalone-qa-" + Date.now(),
        description: projectDescription || prompt,
        files: files || { "app/page.tsx": "// Simulated entry point" },
        createdAt: new Date().toISOString(),
        manifest: {
          mode: "elite",
          protocol: "standalone-qa",
        } as any
      };

      const result = await runOverseerAgent(project);

      return NextResponse.json(result);
    } catch (error) {
      console.error("[Overseer API] Failed:", error);
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}
