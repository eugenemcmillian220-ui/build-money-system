import { callLLMJson } from "../llm";
import { z } from "zod";

export const interpreterResultSchema = z.object({
  command: z.string(),
  parameters: z.record(z.string()),
  confidence: z.number().min(0).max(1),
  suggestedMode: z.enum(["elite", "universal", "nano"]).optional(),
  suggestedProtocol: z.string().optional(),
});

export type InterpreterResult = z.infer<typeof interpreterResultSchema>;

export async function runInterpreterAgent(naturalInput: string): Promise<InterpreterResult> {
  const systemPrompt = `You are "The Interpreter" for Sovereign Forge OS. Convert natural language or voice transcriptions into structured commands.

Parse the user's input into a structured command the system can execute.

Return JSON ONLY:
{
  "command": "manifest",
  "parameters": { "prompt": "Build a SaaS dashboard", "mode": "elite" },
  "confidence": 0.95,
  "suggestedMode": "elite",
  "suggestedProtocol": "saas"
}`;

  try {
    return await callLLMJson(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: naturalInput },
      ],
      interpreterResultSchema,
      { temperature: 0.1, maxTokens: 1024 },
    );
  } catch (err) {
    console.error("Interpreter agent failed:", err);
    return {
      command: "manifest",
      parameters: { prompt: naturalInput },
      confidence: 0.5,
    };
  }
}
