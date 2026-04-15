import { callLLMJson } from "../llm";
import { z } from "zod";

export const architectResultSchema = z.object({
  scaffolding: z.record(z.string()),
  coreLogicPlan: z.string(),
  fileStructure: z.array(z.string()),
  databaseRequirements: z.array(z.string())
});

export type ArchitectResult = z.infer<typeof architectResultSchema>;

export async function runArchitectAgent(prompt: string, strategy: string): Promise<ArchitectResult> {
  const systemPrompt = `
    You are "The Architect", the Structural Planning Lead for Sovereign Forge OS (2026).
    Your goal is to take a project intent and a strategy, then plan the complete application architecture.
    
    You must define:
    1. A detailed file structure.
    2. Core logic requirements (Server Actions, API routes, DB interactions).
    3. Database table requirements.
    
    Return JSON ONLY:
    {
      "scaffolding": { "path/to/file.ts": "Description of file purpose" },
      "coreLogicPlan": "Markdown detailed plan of how the app should work.",
      "fileStructure": ["src/app/page.tsx", "src/lib/db.ts", "..."],
      "databaseRequirements": ["Users table with credit_balance", "Projects table", "..."]
    }
  `;

  try {
    return await callLLMJson(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Intent: ${prompt}\nStrategy: ${strategy}` }
      ],
      architectResultSchema,
      { temperature: 0.2 }
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
