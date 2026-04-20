// DA-068 FIX: TODO: Use structured output mode or JSON schema enforcement for LLM responses
import { keyManager } from "./key-manager";
import { llmCache } from "./llm-cache";


// DA-007 FIX: Model allowlist from env
const ALLOWED_MODELS = new Set((process.env.LLM_ALLOWED_MODELS || '').split(',').filter(Boolean));

function validateModel(model: string): boolean {
  if (ALLOWED_MODELS.size === 0) return true; // No allowlist = allow all (dev mode)
  return ALLOWED_MODELS.has(model);
}

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const FREE_MODEL_FALLBACK = "qwen/qwen3-coder-480b-a35b-instruct:free";

function getModel(): string {
  return process.env.OPENROUTER_MODEL ?? FREE_MODEL_FALLBACK;
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

// ─── Backoff helpers ────────────────────────────────────────────────────────

const BACKOFF_BASE_MS = 500;
const BACKOFF_MAX_MS = 8_000;
const MAX_RETRIES = 2;

function backoffDelay(attempt: number): number {
  const delay = Math.min(BACKOFF_BASE_MS * 2 ** attempt, BACKOFF_MAX_MS);
  return delay * (0.75 + Math.random() * 0.5);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Model fallback chain (updated April 2026) ──────────────────────────────
// gemini-2.0-flash-exp was removed from OpenRouter — replaced with:
// gemini-2.0-flash-001 (stable release) + llama-4-maverick/scout as additional fallbacks

const MODEL_FALLBACK_CHAIN = [
  "qwen/qwen3-coder-480b-a35b-instruct:free",
  "mistralai/devstral:free",
  "nvidia/llama-3.1-nemotron-ultra:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-r1:free",
  "google/gemini-2.0-flash-001:free",
];

function buildHeaders(): Record<string, string> {
  const apiKey = keyManager.getKey("openrouter");

  if (!apiKey) {
    throw new OpenRouterError(
      "No OpenRouter API key configured. Add OPENROUTER_API_KEY or OPENROUTER_API_KEYS to environment variables."
    );
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    'HTTP-Referer': (process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'),
    "X-Title": "AI App Builder",
  };
}

async function handleBadResponse(response: Response, label = "OpenRouter"): Promise<never> {
  const text = await response.text().catch(() => "");

  if (response.status === 402) {
    throw new OpenRouterError(
      `${label} 402: Insufficient credits. ` +
        `Top-up your OpenRouter account or set OPENROUTER_MODEL to a free model. Raw: ${text}`,
      402,
    );
  }

  if (response.status === 401) {
    throw new OpenRouterError(
      `${label} 401: Invalid API key. Check OPENROUTER_API_KEY in environment variables.`,
      401,
    );
  }

  throw new OpenRouterError(`${label} returned ${response.status}: ${text}`, response.status);
}

/**
 * generateText with cache + model-level failover + exponential backoff on 429s.
 */
export async function generateText(prompt: string): Promise<string> {
  const model = getModel();
  const messages: ChatMessage[] = [{ role: "user", content: prompt }];

  // ── Check cache ──
  const cached = llmCache.get(model, messages);
  if (cached) return cached;

  // ── Build fallback chain: configured model first, then the rest ──
  const models = [model, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== model)];

  let lastError: Error | null = null;

  for (const currentModel of models) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const body: OpenRouterRequestBody = {
          model: currentModel,
          messages,
          temperature: 0.7,
          max_tokens: 8192,
        };

        const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: buildHeaders(),
          body: JSON.stringify(body),
        });

        if (response.status === 429) {
          if (attempt < MAX_RETRIES) {
            const delay = backoffDelay(attempt);
            console.warn(
              `[OpenRouter] 429 on ${currentModel} — backing off ${Math.round(delay)}ms (attempt ${attempt + 1}/${MAX_RETRIES + 1})`
            );
            await sleep(delay);
            continue;
          }
          lastError = new OpenRouterError(`Rate limited on ${currentModel}`, 429);
          break; // try next model
        }

        if (!response.ok) await handleBadResponse(response, `OpenRouter/${currentModel}`);

        const json = (await response.json()) as {
          choices: Array<{ message: { content: string } }>;
        };

        const content = json.choices[0]?.message?.content;
        if (!content) throw new OpenRouterError("OpenRouter returned an empty response");

        // ── Cache & return ──
        llmCache.set(currentModel, messages, content);
        return content;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (err instanceof OpenRouterError && err.status === 429 && attempt < MAX_RETRIES) {
          await sleep(backoffDelay(attempt));
          continue;
        }
        break; // next model
      }
    }
  }

  throw lastError ?? new OpenRouterError("All OpenRouter models exhausted");
}

export async function generateTextStream(prompt: string): Promise<ReadableStream<Uint8Array>> {
  const model = getModel();
  const models = [model, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== model)];

  let lastError: Error | null = null;

  for (const currentModel of models) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const body: OpenRouterRequestBody = {
          model: currentModel,
          messages: [{ role: "user", content: prompt }],
          stream: true,
          temperature: 0.7,
          max_tokens: 8192,
        };

        const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: buildHeaders(),
          body: JSON.stringify(body),
        });

        if (response.status === 429) {
          if (attempt < MAX_RETRIES) {
            await sleep(backoffDelay(attempt));
            continue;
          }
          lastError = new OpenRouterError(`Rate limited on ${currentModel}`, 429);
          break;
        }

        if (!response.ok) await handleBadResponse(response, `OpenRouter/${currentModel}`);
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
                  if (data === "[DONE]") {
                    controller.close();
                    return;
                  }
                  try {
                    const parsed = JSON.parse(data) as {
                      choices: Array<{ delta: { content?: string } }>;
                    };
                    const delta = parsed.choices[0]?.delta?.content;
                    if (delta) controller.enqueue(encoder.encode(delta));
                  } catch {
                    // skip malformed chunks
                  }
                }
              }
              controller.close();
            } catch (cause) {
              controller.error(new OpenRouterError("Stream read error", undefined, cause));
            }
          },
        });
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < MAX_RETRIES) {
          await sleep(backoffDelay(attempt));
          continue;
        }
        break;
      }
    }
  }

  throw lastError ?? new OpenRouterError("All OpenRouter models exhausted for streaming");
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

  const model = getModel();
  const messages: ChatMessage[] = [{ role: "user", content: fullPrompt }];

  // ── Check cache ──
  const cached = llmCache.get(model, messages);
  if (cached) return parseMultiFileJson(cached);

  const content = await generateText(fullPrompt);
  return parseMultiFileJson(content);
}

export async function generateMultiFileAppStream(
  prompt: string,
  onChunk: (content: string, partialFiles?: MultiFileResponse) => void,
): Promise<MultiFileResponse> {
  const fullPrompt = `${MULTI_FILE_SYSTEM_PROMPT}\n\nUser request: ${prompt}\n\nGenerate a complete multi-file Next.js app now:`;

  const stream = await generateTextStream(fullPrompt);
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    accumulated += chunk;
    onChunk(chunk);
  }

  return parseMultiFileJson(accumulated);
}
