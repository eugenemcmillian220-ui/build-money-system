import * as dotenv from "dotenv";
dotenv.config();
import { createVercelDeploy } from "../src/lib/deploy";
import * as fs from "fs";
import * as path from "path";

async function manifest() {
  console.log("🚀 Manifesting Aetheris AI Business via Build Money System...");

  const projectId = "aetheris-ai-001";
  
  // Prepare File Map
  const files: Record<string, string> = {
    "app/page.tsx": fs.readFileSync("/workspace/aetheris-ai/app/page.tsx", "utf-8"),
    "supabase/schema.sql": fs.readFileSync("/workspace/aetheris-ai/supabase/schema.sql", "utf-8"),
  };

  console.log("📦 Project Files Prepared.");
  console.log("🔗 Connecting to Vercel API...");

  const result = await createVercelDeploy(
    projectId,
    files,
    "Aetheris AI Studio",
    {
      NEXT_PUBLIC_SITE_URL: "https://aetheris-ai.vercel.app",
    }
  );

  if (result.success) {
    console.log("\n✨ DEPLOYMENT SUCCESSFUL!");
    console.log(`🌐 URL: ${result.deployment?.url}`);
    console.log(`🆔 ID: ${result.deployment?.id}`);
    console.log("🚀 Aetheris AI is now autonomously building empires.");
  } else {
    console.error("\n❌ DEPLOYMENT FAILED");
    console.error(`Error: ${result.error}`);
  }
}

manifest().catch(console.error);
