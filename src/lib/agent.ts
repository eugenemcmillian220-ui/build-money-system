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
  AppSpec,
} from "./types";
import { planSpec, buildFromSpec, fixFiles, fixBrokenFiles, testFiles, streamLLM, cleanJson } from "./llm";
import { postProcessFiles } from "./processor";
import { saveProject, loadProject, getAllProjects } from "./memory";
import { codeSandbox } from "./sandbox";
import {
  saveProjectDB,
  loadProjectDB,
  listProjectsDB,
  updateProjectStatus,
  isDatabaseAvailable,
} from "./supabase/db";
import { memoryStore } from "./memory-store";
import { codeSearch } from "./code-search";
import { createVercelDeploy, isVercelAvailable } from "./deploy";
import { exportToGitHub as exportToGitHubRepo, isGitHubAvailable } from "./github";
import { generateInfrastructure } from "./infra-generator";
import { productManager } from "./product-manager";
import { processVisualContext } from "./vision";
import { security } from "./security";

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
  private userId?: string;

  constructor(
    config: Partial<AgentConfig> = {},
    onProgress?: (progress: AgentProgress) => void,
    userId?: string
  ) {
    this.config = { ...defaultAgentConfig, ...config };
    this.onProgress = onProgress;
    this.userId = userId;
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

  public setMode(mode: "web-app" | "mobile-app") {
    if (mode === "mobile-app") {
      this.systemPrompt = `You are a React Native and Expo expert. Generate a production-ready Expo app with multiple files.
    
Return a JSON object with this exact structure:
{
  "files": {
    "app/_layout.tsx": "root layout code",
    "app/index.tsx": "home screen code",
    "components/Button.tsx": "component code"
  },
  "description": "Brief description of the mobile app",
  "integrations": ["expo-router", "nativewind"]
}

Rules:
- Use Expo Router v3 for file-based navigation
- Use NativeWind (Tailwind for React Native) for styling
- Include proper TypeScript types
- Keep components modular
- Return ONLY valid JSON, no markdown fences or explanations
- Maximum 10 files per app`;
    }
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
        // Phase 8.6: Semantic Code Indexing
        await codeSearch.indexProject(project.id, project.files);
        if (this.userId) {
          await memoryStore.remember(this.userId, project.prompt || "", project.integrations || [], {
            description: project.description,
            project_id: project.id
          });
        }
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
    options: { fixPasses?: number; initialSpec?: AppSpec; generateInfra?: boolean; infraProvider?: "aws" | "gcp" | "azure"; abTestGoal?: string } = {}
  ): Promise<GenerationResult> {
    const { fixPasses = 2, initialSpec, generateInfra = false, infraProvider = "aws", abTestGoal } = options;
    const id = crypto.randomUUID();

    // Sanitize and check PII
    const sanitizedPrompt = security.sanitizeInput(prompt);
    security.checkPII(sanitizedPrompt);

    let spec: AppSpec | null = initialSpec ?? null;
    if (!spec) {
      this.reportProgress({
        phase: "planning",
        message: "Analyzing requirements and recalling context...",
      });

      const context = this.userId ? await memoryStore.recallContext(this.userId, prompt) : [];
      spec = await planSpec(prompt, context);
    }
    
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

    // Phase 9.4: Multi-Cloud IaC Generation
    if (generateInfra) {
      this.reportProgress({
        phase: "building",
        message: `Generating ${infraProvider.toUpperCase()} Infrastructure-as-Code...`,
      });
      const infra = await generateInfrastructure(spec, infraProvider);
      files = { ...files, ...infra.files };
      files["DEPLOYMENT_INSTRUCTIONS.md"] = infra.instructions;
    }

    for (let pass = 1; pass <= fixPasses; pass++) {
      this.reportProgress({
        phase: pass === 1 ? "testing" : "fixing",
        message: pass === 1 ? "Running static tests and validation..." : `Fixing issues (pass ${pass}/${fixPasses})...`,
        pass,
        totalPasses: fixPasses,
      });

      const testResult = await testFiles(files);

      if (testResult.success) {
        break;
      }

      if (testResult.errors) {
        const errorText = testResult.errors.join("\n");
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

    // Phase 8.1: Sandbox Verification Pass
    this.reportProgress({
      phase: "testing",
      message: "Verifying code in live sandbox environment...",
    });

    const sandboxResult = await codeSandbox.verifyProject(files);
    if (!sandboxResult.success) {
      this.reportProgress({
        phase: "fixing",
        message: "Sandbox found errors. Performing final surgical repair...",
      });
      const errors = [...sandboxResult.typeErrors, ...sandboxResult.runtimeErrors];
      const brokenPaths = errors.map(e => e.split(":")[0].trim()).filter(p => !!p);
      files = await fixBrokenFiles(files, brokenPaths.length > 0 ? brokenPaths : Object.keys(files), errors);
    }

    const pathValidation = validateFilePaths(files);
    if (!pathValidation.success) {
      throw new AgentError(pathValidation.errors.join("; "));
    }

    const result: GenerationResult = {
      id,
      files,
      description,
      prompt,
      schema: spec.schema,
      integrations,
      timestamp: Date.now(),
    };

    // Phase 9.3: AI Product Manager & A/B Testing
    if (abTestGoal) {
      this.reportProgress({
        phase: "planning",
        message: `AI Product Manager generating A/B test variant for goal: ${abTestGoal}...`,
      });
      const abTest = await productManager.generateVariant(result as Project, abTestGoal);
      result.abTest = {
        name: abTest.testName,
        hypothesis: abTest.hypothesis,
        variantB: abTest.variants.B
      };
    }

    await this.persistProject(result);

    this.reportProgress({
      phase: "complete",
      message: "Project generated successfully!",
    });

    return result;
  }

  /**
   * Visual generation: analyze image → plan → build → test → fix
   */
  async runVisual(
    imageUrl: string,
    prompt?: string,
    options: { fixPasses?: number } = {}
  ): Promise<GenerationResult> {
    this.reportProgress({
      phase: "vision",
      message: "Analyzing UI design and architectural patterns...",
    });

    const visionResult = await processVisualContext(imageUrl, prompt);

    return this.runAdvanced(prompt || visionResult.description, {
      ...options,
      initialSpec: visionResult.spec,
    });
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
          prompt,
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
    options: { imageUrl?: string } = {}
  ): Promise<GenerationResult> {
    const { imageUrl } = options;
    let spec: AppSpec | null = null;
    let finalPrompt = prompt;

    if (imageUrl) {
      this.reportProgress({
        phase: "vision",
        message: "Analyzing UI design and architectural patterns...",
      });
      const visionResult = await processVisualContext(imageUrl, prompt);
      spec = visionResult.spec;
      finalPrompt = prompt || visionResult.description;
    }

    if (!spec) {
      this.reportProgress({
        phase: "planning",
        message: "Analyzing requirements and recalling context...",
      });
      const context = this.userId ? await memoryStore.recallContext(this.userId, prompt) : [];
      spec = await planSpec(finalPrompt, context);
    }

    const description = spec.description;
    const integrations = spec.integrations;

    this.reportProgress({
      phase: "building",
      message: `Building ${spec.pages.length} pages and ${spec.components.length} components...`,
    });

    const systemPrompt = `You are an expert React/Next.js developer. Generate complete, production-ready code based on the app specification.

Return a JSON object with this structure:
{
  "files": {
    "app/page.tsx": "complete code here",
    "components/Hero.tsx": "complete code here"
  }
}

Rules:
- Use Next.js 15 with App Router and React 19 patterns
- Use Tailwind CSS for all styling (already configured)
- Include 'use client' directive for interactive components
- Use TypeScript with proper types
- Make components fully functional and complete
- Return ONLY valid JSON, no markdown fences
- File paths must start with app/, components/, or lib/`;

    const specJson = JSON.stringify(spec, null, 2);
    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: `App Specification:\n${specJson}\n\nGenerate all files:` }
    ];

    const chunks: string[] = [];
    for await (const delta of streamLLM(messages, this.config)) {
      chunks.push(delta);
      onChunk(delta);
    }

    const rawContent = chunks.join("");
    const cleaned = cleanJson(rawContent);

    let parsed: { files: Record<string, string> };
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      throw new AgentError(`Failed to parse AI response: ${e instanceof Error ? e.message : String(e)}`);
    }

    let files = parsed.files;
    const pathValidation = validateFilePaths(files);
    if (!pathValidation.success) {
      throw new AgentError(pathValidation.errors.join("; "));
    }

    files = postProcessFiles(files, { description, schema: spec.schema, integrations });

    // Perform one fix pass automatically
    try {
      files = await fixFiles(files);
    } catch (e) {
      console.error("Debug pass failed", e);
    }

    const id = crypto.randomUUID();
    const result: GenerationResult = {
      id,
      files,
      description,
      prompt: finalPrompt,
      schema: spec.schema,
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
