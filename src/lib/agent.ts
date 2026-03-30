import crypto from "crypto";
import {
  GenerationResult,
  Project,
  generationResultSchema,
  AgentConfig,
  defaultAgentConfig,
  validateFilePaths,
  AgentPhase,
  DeploymentInfo,
} from "./types";
import { planSpec, buildFromSpec, fixFiles, testFiles } from "./llm";
import { attachBackend } from "./backend";
import { applyIntegrations } from "./integrations";
import { saveProject, loadProject, getAllProjects } from "./memory";
import { 
  saveProjectDB, 
  loadProjectDB, 
  listProjectsDB, 
  updateProjectStatus,
  isDatabaseAvailable 
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

interface AIResponse {
  model: string;
  content: string;
}

async function callAI(
  prompt: string,
  config: AgentConfig,
): Promise<AIResponse> {
  const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

  const body = {
    model: config.model,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: config.temperature,
    max_tokens: config.maxTokens,
  };

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "https://localhost:3000",
      "X-Title": "AI App Builder",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const retryable = response.status === 429 || response.status === 503;
    throw new AgentError(
      `AI API returned ${response.status}: ${text}`,
      response.status,
      retryable,
    );
  }

  const json = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
    model?: string;
  };

  const content = json.choices[0]?.message?.content;
  if (!content) {
    throw new AgentError("AI returned an empty response");
  }

  return {
    model: json.model ?? config.model,
    content,
  };
}

function parseMultiFileResponse(content: string): unknown {
  const cleaned = content
    .replace(/^```json\n?/g, "")
    .replace(/^```\n?/g, "")
    .replace(/\n?```$/g, "")
    .trim();

  return JSON.parse(cleaned);
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

  /**
   * Advanced agent loop: plan → build → test → fix
   */
  async runAdvanced(
    prompt: string,
    options: { fixPasses?: number } = {}
  ): Promise<GenerationResult> {
    const { fixPasses = 2 } = options;
    const id = crypto.randomUUID();

    // Phase 1: Planning
    this.reportProgress({
      phase: "planning",
      message: "Analyzing requirements and creating specification...",
    });

    const spec = await planSpec(prompt);
    const description = spec.description;
    const integrations = spec.integrations;

    // Phase 2: Building
    this.reportProgress({
      phase: "building",
      message: `Building ${spec.pages.length} pages and ${spec.components.length} components...`,
    });

    let files = await buildFromSpec(spec);

    // Phase 3: Apply backend and integrations
    this.reportProgress({
      phase: "building",
      message: "Adding backend services and integrations...",
    });

    files = attachBackend({ files, description, schema: spec.schema, integrations });
    files = applyIntegrations(files, integrations);

    // Phase 4: Testing and Fixing (iterative)
    for (let pass = 1; pass <= fixPasses; pass++) {
      this.reportProgress({
        phase: pass === 1 ? "testing" : "fixing",
        message: pass === 1 ? "Running tests and validation..." : `Fixing issues (pass ${pass}/${fixPasses})...`,
        pass,
        totalPasses: fixPasses,
      });

      // Test the files
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

      // Fix the files if there are errors
      if (testResult.errors && pass < fixPasses) {
        const errorText = testResult.errors.join("\n");
        files = await fixFiles(files, errorText);
      } else if (!testResult.success && pass === fixPasses) {
        // Last pass and still errors - try one more fix
        const errorText = testResult.errors?.join("\n");
        files = await fixFiles(files, errorText);
      }
    }

    // Path validation
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

    const project: Project = {
      ...result,
      id,
      createdAt: new Date().toISOString(),
    };

    // Save to database if available, otherwise use memory
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
        const response = await callAI(fullPrompt, this.config);
        const parsed = parseMultiFileResponse(response.content);

        const validation = generationResultSchema.safeParse(parsed);
        if (!validation.success) {
          throw new AgentError(
            `Invalid response format: ${validation.error.message}`,
          );
        }

        const { description, schema, integrations } = validation.data;
        let files = validation.data.files;

        // Path validation
        const pathValidation = validateFilePaths(files);
        if (!pathValidation.success) {
          throw new AgentError(pathValidation.errors.join("; "));
        }

        // Phase 3: Post-processing
        files = attachBackend({ files, description, schema, integrations });
        files = applyIntegrations(files, integrations);
        
        // Debug pass
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

        const project: Project = {
          ...result,
          id,
          createdAt: new Date().toISOString(),
        };

        // Save to database if available
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

  async runWithStream(
    prompt: string,
    onChunk: (content: string) => void,
  ): Promise<GenerationResult> {
    const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

    const body = {
      model: this.config.model,
      messages: [
        {
          role: "user",
          content: `${this.systemPrompt}\n\nUser request: ${prompt}\n\nGenerate a complete multi-file Next.js app now:`,
        },
      ],
      stream: true,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
    };

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "https://localhost:3000",
        "X-Title": "AI App Builder",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new AgentError(
        `AI API returned ${response.status}: ${text}`,
        response.status,
      );
    }

    if (!response.body) {
      throw new AgentError("No response body received");
    }

    const decoder = new TextDecoder();
    let accumulated = "";

    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") {
            break;
          }
          try {
            const parsed = JSON.parse(data) as {
              choices: Array<{ delta: { content?: string } }>;
            };
            const delta = parsed.choices[0]?.delta?.content;
            if (delta) {
              accumulated += delta;
              onChunk(accumulated);
            }
          } catch {
            // skip malformed SSE chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    const parsed = parseMultiFileResponse(accumulated);
    const validation = generationResultSchema.safeParse(parsed);

    if (!validation.success) {
      throw new AgentError(
        `Invalid response format: ${validation.error.message}`,
      );
    }

    const { description, schema, integrations } = validation.data;
    let files = validation.data.files;

    // Path validation
    const pathValidation = validateFilePaths(files);
    if (!pathValidation.success) {
      throw new AgentError(pathValidation.errors.join("; "));
    }

    // Phase 3: Post-processing
    files = attachBackend({ files, description, schema, integrations });
    files = applyIntegrations(files, integrations);
    
    // Debug pass
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

    const project: Project = {
      ...result,
      id,
      createdAt: new Date().toISOString(),
    };

    // Save to database if available
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

    return result;
  }

  /**
   * Deploy project to Vercel
   */
  async deployToVercel(projectId: string): Promise<DeploymentInfo | null> {
    if (!isVercelAvailable()) {
      throw new AgentError("Vercel integration not configured");
    }

    // Try database first, then memory
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

    // Update project with deployment info
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

    // Try database first, then memory
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

    // Update project with GitHub info
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
