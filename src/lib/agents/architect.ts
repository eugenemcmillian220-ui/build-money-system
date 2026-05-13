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

const AUTOMATED_SYSTEM_PROMPT = `You are "The Advanced Architect" for Sovereign Forge OS. Plan a production-ready Next.js 15 App Router application.

Even in Automated mode, you must ensure the scaffolding is ROBUST and COMPLETE.
Target 8-15 core files that form a fully functional foundation.

Define:
1. File structure (Next.js 15 App Router paths, including layouts, loading states, and error boundaries)
2. Core logic (Server Actions, optimized state management, shared hooks)
3. Database schema (PostgreSQL/Supabase compatible, with RLS policy requirements)

Return JSON ONLY — no markdown fences:
{
  "scaffolding": { "path/file.ts": "Detailed purpose and responsibility" },
  "coreLogicPlan": "- Bullet 1\\n- Bullet 2\\n- Bullet 3",
  "fileStructure": ["src/app/page.tsx", "src/lib/db.ts"],
  "databaseRequirements": ["users(id, email, role) - RLS: user can only read own data", "projects(id, user_id, name) - RLS: owner access only"]
}`;

const GRANULAR_SYSTEM_PROMPT = `You are "The Elite Granular Architect" for Sovereign Forge OS. Produce an EXHAUSTIVE per-file blueprint for a high-scale Next.js 15 App Router application.

For EACH file, specify its exact purpose, exports, dependencies, and complexity level. Target 15-35 files for a comprehensive enterprise-grade application.

Define:
1. File structure with granular per-file specifications including Middleware and Edge Config
2. Core logic plan with detailed implementation notes per module, including caching strategies
3. Database tables with full column specs, indexes, and complex RLS relationships
4. Full dependency graph between files to ensure zero circular dependencies

Return JSON ONLY — no markdown fences:
{
  "scaffolding": { "path/file.ts": "Enterprise-grade responsibility and interface definition" },
  "coreLogicPlan": "- Module: path/file.ts → Implementation detail with caching strategy\\n- Module: path/other.ts → Complex state logic",
  "fileStructure": ["src/app/page.tsx", "src/middleware.ts", "src/lib/db.ts"],
  "databaseRequirements": ["users(id uuid PK, email text UNIQUE, role text, created_at timestamptz) - RLS: owner_id match"],
  "granularSpecs": [
    {
      "filePath": "src/app/page.tsx",
      "purpose": "Main landing page with optimized SSR and streaming components",
      "exports": ["default Page"],
      "dependencies": ["src/components/Hero.tsx", "src/lib/analytics.ts"],
      "complexity": "medium"
    }
  ]
}`;

export async function runArchitectAgent(
  prompt: string,
  strategy: string,
  builderType: "automated" | "granular" = "automated",
): Promise<ArchitectResult> {
  const systemPrompt = builderType === "granular" ? GRANULAR_SYSTEM_PROMPT : AUTOMATED_SYSTEM_PROMPT;
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
