import { serverEnv } from "@/lib/env";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// Free-tier fallback chain: try the configured model first, then free alternatives
const FREE_MODEL_FALLBACK = "meta-llama/llama-3.3-70b-instruct:free";

function getModel(): string {
  return serverEnv.OPENROUTER_MODEL ?? FREE_MODEL_FALLBACK;
}

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = "OpenRouterError";
  }
}

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
  response_format?: { type: "json_object" };
}

function buildHeaders(): Record<string, string> {
  // Always read fresh — no module-level caching
  const apiKey = serverEnv.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new OpenRouterError(
      "OPENROUTER_API_KEY is not set. Add it in Vercel → Settings → Environment Variables and redeploy."
    );
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": serverEnv.NEXT_PUBLIC_SITE_URL ?? "https://localhost:3000",
    "X-Title": "AI App Builder",
  };
}

async function handleBadResponse(response: Response, label = "OpenRouter"): Promise<never> {
  const text = await response.text().catch(() => "");

  // 402 = Payment Required → key has no credits, switch model hint
  if (response.status === 402) {
    throw new OpenRouterError(
      `${label} 402: Insufficient credits on this API key. ` +
      `Either top-up your OpenRouter account or set OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free ` +
      `in Vercel env vars to use a free model. Raw: ${text}`,
      402,
    );
  }

  // 401 = bad key
  if (response.status === 401) {
    throw new OpenRouterError(
      `${label} 401: Invalid API key. Check OPENROUTER_API_KEY in Vercel environment variables.`,
      401,
    );
  }

  throw new OpenRouterError(
    `${label} returned ${response.status}: ${text}`,
    response.status,
  );
}

export async function generateText(prompt: string): Promise<string> {
  const body: OpenRouterRequestBody = {
    model: getModel(),
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 8192,
  };

  let response: Response;
  try {
    response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
  } catch (cause) {
    throw new OpenRouterError("Failed to reach OpenRouter API", undefined, cause);
  }

  if (!response.ok) await handleBadResponse(response);

  const json = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const content = json.choices[0]?.message?.content;
  if (!content) throw new OpenRouterError("OpenRouter returned an empty response");

  return content;
}

export async function generateTextStream(
  prompt: string
): Promise<ReadableStream<Uint8Array>> {
  const body: OpenRouterRequestBody = {
    model: getModel(),
    messages: [{ role: "user", content: prompt }],
    stream: true,
    temperature: 0.7,
    max_tokens: 8192,
  };

  let response: Response;
  try {
    response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
  } catch (cause) {
    throw new OpenRouterError("Failed to reach OpenRouter API", undefined, cause);
  }

  if (!response.ok) await handleBadResponse(response);
  if (!response.body) throw new OpenRouterError("OpenRouter returned no response body");

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = response.body!.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const data = trimmed.slice(6);
            if (data === "[DONE]") { controller.close(); return; }
            try {
              const parsed = JSON.parse(data) as {
                choices: Array<{ delta: { content?: string } }>;
              };
              const delta = parsed.choices[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch { /* skip malformed */ }
          }
        }
        controller.close();
      } catch (cause) {
        controller.error(new OpenRouterError("Stream read error", undefined, cause));
      }
    },
  });
}

