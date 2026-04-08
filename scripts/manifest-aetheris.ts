import * as dotenv from "dotenv";
dotenv.config();
import { createVercelDeploy } from "../src/lib/deploy";
import { exportToGitHub } from "../src/lib/github";
import * as fs from "fs";
import * as path from "path";

async function manifest() {
  console.log("🚀 Manifesting Aetheris AI Business via Build Money System...");

  const projectId = "aetheris-ai-studio-v2";
  const repoName = "aetheris-ai-studio-v2";
  
  // Prepare File Map
  const files: Record<string, string> = {
    "app/page.tsx": fs.readFileSync("/workspace/aetheris-ai/app/page.tsx", "utf-8"),
    "supabase/schema.sql": fs.readFileSync("/workspace/aetheris-ai/supabase/schema.sql", "utf-8"),
    ".env.example": fs.readFileSync("/workspace/aetheris-ai/.env.example", "utf-8"),
  };

  console.log("📦 Project Files Prepared.");

  // 1. Export to GitHub
  console.log(`🔗 Creating GitHub Repository: ${repoName}...`);
  const githubResult = await exportToGitHub(
    repoName,
    files,
    "Aetheris AI: Autonomous Venture Studio. Built by Build Money System."
  );

  if (!githubResult.success) {
    console.error(`❌ GitHub Export Failed: ${githubResult.error}`);
    // If it already exists, we might want to continue or stop.
    // For now, let's assume we want a fresh start or just use the existing one.
    if (!githubResult.error?.includes("already exists")) {
        return;
    }
    console.log("⚠️ Repository already exists. Continuing with deployment...");
  } else {
    console.log(`✅ GitHub Repository Created: ${githubResult.repoUrl}`);
  }

  // 2. Deploy to Vercel
  console.log("🔗 Connecting to Vercel API...");

  const result = await createVercelDeploy(
    projectId,
    files,
    "Aetheris AI Studio",
    {
      NEXT_PUBLIC_SITE_URL: "https://aetheris-ai.vercel.app",
      GITHUB_REPO: githubResult.repoUrl ? githubResult.repoUrl.replace("https://github.com/", "") : undefined,
    }
  );

  if (result.success) {
    console.log("\n✨ DEPLOYMENT SUCCESSFUL!");
    console.log(`🌐 URL: ${result.deployment?.url}`);
    console.log(`🆔 ID: ${result.deployment?.id}`);
    console.log(`🐙 GitHub: ${githubResult.repoUrl || "Already Linked"}`);
    console.log("\n🚀 Aetheris AI is now autonomously building empires with full Git CI/CD.");
  } else {
    console.error("\n❌ DEPLOYMENT FAILED");
    console.error(`Error: ${result.error}`);
  }
}

manifest().catch(console.error);
