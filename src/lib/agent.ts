import crypto from "crypto";
import {
  GenerationResult,
  Project,
  generationResultSchema,
  AgentConfig,
  defaultAgentConfig,
  validateFilePaths,
} from "./types";
import { debugFiles } from "./openrouter";
import { attachBackend } from "./backend";
import { applyIntegrations } from "./integrations";
import { saveProject } from "./memory";

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

  constructor(config: Partial<AgentConfig> = {}) {
    this.config = { ...defaultAgentConfig, ...config };
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
          files = await debugFiles(files);
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

        // Save to memory
        saveProject(result as Project);

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
      files = await debugFiles(files);
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

    // Save to memory
    saveProject(result as Project);

    return result;
  }
}

export function buildAppAgent(prompt: string): Promise<GenerationResult> {
  const agent = new AppBuildAgent();
  return agent.run(prompt);
}
