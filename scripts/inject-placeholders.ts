import * as dotenv from "dotenv";
dotenv.config();
import axios from "axios";

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;
const PROJECT_NAME = "aetheris-ai-studio";

const PLACEHOLDERS: Record<string, string> = {
  NEXT_PUBLIC_SITE_URL: "https://aetheris-ai-studio.vercel.app",
  NEXT_PUBLIC_SUPABASE_URL: "https://your-project.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "REPLACE_WITH_SUPABASE_ANON_KEY",
  SUPABASE_SERVICE_ROLE_KEY: "REPLACE_WITH_SUPABASE_SERVICE_ROLE_KEY",
  GITHUB_TOKEN: "REPLACE_WITH_GITHUB_TOKEN",
  STRIPE_SECRET_KEY: "REPLACE_WITH_STRIPE_SECRET_KEY",
  STRIPE_WEBHOOK_SECRET: "REPLACE_WITH_STRIPE_WEBHOOK_SECRET",
  GROQ_KEYS: "REPLACE_WITH_COMMA_SEPARATED_GROQ_KEYS",
  GEMINI_KEYS: "REPLACE_WITH_COMMA_SEPARATED_GEMINI_KEYS",
  OPENAI_KEYS: "REPLACE_WITH_COMMA_SEPARATED_OPENAI_KEYS",
  OPENROUTER_KEYS: "REPLACE_WITH_COMMA_SEPARATED_OPENROUTER_KEYS",
  E2B_API_KEY: "REPLACE_WITH_E2B_API_KEY",
  X_API_KEY: "REPLACE_WITH_X_API_KEY",
  DISCORD_TOKEN: "REPLACE_WITH_DISCORD_TOKEN",
  CRON_SECRET: "REPLACE_WITH_SECURE_CRON_SECRET",
};

async function inject() {
  if (!VERCEL_TOKEN) {
    console.error("❌ VERCEL_TOKEN is required in .env");
    return;
  }

  console.log(`🚀 Injecting Environment Placeholders into Vercel project: ${PROJECT_NAME}...`);

  const teamParam = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "";
  
  // 1. Get Project ID
  let projectId = "";
  try {
    const projectRes = await axios.get(`https://api.vercel.com/v9/projects/${PROJECT_NAME}${teamParam}`, {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
    });
    projectId = projectRes.data.id;
    console.log(`   ✅ Found Project ID: ${projectId}`);
  } catch (err: any) {
    console.error(`   ❌ Could not find project: ${err.response?.data?.error?.message || err.message}`);
    return;
  }

  // 2. Inject each placeholder
  for (const [key, value] of Object.entries(PLACEHOLDERS)) {
    try {
      await axios.post(`https://api.vercel.com/v10/projects/${projectId}/env${teamParam}`, {
        key,
        value,
        type: "plain",
        target: ["production", "preview", "development"]
      }, {
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
      });
      console.log(`   ✅ Injected: ${key}`);
    } catch (err: any) {
      if (err.response?.data?.error?.code === "existing_variable") {
        console.log(`   ⚠️  Skipped (Already exists): ${key}`);
      } else {
        console.warn(`   ⚠️  Could not inject ${key}: ${err.response?.data?.error?.message || err.message}`);
      }
    }
  }

  console.log("\n✨ Placeholder injection complete. Aetheris AI is ready for full configuration.");
}

inject().catch(console.error);
