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
    1. A detailed file structure following Next.js 15 App Router best practices, including middleware, layout patterns, and server actions.
    2. Core logic requirements: Identify complex state management, Server Actions, API routes, and background workers.
    3. Database architecture: Define detailed SQL schema with RLS (Row Level Security) policies, table relationships, indexes, and triggers.
    4. Security hardening: Identify potential attack vectors (OWASP Top 10) and plan specific mitigations.
    5. Scalability: How the architecture will handle 100k+ concurrent users, including caching strategies and edge runtime optimization.
    6. Performance: Specific performance targets (LCP, FID, CLS) and how to achieve them.
    
    Return JSON ONLY:
    {
      "scaffolding": { "path/to/file.ts": "Comprehensive description of file purpose, logic, and intended exports" },
      "coreLogicPlan": "In-depth markdown plan covering data flow, auth integration, payment processing, and core business logic.",
      "fileStructure": ["src/app/page.tsx", "src/lib/db.ts", "..."],
      "databaseRequirements": ["Detailed SQL tables and RLS policies", "Relationship descriptions", "Index suggestions"]
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
