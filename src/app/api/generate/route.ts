export const dynamic = "force-dynamic";
import { callLLM, streamLLM } from "@/lib/llm";
import { runDeveloperAgent } from "@/lib/agents/developer";
import { keyManager } from "@/lib/key-manager";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";
import { agentEconomy } from "@/lib/economy";

export const runtime = "nodejs";
export const maxDuration = 300;

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
  return keyManager.isAnyConfigured();
}

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
      const { data: org } = await supabaseAdmin
        .from("organizations")
        .select("credit_balance")
        .eq("id", orgId)
        .single();

      if (!org || Number(org.credit_balance) < creditCost) {
        return Response.json({ error: `Insufficient credits. This operation requires ${creditCost} units.` }, { status: 402 });
      }
    }
  }

  const llmAvailable = isAnyLLMAvailable();

  if (multiFile || mode === "mobile-app" || mode === "vision") {
    if (!llmAvailable) {
      return Response.json({ error: "No AI provider configured.", fallback: true }, { status: 503 });
    }

    try {
      if (stream) {
        // Fallback for streaming — direct unified agent doesn't support streaming yet
        // but we want to maintain the API contract.
        const result = await runDeveloperAgent(prompt || "", { mode: mode === "mobile-app" ? "mobile-app" : "web-app", imageUrl, orgId });
        return Response.json(result);
      }

      const result = await runDeveloperAgent(prompt || "", {
        mode: mode === "mobile-app" ? "mobile-app" : "web-app",
        imageUrl,
        orgId
      });

      if (orgId) {
        await supabaseAdmin.rpc("decrement_org_balance", { p_org_id: orgId, p_amount: creditCost });
        agentEconomy.chargeResourceCost(orgId, "Developer", creditCost * 1000, "multi-file-generation").catch(() => {});
      }

      return Response.json(result);
    } catch (error) {
      console.error("[Generate] Multi-file error:", error);
      const status = (error as { status?: number })?.status === 429 ? 429 : 502;
      return Response.json({ error: (error as Error).message }, { status });
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
              const readable = streamLLM([{ role: "user", content: fullPrompt }]);
              for await (const chunk of readable) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "chunk", delta: chunk })}\n\n`));
              }
              controller.close();
            } catch (error) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: (error as Error).message })}\n\n`));
              controller.close();
            }
          },
        });
        return new Response(streamResult, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
      }

      const code = await callLLM([{ role: "user", content: `${SYSTEM_PROMPT}\n\nUser request: ${prompt}\n\nGenerate a complete Next.js component with Tailwind CSS:` }]);
      if (orgId) {
        await supabaseAdmin.rpc("decrement_org_balance", { p_org_id: orgId, p_amount: creditCost });
        agentEconomy.chargeResourceCost(orgId, "Developer", creditCost * 1000, "single-component-generation").catch(() => {});
      }
      return Response.json({ code });
    } catch (error) {
      const status = (error as { status?: number })?.status === 429 ? 429 : 502;
      return Response.json({ error: (error as Error).message }, { status });
    }
  }

  return Response.json({
    code: `export default function Component() { return <div className="p-8 bg-gray-50 rounded-lg">Hello World</div> }`,
    fallback: true,
    message: "Demo component returned. Configure an AI provider for full generation.",
  });
}
