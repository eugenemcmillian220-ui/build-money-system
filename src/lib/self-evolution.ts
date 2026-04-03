import { Project, GenerationResult } from "./types";
import { processVisualContext } from "./vision";
import { AppBuildAgent } from "./agent";
import { saveProjectDB } from "./supabase/db";

export interface EvolutionRequest {
  projectId: string;
  screenshotUrl: string;
  userFeedback: string;
  orgId: string;
}

/**
 * Self-Evolution Engine: Rewrites applications based on visual state and user feedback
 */
export async function evolveApplication(req: EvolutionRequest): Promise<GenerationResult> {
  const { projectId, screenshotUrl, userFeedback, orgId } = req;

  // 1. Visual Diagnosis: Analyze the current UI state + feedback
  console.log(`[Evolution] Diagnosing project ${projectId} visuals...`);
  const visionAnalysis = await processVisualContext(
    screenshotUrl, 
    `User feedback: "${userFeedback}". Diagnose why the user is unhappy and plan a fix.`
  );

  // 2. Autonomous Rewrite: Generate the fixed code
  const agent = new AppBuildAgent({}, undefined, orgId);
  const result = await agent.runAdvanced(
    `Evolve the application based on this diagnosis: ${visionAnalysis.description}. User feedback: ${userFeedback}`,
    {
      initialSpec: visionAnalysis.spec,
      fixPasses: 2
    }
  );

  // 3. Persist as a new "Evolved" version
  const evolvedProject: Project = {
    ...result,
    id: `evolved-${projectId}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    metadata: {
      originalProjectId: projectId,
      evolutionReason: userFeedback,
      diagnosis: visionAnalysis.description
    }
  } as Project;

  await saveProjectDB(evolvedProject);
  return evolvedProject;
}
