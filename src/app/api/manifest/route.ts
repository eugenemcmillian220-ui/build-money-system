import { NextRequest, NextResponse } from "next/server";
import { classifyIntent } from "@/lib/agents/classifier";
import { runScoutAgent } from "@/lib/agents/scout";
import { runChroniclerAgent } from "@/lib/agents/chronicler";
import { runPhantom } from "@/lib/agents/phantom";
import { runHerald } from "@/lib/agents/herald";
import { PHASE_19_SYSTEM_PROMPT } from "@/lib/prompts/phase-19";
import { Project } from "@/lib/types";
import { saveProjectDB } from "@/lib/supabase/db";
import { startSpan, traced } from "@/lib/telemetry";

export async function POST(request: NextRequest) {
  return traced("manifestationPipeline", {}, async (span) => {
    try {
      const { prompt, orgId, options } = await request.json();

      if (!prompt) {
        return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
      }

      span.attributes["project.prompt"] = prompt;
      span.attributes["project.org_id"] = orgId;

      // STEP 1: INTENT CLASSIFICATION
      const classification = await traced("agent.classifier", { "agent.role": "Classifier" }, () => classifyIntent(prompt));
      const mode = options?.mode || classification.mode;
      const protocol = options?.protocol || classification.protocol;

      span.attributes["project.mode"] = mode;
      span.attributes["project.protocol"] = protocol;

      // STEP 2: THE SCOUT
      const strategy = await traced("agent.scout", { "agent.role": "Scout" }, () => runScoutAgent(prompt, protocol));

      // STEP 3: THE DEVELOPER (Generate Files)
      const finalPrompt = `${PHASE_19_SYSTEM_PROMPT}\n\nBUILD CONTEXT:\nMode: ${mode.toUpperCase()}\nProtocol: ${protocol.toUpperCase()}\n\nSTRATEGY:\n${strategy.strategyMarkdown}\n\nUSER REQUEST: "${prompt}"`;

      const res = await traced("agent.developer", { "agent.role": "Developer" }, async () => {
        const fetchRes = await fetch(`${request.nextUrl.origin}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: finalPrompt, multiFile: true, orgId }),
        });
        if (!fetchRes.ok) throw new Error("Generation failed at Developer layer");
        return fetchRes.json();
      });

      const genData = res;
      const files = genData.result?.files;

      // STEP 4: THE CHRONICLER
      const docs = await traced("agent.chronicler", { "agent.role": "Chronicler" }, () => runChroniclerAgent(files));

      // STEP 5: THE PHANTOM
      const simulation = await traced("agent.phantom", { "agent.role": "Phantom" }, () => runPhantom({ files, id: "temp", createdAt: new Date().toISOString() } as Project));

      // STEP 6: THE HERALD
      const launch = await traced("agent.herald", { "agent.role": "Herald" }, () => runHerald({
        description: genData.result.description || prompt,
        files,
        id: "temp",
        createdAt: new Date().toISOString(),
        manifest: { strategy: strategy.strategyMarkdown, docs, mode, protocol }
      } as Project));

      // STEP 7: PERSISTENCE
      const projectData: Partial<Project> = {
        id: crypto.randomUUID(),
        files,
        description: genData.result.description || prompt,
        orgId,
        createdAt: new Date().toISOString(),
        manifest: { mode, protocol, strategy: strategy.strategyMarkdown, docs, simulation, launch },
      };

      const savedProject = await saveProjectDB(projectData as Project);

      return NextResponse.json({ success: true, project: savedProject });

    } catch (error) {
      console.error("[Phase 19] Build Failed:", error);
      span.end(error as Error);
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}
