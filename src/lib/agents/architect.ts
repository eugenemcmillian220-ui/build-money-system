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
  const systemPrompt = `You are "The Architect" for Sovereign Forge OS. Plan a Next.js 15 App Router application.

Keep responses SHORT — bullet points only, no prose. Target 5-12 files max.

Define:
1. File structure (Next.js 15 App Router paths)
2. Core logic (state, Server Actions, API routes) — bullet points
3. Database tables (names + columns only, no full SQL)

Return JSON ONLY — no markdown fences:
{
  "scaffolding": { "path/file.ts": "One-line purpose" },
  "coreLogicPlan": "- Bullet 1\\n- Bullet 2\\n- Bullet 3",
  "fileStructure": ["src/app/page.tsx", "src/lib/db.ts"],
  "databaseRequirements": ["users(id, email, role)", "projects(id, user_id, name)"]
}`;

  try {
    return await callLLMJson(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Intent: ${prompt}\nStrategy: ${strategy}` }
      ],
      architectResultSchema,
      { temperature: 0.2, maxTokens: 2048, timeout: 25000 }
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
