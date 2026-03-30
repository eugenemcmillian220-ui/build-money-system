import { serverEnv } from "@/lib/env";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const MODEL = "openai/gpt-4o-mini";

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
}

function buildHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${serverEnv.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": serverEnv.NEXT_PUBLIC_SITE_URL ?? "https://localhost:3000",
    "X-Title": "AI App Builder",
  };
}

export async function generateText(prompt: string): Promise<string> {
  const body: OpenRouterRequestBody = {
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 4096,
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

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new OpenRouterError(
      `OpenRouter returned ${response.status}: ${text}`,
      response.status,
    );
  }

  const json = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const content = json.choices[0]?.message?.content;
  if (!content) {
    throw new OpenRouterError("OpenRouter returned an empty response");
  }

  return content;
}

export async function generateTextStream(prompt: string): Promise<ReadableStream<Uint8Array>> {
  const body: OpenRouterRequestBody = {
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    stream: true,
    temperature: 0.7,
    max_tokens: 4096,
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

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new OpenRouterError(
      `OpenRouter returned ${response.status}: ${text}`,
      response.status,
    );
  }

  if (!response.body) {
    throw new OpenRouterError("OpenRouter returned no response body");
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = response.body!.getReader();
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
              controller.close();
              return;
            }
            try {
              const parsed = JSON.parse(data) as {
                choices: Array<{ delta: { content?: string } }>;
              };
              const delta = parsed.choices[0]?.delta?.content;
              if (delta) {
                controller.enqueue(encoder.encode(delta));
              }
            } catch {
              // skip malformed SSE chunks
            }
          }
        }
        controller.close();
      } catch (cause) {
        controller.error(new OpenRouterError("Stream read error", undefined, cause));
      }
    },
  });

  return stream;
}

const MULTI_FILE_SYSTEM_PROMPT = `You are an AI app builder. Generate a Next.js application with multiple files.

Return a JSON object with this exact structure:
{
  "files": {
    "app/page.tsx": "code here",
    "components/Hero.tsx": "code here",
    "app/globals.css": "css code here"
  },
  "description": "Brief description of what this app does"
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

function parseMultiFileJson(content: string): Record<string, string> {
  const cleaned = content
    .replace(/^```json\n?/g, "")
    .replace(/^```\n?/g, "")
    .replace(/\n?```$/g, "")
    .trim();

  const parsed = JSON.parse(cleaned);
  if (!parsed.files || typeof parsed.files !== "object") {
    throw new OpenRouterError("Invalid multi-file response: missing files object");
  }

  return parsed.files as Record<string, string>;
}

export async function generateMultiFileApp(prompt: string): Promise<Record<string, string>> {
  const fullPrompt = `${MULTI_FILE_SYSTEM_PROMPT}\n\nUser request: ${prompt}\n\nGenerate a complete multi-file Next.js app now:`;

  const body: OpenRouterRequestBody = {
    model: MODEL,
    messages: [{ role: "user", content: fullPrompt }],
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

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new OpenRouterError(
      `OpenRouter returned ${response.status}: ${text}`,
      response.status,
    );
  }

  const json = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const content = json.choices[0]?.message?.content;
  if (!content) {
    throw new OpenRouterError("OpenRouter returned an empty response");
  }

  return parseMultiFileJson(content);
}

export async function generateMultiFileAppStream(
  prompt: string,
  onChunk: (content: string, partialFiles?: Record<string, string>) => void,
): Promise<Record<string, string>> {
  const fullPrompt = `${MULTI_FILE_SYSTEM_PROMPT}\n\nUser request: ${prompt}\n\nGenerate a complete multi-file Next.js app now:`;

  const body: OpenRouterRequestBody = {
    model: MODEL,
    messages: [{ role: "user", content: fullPrompt }],
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

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new OpenRouterError(
      `OpenRouter returned ${response.status}: ${text}`,
      response.status,
    );
  }

  if (!response.body) {
    throw new OpenRouterError("OpenRouter returned no response body");
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let accumulated = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = response.body!.getReader();
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
              controller.close();
              return;
            }
            try {
              const parsed = JSON.parse(data) as {
                choices: Array<{ delta: { content?: string } }>;
              };
              const delta = parsed.choices[0]?.delta?.content;
              if (delta) {
                accumulated += delta;
                controller.enqueue(encoder.encode(delta));

                let partialFiles: Record<string, string> | undefined;
                try {
                  partialFiles = parseMultiFileJson(accumulated);
                } catch {
                  // Not valid JSON yet, ignore
                }
                onChunk(accumulated, partialFiles);
              }
            } catch {
              // skip malformed SSE chunks
            }
          }
        }
        controller.close();
      } catch (cause) {
        controller.error(new OpenRouterError("Stream read error", undefined, cause));
      }
    },
  });

  // Wait for the stream to complete
  const reader = stream.getReader();
  try {
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }

  return parseMultiFileJson(accumulated);
}
