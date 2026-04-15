import { z } from "zod";

const serverEnvSchema = z.object({
  // OpenRouter - supports comma-separated multi-key rotation
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_API_KEYS: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional().default("meta-llama/llama-3.3-70b-instruct:free"),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL")
    .optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required")
    .optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Site
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),

  // GitHub & Vercel deployment
  GITHUB_ACCESS_TOKEN: z.string().optional(),
  GITHUB_USERNAME: z.string().optional(),
  GITHUB_REPO: z.string().optional(),
  GITHUB_DEFAULT_BRANCH: z.string().optional().default("main"),
  GITHUB_TOKEN: z.string().optional(), // Legacy
  VERCEL_ACCESS_TOKEN: z.string().optional(),
  VERCEL_PROJECT_ID: z.string().optional(),
  VERCEL_TEAM_ID: z.string().optional(),
  VERCEL_TOKEN: z.string().optional(), // Legacy

  // Admin
  ADMIN_API_KEYS: z.string().optional(),

  // AI providers - single key (legacy) or multi-key (comma-separated)
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_API_KEYS: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  GROQ_API_KEYS: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_API_KEYS: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEYS: z.string().optional(),
  CEREBRAS_API_KEY: z.string().optional(),
  CEREBRAS_API_KEYS: z.string().optional(),
  CLOUDFLARE_API_KEY: z.string().optional(),
  CLOUDFLARE_API_KEYS: z.string().optional(),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_ACCOUNT_ID: z.string().optional(),

  // Stripe price IDs
  STRIPE_BASIC_MINI_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_BASIC_MINI_YEARLY_PRICE_ID: z.string().optional(),
  STRIPE_BASIC_STARTER_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_BASIC_STARTER_YEARLY_PRICE_ID: z.string().optional(),
  STRIPE_BASIC_PRO_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_BASIC_PRO_YEARLY_PRICE_ID: z.string().optional(),
  STRIPE_BASIC_PREMIUM_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_BASIC_PREMIUM_YEARLY_PRICE_ID: z.string().optional(),
  STRIPE_ELITE_STARTER_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_ELITE_STARTER_YEARLY_PRICE_ID: z.string().optional(),
  STRIPE_ELITE_PRO_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_ELITE_PRO_YEARLY_PRICE_ID: z.string().optional(),
  STRIPE_ELITE_ENTERPRISE_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_ELITE_ENTERPRISE_YEARLY_PRICE_ID: z.string().optional(),
  STRIPE_LIFETIME_STARTER_PRICE_ID: z.string().optional(),
  STRIPE_LIFETIME_PRO_PRICE_ID: z.string().optional(),
  STRIPE_ON_PREM_PERPETUAL_PRICE_ID: z.string().optional(),
  STRIPE_CREDITS_5K_PRICE_ID: z.string().optional(),
  STRIPE_CREDITS_10K_PRICE_ID: z.string().optional(),
  STRIPE_CREDITS_25K_PRICE_ID: z.string().optional(),
  STRIPE_CREDITS_50K_PRICE_ID: z.string().optional(),
  STRIPE_CREDITS_100K_PRICE_ID: z.string().optional(),

  // Services
  E2B_API_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),

  // Social
  DISCORD_TOKEN: z.string().optional(),
  SLACK_TOKEN: z.string().optional(),
  SLACK_BOT_TOKEN: z.string().optional(),
  SLACK_WEBHOOK_URL: z.string().optional(),
  SLACK_CHANNEL_ID: z.string().optional(),
  GROQ_KEYS: z.string().optional(),
  GEMINI_KEYS: z.string().optional(),
  OPENAI_KEYS: z.string().optional(),
  OPENROUTER_KEYS: z.string().optional(),

  // Arize AI / OTel
  ARIZE_API_KEY: z.string().optional(),
  ARIZE_SPACE_ID: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),

  // Analytics & Monitoring
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),

  // Management
  SUPABASE_ACCESS_TOKEN: z.string().optional(),
  SUPABASE_MANAGEMENT_API_KEY: z.string().optional(),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL")
    .optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required")
    .optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),
});

type ServerEnv = z.infer<typeof serverEnvSchema>;
type ClientEnv = z.infer<typeof clientEnvSchema>;

// ⚠️ Do NOT cache serverEnv — always read fresh from process.env
function getServerEnv(): ServerEnv {
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.SKIP_ENV_VALIDATION === "true"
  ) {
    return serverEnvSchema.partial().parse(process.env) as unknown as ServerEnv;
  }

  const result = serverEnvSchema.partial().safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    console.error("❌ Invalid server environment variables:", formatted);
    throw new Error(
      `Invalid server environment variables:\n${JSON.stringify(formatted, null, 2)}`
    );
  }
  return result.data as ServerEnv;
}

let cachedClientEnv: ClientEnv | undefined;

function validateClientEnv(): ClientEnv {
  if (cachedClientEnv) return cachedClientEnv;

  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.SKIP_ENV_VALIDATION === "true"
  ) {
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
      `Invalid client environment variables:\n${JSON.stringify(formatted, null, 2)}`
    );
  }
  cachedClientEnv = result.data;
  return cachedClientEnv;
}

export const serverEnv = new Proxy({} as ServerEnv, {
  get(_target, prop) {
    if (typeof prop !== "string") return undefined;
    return getServerEnv()[prop as keyof ServerEnv];
  },
});

export const clientEnv = new Proxy({} as ClientEnv, {
  get(_target, prop) {
    if (typeof prop !== "string") return undefined;
    return validateClientEnv()[prop as keyof ClientEnv];
  },
});
