import { NextRequest, NextResponse } from "next/server";
import { callLLMJson } from "@/lib/llm";
import { traced } from "@/lib/telemetry";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const voiceCommandSchema = z.object({
  command: z.string(),
  intent: z.enum(["manifest", "deals", "negotiate", "scout", "status", "help"]),
  params: z.record(z.any()),
  rawTranscript: z.string(),
});

/**
 * Phase 19: Voice Synthesis Command Processor
 * Translates speech transcripts into actionable Sovereign Forge commands.
 */
export async function POST(request: NextRequest) {
  return traced("voice.command", { "agent.role": "Interpreter" }, async (span) => {
    try {
      const { transcript } = await request.json();

      if (!transcript) return NextResponse.json({ error: "transcript required" }, { status: 400 });

      span.attributes["voice.transcript"] = transcript;

      const systemPrompt = `You are the 'Sovereign Interpreter'. 
Translate the user's spoken transcript into a technical command for the Forge OS.

Available Intents: manifest, deals, negotiate, scout, status, help.

Return JSON ONLY:
{
  "command": "The normalized command string (e.g. 'manifest a crypto tracker')",
  "intent": "...",
  "params": { "mode": "elite", "protocol": "saas", ... },
  "rawTranscript": "${transcript}"
}`;

      const result = await callLLMJson(
        [{ role: "system", content: systemPrompt }],
        voiceCommandSchema,
        { temperature: 0.1 }
      );

      return NextResponse.json(result);

    } catch (error) {
      console.error("[Voice] Interpretation failed:", error);
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}
