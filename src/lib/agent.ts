import { runDeveloperAgent } from "./agents/developer";
import {
  GenerationResult,
  Project,
  AgentConfig,
  defaultAgentConfig,
  AgentPhase,
  DeploymentInfo,
} from "./types";
import {
  isDatabaseAvailable,
  saveProjectDB,
  loadProjectDB,
  listProjectsDB,
  updateProjectStatus,
} from "./supabase/db";
import { saveProject, loadProject, getAllProjects } from "./memory";
import { createVercelDeploy, isVercelAvailable } from "./deploy";
import { exportToGitHub as exportToGitHubRepo, isGitHubAvailable } from "./github";

export { isDatabaseAvailable, isVercelAvailable, isGitHubAvailable, updateProjectStatus };

export class AgentError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryable: boolean = false,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = "AgentError";
  }
}

export interface AgentProgress {
  phase: AgentPhase;
  message: string;
  pass?: number;
  totalPasses?: number;
}

/**
 * Backward-compatible wrapper for the unified Developer agent
 */
export class AppBuildAgent {
  private config: AgentConfig;
  private onProgress?: (progress: AgentProgress) => void;
  private userId?: string;
  private mode: "web-app" | "mobile-app" = "web-app";

  constructor(
    config: Partial<AgentConfig> = {},
    onProgress?: (progress: AgentProgress) => void,
    userId?: string
  ) {
    this.config = { ...defaultAgentConfig, ...config };
    this.onProgress = onProgress;
    this.userId = userId;
  }

  public setMode(mode: "web-app" | "mobile-app") {
    this.mode = mode;
  }

  private reportProgress(progress: AgentProgress) {
    if (this.onProgress) this.onProgress(progress);
  }

  /**
   * Refactored to use the unified runDeveloperAgent
   */
  async runAdvanced(
    prompt: string,
    options: { fixPasses?: number; generateInfra?: boolean; infraProvider?: "aws" | "gcp" | "azure"; abTestGoal?: string } = {}
  ): Promise<GenerationResult> {
    this.reportProgress({ phase: "planning", message: "Strategic initialization..." });
    
    const result = await runDeveloperAgent(prompt, {
      mode: this.mode,
      userId: this.userId,
      fixPasses: options.fixPasses,
      generateInfra: options.generateInfra,
      infraProvider: options.infraProvider,
      abTestGoal: options.abTestGoal,
    });

    this.reportProgress({ phase: "complete", message: "Manifestation successful!" });
    return result;
  }

  async run(prompt: string): Promise<GenerationResult> {
    return this.runAdvanced(prompt);
  }

  async runWithStream(
    prompt: string,
    onChunk: (delta: string) => void,
    options: { imageUrl?: string; [key: string]: unknown } = {}
  ): Promise<GenerationResult> {
    // Note: Streaming is currently handled by direct LLM calls in Developer agent or in the route.
    // For this unified wrapper, we fall back to the standard run.
    onChunk("Connecting to neural link...");
    const res = await this.runAdvanced(prompt, options as Parameters<AppBuildAgent["runAdvanced"]>[1]);
    onChunk("\nManifestation complete.");
    return res;
  }

  async runVisual(imageUrl: string, prompt?: string): Promise<GenerationResult> {
    return runDeveloperAgent(prompt || "Vision-based generation", {
      imageUrl,
      mode: this.mode,
      userId: this.userId,
    });
  }

  async deployToVercel(projectId: string): Promise<DeploymentInfo | null> {
    if (!isVercelAvailable()) throw new AgentError("Vercel integration not configured");

    const project = await loadProjectFromStorage(projectId);
    if (!project) throw new AgentError(`Project ${projectId} not found`);

    const result = await createVercelDeploy(projectId, project.files, project.description?.slice(0, 50));
    if (!result.success || !result.deployment) throw new AgentError(result.error || "Deployment failed");

    project.deployment = result.deployment;
    await this.persistProject(project);
    return result.deployment;
  }

  async exportToGitHub(projectId: string, repoName: string): Promise<{ repoUrl: string }> {
    if (!isGitHubAvailable()) throw new AgentError("GitHub integration not configured");

    const project = await loadProjectFromStorage(projectId);
    if (!project) throw new AgentError(`Project ${projectId} not found`);

    const result = await exportToGitHubRepo(repoName, project.files, project.description);
    if (!result.success) throw new AgentError(result.error || "GitHub export failed");

    project.githubRepo = result.repoUrl;
    await this.persistProject(project);
    return { repoUrl: result.repoUrl };
  }

  private async persistProject(project: Project): Promise<void> {
    if (isDatabaseAvailable()) {
      try {
        await saveProjectDB(project);
      } catch (e) {
        console.error("[CRITICAL] Database persistence failed", e);
        saveProject(project);
      }
    } else {
      saveProject(project);
    }
  }
}

export async function loadProjectFromStorage(id: string): Promise<Project | null> {
  if (isDatabaseAvailable()) {
    try {
      return await loadProjectDB(id);
    } catch (e) {
      console.error("Database load failed", e);
    }
  }
  return loadProject(id) ?? null;
}

export async function listProjectsFromStorage(): Promise<Project[]> {
  if (isDatabaseAvailable()) {
    try {
      return await listProjectsDB();
    } catch (e) {
      console.error("Database list failed", e);
    }
  }
  return getAllProjects();
}
