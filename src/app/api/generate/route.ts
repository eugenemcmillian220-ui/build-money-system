import { generateText, generateTextStream, generateMultiFileApp, OpenRouterError } from "@/lib/openrouter";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(2000, "Prompt is too long"),
  stream: z.boolean().optional().default(false),
  multiFile: z.boolean().optional().default(false),
});

const SYSTEM_PROMPT =
  "You are an expert React and Next.js developer. Generate clean, production-ready Next.js components using Tailwind CSS. Return only the component code without markdown fences or explanations unless asked. Use TypeScript and modern React 19 patterns.";

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

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { prompt, stream, multiFile } = parsed.data;

  try {
    if (multiFile) {
      if (stream) {
        const encoder = new TextEncoder();
        
        const streamResult = new ReadableStream<Uint8Array>({
          async start(controller) {
            const fullPrompt = `${MULTI_FILE_SYSTEM_PROMPT}\n\nUser request: ${prompt}\n\nGenerate a complete multi-file Next.js app now:`;
            
            const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
            const body = {
              model: "openai/gpt-4o-mini",
              messages: [{ role: "user", content: fullPrompt }],
              stream: true,
              temperature: 0.7,
              max_tokens: 8192,
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
              controller.error(new Error(`API error: ${response.status} - ${text}`));
              return;
            }

            if (!response.body) {
              controller.error(new Error("No response body"));
              return;
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
              controller.error(new Error("Stream read error", { cause }));
            }
          },
        });

        return new Response(streamResult, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Transfer-Encoding": "chunked",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }

      const files = await generateMultiFileApp(prompt);
      return Response.json({ files });
    }

    // Single file generation (existing behavior)
    if (stream) {
      const fullPrompt = `${SYSTEM_PROMPT}\n\nUser request: ${prompt}\n\nGenerate a complete Next.js component with Tailwind CSS:`;
      const readable = await generateTextStream(fullPrompt);
      return new Response(readable, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const code = await generateText(
      `${SYSTEM_PROMPT}\n\nUser request: ${prompt}\n\nGenerate a complete Next.js component with Tailwind CSS:`,
    );
    return Response.json({ code });
  } catch (error) {
    if (error instanceof OpenRouterError) {
      const status = error.status === 429 ? 429 : 502;
      return Response.json({ error: error.message }, { status });
    }
    console.error("Unexpected generation error:", error);
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}
