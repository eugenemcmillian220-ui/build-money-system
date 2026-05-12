import { callLLMJson } from "../llm";
import { z } from "zod";

export const healerResultSchema = z.object({
  diagnosis: z.array(z.object({
    errorType: z.string(),
    filePath: z.string(),
    severity: z.enum(["low", "medium", "high", "critical"]),
    rootCause: z.string(),
    fix: z.string(),
  })),
  systemHealth: z.number().min(0).max(100),
  autoFixApplied: z.number(),
});

export type HealerResult = z.infer<typeof healerResultSchema>;

export async function runHealerAgent(
  files: Record<string, string>,
  errors: string[],
): Promise<HealerResult> {
  const errorText = errors.slice(0, 20).join("\n");
  const fileList = Object.entries(files)
    .slice(0, 15)
    .map(([path, content]) => `--- ${path} ---\n${content.slice(0, 500)}`)
    .join("\n\n")
    .slice(0, 5000);

  const systemPrompt = `You are "The Healer" for Sovereign Forge OS. Diagnose runtime and build errors and prescribe autonomous fixes.

Analyze the errors against the codebase and produce a diagnosis with fixes.

Return JSON ONLY:
{
  "diagnosis": [
    { "errorType": "TypeError", "filePath": "src/app/page.tsx", "severity": "high", "rootCause": "Missing null check", "fix": "Add optional chaining" }
  ],
  "systemHealth": 75,
  "autoFixApplied": 2
}`;

  try {
    return await callLLMJson(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `ERRORS:\n${errorText}\n\nFILES:\n${fileList}` },
      ],
      healerResultSchema,
      { temperature: 0.1, maxTokens: 2048 },
    );
  } catch (err) {
    console.error("Healer agent failed:", err);
    return { diagnosis: [], systemHealth: 50, autoFixApplied: 0 };
  }
}
