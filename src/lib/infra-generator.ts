import { cleanJson, callLLM } from "./llm";
import { AppSpec } from "./types";

export interface InfraResult {
  provider: "aws" | "gcp" | "azure";
  files: Record<string, string>;
  instructions: string;
}

/**
 * Multi-Cloud IaC Generator: Generates Terraform/Pulumi infrastructure code
 */
export async function generateInfrastructure(spec: AppSpec, provider: "aws" | "gcp" | "azure" = "aws"): Promise<InfraResult> {
  const systemPrompt = `You are a DevOps and Infrastructure Engineer. Generate infrastructure-as-code for a Next.js 15 application to be deployed on ${provider.toUpperCase()}.

Focus on:
- Containerization (Docker)
- Serverless / Managed App hosting (e.g., AWS Amplify, GCP Cloud Run)
- Database provisioning (if specified in schema)
- Static assets (S3/GCS)
- Environment variable management

Return ONLY a JSON object:
{
  "provider": "${provider}",
  "files": {
    "infra/main.tf": "Terraform code",
    "Dockerfile": "Production Dockerfile",
    "docker-compose.yml": "Local dev environment"
  },
  "instructions": "Step-by-step instructions to deploy this infra"
}`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: `App Specification:\n${JSON.stringify(spec, null, 2)}` }
  ];

  const response = await callLLM(messages, { temperature: 0.2, timeout: 90000 });
  const result = JSON.parse(cleanJson(response)) as InfraResult;

  return result;
}
