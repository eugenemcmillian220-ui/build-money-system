import { z } from "zod";

const serverEnvSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),
  OPENROUTER_MODEL: z.string().optional().default("openai/gpt-4o-mini"),
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required").optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  // Phase 4: GitHub and Vercel tokens (optional for development)
  GITHUB_TOKEN: z.string().optional(),
  VERCEL_TOKEN: z.string().optional(),
  VERCEL_TEAM_ID: z.string().optional(),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
});

type ServerEnv = z.infer<typeof serverEnvSchema>;
type ClientEnv = z.infer<typeof clientEnvSchema>;

let cachedServerEnv: ServerEnv | undefined;
let cachedClientEnv: ClientEnv | undefined;

function validateServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;

  // Skip validation during build to avoid errors when environment variables are not set
  if (process.env.NEXT_PHASE === 'phase-production-build' || process.env.SKIP_ENV_VALIDATION === 'true') {
    return serverEnvSchema.partial().parse(process.env) as unknown as ServerEnv;
  }

  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    console.error("❌ Invalid server environment variables:", formatted);
    throw new Error(
      `Invalid server environment variables:\n${JSON.stringify(formatted, null, 2)}`,
    );
  }
  cachedServerEnv = result.data;
  return cachedServerEnv;
}

function validateClientEnv(): ClientEnv {
  if (cachedClientEnv) return cachedClientEnv;

  // Skip validation during build
  if (process.env.NEXT_PHASE === 'phase-production-build' || process.env.SKIP_ENV_VALIDATION === 'true') {
    return clientEnvSchema.partial().parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env["NEXT_PUBLIC_SUPABASE_URL"],
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
      NEXT_PUBLIC_SITE_URL: process.env["NEXT_PUBLIC_SITE_URL"],
    }) as unknown as ClientEnv;
  }

  const result = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env["NEXT_PUBLIC_SUPABASE_URL"],
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    NEXT_PUBLIC_SITE_URL: process.env["NEXT_PUBLIC_SITE_URL"],
  });
  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    console.error("❌ Invalid client environment variables:", formatted);
    throw new Error(
      `Invalid client environment variables:\n${JSON.stringify(formatted, null, 2)}`,
    );
  }
  cachedClientEnv = result.data;
  return cachedClientEnv;
}

// Export as proxies to allow lazy validation only when variables are actually accessed
export const serverEnv = new Proxy({} as ServerEnv, {
  get(target, prop) {
    if (typeof prop !== "string") return undefined;
    return validateServerEnv()[prop as keyof ServerEnv];
  }
});

export const clientEnv = new Proxy({} as ClientEnv, {
  get(target, prop) {
    if (typeof prop !== "string") return undefined;
    return validateClientEnv()[prop as keyof ClientEnv];
  }
});
