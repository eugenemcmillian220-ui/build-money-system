import { callLLMJson } from "../llm";
import { z } from "zod";

export const architectResultSchema = z.object({
  scaffolding: z.record(z.string()),
  coreLogicPlan: z.string(),
  fileStructure: z.array(z.string()),
  databaseRequirements: z.array(z.string()),
  granularSpecs: z.array(z.object({
    filePath: z.string(),
    purpose: z.string(),
    exports: z.array(z.string()),
    dependencies: z.array(z.string()),
    complexity: z.enum(["low", "medium", "high"]),
  })).optional(),
});

export type ArchitectResult = z.infer<typeof architectResultSchema>;

// Lazy-load prompts to reduce bundle size at startup
async function getSystemPrompt(builderType: "automated" | "granular"): Promise<string> {
  const { AUTOMATED_SYSTEM_PROMPT, GRANULAR_SYSTEM_PROMPT } = await import("../prompts/architect.prompt");
  return builderType === "granular" ? GRANULAR_SYSTEM_PROMPT : AUTOMATED_SYSTEM_PROMPT;
}

export async function runArchitectAgent(
  prompt: string,
  strategy: string,
  builderType: "automated" | "granular" = "automated",
): Promise<ArchitectResult> {
  const systemPrompt = await getSystemPrompt(builderType);
  const maxTokens = builderType === "granular" ? 4096 : 3072;

  try {
    return await callLLMJson(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Intent: ${prompt}\nStrategy: ${strategy}` }
      ],
      architectResultSchema,
      { temperature: 0.2, maxTokens, timeout: 35000 }
    );
  } catch (err) {
    console.error("Architect parse failed, falling back to defaults.", err);
    return {
      scaffolding: { "src/app/page.tsx": "Main entry point" },
      coreLogicPlan: "Build a standard Next.js 15 application.",
      fileStructure: ["src/app/page.tsx", "src/lib/supabase.ts"],
      databaseRequirements: ["Standard Supabase Auth tables"]
    };
  }
}
