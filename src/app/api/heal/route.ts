import { NextRequest, NextResponse } from "next/server";
import { callLLMJson } from "@/lib/llm";
import { traced } from "@/lib/telemetry";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const healResultSchema = z.object({
  diagnosis: z.string(),
  rootCause: z.string(),
  fixPatch: z.string(),
  isAutoFixable: z.boolean(),
});

/**
 * Phase 7: Self-Healing Cron - Error Diagnosis API
 */
export async function POST(request: NextRequest) {
  return traced("healing.diagnosis", { "agent.role": "Healer" }, async (span) => {
    try {
      const { errorLog, stackTrace, context } = await request.json();

      if (!errorLog) return NextResponse.json({ error: "errorLog required" }, { status: 400 });

      span.attributes["error.log"] = errorLog;

      const systemPrompt = `You are 'The Self-Healer'. Diagnose the provided error and suggest a fix.
Return JSON ONLY:
{
  "diagnosis": "What happened?",
  "rootCause": "Why did it happen?",
  "fixPatch": "Code snippet or instruction to fix.",
  "isAutoFixable": boolean
}

Error: ${errorLog}
Stack: ${stackTrace || "N/A"}
Context: ${JSON.stringify(context || {})} `;

      const result = await callLLMJson(
        [{ role: "system", content: systemPrompt }],
        healResultSchema,
        { temperature: 0.1 }
      );

      return NextResponse.json(result);

    } catch (error) {
      console.error("[Healer] Diagnosis failed:", error);
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}
