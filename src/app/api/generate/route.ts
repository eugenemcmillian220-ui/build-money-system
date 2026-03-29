import { generateText, generateTextStream, OpenRouterError } from "@/lib/openrouter";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(2000, "Prompt is too long"),
  stream: z.boolean().optional().default(false),
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

  const { prompt, stream } = parsed.data;
  const fullPrompt = `${SYSTEM_PROMPT}\n\nUser request: ${prompt}\n\nGenerate a complete Next.js component with Tailwind CSS:`;

  try {
    if (stream) {
      const readable = await generateTextStream(fullPrompt);
      return new Response(readable, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const code = await generateText(fullPrompt);
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
