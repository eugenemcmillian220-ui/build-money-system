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
  return text
    .replace(/^```json\s*/g, "")
    .replace(/^```\s*/g, "")
    .replace(/\s*```$/g, "")
    .trim();
}

export function parseMultiFileJson(content: string): { files: FileMap } {
  const cleaned = cleanJson(content);

  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed.files || typeof parsed.files !== "object") {
      throw new Error("Invalid response: missing files object");
    }
    return parsed;
  } catch (e) {
    throw new LLMError(`Failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function callLLMJson<T>(
  messages: ChatMessage[],
  schema: { parse: (data: unknown) => T },
  config: Partial<AgentConfig> = {}
): Promise<T> {
  const content = await callLLM(messages, config);
  const cleaned = cleanJson(content);
  try {
    const parsed = JSON.parse(cleaned);
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
    });

    if (useCache) {
      const simpleMessages = messages.map(m => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      }));
      llmCache.set(result.model, simpleMessages, result.content);
    }

    return result.content;
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    logger.error("OpenCode Zen AI call failed", { error: detail });
    throw new LLMError(
      `OpenCode Zen AI is currently unavailable. Error: ${detail}`,
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
  });
}

/**
 * Generates embeddings using OpenCode Zen AI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  return aiEmbed(text);
}

export async function planSpec(prompt: string, context: MemoryContext[] = []): Promise<AppSpec> {
  const contextText =
    context.length > 0
      ? `\n\nRelevant context from previous projects:\n${JSON.stringify(context, null, 2)}`
      : "";

  const systemPrompt = `You are "The Architect", the Structural Planning Lead for Sovereign Forge OS (2026). Given a user request, create a detailed specification for a high-performance Next.js 15 application.${contextText}

Rules:
- Include Supabase Auth by default (login/signup pages) unless explicitly told not to.
- Use shadcn/ui and Tailwind CSS v4 design language.
- Ensure Row Level Security (RLS) is considered in the schema.
- Focus on accessibility (a11y) and responsive design.
- Keep the app focused and achievable (5-12 files max).
- Return a JSON object with this exact structure:
{
  "name": "App Name",
  "description": "Brief description",
  "features": ["auth", "dashboard", "..."],
  "pages": [{ "route": "/login", "description": "Login page", "components": ["LoginForm"] }],
  "components": [{ "name": "LoginForm", "description": "Auth form", "props": {} }],
  "integrations": ["supabase", "stripe", "..."],
  "schema": "SQL schema with RLS policies here",
  "fileStructure": ["app/layout.tsx", "app/page.tsx", "lib/supabase.ts", "..."],
  "visuals": { "theme": "dark", "primaryColor": "#f59e0b" }
}`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `User request: ${prompt}\n\nGenerate the app specification:` },
  ];

  const content = await callLLM(messages, { temperature: 0.7, maxTokens: 8192 });
  const cleaned = cleanJson(content);

  try {
    const parsed = JSON.parse(cleaned) as AppSpec;

    if (!parsed.name || !parsed.description || !Array.isArray(parsed.features)) {
      throw new LLMError("Invalid spec: missing required fields");
    }

    return parsed;
  } catch (e) {
    if (e instanceof LLMError) throw e;
    throw new LLMError(`Failed to parse spec JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
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

  const content = await callLLM(messages, { temperature: 0.7, maxTokens: 16384 });
  const parsed = parseMultiFileJson(content);
  return parsed.files;
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

  const content = await callLLM(messages, { temperature: 0.2, maxTokens: 16384 });
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

  const content = await callLLM(messages, { temperature: 0.1, maxTokens: 8192 });
  const parsed = parseMultiFileJson(content);

  return { ...allFiles, ...parsed.files };
}
