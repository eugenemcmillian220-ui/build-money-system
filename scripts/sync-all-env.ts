import * as dotenv from "dotenv";
dotenv.config();
import axios from "axios";
import * as fs from "fs";
import * as path from "path";

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;
const PROJECT_NAME = "build-money-system";

async function syncAll() {
  if (!VERCEL_TOKEN) {
    console.error("❌ VERCEL_TOKEN not found in .env");
    return;
  }

  console.log(`🚀 Syncing all environment variables to Vercel project: ${PROJECT_NAME}...`);

  // 1. Get Project ID
  const teamParam = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "";
  let projectId = "";
  try {
    const res = await axios.get(`https://api.vercel.com/v9/projects/${PROJECT_NAME}${teamParam}`, {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
    });
    projectId = res.data.id;
    console.log(`   ✅ Found Project ID: ${projectId}`);
  } catch (err: any) {
    console.error(`   ❌ Project not found: ${err.response?.data?.error?.message || err.message}`);
    return;
  }

  // 2. Read local .env
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    console.error("❌ .env file not found");
    return;
  }

  const envContent = fs.readFileSync(envPath, "utf-8");
  const envVars: Record<string, string> = {};
  envContent.split("\n").forEach(line => {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
      const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
      if (value && !line.startsWith("#")) {
        envVars[key.trim()] = value;
      }
    }
  });

  // 3. Push to Vercel
  for (const [key, value] of Object.entries(envVars)) {
    if (key === "VERCEL_TOKEN" || key === "VERCEL_PROJECT_ID") continue; // Avoid self-recursion or loops

    try {
      await axios.post(`https://api.vercel.com/v10/projects/${projectId}/env${teamParam}`, {
        key,
        value,
        type: "plain",
        target: ["production", "preview", "development"]
      }, {
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
      });
      console.log(`   ✅ Synced: ${key}`);
    } catch (err: any) {
      if (err.response?.data?.error?.code === "existing_variable") {
        // Update existing variable
        try {
          // Get the env ID first
          const envsRes = await axios.get(`https://api.vercel.com/v9/projects/${projectId}/env${teamParam}`, {
            headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
          });
          const existingEnv = envsRes.data.envs.find((e: any) => e.key === key);
          if (existingEnv) {
            await axios.patch(`https://api.vercel.com/v9/projects/${projectId}/env/${existingEnv.id}${teamParam}`, {
              value,
              target: ["production", "preview", "development"]
            }, {
              headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
            });
            console.log(`   🔄 Updated: ${key}`);
          }
        } catch (patchErr: any) {
          console.warn(`   ⚠️  Could not update ${key}: ${patchErr.response?.data?.error?.message || patchErr.message}`);
        }
      } else {
        console.warn(`   ⚠️  Could not sync ${key}: ${err.response?.data?.error?.message || err.message}`);
      }
    }
  }

  console.log("\n✨ All environment variables are now synchronized with Vercel.");
}

syncAll().catch(console.error);
