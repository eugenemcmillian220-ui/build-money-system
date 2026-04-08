import { serverEnv } from "@/lib/env";
import { FileMap, DeploymentInfo, DeploymentStatus } from "./types";

export interface VercelDeployResult {
  success: boolean;
  deployment?: DeploymentInfo;
  error?: string;
}

export class VercelError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = "VercelError";
  }
}

const VERCEL_API_BASE = "https://api.vercel.com";

interface VercelDeploymentResponse {
  id: string;
  url: string;
  readyState: string;
  created: number;
}

/**
 * Create a Vercel deployment from files
 */
export async function createVercelDeploy(
  projectId: string,
  files: FileMap,
  name?: string,
  env: Record<string, string> = {}
): Promise<VercelDeployResult> {
  const token = serverEnv.VERCEL_TOKEN;
  
  if (!token) {
    return {
      success: false,
      error: "Vercel token not configured. Set VERCEL_TOKEN environment variable.",
    };
  }

  try {
    // Dynamic import axios
    const axiosModule = await import("axios");
    const axios = axiosModule.default;
    
    // Convert files to Vercel format (array of objects)
    const vercelFiles: { file: string; data: string; encoding: string }[] = [];

    for (const [path, content] of Object.entries(files)) {
      vercelFiles.push({
        file: path,
        data: Buffer.from(content).toString("base64"),
        encoding: "base64",
      });
    }

    // Add package.json if not present
    if (!files["package.json"]) {
      vercelFiles.push({
        file: "package.json",
        data: Buffer.from(JSON.stringify({
          name: name?.toLowerCase().replace(/\s+/g, "-") || `ai-app-${projectId.slice(0, 8)}`,
          version: "1.0.0",
          private: true,
          scripts: {
            dev: "next dev",
            build: "next build",
            start: "next start",
          },
          engines: {
            node: "22.x"
          },
          dependencies: {
            next: "latest",
            react: "latest",
            "react-dom": "latest"
          },
          devDependencies: {
            typescript: "latest",
            "@types/node": "latest",
            "@types/react": "latest",
            "@types/react-dom": "latest"
          },
        }, null, 2)).toString("base64"),
        encoding: "base64",
      });
    }

    // Add next.config.js if not present
    if (!files["next.config.js"] && !files["next.config.ts"]) {
      vercelFiles.push({
        file: "next.config.js",
        data: Buffer.from(`/** @type {import('next').NextConfig} */
const nextConfig = {}
module.exports = nextConfig
`).toString("base64"),
        encoding: "base64",
      });
    }


    const teamParam = serverEnv.VERCEL_TEAM_ID ? `?teamId=${serverEnv.VERCEL_TEAM_ID}` : "";
    
    const deploymentName = (name || `ai-app-${projectId.slice(0, 8)}`)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9._-]/g, "");

    // Optional: Link to GitHub if repo info is provided in env
    const githubRepo = env.GITHUB_REPO; // format: "owner/repo"
    if (githubRepo) {
      try {
        await axios.post(`${VERCEL_API_BASE}/v9/projects/${deploymentName}${teamParam}`, {
          link: {
            type: "github",
            repo: githubRepo,
          }
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`   ✅ Linked project ${deploymentName} to GitHub: ${githubRepo}`);
      } catch {
        // Project might not exist yet, or other error. 
        // We'll try to create it with the link if it doesn't exist.
        try {
          await axios.post(`${VERCEL_API_BASE}/v9/projects${teamParam}`, {
            name: deploymentName,
            framework: "nextjs",
            link: {
              type: "github",
              repo: githubRepo,
            }
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log(`   ✅ Created and linked project ${deploymentName} to GitHub: ${githubRepo}`);
        } catch (e2) {
          console.warn(`   ⚠️ Could not link project to GitHub: ${e2 instanceof Error ? e2.message : "Unknown error"}`);
        }
      }
    }

    const response = await axios.post<VercelDeploymentResponse>(
      `${VERCEL_API_BASE}/v13/deployments${teamParam}`,
      {
        name: deploymentName,
        files: vercelFiles,
        framework: "nextjs",
        target: "production",
        projectSettings: {
          framework: "nextjs"
        },
        env: env // Build-time env vars
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const deployment = response.data;

    return {
      success: true,
      deployment: {
        id: deployment.id,
        url: deployment.url ? `https://${deployment.url}` : ``,
        status: mapVercelStatus(deployment.readyState),
        createdAt: new Date().toISOString(),
      },
    };
  } catch (err: unknown) {
    console.error("Vercel deployment error:", err);

    // Type guard for axios error
    const isAxiosError = (e: unknown): e is { 
      response?: { status?: number; data?: { error?: { message?: string } } }; 
      message?: string;
    } => {
      return typeof e === "object" && e !== null && "isAxiosError" in e;
    };
    
    if (isAxiosError(err)) {
      const status = err.response?.status;
      const message = err.response?.data?.error?.message || err.message;
      
      // Handle rate limiting
      if (status === 429) {
        return {
          success: false,
          error: "Vercel rate limit exceeded. Please try again later.",
        };
      }
      
      return {
        success: false,
        error: `Vercel API error: ${message}`,
      };
    }

    return {
      success: false,
      error: `Deployment failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}

/**
 * Get deployment status from Vercel
 */
export async function getDeploymentStatus(deploymentId: string): Promise<DeploymentInfo | null> {
  const token = serverEnv.VERCEL_TOKEN;
  
  if (!token) {
    return null;
  }

  try {
    const axiosModule = await import("axios");
    const axios = axiosModule.default;
    
    const teamParam = serverEnv.VERCEL_TEAM_ID ? `?teamId=${serverEnv.VERCEL_TEAM_ID}` : "";
    const response = await axios.get<VercelDeploymentResponse>(
      `${VERCEL_API_BASE}/v13/deployments/${deploymentId}${teamParam}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const deployment = response.data;

    return {
      id: deployment.id,
      url: deployment.url ? `https://${deployment.url}` : ``,
      status: mapVercelStatus(deployment.readyState),
      createdAt: new Date(deployment.created).toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Failed to get deployment status:", error);
    return null;
  }
}

/**
 * Check if Vercel integration is available
 */
export function isVercelAvailable(): boolean {
  return !!serverEnv.VERCEL_TOKEN;
}

/**
 * Map Vercel status to our status type
 */
function mapVercelStatus(vercelStatus: string): DeploymentStatus {
  switch (vercelStatus) {
    case "QUEUED":
    case "BUILDING":
      return "building";
    case "READY":
      return "ready";
    case "ERROR":
    case "CANCELED":
      return "error";
    default:
      return "pending";
  }
}

/**
 * Delete a deployment
 */
export async function deleteDeployment(deploymentId: string): Promise<boolean> {
  const token = serverEnv.VERCEL_TOKEN;
  
  if (!token) {
    return false;
  }

  try {
    const axiosModule = await import("axios");
    const axios = axiosModule.default;
    
    const teamParam = serverEnv.VERCEL_TEAM_ID ? `?teamId=${serverEnv.VERCEL_TEAM_ID}` : "";
    await axios.delete(
      `${VERCEL_API_BASE}/v13/deployments/${deploymentId}${teamParam}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return true;
  } catch (error) {
    console.error("Failed to delete deployment:", error);
    return false;
  }
}
