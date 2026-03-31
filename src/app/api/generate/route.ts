import { generateText, generateTextStream, OpenRouterError } from "@/lib/openrouter";
import { AppBuildAgent, AgentError } from "@/lib/agent";
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
      const agent = new AppBuildAgent();

      if (stream) {
        const encoder = new TextEncoder();

        const streamResult = new ReadableStream<Uint8Array>({
          async start(controller) {
            try {
              const result = await agent.runWithStream(prompt, (delta) => {
                const event = `data: ${JSON.stringify({ type: "chunk", delta })}\n\n`;
                controller.enqueue(encoder.encode(event));
              });
              const event = `data: ${JSON.stringify({ type: "result", result })}\n\n`;
              controller.enqueue(encoder.encode(event));
              controller.close();
            } catch (error) {
              const message = error instanceof Error ? error.message : "Generation failed";
              const event = `data: ${JSON.stringify({ type: "error", error: message })}\n\n`;
              controller.enqueue(encoder.encode(event));
              controller.close();
            }
          },
        });

        return new Response(streamResult, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        });
      }

      const result = await agent.run(prompt);
      return Response.json(result);
    }

    // Single file generation
    if (stream) {
      const encoder = new TextEncoder();

      const streamResult = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            const fullPrompt = `${SYSTEM_PROMPT}\n\nUser request: ${prompt}\n\nGenerate a complete Next.js component with Tailwind CSS:`;
            const readable = await generateTextStream(fullPrompt);
            const reader = readable.getReader();

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const delta = new TextDecoder().decode(value);
              const event = `data: ${JSON.stringify({ type: "chunk", delta })}\n\n`;
              controller.enqueue(encoder.encode(event));
            }

            controller.close();
          } catch (error) {
            const message = error instanceof Error ? error.message : "Generation failed";
            const event = `data: ${JSON.stringify({ type: "error", error: message })}\n\n`;
            controller.enqueue(encoder.encode(event));
            controller.close();
          }
        },
      });

      return new Response(streamResult, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    const code = await generateText(
      `${SYSTEM_PROMPT}\n\nUser request: ${prompt}\n\nGenerate a complete Next.js component with Tailwind CSS:`,
    );
    return Response.json({ code });
  } catch (error) {
    if (error instanceof OpenRouterError || error instanceof AgentError) {
      const status = error.status === 429 ? 429 : 502;
      return Response.json({ error: error.message }, { status });
    }
    console.error("Unexpected generation error:", error);
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}
