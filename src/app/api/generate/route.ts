export const dynamic = "force-dynamic";
import { callLLM, streamLLM } from "@/lib/llm";
import { runDeveloperAgent } from "@/lib/agents/developer";
import { keyManager } from "@/lib/key-manager";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";
import { agentEconomy } from "@/lib/economy";
import { ADMIN_FREE_TIER } from "@/lib/admin-emails";

export const runtime = "nodejs";
// Vercel Hobby hard cap: 60s. We leave 10s headroom for DB writes.
// The manifest pipeline (chained stages) handles longer jobs — this route
// is only for quick single-component generation.
export const maxDuration = 280;

const requestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(100000, "Prompt is too long").optional(),
  imageUrl: z.string().optional(),
  stream: z.boolean().optional().default(false),
  multiFile: z.boolean().optional().default(false),
  mode: z.enum(["web-component", "web-app", "mobile-app", "vision"]).optional().default("web-app"),
  orgId: z.string().uuid().optional(),
});

const SYSTEM_PROMPT = `You are the Sovereign Forge OS Developer Agent producing production-ready Next.js 15 (App Router) code with React 19, TypeScript, and Tailwind CSS v4 with shadcn/ui aesthetic.

RULES (follow exactly, no exceptions):
1. Return ONLY valid TypeScript/TSX code — no markdown fences, no explanations, no prose.
2. Always include ALL import statements at the top (React, hooks, lucide-react icons, etc.).
3. Use "use client" directive when using hooks or browser APIs.
4. Tailwind CSS v4 for all styling — no inline styles, no CSS modules.
5. TypeScript strict — all props typed, no \`any\`.
6. Default export the main component.
7. Self-contained — no external data fetching unless explicitly requested.
8. Handle loading/error states when async operations are involved.
9. Use semantic HTML (button, nav, main, section, article, header, footer).
10. Accessible: aria-labels on icon-only buttons, proper label/input pairing.
11. Include data-testid attributes on interactive elements for QA.
12. Apply Supabase Auth by default. Implement robust error boundaries.

START IMMEDIATELY WITH: import React...`;

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
  // Admin accounts (admin_free tier) bypass credit checks entirely.
  const creditCost = multiFile ? 25 : 5;
  let isAdmin = false;
  if (orgId) {
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("credit_balance, billing_tier")
      .eq("id", orgId)
      .single();

    isAdmin = org?.billing_tier === ADMIN_FREE_TIER;

    if (!isAdmin) {
      const { data: reserved, error: reserveError } = await supabaseAdmin.rpc("reserve_credits", {
        p_org_id: orgId,
        p_amount: creditCost,
      });

      if (reserveError || !reserved) {
        const { data: freshOrg } = await supabaseAdmin
          .from("organizations")
          .select("credit_balance")
          .eq("id", orgId)
          .single();

        if (!freshOrg || Number(freshOrg.credit_balance) < creditCost) {
          return Response.json({ error: `Insufficient credits. This operation requires ${creditCost} units.` }, { status: 402 });
        }
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
        const result = await runDeveloperAgent(prompt || "", { mode: mode === "mobile-app" ? "mobile-app" : "web-app", imageUrl, orgId });
        return Response.json(result);
      }

      const result = await runDeveloperAgent(prompt || "", {
        mode: mode === "mobile-app" ? "mobile-app" : "web-app",
        imageUrl,
        orgId
      });

      // Credits already reserved atomically in STEP 0; record the charge in the ledger
      if (orgId && !isAdmin) {
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
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
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
      // Credits already reserved atomically in STEP 0; record the charge in the ledger
      if (orgId && !isAdmin) {
        agentEconomy.chargeResourceCost(orgId, "Developer", creditCost * 1000, "single-component-generation").catch(() => {});
      }
      return Response.json({ code });
    } catch (error) {
      const status = (error as { status?: number })?.status === 429 ? 429 : 502;
      return Response.json({ error: (error as Error).message }, { status });
    }
  }

  return Response.json({
    code: `"use client";\nimport React from "react";\n\nexport default function Component() {\n  return (\n    <div className="p-8 bg-gray-50 rounded-lg text-center">\n      <h2 className="text-xl font-semibold text-gray-700 mb-2">Demo Component</h2>\n      <p className="text-gray-500">Configure an AI provider to generate real components.</p>\n    </div>\n  );\n}`,
    fallback: true,
    message: "Demo component returned. Configure an AI provider (GROQ_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY, or OPENROUTER_API_KEY) for full generation.",
  });
}
