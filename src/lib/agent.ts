import crypto from "crypto";
import {
  GenerationResult,
  Project,
  llmResponseSchema,
  AgentConfig,
  defaultAgentConfig,
  validateFilePaths,
  AgentPhase,
  DeploymentInfo,
} from "./types";
import { planSpec, buildFromSpec, fixFiles, fixBrokenFiles, testFiles, streamLLM, cleanJson } from "./llm";
import { postProcessFiles } from "./processor";
import { saveProject, loadProject, getAllProjects } from "./memory";
import {
  saveProjectDB,
  loadProjectDB,
  listProjectsDB,
  updateProjectStatus,
  isDatabaseAvailable,
} from "./supabase/db";
import { createVercelDeploy, isVercelAvailable } from "./deploy";
import { exportToGitHub as exportToGitHubRepo, isGitHubAvailable } from "./github";

export { isDatabaseAvailable, isVercelAvailable, isGitHubAvailable };

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

export class AppBuildAgent {
  private config: AgentConfig;
  private systemPrompt: string;
  private onProgress?: (progress: AgentProgress) => void;

  constructor(
    config: Partial<AgentConfig> = {},
    onProgress?: (progress: AgentProgress) => void
  ) {
    this.config = { ...defaultAgentConfig, ...config };
    this.onProgress = onProgress;
    this.systemPrompt = `You are an AI app builder. Generate a Next.js application with multiple files.
    
Return a JSON object with this exact structure:
{
  "files": {
    "app/page.tsx": "code here",
    "components/Hero.tsx": "code here",
    "app/globals.css": "css code here"
  },
  "description": "Brief description of what this app does",
  "schema": "SQL schema for Supabase if needed (optional)",
  "integrations": ["stripe", "supabase"] (optional array)
}

Rules:
- Use Next.js 15 with App Router and React 19 patterns
- Use Tailwind CSS for styling (already configured)
- Include proper TypeScript types
- Use 'use client' directive for interactive components
- Keep files modular and organized
- Return ONLY valid JSON, no markdown fences or explanations
- File paths must start with app/, components/, or lib/
- Do not use path traversal (no ../ in paths)
- Maximum 10 files per app`;
  }

  private reportProgress(progress: AgentProgress) {
    if (this.onProgress) {
      this.onProgress(progress);
    }
  }

