import * as dotenv from "dotenv";
dotenv.config();
import { createVercelDeploy } from "../src/lib/deploy";
import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";

async function deploy() {
  console.log("🚀 Triggering Manual Platform Deployment for Build Money System...");

  const projectId = "prj_IWU7CvE5WyYuKCaEqxRwPY2H00Xn";
  const projectName = "build-money-system";
  
  // 1. Collect all files (excluding node_modules and dotfiles)
  console.log("📦 Collecting project files...");
  const filePaths = await glob("**/*", {
    cwd: process.cwd(),
    nodir: true,
    ignore: ["node_modules/**", ".*", "dist/**", ".next/**", "generated_images/**", "scripts/manifest-aetheris.ts", "scripts/inject-placeholders.ts"]
  });

  const files: Record<string, string> = {};
  for (const filePath of filePaths) {
    files[filePath] = fs.readFileSync(path.join(process.cwd(), filePath), "utf-8");
  }

  console.log(`✅ Collected ${Object.keys(files).length} files.`);

  // 2. Trigger Vercel Deploy
  console.log("🔗 Connecting to Vercel API...");
  const result = await createVercelDeploy(
    projectId,
    files,
    projectName,
    {
      NEXT_PUBLIC_SITE_URL: "https://build-money-system.vercel.app",
    }
  );

  if (result.success) {
    console.log("\n✨ PLATFORM DEPLOYMENT TRIGGERED!");
    console.log(`🌐 URL: ${result.deployment?.url}`);
    console.log(`🆔 ID: ${result.deployment?.id}`);
    console.log("\n🚀 The platform is now rebuilding on Vercel with all Phase 1-18 logic.");
  } else {
    console.error("\n❌ DEPLOYMENT FAILED");
    console.error(`Error: ${result.error}`);
  }
}

deploy().catch(console.error);
