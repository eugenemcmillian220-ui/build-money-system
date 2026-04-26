import { FileMap, GenerationResult, Project } from "./types";
import { fixBrokenFiles, cleanJson, callLLM } from "./llm";
import { codeSandbox } from "./sandbox";
import { saveProjectDB, loadProjectDB } from "./supabase/db";

export interface SREDiagnosis {
  error: string;
  rootCause: string;
  severity: "low" | "medium" | "high" | "critical";
  recommendation: string;
}

/**
 * Autonomous SRE Agent: Diagnoses and heals production errors
 */
export async function diagnoseAndHeal(projectId: string, errorLog: string): Promise<GenerationResult | null> {
  const project = await loadProjectDB(projectId);
  if (!project) return null;

  // 1. Diagnose the error using AI
  const diagnosis = await diagnoseError(errorLog, project.files);
  console.log(`[SRE] Diagnosis for ${projectId}:`, diagnosis);

  // 2. Attempt to fix the files in a sandbox
  const brokenPaths = extractFilePathsFromLog(errorLog, Object.keys(project.files));
  
  let healedFiles = await fixBrokenFiles(
    project.files, 
    brokenPaths.length > 0 ? brokenPaths : Object.keys(project.files), 
    [errorLog, diagnosis.recommendation]
  );

  // 3. Verify the fix in a sandbox
  const sandboxResult = await codeSandbox.verifyProject(healedFiles);
  if (!sandboxResult.success) {
    console.warn(`[SRE] Healing failed verification for ${projectId}. Retrying with sandbox errors...`);
    const errors = [...sandboxResult.typeErrors, ...sandboxResult.runtimeErrors];
    healedFiles = await fixBrokenFiles(healedFiles, Object.keys(healedFiles), errors);
  }

  // 4. Update the project in the database
  const updatedProject: Project = {
    ...project,
    files: healedFiles,
    timestamp: Date.now(),
    metadata: {
      ...project.metadata,
      lastHealedAt: new Date().toISOString(),
      lastDiagnosis: diagnosis
    }
  } as Project;

  await saveProjectDB(updatedProject);
  return updatedProject;
}

async function diagnoseError(errorLog: string, files: FileMap): Promise<SREDiagnosis> {
  const fileSummary = Object.keys(files).join(", ");
  const systemPrompt = `You are an Autonomous SRE (Site Reliability Engineer). Analyze the error log and identify the root cause within the provided Next.js 15 project structure.

Return ONLY a JSON object:
{
  "error": "Short summary of the error",
  "rootCause": "Deep technical explanation of the cause",
  "severity": "low" | "medium" | "high" | "critical",
  "recommendation": "Specific instruction for the developer agent to fix this"
}`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: `Project Files: ${fileSummary}\n\nError Log:\n${errorLog}` }
  ];

  const response = await callLLM(messages, { temperature: 0.1 });
  return JSON.parse(cleanJson(response)) as SREDiagnosis;
}

function extractFilePathsFromLog(log: string, availablePaths: string[]): string[] {
  const paths = new Set<string>();
  for (const path of availablePaths) {
    if (log.includes(path)) {
      paths.add(path);
    }
  }
  return Array.from(paths);
}
