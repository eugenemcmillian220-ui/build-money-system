import { serverEnv } from "@/lib/env";
import { FileMap, AppSpec, AgentConfig, defaultAgentConfig } from "./types";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterRequestBody {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

function buildHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${serverEnv.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": serverEnv.NEXT_PUBLIC_SITE_URL ?? "https://localhost:3000",
    "X-Title": "AI App Builder",
  };
}

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

async function callLLM(
  messages: ChatMessage[],
  config: Partial<AgentConfig> = {}
): Promise<string> {
  const fullConfig = { ...defaultAgentConfig, ...config };

  const body: OpenRouterRequestBody = {
    model: fullConfig.model,
    messages,
    temperature: fullConfig.temperature,
    max_tokens: fullConfig.maxTokens,
  };

  let response: Response;
  try {
    response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
  } catch (cause) {
    throw new LLMError("Failed to reach LLM API", undefined, cause);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new LLMError(
      `LLM API returned ${response.status}: ${text}`,
      response.status,
    );
  }

  const json = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const content = json.choices[0]?.message?.content;
  if (!content) {
    throw new LLMError("LLM API returned an empty response");
  }

  return content;
}

export async function* streamLLM(
  messages: ChatMessage[],
  config: Partial<AgentConfig> = {}
): AsyncIterable<string> {
  const fullConfig = { ...defaultAgentConfig, ...config };

  const body: OpenRouterRequestBody = {
    model: fullConfig.model,
    messages,
    stream: true,
    temperature: fullConfig.temperature,
    max_tokens: fullConfig.maxTokens,
  };

  let response: Response;
  try {
    response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
  } catch (cause) {
    throw new LLMError("Failed to reach LLM API", undefined, cause);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new LLMError(
      `LLM API returned ${response.status}: ${text}`,
      response.status,
    );
  }

  if (!response.body) {
    throw new LLMError("LLM API returned no response body");
  }

  const decoder = new TextDecoder();
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
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data) as {
            choices: Array<{ delta: { content?: string } }>;
          };
          const delta = parsed.choices[0]?.delta?.content;
          if (delta) {
            yield delta;
          }
        } catch {
          // skip malformed SSE chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Plan phase: Generate a structured spec from user prompt
 */
export async function planSpec(prompt: string): Promise<AppSpec> {
  const systemPrompt = `You are an expert software architect. Given a user request, create a detailed specification for a Next.js application.

Return a JSON object with this exact structure:
{
  "name": "App Name",
  "description": "Brief description of the app",
  "features": ["feature 1", "feature 2"],
  "pages": [
    {
      "route": "/",
      "description": "What this page does",
      "components": ["Hero", "Features"]
    }
  ],
  "components": [
    {
      "name": "ComponentName",
      "description": "What this component does",
      "props": { "title": "string", "count": "number" }
    }
  ],
  "integrations": ["stripe", "supabase"],
  "schema": "SQL schema if database is needed",
  "fileStructure": ["app/page.tsx", "components/Hero.tsx"]
}

Rules:
- Keep the app focused and achievable (5-10 files max)
- Use Next.js 15 App Router patterns
- Include only necessary integrations
- Return ONLY valid JSON, no markdown fences`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `User request: ${prompt}\n\nGenerate the app specification:` }
  ];

  const content = await callLLM(messages, { temperature: 0.7, maxTokens: 4096 });
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

/**
 * Build phase: Generate files from spec
 */
export async function buildFromSpec(spec: AppSpec): Promise<FileMap> {
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
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `App Specification:\n${specJson}\n\nGenerate all files:` }
  ];

  const content = await callLLM(messages, { temperature: 0.7, maxTokens: 8192 });
  const parsed = parseMultiFileJson(content);
  return parsed.files;
}

/**
 * Fix phase: Fix errors in generated files
 */
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
    { role: "user", content: `Current Files:\n${filesList}${errorContext}\n\nReturn fixed files:` }
  ];

  const content = await callLLM(messages, { temperature: 0.2, maxTokens: 8192 });
  const parsed = parseMultiFileJson(content);
  return parsed.files;
}

/**
 * Test phase: Validate files and return errors if any
 */
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