  private async persistProject(result: GenerationResult): Promise<void> {
    const project: Project = {
      ...result,
      id: result.id ?? crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    if (isDatabaseAvailable()) {
      try {
        await saveProjectDB(project);
      } catch (e) {
        console.error("Failed to save to database, falling back to memory:", e);
        saveProject(project);
      }
    } else {
      saveProject(project);
    }
  }

  /**
   * Advanced agent loop: plan → build → test → fix
   */
  async runAdvanced(
    prompt: string,
    options: { fixPasses?: number } = {}
  ): Promise<GenerationResult> {
    const { fixPasses = 2 } = options;
    const id = crypto.randomUUID();

    this.reportProgress({
      phase: "planning",
      message: "Analyzing requirements and creating specification...",
    });

    const spec = await planSpec(prompt);
    const description = spec.description;
    const integrations = spec.integrations;

    this.reportProgress({
      phase: "building",
      message: `Building ${spec.pages.length} pages and ${spec.components.length} components...`,
    });

    let files = await buildFromSpec(spec);

    this.reportProgress({
      phase: "building",
      message: "Adding backend services and integrations...",
    });

    files = postProcessFiles(files, { description, schema: spec.schema, integrations });

    for (let pass = 1; pass <= fixPasses; pass++) {
      this.reportProgress({
        phase: pass === 1 ? "testing" : "fixing",
        message: pass === 1 ? "Running tests and validation..." : `Fixing issues (pass ${pass}/${fixPasses})...`,
        pass,
        totalPasses: fixPasses,
      });

      const testResult = await testFiles(files);

      if (testResult.success) {
        this.reportProgress({
          phase: "complete",
          message: "All tests passed!",
          pass,
          totalPasses: fixPasses,
        });
        break;
      }

      if (testResult.errors) {
        const errorText = testResult.errors.join("\n");
        // Surgical fix: only send broken files, not the whole project
        const brokenPaths = testResult.errors
          .map(e => e.split(":")[0].trim())
          .filter(p => p.endsWith(".tsx") || p.endsWith(".ts"));
        if (brokenPaths.length > 0) {
          files = await fixBrokenFiles(files, brokenPaths, testResult.errors);
        } else {
          files = await fixFiles(files, errorText);
        }
      }
    }

    const pathValidation = validateFilePaths(files);
    if (!pathValidation.success) {
      throw new AgentError(pathValidation.errors.join("; "));
    }

    const result: GenerationResult = {
      id,
      files,
      description,
      schema: spec.schema,
      integrations,
      timestamp: Date.now(),
    };

    await this.persistProject(result);

    this.reportProgress({
      phase: "complete",
      message: "Project generated successfully!",
    });

    return result;
  }

  /**
   * Original run method (backward compatible)
   */
  async run(prompt: string): Promise<GenerationResult> {
    const fullPrompt = `${this.systemPrompt}\n\nUser request: ${prompt}\n\nGenerate a complete multi-file Next.js app now:`;

    let lastError: AgentError | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const messages = [{ role: "user" as const, content: fullPrompt }];
        const chunks: string[] = [];
        for await (const delta of streamLLM(messages, this.config)) {
          chunks.push(delta);
        }
        const rawContent = chunks.join("");
        const cleaned = cleanJson(rawContent);
        const parsed = JSON.parse(cleaned);

        // Use llmResponseSchema to validate LLM output (without timestamp)
        const validation = llmResponseSchema.safeParse(parsed);
        if (!validation.success) {
          throw new AgentError(
            `Invalid response format: ${validation.error.message}`,
          );
        }

        const { description, schema, integrations } = validation.data;
        let files = validation.data.files;

        const pathValidation = validateFilePaths(files);
        if (!pathValidation.success) {
          throw new AgentError(pathValidation.errors.join("; "));
        }

        files = postProcessFiles(files, { description, schema, integrations });

        try {
          files = await fixFiles(files);
        } catch (e) {
          console.error("Debug pass failed, using original files", e);
        }

        const id = crypto.randomUUID();
        const result: GenerationResult = {
          id,
          files,
          description,
          schema,
          integrations,
          timestamp: Date.now(),
        };

        await this.persistProject(result);
        return result;
      } catch (error) {
        if (error instanceof AgentError) {
          lastError = error;
          if (!error.retryable || attempt === this.config.maxRetries) {
            throw error;
          }
        } else if (error instanceof SyntaxError) {
          throw new AgentError(`Failed to parse AI response: ${error.message}`);
        } else {
          throw new AgentError(
            `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
            undefined,
            false,
            error,
          );
        }

        const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError ?? new AgentError("Agent failed after all retries");
  }

  /**
   * Streaming run: yields only deltas to onChunk, returns post-processed result
   */
  async runWithStream(
    prompt: string,
    onChunk: (delta: string) => void,
  ): Promise<GenerationResult> {
    const fullPrompt = `${this.systemPrompt}\n\nUser request: ${prompt}\n\nGenerate a complete multi-file Next.js app now:`;
    const messages = [{ role: "user" as const, content: fullPrompt }];

    const chunks: string[] = [];
    for await (const delta of streamLLM(messages, this.config)) {
      chunks.push(delta);
      onChunk(delta);
    }

    const rawContent = chunks.join("");
    const cleaned = cleanJson(rawContent);

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      throw new AgentError(`Failed to parse AI response: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Use llmResponseSchema to validate LLM output (without timestamp)
    const validation = llmResponseSchema.safeParse(parsed);
    if (!validation.success) {
      throw new AgentError(
        `Invalid response format: ${validation.error.message}`,
      );
    }

    const { description, schema, integrations } = validation.data;
    let files = validation.data.files;

    const pathValidation = validateFilePaths(files);
    if (!pathValidation.success) {
      throw new AgentError(pathValidation.errors.join("; "));
    }

    files = postProcessFiles(files, { description, schema, integrations });

    try {
      files = await fixFiles(files);
    } catch (e) {
      console.error("Debug pass failed, using original files", e);
    }

    const id = crypto.randomUUID();
    const result: GenerationResult = {
      id,
      files,
      description,
      schema,
      integrations,
      timestamp: Date.now(),
    };

    await this.persistProject(result);
    return result;
  }

  /**
   * Deploy project to Vercel
   */
  async deployToVercel(projectId: string): Promise<DeploymentInfo | null> {
    if (!isVercelAvailable()) {
      throw new AgentError("Vercel integration not configured");
    }

    let project: Project | null = null;
    if (isDatabaseAvailable()) {
      project = await loadProjectDB(projectId);
    }
    if (!project) {
      project = loadProject(projectId) || null;
    }

    if (!project) {
      throw new AgentError(`Project ${projectId} not found`);
    }

    const result = await createVercelDeploy(
      projectId,
      project.files,
      project.description?.slice(0, 50)
    );

    if (!result.success || !result.deployment) {
      throw new AgentError(result.error || "Deployment failed");
    }

    project.deployment = result.deployment;

    if (isDatabaseAvailable()) {
      try {
        await saveProjectDB(project);
      } catch {
        saveProject(project);
      }
    } else {
      saveProject(project);
    }

    return result.deployment;
  }

  /**
   * Export project to GitHub
   */
  async exportToGitHub(
    projectId: string,
    repoName: string
  ): Promise<{ repoUrl: string }> {
    if (!isGitHubAvailable()) {
      throw new AgentError("GitHub integration not configured");
    }

    let project: Project | null = null;
    if (isDatabaseAvailable()) {
      project = await loadProjectDB(projectId);
    }
    if (!project) {
      project = loadProject(projectId) || null;
    }

    if (!project) {
      throw new AgentError(`Project ${projectId} not found`);
    }

    const result = await exportToGitHubRepo(repoName, project.files, project.description);

    if (!result.success) {
      throw new AgentError(result.error || "GitHub export failed");
    }

    project.githubRepo = result.repoUrl;

    if (isDatabaseAvailable()) {
      try {
        await saveProjectDB(project);
      } catch {
        saveProject(project);
      }
    } else {
      saveProject(project);
    }

    return { repoUrl: result.repoUrl };
  }
}

export function buildAppAgent(prompt: string): Promise<GenerationResult> {
  const agent = new AppBuildAgent();
  return agent.run(prompt);
}

/**
 * Load project from database or memory
 */
export async function loadProjectFromStorage(id: string): Promise<Project | null> {
  if (isDatabaseAvailable()) {
    try {
      return await loadProjectDB(id);
    } catch (e) {
      console.error("Failed to load from database, falling back to memory:", e);
    }
  }
  return loadProject(id) ?? null;
}

/**
 * List all projects from database or memory
 */
export async function listProjectsFromStorage(): Promise<Project[]> {
  if (isDatabaseAvailable()) {
    try {
      return await listProjectsDB();
    } catch (e) {
      console.error("Failed to list from database, falling back to memory:", e);
    }
  }
  return getAllProjects();
}

export { updateProjectStatus };
