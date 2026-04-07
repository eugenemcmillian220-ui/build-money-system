import { generateText, generateTextStream, OpenRouterError } from "@/lib/openrouter";
import { AppBuildAgent, AgentError } from "@/lib/agent";
import { serverEnv } from "@/lib/env";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(2000, "Prompt is too long").optional(),
  imageUrl: z.string().optional(),
  stream: z.boolean().optional().default(false),
  multiFile: z.boolean().optional().default(false),
  mode: z.enum(["web-component", "web-app", "mobile-app", "vision"]).optional().default("web-app"),
});

const SYSTEM_PROMPT =
  "You are an expert React and Next.js developer. Generate clean, production-ready Next.js components using Tailwind CSS. Return only the component code without markdown fences or explanations unless asked. Use TypeScript and modern React 19 patterns.";

// Check if OpenRouter API is configured
function isLLMAvailable(): boolean {
  return !!serverEnv.OPENROUTER_API_KEY;
}

// Demo component for when API is not configured
const DEMO_COMPONENTS: Record<string, string> = {
  "button": `export default function Button({ children, onClick, variant = "primary" }) {
  const baseStyles = "px-4 py-2 rounded-lg font-medium transition-colors";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    danger: "bg-red-600 text-white hover:bg-red-700"
  };
  return (
    <button className={\`\${baseStyles} \${variants[variant]}\`} onClick={onClick}>
      {children}
    </button>
  );
}`,
  "card": `export default function Card({ title, children, className = "" }) {
  return (
    <div className={\`bg-white rounded-xl shadow-lg p-6 \${className}\`}>
      {title && <h2 className="text-xl font-bold mb-4">{title}</h2>}
      {children}
    </div>
  );
}`,
};

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

  const { prompt, imageUrl, stream, multiFile, mode } = parsed.data;

  // Check if OpenRouter is available
  const llmAvailable = isLLMAvailable();

  // Handle multi-file or mobile-app modes (requires LLM)
  if (multiFile || mode === "mobile-app" || mode === "vision") {
    if (!llmAvailable) {
      return Response.json({
        error: "OpenRouter API key not configured. Set OPENROUTER_API_KEY to use multi-file generation.",
        code: null,
        fallback: true
      }, { status: 503 });
    }

    const agent = new AppBuildAgent({ model: serverEnv.OPENROUTER_MODEL }, undefined);

    if (mode === "mobile-app") {
      agent.setMode("mobile-app");
    }

    if (stream) {
      const encoder = new TextEncoder();

      const streamResult = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            const result = await agent.runWithStream(prompt || "", (delta) => {
              const event = `data: ${JSON.stringify({ type: "chunk", delta })}\n\n`;
              controller.enqueue(encoder.encode(event));
            }, { imageUrl });
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

    if (mode === "vision" && imageUrl) {
      const result = await agent.runVisual(imageUrl, prompt);
      return Response.json(result);
    }

    const result = await agent.run(prompt || "");
    return Response.json(result);
  }

  // Single file generation - try LLM if available
  if (llmAvailable) {
    try {
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
    }
  }

  // Fallback: Return demo component based on prompt keywords
  const promptLower = (prompt || "").toLowerCase();
  let demoCode = null;
  
  for (const [keyword, code] of Object.entries(DEMO_COMPONENTS)) {
    if (promptLower.includes(keyword)) {
      demoCode = code;
      break;
    }
  }

  if (!demoCode) {
    // Default demo component
    demoCode = `export default function GeneratedComponent() {
  return (
    <div className="p-8 bg-gray-50 rounded-lg">
      <h1 className="text-2xl font-bold mb-4">Hello World</h1>
      <p className="text-gray-600">Generated component placeholder</p>
    </div>
  );
}`;
  }

  return Response.json({ 
    code: demoCode,
    fallback: true,
    message: "Demo component returned. Configure OPENROUTER_API_KEY for full code generation."
  });
}