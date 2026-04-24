import { serverEnv } from "@/lib/env";
import { isDatabaseAvailable } from "@/lib/supabase/db";
import { isGitHubAvailable } from "@/lib/github";
import { isVercelAvailable } from "@/lib/deploy";

/**
 * Diagnostic Suite for Sovereign Forge Platform
 * Run this to verify all integrations are active.
 */
export async function runDiagnostics() {
  const results = {
    env: {
      supabase: !!serverEnv.NEXT_PUBLIC_SUPABASE_URL && !!serverEnv.SUPABASE_SERVICE_ROLE_KEY,
      stripe: !!serverEnv.STRIPE_SECRET_KEY && !!serverEnv.STRIPE_ACCOUNT_ID,
      github: !!(serverEnv.GITHUB_ACCESS_TOKEN || serverEnv.GITHUB_TOKEN),
      vercel: !!(serverEnv.VERCEL_ACCESS_TOKEN || serverEnv.VERCEL_TOKEN),
      llm: {
        opencodezen: !!serverEnv.OPENCODE_ZEN_API_KEY,
        openai: !!serverEnv.OPENAI_API_KEYS,
        deepseek: !!serverEnv.DEEPSEEK_API_KEYS,
        cerebras: !!serverEnv.CEREBRAS_API_KEYS,
      }
    },
    integrations: {
      db: isDatabaseAvailable(),
      github: isGitHubAvailable(),
      vercel: isVercelAvailable(),
    },
    timestamp: new Date().toISOString()
  };

  console.log("=== Sovereign Forge Diagnostics ===");
  console.log(JSON.stringify(results, null, 2));
  return results;
}
