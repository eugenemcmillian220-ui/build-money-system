import { callLLMJson } from "../llm";
import { z } from "zod";

export const architectResultSchema = z.object({
  scaffolding: z.record(z.string()),
  coreLogicPlan: z.string(),
  fileStructure: z.array(z.string()),
  databaseRequirements: z.array(z.string()),
  apiEndpoints: z.array(z.object({
    route: z.string(),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    purpose: z.string(),
  })).optional(),
  middlewareRequirements: z.array(z.string()).optional(),
  granularSpecs: z.array(z.object({
    filePath: z.string(),
    purpose: z.string(),
    exports: z.array(z.string()),
    dependencies: z.array(z.string()),
    complexity: z.enum(["low", "medium", "high"]),
  })).optional(),
});

export type ArchitectResult = z.infer<typeof architectResultSchema>;

const MODE_CONTEXT: Record<string, string> = {
  elite: `Mode: ELITE — full production stack. Include:
- RLS policies on every table, auth middleware, RBAC helpers
- Error boundaries, loading states, Suspense wrappers
- API rate-limiting middleware, input validation (zod)
- Comprehensive data-testid attributes for QA
- Server Actions for mutations, optimistic updates`,
  universal: `Mode: UNIVERSAL — standard production app. Include:
- Supabase Auth with email-OTP, basic RLS
- Clean component hierarchy with loading/error states
- Server Actions for key mutations
- data-testid on interactive elements`,
  nano: `Mode: NANO — minimal viable product. Include:
- Single auth flow (email-OTP)
- Minimal pages (landing + 1-2 core features)
- Inline styles or minimal Tailwind, no complex state`,
};

const AUTOMATED_SYSTEM_PROMPT = `You are "The Architect" for Sovereign Forge OS v3.0. Plan a Next.js 15 App Router application with React 19.

Architecture principles:
- Server Components by default; 'use client' only where needed
- Supabase for auth (email-OTP), database, and real-time
- shadcn/ui + Tailwind CSS v4 for UI
- Type-safe Server Actions for mutations
- Zod schemas for all API input validation
- Proper error boundaries and loading states

Return JSON ONLY — no markdown fences:
{
  "scaffolding": { "path/file.ts": "Purpose + key exports" },
  "coreLogicPlan": "- Bullet 1\\n- Bullet 2",
  "fileStructure": ["src/app/page.tsx", "src/lib/db.ts"],
  "databaseRequirements": ["users(id uuid PK, email text, role text, created_at timestamptz)"],
  "apiEndpoints": [{"route": "/api/example", "method": "POST", "purpose": "Create resource"}],
  "middlewareRequirements": ["auth-guard", "rate-limit"]
}`;

const GRANULAR_SYSTEM_PROMPT = `You are "The Granular Architect" for Sovereign Forge OS v3.0. Produce a DETAILED per-file blueprint for a Next.js 15 App Router application with React 19.

Architecture principles:
- Server Components by default; 'use client' only for interactive components
- Supabase for auth, DB (with RLS), real-time subscriptions
- shadcn/ui + Tailwind CSS v4, dark mode support
- Type-safe Server Actions with revalidation
- Zod schemas for all data boundaries
- Error boundaries per route segment, Suspense for async components
- Middleware for auth guards and rate limiting

For EACH file, specify purpose, exports, dependencies, and complexity. Target 10-25 files.

Return JSON ONLY — no markdown fences:
{
  "scaffolding": { "path/file.ts": "Detailed purpose, responsibility, and key patterns" },
  "coreLogicPlan": "- Module: path/file.ts → Detailed implementation logic\\n- Module: path/other.ts → Logic",
  "fileStructure": ["src/app/page.tsx", "src/app/api/route.ts"],
  "databaseRequirements": ["users(id uuid PK, email text UNIQUE, role text DEFAULT 'user', created_at timestamptz DEFAULT now())"],
  "apiEndpoints": [{"route": "/api/example", "method": "POST", "purpose": "Create resource with validation"}],
  "middlewareRequirements": ["auth-guard", "rate-limit", "csrf-protection"],
  "granularSpecs": [
    {
      "filePath": "src/app/page.tsx",
      "purpose": "Landing page with hero, features grid, and CTA",
      "exports": ["default Page"],
      "dependencies": ["src/components/Hero.tsx", "src/components/Features.tsx"],
      "complexity": "medium"
    }
  ]
}`;

function getFileTargets(builderType: "automated" | "granular", mode: string): string {
  if (builderType === "granular") return "Target 10-25 files for a complete production application.";
  if (mode === "elite") return "Target 8-15 files for a robust production application.";
  if (mode === "nano") return "Target 3-6 files for a minimal viable product.";
  return "Target 5-12 files for a solid application.";
}

export async function runArchitectAgent(
  prompt: string,
  strategy: string,
  builderType: "automated" | "granular" = "automated",
  mode: string = "universal",
): Promise<ArchitectResult> {
  const basePrompt = builderType === "granular" ? GRANULAR_SYSTEM_PROMPT : AUTOMATED_SYSTEM_PROMPT;
  const modeContext = MODE_CONTEXT[mode] || MODE_CONTEXT.universal;
  const fileTargets = getFileTargets(builderType, mode);
  const systemPrompt = `${basePrompt}\n\n${modeContext}\n\n${fileTargets}`;
  const maxTokens = builderType === "granular" ? 4096 : mode === "elite" ? 3072 : 2048;

  try {
    return await callLLMJson(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Intent: ${prompt}\nStrategy: ${strategy}` }
      ],
      architectResultSchema,
      { temperature: 0.2, maxTokens, timeout: 25000 }
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
