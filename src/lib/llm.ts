import { FileMap, AppSpec, AgentConfig, defaultAgentConfig, ChatMessage } from "./types";
import { MemoryContext } from "./memory-store";
import { aiComplete, aiEmbed, aiStream } from "./ai";
import { llmCache } from "./llm-cache";
import { logger } from "./logger";

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = "LLMError";
  }
}

export function cleanJson(text: string): string {
  let s = text;
  // Strip markdown code fences
  s = s.replace(/^```[a-zA-Z]*\s*/g, "").replace(/```$/g, "");
  // Strip JS-style block and line comments (LLMs sometimes emit these)
  s = s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  // Strip trailing commas before ] or } — repeat for nested structures
  for (let i = 0; i < 5; i++) {
    const before = s;
    s = s.replace(/,([\s\n\r]*[}\]])/g, "$1");
    if (s === before) break;
  }
  // Normalize outer braces
  s = s.replace(/^\s*{\s*/, "{").replace(/\s*}\s*$/, "}");
  return s.trim();
}

/**
 * Attempts to parse JSON from a string, even if it's surrounded by noise or markdown.
 */
export function robustParseJson<T>(text: string): T {
  const cleaned = cleanJson(text);
  try {
    return JSON.parse(cleaned) as T;
  } catch (e) {
    // If standard parse fails, try to find the JSON object boundaries
    const firstOpen = text.indexOf("{");
    const lastClose = text.lastIndexOf("}");

    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
      const candidate = text.slice(firstOpen, lastClose + 1);
      try {
        const parsed = JSON.parse(candidate) as T;
        logger.warn("Robust JSON parser recovered data from noisy response", {
          originalLength: text.length,
          recoveredLength: candidate.length,
        });
        return parsed;
      } catch (innerError) {
        throw new LLMError(
          `Failed to parse JSON even with robust extraction: ${innerError instanceof Error ? innerError.message : String(innerError)}`,
          undefined,
          e
        );
      }
    }
    throw new LLMError(`Failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export function parseMultiFileJson(content: string): { files: FileMap } {
  try {
    const parsed = robustParseJson<{ files: FileMap }>(content);
    if (!parsed.files || typeof parsed.files !== "object") {
      throw new Error("Invalid response: missing files object");
    }
    return parsed;
  } catch (e) {
    throw new LLMError(`Failed to parse multi-file JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function callLLMJson<T>(
  messages: ChatMessage[],
  schema: { parse: (data: unknown) => T },
  config: Partial<AgentConfig> = {}
): Promise<T> {
  const content = await callLLM(messages, config);
  try {
    const parsed = robustParseJson<unknown>(content);
    return schema.parse(parsed);
  } catch (e) {
    logger.error("LLM JSON parse error", { error: e, rawContentPreview: content.slice(0, 200) });
    throw new LLMError(`Failed to parse LLM response as JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function callLLM(
  messages: ChatMessage[],
  config: Partial<AgentConfig> = {},
  options: { cache?: boolean; cacheTTL?: number } = {}
): Promise<string> {
  const fullConfig = { ...defaultAgentConfig, ...config };
  const useCache = options.cache !== false;

  if (useCache) {
    const cachedModel = fullConfig.model || "default";
    const simpleMessages = messages.map(m => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    }));
    const cached = llmCache.get(cachedModel, simpleMessages);
    if (cached) {
      logger.debug("LLM cache hit", { model: cachedModel });
      return cached;
    }
  }

  try {
    const result = await aiComplete({
      messages,
      model: fullConfig.model,
      temperature: fullConfig.temperature,
      maxTokens: fullConfig.maxTokens,
      timeout: fullConfig.timeout,
    });

    if (useCache) {
      const cacheKey = fullConfig.model || "default";
      const simpleMessages = messages.map(m => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      }));
      llmCache.set(cacheKey, simpleMessages, result.content);
    }

    return result.content;
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    logger.error("AI call failed", { error: detail });
    throw new LLMError(
      `AI is currently unavailable. Error: ${detail}`,
      503
    );
  }
}

export async function* streamLLM(
  messages: ChatMessage[],
  config: Partial<AgentConfig> = {}
): AsyncIterable<string> {
  const fullConfig = { ...defaultAgentConfig, ...config };
  yield* aiStream({
    messages,
    model: fullConfig.model,
    temperature: fullConfig.temperature,
    maxTokens: fullConfig.maxTokens,
    timeout: fullConfig.timeout,
  });
}

/**
 * Generates embeddings using OpenCode Zen AI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  return aiEmbed(text);
}

/**
 * Outline half of planSpec: produces the high-level app structure
 * (name, description, features, pages, integrations, visuals).
 * Smaller JSON = faster, less truncation risk.
 */
export type AppSpecOutline = Pick<AppSpec, "name" | "description" | "features" | "pages" | "integrations" | "visuals">;

// No outer retries — aiComplete already retries across providers/models.
// Retrying here doubled the wall-clock time (2 × 50s budget = 100s)
// which exceeded the Vercel Hobby 60s function limit.
const MAX_PLAN_RETRIES = 0;

export async function planSpecOutline(prompt: string, context: MemoryContext[] = []): Promise<AppSpecOutline> {
  const contextText =
    context.length > 0
      ? `\n\nRelevant context from previous projects:\n${JSON.stringify(context, null, 2)}`
      : "";

  const systemPrompt = `You are "The Architect", the Structural Planning Lead for Sovereign Forge OS (2026). Given a user request, create a detailed specification for a high-performance Next.js 15 (App Router) application with React 19.${contextText}

Rules:
- Include Supabase Auth by default (login/signup pages with email-OTP) unless explicitly told not to.
- shadcn/ui + Tailwind CSS v4. Keep app focused: 5-12 files max.
- Include data-testid attributes on interactive elements for QA.
- AI Provider: OpenCode Zen API for any LLM features.
- Keep ALL descriptions under 15 words. No component details, schema, or file paths.
- Return ONLY valid JSON — no markdown fences, no extra fields:
{"name":"App Name","description":"Brief desc","features":["auth","dashboard"],"pages":[{"route":"/login","description":"Login","components":["LoginForm"]}],"integrations":["supabase"],"visuals":{"theme":"dark","primaryColor":"#f59e0b"}}`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `User request: ${prompt}\n\nGenerate the architecture outline:` },
  ];

  let lastError: Error | null = null;
  const planStart = Date.now();

  for (let attempt = 1; attempt <= MAX_PLAN_RETRIES + 1; attempt++) {
    try {
      logger.debug("planSpecOutline attempt starting", {
        attempt,
        promptLength: prompt.length,
      });
      const content = await callLLM(messages, {
        temperature: attempt === 1 ? 0.7 : 0.4,
        maxTokens: 2048,
        timeout: 25000,
      }, { cache: false });

      const parsed = robustParseJson<AppSpecOutline>(content);

      if (!parsed.name || !parsed.description || !Array.isArray(parsed.features)) {
        throw new LLMError("Invalid outline: missing required fields (name, description, features)");
      }
      if (!Array.isArray(parsed.pages) || parsed.pages.length === 0) {
        throw new LLMError("Invalid outline: pages array is missing or empty");
      }

      logger.info("planSpecOutline succeeded", {
        attempt,
        features: parsed.features.length,
        pages: parsed.pages.length,
        durationMs: Date.now() - planStart,
      });
      return parsed;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      logger.warn("planSpecOutline attempt failed", {
        attempt,
        error: lastError.message,
        durationMs: Date.now() - planStart,
      });
    }
  }

  throw new LLMError(`planSpecOutline failed after ${MAX_PLAN_RETRIES + 1} attempts: ${lastError?.message}`);
}

/**
 * Details half of planSpec: given the outline, produces the detailed
 * components, schema, and fileStructure. Smaller, focused JSON.
 */
export type AppSpecDetails = Pick<AppSpec, "components" | "schema" | "fileStructure">;

export async function planSpecDetails(prompt: string, outline: AppSpecOutline): Promise<AppSpecDetails> {
  const outlineSummary = `${outline.name}: ${outline.features.join(", ")}. Pages: ${outline.pages.map(p => p.route).join(", ")}`;
  const systemPrompt = `You are "The Architect" for Sovereign Forge OS. Given an outline, produce implementation details.

OUTLINE: ${outlineSummary}

Rules:
- shadcn/ui + Tailwind CSS v4. Include RLS in schema. 5-12 files max.
- Keep component descriptions under 10 words. Schema as column names only, no full SQL.
- Return ONLY valid JSON — no markdown fences:
{"components":[{"name":"LoginForm","description":"Auth form","props":{}}],"schema":"users(id,email,role); projects(id,name)","fileStructure":["app/layout.tsx","app/page.tsx"]}`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `User request: ${prompt}\n\nGenerate the implementation details:` },
  ];

  let lastError: Error | null = null;
  const detailStart = Date.now();

  for (let attempt = 1; attempt <= MAX_PLAN_RETRIES + 1; attempt++) {
    try {
      logger.debug("planSpecDetails attempt starting", {
        attempt,
        outlineName: outline.name,
      });
      const content = await callLLM(messages, {
        temperature: attempt === 1 ? 0.5 : 0.3,
        maxTokens: 2048,
        timeout: 25000,
      }, { cache: false });

      const parsed = robustParseJson<AppSpecDetails>(content);

      if (!Array.isArray(parsed.components) || parsed.components.length === 0) {
        throw new LLMError("Invalid details: components array is missing or empty");
      }
      if (!Array.isArray(parsed.fileStructure) || parsed.fileStructure.length === 0) {
        throw new LLMError("Invalid details: fileStructure array is missing or empty");
      }

      logger.info("planSpecDetails succeeded", {
        attempt,
        components: parsed.components.length,
        files: parsed.fileStructure.length,
        durationMs: Date.now() - detailStart,
      });
      return parsed;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      logger.warn("planSpecDetails attempt failed", {
        attempt,
        error: lastError.message,
        durationMs: Date.now() - detailStart,
      });
    }
  }

  throw new LLMError(`planSpecDetails failed after ${MAX_PLAN_RETRIES + 1} attempts: ${lastError?.message}`);
}

/**
 * Combined planSpec: runs outline + details and merges into a full AppSpec.
 * Kept for backward compatibility with callers that need the full spec in one call.
 */
export async function planSpec(prompt: string, context: MemoryContext[] = []): Promise<AppSpec> {
  const outline = await planSpecOutline(prompt, context);
  const details = await planSpecDetails(prompt, outline);

  return {
    ...outline,
    ...details,
  };
}

export async function buildFromSpec(spec: AppSpec): Promise<FileMap> {
  const systemPrompt = `You are "The Developer", the Engineering Lead for Sovereign Forge OS (2026). Generate complete, production-ready code based on the app specification.

Rules:
- Use Next.js 15 with App Router and React 19 patterns.
- Use shadcn/ui aesthetic with Tailwind CSS v4.
- Apply the visual theme and primary color specified in the App Specification.
- Implement full-stack logic: Supabase Auth, Server Actions, and robust DB queries.
- Ensure 'use client' is used correctly and sparingly.
- Focus on clean, modular, and reusable component architecture.
- Return ONLY valid JSON in this structure: {"files": {"path": "content"}}.
- No markdown fences.`;

  const specJson = JSON.stringify(spec, null, 2);
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `App Specification:\n${specJson}\n\nGenerate all files:` },
  ];

  const MAX_BUILD_RETRIES = 1;
  let lastError: Error | null = null;
  const buildStart = Date.now();

  for (let attempt = 1; attempt <= MAX_BUILD_RETRIES + 1; attempt++) {
    try {
      logger.debug("buildFromSpec attempt starting", {
        attempt,
        maxRetries: MAX_BUILD_RETRIES,
        specName: spec.name,
        featureCount: spec.features.length,
      });
      const content = await callLLM(messages, {
        temperature: attempt === 1 ? 0.7 : 0.5,
        maxTokens: 8192,
        timeout: 25000,
      });
      const parsed = parseMultiFileJson(content);
      logger.info("buildFromSpec succeeded", {
        attempt,
        fileCount: Object.keys(parsed.files).length,
        durationMs: Date.now() - buildStart,
      });
      return parsed.files;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      logger.warn("buildFromSpec attempt failed", {
        attempt,
        error: lastError.message,
        durationMs: Date.now() - buildStart,
      });
    }
  }

  logger.error("buildFromSpec exhausted all retries, falling back to template", {
    attempts: MAX_BUILD_RETRIES + 1,
    totalMs: Date.now() - buildStart,
    lastError: lastError?.message,
  });

  const { fallbackFileMap } = await import("./template-fallback");
  return fallbackFileMap(spec);
}

export async function fixFiles(files: FileMap, error?: string): Promise<FileMap> {
  const systemPrompt = `You are an expert debugger. Fix any syntax errors, runtime issues, or React/Next.js anti-patterns in the provided files.

Return a JSON object with this structure:
{
  "files": {
    "app/page.tsx": "fixed code here",
    "components/Hero.tsx": "fixed code here"
  }
}

Rules:
- Fix TypeScript errors
- Fix React hooks usage (rules of hooks)
- Fix Next.js App Router patterns
- Ensure Tailwind classes are valid
- Add 'use client' to any component that uses React hooks but is missing it
- Return ONLY valid JSON, no markdown fences
- Preserve the original file structure`;

  const filesList = Object.entries(files)
    .map(([path, content]) => `File: ${path}\n\`\`\`tsx\n${content}\n\`\`\``)
    .join("\n\n");

  const errorContext = error ? `\n\nReported Error:\n${error}` : "";

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Current Files:\n${filesList}${errorContext}\n\nReturn fixed files:` },
  ];

  const content = await callLLM(messages, { temperature: 0.2, maxTokens: 8192, timeout: 25000 });
  const parsed = parseMultiFileJson(content);
  return parsed.files;
}

export async function testFiles(files: FileMap): Promise<{ success: boolean; errors?: string[] }> {
  const errors: string[] = [];

  for (const [path, content] of Object.entries(files)) {
    if (path.includes("..")) {
      errors.push(`Invalid path: ${path} - path traversal detected`);
    }

    if (!/\.(tsx|ts|css|json|md|sql)$/.test(path)) {
      errors.push(`Warning: ${path} has unusual extension`);
    }

    if (path.endsWith(".tsx")) {
      if (/useState|useEffect|useCallback|useMemo/.test(content)) {
        if (!content.includes('"use client"') && !content.includes("'use client'")) {
          errors.push(`${path}: Uses React hooks but missing 'use client' directive`);
        }
      }

      if (path.includes("/page.") && !content.includes("export default")) {
        errors.push(`${path}: Page file missing default export`);
      }
    }

    const openTags = (content.match(/<[A-Z][A-Za-z0-9]*[^/>]*>/g) || []).length;
    const closeTags = (content.match(/<\/[A-Z][A-Za-z0-9]*>/g) || []).length;
    const selfClosing = (content.match(/<[A-Z][A-Za-z0-9]*[^>]*\/>/g) || []).length;
    if (openTags > closeTags + selfClosing) {
      errors.push(`${path}: Possible unclosed JSX tags`);
    }
  }

  return { success: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

export async function fixBrokenFiles(
  allFiles: FileMap,
  brokenFilePaths: string[],
  errors: string[]
): Promise<FileMap> {
  const brokenFiles = Object.fromEntries(
    Object.entries(allFiles).filter(([path]) => brokenFilePaths.includes(path))
  );

  const filesList = Object.entries(brokenFiles)
    .map(([path, content]) => `File: ${path}\n\`\`\`tsx\n${content}\n\`\`\``)
    .join("\n\n");

  const errorContext = `Errors to fix:\n${errors.join("\n")}`;

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are an expert TypeScript debugger. Fix ONLY the specific errors listed. Return ONLY the fixed files as JSON:
{"files": {"path/to/file.tsx": "fixed code here"}}
Rules:
- Fix TypeScript errors precisely
- Add 'use client' where React hooks are used without it
- Do not modify files that are not broken
- Return ONLY valid JSON, no markdown fences`,
    },
    {
      role: "user",
      content: `${filesList}\n\n${errorContext}\n\nReturn fixed files as JSON:`,
    },
  ];

  const content = await callLLM(messages, { temperature: 0.1, maxTokens: 8192, timeout: 25000 });
  const parsed = parseMultiFileJson(content);

  return { ...allFiles, ...parsed.files };
}
