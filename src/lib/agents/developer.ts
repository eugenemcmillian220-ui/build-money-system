import { GenerationResult, Project, validateFilePaths, AppSpec } from "../types";
import { buildFromSpec, fixFiles, fixBrokenFiles, testFiles, planSpec } from "../llm";
import { postProcessFiles } from "../processor";
import { codeSandbox } from "../sandbox";
import { isDatabaseAvailable } from "../supabase/db";
import { memoryStore } from "../memory-store";
import { codeSearch } from "../code-search";
import { generateInfrastructure } from "../infra-generator";
import { productManager } from "../product-manager";
import { processVisualContext } from "../vision";
import { security } from "../security";
import { hiveMind } from "../hive-mind";
import crypto from "crypto";

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

export type DeveloperResult = GenerationResult;

export async function runDeveloperAgent(
  prompt: string,
  options: {
    mode?: "web-app" | "mobile-app";
    multiFile?: boolean;
    imageUrl?: string;
    orgId?: string;
    userId?: string;
    fixPasses?: number;
    generateInfra?: boolean;
    infraProvider?: "aws" | "gcp" | "azure";
    abTestGoal?: string;
    precomputedSpec?: AppSpec;
  } = {}
): Promise<DeveloperResult> {
  const {
    mode = "web-app",
    imageUrl,
    orgId,
    userId,
    fixPasses = 1,
    generateInfra = false,
    infraProvider = "aws",
    abTestGoal,
    precomputedSpec,
  } = options;

  console.log(`[Developer] Initiating ${mode} generation for: ${prompt.slice(0, 50)}...`);

  // Sanitize and check PII
  const sanitizedPrompt = security.sanitizeInput(prompt);
  security.checkPII(sanitizedPrompt);

  if (imageUrl) {
    const visionResult = await processVisualContext(imageUrl, sanitizedPrompt);
    return runDeveloperAgent(sanitizedPrompt || visionResult.description, {
      ...options,
      imageUrl: undefined, // Prevent infinite recursion
      // We could use the spec from visionResult here if we wanted to skip planning
    });
  }

  // Planning phase — skip if spec was precomputed in a prior stage
  const spec = precomputedSpec ?? await (async () => {
    const context = userId ? await memoryStore.recallContext(userId, sanitizedPrompt) : [];
    return planSpec(sanitizedPrompt, context);
  })();
  
  const description = spec.description;
  const integrations = spec.integrations;

  // Building phase
  let files = await buildFromSpec(spec);
  files = postProcessFiles(files, { description, schema: spec.schema, integrations });

  // Infrastructure generation
  if (generateInfra) {
    const infra = await generateInfrastructure(spec, infraProvider);
    files = { ...files, ...infra.files };
    files["DEPLOYMENT_INSTRUCTIONS.md"] = infra.instructions;
  }

  // Fix passes
  for (let pass = 1; pass <= fixPasses; pass++) {
    const testResult = await testFiles(files);
    if (testResult.success) break;

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

  // Sandbox Verification
  const sandboxResult = await codeSandbox.verifyProject(files);
  if (!sandboxResult.success) {
    const errors = [...sandboxResult.typeErrors, ...sandboxResult.runtimeErrors];
    const brokenPaths = errors.map(e => e.split(":")[0].trim()).filter(p => !!p);
    files = await fixBrokenFiles(files, brokenPaths.length > 0 ? brokenPaths : Object.keys(files), errors);
  }

  const pathValidation = validateFilePaths(files);
  if (!pathValidation.success) {
    throw new AgentError(pathValidation.errors.join("; "));
  }

  const result: DeveloperResult = {
    id: crypto.randomUUID(),
    files,
    description,
    prompt: sanitizedPrompt,
    schema: spec.schema,
    integrations,
    timestamp: Date.now(),
  };

  // A/B Testing variant
  if (abTestGoal) {
    const abTest = await productManager.generateVariant(result as Project, abTestGoal);
    result.abTest = {
      name: abTest.testName,
      hypothesis: abTest.hypothesis,
      variantB: abTest.variants.B
    };
  }

  // Persistence (Optional, usually handled by persist stage in job system)
  if (orgId && isDatabaseAvailable()) {
    // Note: In the job-based system, persistence is a separate stage.
    // But for direct /api/generate calls, we might still want to persist or index.
    await codeSearch.indexProject(result.id!, result.files);
    if (userId) {
      await memoryStore.remember(userId, result.prompt || "", result.integrations || [], {
        description: result.description,
        project_id: result.id
      });
    }
  }

  // Hive Mind contribution
  if (sanitizedPrompt && result.files) {
    hiveMind.extractPattern(sanitizedPrompt, result.files, "architecture")
      .then(pattern => { if (pattern) hiveMind.contribute(pattern, userId); })
      .catch(err => console.warn("[Developer] Hive Mind contribution failed:", err));
  }

  return result;
}
