import * as dotenv from "dotenv";
dotenv.config();
import axios from "axios";

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;
const PROJECT_NAME = "build-money-system";

const VARS_TO_SYNC = [
  "GITHUB_TOKEN",
  "STRIPE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
];

async function forceSync() {
  if (!VERCEL_TOKEN) return;
  const teamParam = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "";
  
  // 1. Get Project ID
  const projectRes = await axios.get(`https://api.vercel.com/v9/projects/${PROJECT_NAME}${teamParam}`, {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
  });
  const projectId = projectRes.data.id;

  // 2. Get existing envs
  const envsRes = await axios.get(`https://api.vercel.com/v9/projects/${projectId}/env${teamParam}`, {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
  });
  const existingEnvs = envsRes.data.envs;

  for (const key of VARS_TO_SYNC) {
    const value = process.env[key];
    if (!value) continue;

    const existing = existingEnvs.find((e: any) => e.key === key);
    if (existing) {
      // Update
      await axios.patch(`https://api.vercel.com/v9/projects/${projectId}/env/${existing.id}${teamParam}`, {
        value,
        target: ["production", "preview", "development"]
      }, {
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
      });
      console.log(`   🔄 Force Updated: ${key}`);
    } else {
      // Create
      await axios.post(`https://api.vercel.com/v10/projects/${projectId}/env${teamParam}`, {
        key,
        value,
        type: "plain",
        target: ["production", "preview", "development"]
      }, {
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
      });
      console.log(`   ✅ Created: ${key}`);
    }
  }
}

forceSync().catch(console.error);