const MULTI_FILE_SYSTEM_PROMPT = `You are an AI app builder. Generate a Next.js application with multiple files.

Return a JSON object with this exact structure:
{
  "files": {
    "app/page.tsx": "code here",
    "components/Hero.tsx": "code here",
    "app/globals.css": "css code here"
  },
  "description": "Brief description of what this app does",
  "schema": "SQL schema for Supabase if needed (optional)",
  "integrations": ["stripe", "supabase"]
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

export interface MultiFileResponse {
  files: Record<string, string>;
  description?: string;
  schema?: string;
  integrations?: string[];
}

function parseMultiFileJson(content: string): MultiFileResponse {
  const cleaned = content
    .replace(/^```json\n?/g, "")
    .replace(/^```\n?/g, "")
    .replace(/\n?```$/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed.files || typeof parsed.files !== "object") {
      throw new OpenRouterError("Invalid multi-file response: missing files object");
    }
    return parsed as MultiFileResponse;
  } catch (e) {
    if (e instanceof OpenRouterError) throw e;
    throw new OpenRouterError(
      `Failed to parse multi-file JSON: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

export async function generateMultiFileApp(prompt: string): Promise<MultiFileResponse> {
  const fullPrompt = `${MULTI_FILE_SYSTEM_PROMPT}\n\nUser request: ${prompt}\n\nGenerate a complete multi-file Next.js app now:`;

  const body: OpenRouterRequestBody = {
    model: getModel(),
    messages: [{ role: "user", content: fullPrompt }],
    temperature: 0.7,
    max_tokens: 16384,
    response_format: { type: "json_object" },
  };

  let response: Response;
  try {
    response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
  } catch (cause) {
    throw new OpenRouterError("Failed to reach OpenRouter API", undefined, cause);
  }

  if (!response.ok) await handleBadResponse(response);

  const json = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const content = json.choices[0]?.message?.content;
  if (!content) throw new OpenRouterError("OpenRouter returned an empty response");

  return parseMultiFileJson(content);
}

export async function generateMultiFileAppStream(
  prompt: string,
  onChunk: (content: string, partialFiles?: MultiFileResponse) => void,
): Promise<MultiFileResponse> {
  const fullPrompt = `${MULTI_FILE_SYSTEM_PROMPT}\n\nUser request: ${prompt}\n\nGenerate a complete multi-file Next.js app now:`;

  const body: OpenRouterRequestBody = {
    model: getModel(),
    messages: [{ role: "user", content: fullPrompt }],
    stream: true,
    temperature: 0.7,
    max_tokens: 16384,
  };

  let response: Response;
  try {
    response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
  } catch (cause) {
    throw new OpenRouterError("Failed to reach OpenRouter API", undefined, cause);
  }

  if (!response.ok) await handleBadResponse(response);
  if (!response.body) throw new OpenRouterError("OpenRouter returned no response body");

  const decoder = new TextDecoder();
  let accumulated = "";

  const reader = response.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") break;
        try {
          const parsed = JSON.parse(data) as {
            choices: Array<{ delta: { content?: string } }>;
          };
          const delta = parsed.choices[0]?.delta?.content;
          if (delta) {
            accumulated += delta;
            let partialFiles: MultiFileResponse | undefined;
            try { partialFiles = parseMultiFileJson(accumulated); } catch { /* not valid JSON yet */ }
            onChunk(accumulated, partialFiles);
          }
        } catch { /* skip malformed */ }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return parseMultiFileJson(accumulated);
}

export async function debugFiles(
  files: Record<string, string>,
  error?: string
): Promise<Record<string, string>> {
  const prompt = `You are an expert debugger. Fix any syntax or runtime issues in the following Next.js files.
${error ? `Reported error: ${error}` : "Ensure the code is modern, bug-free, and follows Next.js 15 / React 19 patterns."}

Current files:
${Object.entries(files).map(([path, content]) => `File: ${path}\n\`\`\`\n${content}\n\`\`\``).join("\n\n")}

Return ONLY the fixed files in the same JSON format:
{
  "files": {
    "path/to/file.tsx": "fixed code here"
  }
}`;

  const body: OpenRouterRequestBody = {
    model: getModel(),
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: 16384,
    response_format: { type: "json_object" },
  };

  let response: Response;
  try {
    response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
  } catch (cause) {
    throw new OpenRouterError("Failed to reach OpenRouter API", undefined, cause);
  }

  if (!response.ok) await handleBadResponse(response);

  const json = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const content = json.choices[0]?.message?.content;
  if (!content) throw new OpenRouterError("OpenRouter returned an empty response during debug");

  const parsed = parseMultiFileJson(content);
  return parsed.files;
}
