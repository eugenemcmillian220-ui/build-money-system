import { NextRequest } from "next/server";
import { AppBuildAgent, AgentError } from "@/lib/agent";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/api-auth";

export const runtime = "nodejs";
export const maxDuration = 120; // Extended duration for multi-pass generation

const requestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(2000, "Prompt is too long"),
  stream: z.boolean().optional().default(false),
  fixPasses: z.number().int().min(1).max(5).optional().default(2),
});

/**
 * POST /api/generate-advanced
 * Generate a Next.js app with the advanced agent loop (plan → build → test → fix)
 */
export async function POST(request: NextRequest): Promise<Response> {
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

  const { prompt, stream, fixPasses } = parsed.data;

  try {
    const agent = new AppBuildAgent(undefined, (progress) => {
      console.log(`[Agent Progress] ${progress.phase}: ${progress.message}`);
    });

    if (stream) {
      const encoder = new TextEncoder();

      const streamResult = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            // Send progress updates as SSE
            const sendProgress = (progress: { phase: string; message: string }) => {
              const data = JSON.stringify({ type: "progress", ...progress });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            };

            const agentWithProgress = new AppBuildAgent(undefined, sendProgress);
            const result = await agentWithProgress.runAdvanced(prompt, { fixPasses });

            // Send final result
            const data = JSON.stringify({ type: "complete", result });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            controller.close();
          } catch (error) {
            console.error("Streaming error:", error);
            const errorData = JSON.stringify({ 
              type: "error", 
              error: error instanceof Error ? error.message : "Generation failed" 
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
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

    const result = await agent.runAdvanced(prompt, { fixPasses });
    return Response.json(result);
  } catch (error) {
    if (error instanceof AgentError) {
      const status = error.status === 429 ? 429 : 502;
      return Response.json({ error: error.message }, { status });
    }
    console.error("Unexpected generation error:", error);
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}
