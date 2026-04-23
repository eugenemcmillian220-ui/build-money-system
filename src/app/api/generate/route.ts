export const dynamic = "force-dynamic";
import { generateText, generateTextStream, OpenRouterError } from "@/lib/openrouter";
import { AppBuildAgent, AgentError } from "@/lib/agent";
import { keyManager } from "@/lib/key-manager";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { agentEconomy } from "@/lib/economy";

export const runtime = "nodejs";
export const maxDuration = 800;

const requestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(100000, "Prompt is too long").optional(),
  imageUrl: z.string().optional(),
  stream: z.boolean().optional().default(false),
  multiFile: z.boolean().optional().default(false),
  mode: z.enum(["web-component", "web-app", "mobile-app", "vision"]).optional().default("web-app"),
  orgId: z.string().uuid().optional(),
});

const SYSTEM_PROMPT =
  "You are an expert React and Next.js developer. Generate clean, production-ready Next.js components using Tailwind CSS. Return only the component code without markdown fences or explanations unless asked. Use TypeScript and modern React 19 patterns.";

function isAnyLLMAvailable(): boolean {
  return (
    keyManager.isConfigured("openrouter") ||
    keyManager.isConfigured("groq") ||
    keyManager.isConfigured("gemini") ||
    keyManager.isConfigured("openai") ||
    keyManager.isConfigured("deepseek") ||
    keyManager.isConfigured("cerebras")
  );
}

const DEMO_COMPONENTS: Record<string, string> = {
  button: `export default function Button({ children, onClick, variant = "primary" }) {
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
  card: `export default function Card({ title, children, className = "" }) {
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

  const { prompt, imageUrl, stream, multiFile, mode, orgId } = parsed.data;

  // STEP 0: CREDIT CHECK — use atomic reservation to prevent race conditions
  const creditCost = multiFile ? 25 : 5;
  if (orgId) {
    const { data: reserved, error: reserveError } = await supabaseAdmin.rpc("reserve_credits", {
      p_org_id: orgId,
      p_amount: creditCost,
    });

    if (reserveError || !reserved) {
      // Fallback: manual check if RPC not available
      const { data: org, error: orgError } = await supabaseAdmin
        .from("organizations")
        .select("credit_balance")
        .eq("id", orgId)
        .single();

      if (orgError || !org) {
        return Response.json({ error: "Organization not found" }, { status: 404 });
      }

      if (Number(org.credit_balance) < creditCost) {
        return Response.json({ error: `Insufficient credits. This operation requires ${creditCost} units.` }, { status: 402 });
      }
    }
  }

  const llmAvailable = isAnyLLMAvailable();

  if (multiFile || mode === "mobile-app" || mode === "vision") {
    if (!llmAvailable) {
      return Response.json(
        {
          error:
            "No AI provider configured. Set at least one of: OPENROUTER_API_KEY, GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY.",
          code: null,
          fallback: true,
        },
        { status: 503 },
      );
    }

    const agent = new AppBuildAgent(undefined, undefined);

    if (mode === "mobile-app") {
      agent.setMode("mobile-app");
    }

    if (stream) {
      const encoder = new TextEncoder();

      const streamResult = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            const result = await agent.runWithStream(
              prompt || "",
              (delta) => {
                const event = `data: ${JSON.stringify({ type: "chunk", delta })}\n\n`;
                controller.enqueue(encoder.encode(event));
              },
              { imageUrl },
            );
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
          Connection: "keep-alive",
        },
      });
    }

    if (mode === "vision" && imageUrl) {
      const result = await agent.runVisual(imageUrl, prompt);
      return Response.json(result);
    }

    try {
      const result = await agent.run(prompt || "");

      // CREDIT DEDUCTION + USAGE TRACKING
      if (orgId) {
        await supabaseAdmin.rpc("decrement_org_balance", { p_org_id: orgId, p_amount: creditCost });
        // Track resource cost in the economy ledger for analytics
        agentEconomy.chargeResourceCost(orgId, "Developer", creditCost * 1000, "multi-file-generation").catch(
          (err) => console.warn("[Generate] Usage tracking failed (non-blocking):", err)
        );
      }

      return Response.json(result);
    } catch (error) {
      console.error("[Generate] Multi-file generation error:", error);
      const message = error instanceof Error ? error.message : "Multi-file generation failed";
      const status = (error as { status?: number })?.status === 429 ? 429 : 502;
      return Response.json({ error: message }, { status });
    }
  }

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
            Connection: "keep-alive",
          },
        });
      }

      const code = await generateText(
        `${SYSTEM_PROMPT}\n\nUser request: ${prompt}\n\nGenerate a complete Next.js component with Tailwind CSS:`,
      );

      // CREDIT DEDUCTION + USAGE TRACKING
      if (orgId) {
        await supabaseAdmin.rpc("decrement_org_balance", { p_org_id: orgId, p_amount: creditCost });
        // Track resource cost in the economy ledger
        agentEconomy.chargeResourceCost(orgId, "Developer", creditCost * 1000, "single-component-generation").catch(
          (err) => console.warn("[Generate] Usage tracking failed (non-blocking):", err)
        );
      }

      return Response.json({ code });
    } catch (error) {
      if (error instanceof OpenRouterError || error instanceof AgentError) {
        const status = error.status === 429 ? 429 : 502;
        return Response.json({ error: error.message }, { status });
      }
    }
  }

  const promptLower = (prompt || "").toLowerCase();
  let demoCode: string | null = null;

  for (const [keyword, code] of Object.entries(DEMO_COMPONENTS)) {
    if (promptLower.includes(keyword)) {
      demoCode = code;
      break;
    }
  }

  if (!demoCode) {
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
    message:
      "Demo component returned. Configure OPENROUTER_API_KEY, GROQ_API_KEY, or GEMINI_API_KEY for full generation.",
  });
}
